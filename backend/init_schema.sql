-- ELPMS Database Schema
-- Generated from Prisma schema

-- Create ENUM types
CREATE TYPE "Role" AS ENUM ('ADMIN', 'EMPLOYER', 'EMPLOYEE');
CREATE TYPE "EmploymentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE "LeaveType" AS ENUM ('LOCAL', 'SICK');
CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "PayrollStatus" AS ENUM ('DRAFT', 'APPROVED', 'LOCKED');

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT PRIMARY KEY,
    "email" TEXT UNIQUE NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" DEFAULT 'EMPLOYEE' NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Employees table
CREATE TABLE IF NOT EXISTS "employees" (
    "id" TEXT PRIMARY KEY,
    "employeeId" TEXT UNIQUE NOT NULL,
    "userId" TEXT UNIQUE NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT UNIQUE NOT NULL,
    "phone" TEXT,
    "department" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "status" "EmploymentStatus" DEFAULT 'ACTIVE' NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "travellingAllowance" DOUBLE PRECISION DEFAULT 0 NOT NULL,
    "otherAllowances" DOUBLE PRECISION DEFAULT 0 NOT NULL,
    "localLeaveBalance" INTEGER DEFAULT 0 NOT NULL,
    "sickLeaveBalance" INTEGER DEFAULT 0 NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Leaves table
CREATE TABLE IF NOT EXISTS "leaves" (
    "id" TEXT PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalDays" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "attachment" TEXT,
    "status" "LeaveStatus" DEFAULT 'PENDING' NOT NULL,
    "isUrgent" BOOLEAN DEFAULT false NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE
);

-- Attendance table
CREATE TABLE IF NOT EXISTS "attendances" (
    "id" TEXT PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "isPresent" BOOLEAN DEFAULT true NOT NULL,
    "isLeave" BOOLEAN DEFAULT false NOT NULL,
    "leaveType" "LeaveType",
    "isAbsence" BOOLEAN DEFAULT false NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    UNIQUE ("employeeId", "date"),
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE
);

-- Payroll table
CREATE TABLE IF NOT EXISTS "payrolls" (
    "id" TEXT PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "workingDays" INTEGER NOT NULL,
    "presentDays" INTEGER NOT NULL,
    "leaveDays" INTEGER NOT NULL,
    "absenceDays" INTEGER NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "travellingAllowance" DOUBLE PRECISION NOT NULL,
    "otherAllowances" DOUBLE PRECISION NOT NULL,
    "travellingDeduction" DOUBLE PRECISION DEFAULT 0 NOT NULL,
    "totalDeductions" DOUBLE PRECISION DEFAULT 0 NOT NULL,
    "grossSalary" DOUBLE PRECISION NOT NULL,
    "netSalary" DOUBLE PRECISION NOT NULL,
    "status" "PayrollStatus" DEFAULT 'DRAFT' NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    UNIQUE ("employeeId", "month", "year"),
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE
);

-- Payslips table
CREATE TABLE IF NOT EXISTS "payslips" (
    "id" TEXT PRIMARY KEY,
    "payrollId" TEXT UNIQUE NOT NULL,
    "employeeId" TEXT NOT NULL,
    "pdfPath" TEXT,
    "generatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "downloadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    FOREIGN KEY ("payrollId") REFERENCES "payrolls"("id") ON DELETE CASCADE,
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE
);

-- Public Holidays table
CREATE TABLE IF NOT EXISTS "public_holidays" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) UNIQUE NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- System Config table
CREATE TABLE IF NOT EXISTS "system_config" (
    "id" TEXT PRIMARY KEY,
    "key" TEXT UNIQUE NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "employees_userId_idx" ON "employees"("userId");
CREATE INDEX IF NOT EXISTS "employees_status_idx" ON "employees"("status");
CREATE INDEX IF NOT EXISTS "leaves_employeeId_idx" ON "leaves"("employeeId");
CREATE INDEX IF NOT EXISTS "leaves_status_idx" ON "leaves"("status");
CREATE INDEX IF NOT EXISTS "attendances_employeeId_idx" ON "attendances"("employeeId");
CREATE INDEX IF NOT EXISTS "attendances_date_idx" ON "attendances"("date");
CREATE INDEX IF NOT EXISTS "payrolls_employeeId_idx" ON "payrolls"("employeeId");
CREATE INDEX IF NOT EXISTS "payslips_employeeId_idx" ON "payslips"("employeeId");
CREATE INDEX IF NOT EXISTS "public_holidays_date_idx" ON "public_holidays"("date");
CREATE INDEX IF NOT EXISTS "audit_logs_userId_idx" ON "audit_logs"("userId");
CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs"("entity");
