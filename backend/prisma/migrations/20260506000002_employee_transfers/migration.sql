-- Employee-level transfer elections
CREATE TABLE "employee_transfers" (
    "id"          TEXT NOT NULL,
    "employeeId"  TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "label"       TEXT NOT NULL,
    "amount"      DECIMAL(65,30) NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_transfers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employee_transfers_employeeId_accountType_key"
    ON "employee_transfers"("employeeId", "accountType");

ALTER TABLE "employee_transfers"
    ADD CONSTRAINT "employee_transfers_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Payroll-period snapshot of transfers
CREATE TABLE "payroll_transfers" (
    "id"          TEXT NOT NULL,
    "payrollId"   TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "label"       TEXT NOT NULL,
    "amount"      DECIMAL(65,30) NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payroll_transfers_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "payroll_transfers"
    ADD CONSTRAINT "payroll_transfers_payrollId_fkey"
    FOREIGN KEY ("payrollId") REFERENCES "payrolls"("id") ON DELETE CASCADE ON UPDATE CASCADE;
