/** Isolated from main mongodb module so Next.js does not bundle memory-server in production paths. */

export async function startDemoMemoryServer(): Promise<string> {
  const { MongoMemoryServer } = await import("mongodb-memory-server");
  const server = await MongoMemoryServer.create();
  global.demoMemoryServer = server;
  return server.getUri();
}
