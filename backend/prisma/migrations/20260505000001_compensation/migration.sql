-- Add compensation field to employees and payrolls tables

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "compensation" DECIMAL NOT NULL DEFAULT 0;
ALTER TABLE "payrolls"  ADD COLUMN IF NOT EXISTS "compensation" DECIMAL NOT NULL DEFAULT 0;
