-- Initial schema baseline
-- Recreates the database state that existed before the first ALTER-only migration.
-- Uses IF NOT EXISTS / EXCEPTION handling so this is a no-op on existing databases.

-- ─── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('ADMIN', 'EMPLOYER', 'EMPLOYEE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "LeaveType" AS ENUM ('LOCAL', 'SICK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DIRECTOR/TREASURER/SECRETARY are added by migration 20260504000001_add_roles.
-- REJECTED is added to PayrollStatus by migration 20260506000001_payroll_rejected_status.
DO $$ BEGIN
    CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'APPROVED', 'LOCKED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "users" (
    "id"                 TEXT         NOT NULL,
    "email"              TEXT         NOT NULL,
    "password"           TEXT         NOT NULL,
    "role"               "Role"       NOT NULL DEFAULT 'EMPLOYEE',
    "emailNotifications" BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- baseSalary and friends start as DOUBLE PRECISION; migration 20260422000000
-- converts them to DECIMAL.
CREATE TABLE IF NOT EXISTS "employees" (
    "id"                  TEXT               NOT NULL,
    "employeeId"          TEXT               NOT NULL,
    "userId"              TEXT               NOT NULL,
    "firstName"           TEXT               NOT NULL,
    "lastName"            TEXT               NOT NULL,
    "email"               TEXT               NOT NULL,
    "phone"               TEXT,
    "department"          TEXT               NOT NULL,
    "jobTitle"            TEXT               NOT NULL,
    "joiningDate"         TIMESTAMP(3)       NOT NULL,
    "status"              "EmploymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "baseSalary"          DOUBLE PRECISION   NOT NULL,
    "travellingAllowance" DOUBLE PRECISION   NOT NULL DEFAULT 0,
    "otherAllowances"     DOUBLE PRECISION   NOT NULL DEFAULT 0,
    "localLeaveBalance"   DOUBLE PRECISION   NOT NULL DEFAULT 0,
    "sickLeaveBalance"    DOUBLE PRECISION   NOT NULL DEFAULT 0,
    "createdAt"           TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3)       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "leaves" (
    "id"              TEXT          NOT NULL,
    "employeeId"      TEXT          NOT NULL,
    "leaveType"       "LeaveType"   NOT NULL,
    "startDate"       TIMESTAMP(3)  NOT NULL,
    "endDate"         TIMESTAMP(3)  NOT NULL,
    "totalDays"       DOUBLE PRECISION NOT NULL,
    "reason"          TEXT          NOT NULL,
    "attachment"      TEXT,
    "status"          "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "isUrgent"        BOOLEAN       NOT NULL DEFAULT false,
    "isHalfDay"       BOOLEAN       NOT NULL DEFAULT false,
    "halfDayPeriod"   TEXT,
    "approvedBy"      TEXT,
    "approvedAt"      TIMESTAMP(3),
    "rejectedBy"      TEXT,
    "rejectedAt"      TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "leaves_pkey" PRIMARY KEY ("id")
);

-- secondHalfLeaveType column is added by migration 20260505000004.
CREATE TABLE IF NOT EXISTS "attendances" (
    "id"            TEXT         NOT NULL,
    "employeeId"    TEXT         NOT NULL,
    "date"          TIMESTAMP(3) NOT NULL,
    "isPresent"     BOOLEAN      NOT NULL DEFAULT true,
    "isLeave"       BOOLEAN      NOT NULL DEFAULT false,
    "leaveType"     "LeaveType",
    "isHalfDay"     BOOLEAN      NOT NULL DEFAULT false,
    "halfDayPeriod" TEXT,
    "isAbsence"     BOOLEAN      NOT NULL DEFAULT false,
    "remarks"       TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- compensation column added/removed by 20260505000001/0002.
-- rejectedBy/At/Reason added by 20260506000001.
CREATE TABLE IF NOT EXISTS "payrolls" (
    "id"                  TEXT             NOT NULL,
    "employeeId"          TEXT             NOT NULL,
    "month"               INTEGER          NOT NULL,
    "year"                INTEGER          NOT NULL,
    "workingDays"         INTEGER          NOT NULL,
    "presentDays"         INTEGER          NOT NULL,
    "leaveDays"           INTEGER          NOT NULL,
    "absenceDays"         INTEGER          NOT NULL,
    "baseSalary"          DOUBLE PRECISION NOT NULL,
    "travellingAllowance" DOUBLE PRECISION NOT NULL,
    "otherAllowances"     DOUBLE PRECISION NOT NULL,
    "travellingDeduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeductions"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grossSalary"         DOUBLE PRECISION NOT NULL,
    "netSalary"           DOUBLE PRECISION NOT NULL,
    "status"              "PayrollStatus"  NOT NULL DEFAULT 'DRAFT',
    "approvedBy"          TEXT,
    "approvedAt"          TIMESTAMP(3),
    "remarks"             TEXT,
    "createdAt"           TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payrolls_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "payslips" (
    "id"           TEXT         NOT NULL,
    "payrollId"    TEXT         NOT NULL,
    "employeeId"   TEXT         NOT NULL,
    "pdfPath"      TEXT,
    "generatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "downloadedAt" TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payslips_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public_holidays" (
    "id"          TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "date"        TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "public_holidays_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "system_config" (
    "id"          TEXT         NOT NULL,
    "key"         TEXT         NOT NULL,
    "value"       TEXT         NOT NULL,
    "description" TEXT,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "action"    TEXT         NOT NULL,
    "entity"    TEXT         NOT NULL,
    "entityId"  TEXT         NOT NULL,
    "changes"   TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- ─── Unique indexes ───────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key"
    ON "users"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "employees_employeeId_key"
    ON "employees"("employeeId");

CREATE UNIQUE INDEX IF NOT EXISTS "employees_userId_key"
    ON "employees"("userId");

CREATE UNIQUE INDEX IF NOT EXISTS "employees_email_key"
    ON "employees"("email");

CREATE UNIQUE INDEX IF NOT EXISTS "attendances_employeeId_date_key"
    ON "attendances"("employeeId", "date");

CREATE UNIQUE INDEX IF NOT EXISTS "payrolls_employeeId_month_year_key"
    ON "payrolls"("employeeId", "month", "year");

CREATE UNIQUE INDEX IF NOT EXISTS "payslips_payrollId_key"
    ON "payslips"("payrollId");

CREATE UNIQUE INDEX IF NOT EXISTS "public_holidays_date_key"
    ON "public_holidays"("date");

CREATE UNIQUE INDEX IF NOT EXISTS "system_config_key_key"
    ON "system_config"("key");

-- ─── Foreign keys ─────────────────────────────────────────────────────────────

DO $$ BEGIN
    ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "leaves" ADD CONSTRAINT "leaves_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "attendances" ADD CONSTRAINT "attendances_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payrollId_fkey"
        FOREIGN KEY ("payrollId") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "payslips" ADD CONSTRAINT "payslips_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
