import mongoose from "mongoose";
import { getMongoUriOrThrow, shouldUseInMemoryMongo } from "@/lib/env";
import { getLandingDemoMongoUri } from "@/lib/env";
import { isDemo } from "@/lib/system/mode";
import { assertEnvValid } from "@/lib/system/env-validator";
import { assertDemoDatabaseIsolation } from "@/lib/system/mode";
import { logger } from "@/lib/logger";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
  // eslint-disable-next-line no-var
  var landingDemoMongooseCache: MongooseCache | undefined;
  // eslint-disable-next-line no-var
  var demoMemoryServer: { stop(): Promise<boolean> } | null | undefined;
  // eslint-disable-next-line no-var
  var demoMemoryStartPromise: Promise<string> | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

const landingDemoCached: MongooseCache =
  global.landingDemoMongooseCache ?? { conn: null, promise: null };
global.landingDemoMongooseCache = landingDemoCached;

async function connectWithUri(uri: string, target: MongooseCache): Promise<typeof mongoose> {
  if (target.conn) return target.conn;

  if (!target.promise) {
    const isVercel = Boolean(process.env.VERCEL);
    const hasDbInUri = /\/[A-Za-z0-9_-]+(\?|$)/.test(
      uri.replace(/^mongodb(\+srv)?:\/\/[^/]+/, "")
    );
    target.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 10,
      maxIdleTimeMS: isVercel ? 5000 : undefined,
      serverSelectionTimeoutMS: 15000,
      ...(hasDbInUri ? {} : { dbName: "reglow" }),
      ...(isVercel ? {} : { family: 4 }),
    });
  }

  target.conn = await target.promise;
  await attachVercelDatabasePool();
  return target.conn;
}

async function resolveUri(): Promise<string> {
  if (shouldUseInMemoryMongo()) {
    if (global.demoMemoryUri) return global.demoMemoryUri;

    if (!global.demoMemoryStartPromise) {
      global.demoMemoryStartPromise = (async () => {
        const { startDemoMemoryServer } = await import("@/lib/demo-memory-db");
        const uri = await startDemoMemoryServer();
        global.demoMemoryUri = uri;
        logger.info("Demo in-memory MongoDB started", { uri: "memory" });
        return uri;
      })().catch((error) => {
        global.demoMemoryStartPromise = undefined;
        throw error;
      });
    }

    return global.demoMemoryStartPromise;
  }
  return getMongoUriOrThrow();
}

/** Vercel serverless: release DB connections when functions suspend (see Vercel + MongoDB guide). */
async function attachVercelDatabasePool(): Promise<void> {
  if (!process.env.VERCEL) return;
  try {
    const { attachDatabasePool } = await import("@vercel/functions");
    const client = mongoose.connection.getClient();
    attachDatabasePool(client);
  } catch (error) {
    logger.warn("attachDatabasePool skipped", {
      err: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  assertEnvValid();

  try {
    if (!cached.promise) {
      const uri = await resolveUri();
      assertDemoDatabaseIsolation(uri);
      await connectWithUri(uri, cached);
    } else {
      cached.conn = await cached.promise;
    }

    logger.info("Database connected", { mode: isDemo() ? "demo" : "production" });

    if (isDemo() && !global.demoSeeded) {
      const { ensureDemoSeeded } = await import("@/lib/seed/demo-seed");
      await ensureDemoSeeded();
      global.demoSeeded = true;
    }

    return cached.conn!;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    logger.error("Database connection failed", {
      err: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Landing-page demo on production Vercel — uses MONGODB_URI_DEMO, not production DB. */
export async function connectLandingDemoDB(): Promise<typeof mongoose> {
  const uri = getLandingDemoMongoUri();
  if (!uri) {
    throw new Error("MONGODB_URI_DEMO is required for landing demo");
  }

  if (landingDemoCached.conn) {
    if (!global.demoSeeded) {
      const { ensureDemoSeeded } = await import("@/lib/seed/demo-seed");
      await ensureDemoSeeded();
      global.demoSeeded = true;
    }
    return landingDemoCached.conn;
  }

  try {
    await connectWithUri(uri, landingDemoCached);
    logger.info("Landing demo database connected");

    if (!global.demoSeeded) {
      const { ensureDemoSeeded } = await import("@/lib/seed/demo-seed");
      await ensureDemoSeeded();
      global.demoSeeded = true;
    }

    return landingDemoCached.conn!;
  } catch (error) {
    landingDemoCached.promise = null;
    landingDemoCached.conn = null;
    logger.error("Landing demo database connection failed", {
      err: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Drop all data and re-seed — demo mode only. */
export async function resetDemoDatabase(): Promise<void> {
  if (!isDemo()) {
    throw new Error("resetDemoDatabase is only allowed in demo mode");
  }
  await connectDB();
  await mongoose.connection.dropDatabase();
  global.demoSeeded = false;
  const { seedDemoData } = await import("@/lib/seed/demo-seed");
  await seedDemoData({ force: true });
  global.demoSeeded = true;
  logger.info("Demo database reset complete");
}

export async function disconnectDB(): Promise<void> {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
  if (global.demoMemoryServer) {
    await global.demoMemoryServer.stop();
    global.demoMemoryServer = null;
    global.demoMemoryUri = undefined;
  }
}
