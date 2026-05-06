import { PrismaClient } from '@prisma/client';

// PgBouncer in transaction mode corrupts binary-encoded float8 parameters (error 22P03).
// ?pgbouncer=true forces Prisma to use text protocol, which PgBouncer handles correctly.
// connection_limit=1 prevents connection exhaustion in serverless (one lambda = one connection).
const buildUrl = () => {
  const raw = process.env.DATABASE_URL ?? '';
  if (!raw) return raw;
  let url = raw;
  if (!url.includes('pgbouncer')) {
    url += (url.includes('?') ? '&' : '?') + 'pgbouncer=true';
  }
  if (!url.includes('connection_limit')) {
    url += '&connection_limit=1';
  }
  return url;
};

const createClient = () =>
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: { db: { url: buildUrl() } },
  });

// Singleton: reuse the client across warm serverless invocations to avoid
// opening a new connection pool on every request.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const prisma = global.__prisma ?? createClient();
global.__prisma = prisma;

export default prisma;
