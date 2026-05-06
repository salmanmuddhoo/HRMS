-- Add REJECTED to PayrollStatus enum and rejection fields to Payroll
ALTER TYPE "PayrollStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

ALTER TABLE "payrolls" ADD COLUMN IF NOT EXISTS "rejectedBy" TEXT;
ALTER TABLE "payrolls" ADD COLUMN IF NOT EXISTS "rejectedAt" TIMESTAMP(3);
ALTER TABLE "payrolls" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
