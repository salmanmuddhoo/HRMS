-- Allow presentDays and leaveDays to hold half-day values (e.g. 24.5, 0.5)
ALTER TABLE "payrolls" ALTER COLUMN "presentDays" TYPE DECIMAL;
ALTER TABLE "payrolls" ALTER COLUMN "leaveDays" TYPE DECIMAL;
