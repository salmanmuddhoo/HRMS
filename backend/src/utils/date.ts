export const calculateDaysBetween = (startDate: Date, endDate: Date): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Include both start and end dates
};

export const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};

// Working days for payroll: Monday–Saturday; only Sunday is off
export const countPayrollWorkingDays = (
  startDate: Date,
  endDate: Date,
  publicHolidays: Date[] = []
): number => {
  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    // Sunday === 0; every other day (Mon–Sat) is a working day
    if (current.getDay() !== 0) {
      const isHoliday = publicHolidays.some(
        h => h.toDateString() === current.toDateString()
      );
      if (!isHoliday) count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
};

export const getWorkingDays = (
  startDate: Date,
  endDate: Date,
  publicHolidays: Date[] = []
): number => {
  let workingDays = 0;
  const current = new Date(startDate);

  while (current <= endDate) {
    if (!isWeekend(current)) {
      const isHoliday = publicHolidays.some(
        (holiday) =>
          holiday.toDateString() === current.toDateString()
      );
      if (!isHoliday) {
        workingDays++;
      }
    }
    current.setDate(current.getDate() + 1);
  }

  return workingDays;
};

export const getMonthDateRange = (month: number, year: number) => {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  return { startDate, endDate };
};

// When startDay > 1, the cycle runs from startDay of the previous month to (startDay-1) of the current month.
export const getPayrollCycleDateRange = (month: number, year: number, startDay: number) => {
  if (startDay <= 1) {
    return getMonthDateRange(month, year);
  }
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const startDate = new Date(prevYear, prevMonth - 1, startDay);
  const endDate = new Date(year, month - 1, startDay - 1);
  return { startDate, endDate };
};

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};
