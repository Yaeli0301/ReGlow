import mongoose from "mongoose";
import { getMongoUriOrThrow, isDemoMode, shouldUseInMemoryMongo } from "@/lib/env";
import { logger } from "@/lib/logger";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
  // eslint-disable-next-line no-var
  var demoMemoryServer: { stop(): Promise<boolean> } | null | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? { conn: null, promise: null };
global.mongooseCache = cached;

async function resolveUri(): Promise<string> {
  if (shouldUseInMemoryMongo()) {
    if (global.demoMemoryUri) return global.demoMemoryUri;

    const { startDemoMemoryServer } = await import("@/lib/demo-memory-db");
    global.demoMemoryUri = await startDemoMemoryServer();
    logger.info("Demo in-memory MongoDB started", { uri: "memory" });
    return global.demoMemoryUri;
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

  if (!cached.promise) {
    const uri = await resolveUri();
    const isVercel = Boolean(process.env.VERCEL);
    cached.promise = mongoose.connect(uri, {
      bufferCommands: false,
      maxPoolSize: 10,
      maxIdleTimeMS: isVercel ? 5000 : undefined,
      serverSelectionTimeoutMS: 15000,
      // IPv4 only for local Windows DNS issues — not needed on Vercel
      ...(isVercel ? {} : { family: 4 }),
    });
  }

  try {
    cached.conn = await cached.promise;
    await attachVercelDatabasePool();
    logger.info("Database connected", { mode: isDemoMode() ? "demo" : "production" });

    if (isDemoMode() && !global.demoSeeded) {
      const { ensureDemoSeeded } = await import("@/lib/seed/demo-seed");
      await ensureDemoSeeded();
      global.demoSeeded = true;
    }

    return cached.conn;
  } catch (error) {
    cached.promise = null;
    logger.error("Database connection failed", {
      err: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/** Drop all data and re-seed — demo mode only. */
export async function resetDemoDatabase(): Promise<void> {
  if (!isDemoMode()) {
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
