-- Replace single Employee.compensation field with a per-label history table
-- and add a PayrollCompensation snapshot table

ALTER TABLE "employees" DROP COLUMN IF EXISTS "compensation";

CREATE TABLE "employee_compensations" (
  "id"         TEXT        NOT NULL,
  "employeeId" TEXT        NOT NULL,
  "label"      TEXT        NOT NULL,
  "amount"     DECIMAL     NOT NULL,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "employee_compensations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_compensations_employeeId_label_key" UNIQUE ("employeeId", "label"),
  CONSTRAINT "employee_compensations_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "payroll_compensations" (
  "id"        TEXT        NOT NULL,
  "payrollId" TEXT        NOT NULL,
  "label"     TEXT        NOT NULL,
  "amount"    DECIMAL     NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "payroll_compensations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payroll_compensations_payrollId_fkey"
    FOREIGN KEY ("payrollId") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
