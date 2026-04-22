-- Change Float (DOUBLE PRECISION) to Decimal (NUMERIC) for all float columns.
-- Prisma encodes Decimal values as text strings, bypassing PgBouncer's
-- binary float8 encoding bug (error 22P03) in transaction mode.

ALTER TABLE "employees"
  ALTER COLUMN "baseSalary"          TYPE DECIMAL USING "baseSalary"::DECIMAL,
  ALTER COLUMN "travellingAllowance" TYPE DECIMAL USING "travellingAllowance"::DECIMAL,
  ALTER COLUMN "otherAllowances"     TYPE DECIMAL USING "otherAllowances"::DECIMAL,
  ALTER COLUMN "localLeaveBalance"   TYPE DECIMAL USING "localLeaveBalance"::DECIMAL,
  ALTER COLUMN "sickLeaveBalance"    TYPE DECIMAL USING "sickLeaveBalance"::DECIMAL;

ALTER TABLE "leaves"
  ALTER COLUMN "totalDays" TYPE DECIMAL USING "totalDays"::DECIMAL;

ALTER TABLE "payrolls"
  ALTER COLUMN "baseSalary"          TYPE DECIMAL USING "baseSalary"::DECIMAL,
  ALTER COLUMN "travellingAllowance" TYPE DECIMAL USING "travellingAllowance"::DECIMAL,
  ALTER COLUMN "otherAllowances"     TYPE DECIMAL USING "otherAllowances"::DECIMAL,
  ALTER COLUMN "travellingDeduction" TYPE DECIMAL USING "travellingDeduction"::DECIMAL,
  ALTER COLUMN "totalDeductions"     TYPE DECIMAL USING "totalDeductions"::DECIMAL,
  ALTER COLUMN "grossSalary"         TYPE DECIMAL USING "grossSalary"::DECIMAL,
  ALTER COLUMN "netSalary"           TYPE DECIMAL USING "netSalary"::DECIMAL;
