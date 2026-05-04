-- Create AdjustmentType enum and payroll_adjustments table

CREATE TYPE "AdjustmentType" AS ENUM ('DEDUCTION', 'ADDITION');

CREATE TABLE "payroll_adjustments" (
  "id"        TEXT        NOT NULL,
  "payrollId" TEXT        NOT NULL,
  "label"     TEXT        NOT NULL,
  "type"      "AdjustmentType" NOT NULL,
  "amount"    DECIMAL     NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payroll_adjustments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_adjustments_payrollId_fkey"
    FOREIGN KEY ("payrollId") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
