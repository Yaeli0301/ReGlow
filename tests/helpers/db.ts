import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

let mongod: MongoMemoryServer | null = null;

export async function connectTestDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  global.mongooseCache = { conn: null, promise: null };

  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.ENV_MODE = "production";
  global.demoSeeded = undefined;
  global.demoMemoryUri = undefined;

  await mongoose.connect(process.env.MONGODB_URI, { bufferCommands: false });
}

export async function clearTestDB(): Promise<void> {
  if (mongoose.connection.readyState !== 1) return;
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

export async function disconnectTestDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}
