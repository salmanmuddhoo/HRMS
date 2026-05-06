-- Support two different leave types on the same day (one per half)
ALTER TABLE "attendances" ADD COLUMN "secondHalfLeaveType" TEXT;
