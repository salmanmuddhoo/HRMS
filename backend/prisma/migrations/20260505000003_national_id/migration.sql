-- Add nationalId field to employees
ALTER TABLE "employees" ADD COLUMN "nationalId" TEXT NOT NULL DEFAULT '';
