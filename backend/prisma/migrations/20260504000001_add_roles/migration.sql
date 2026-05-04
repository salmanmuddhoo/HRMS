-- Add new roles to the Role enum.
-- PostgreSQL requires each ADD VALUE in a separate statement and they cannot
-- run inside a transaction, so this migration must be applied with a direct
-- database connection (not PgBouncer transaction mode).

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DIRECTOR';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TREASURER';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SECRETARY';
