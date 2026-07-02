import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required for Prisma Client initialization.");
  }

  if (!connectionString.startsWith("postgresql://") && !connectionString.startsWith("postgres://")) {
    throw new Error(
      "DATABASE_URL must be a PostgreSQL connection string for PrismaPg. Use the Supabase Postgres connection string, not sqlite or NEXT_PUBLIC_SUPABASE_URL."
    );
  }

  return connectionString;
}

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: getConnectionString(),
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);

    return typeof value === "function" ? value.bind(client) : value;
  },
});
