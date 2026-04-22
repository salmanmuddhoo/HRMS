import { PrismaClient } from '@prisma/client';

// PgBouncer in transaction mode corrupts binary-encoded float8 parameters (error 22P03).
// ?pgbouncer=true forces Prisma to use text protocol, which PgBouncer handles correctly.
const raw = process.env.DATABASE_URL ?? '';
const url = raw && !raw.includes('pgbouncer')
  ? `${raw}${raw.includes('?') ? '&' : '?'}pgbouncer=true`
  : raw;

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: url ? { db: { url } } : undefined,
});

export default prisma;
