import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { getPayrollCycleDateRange } from '../utils/date';
import { formatDate } from '../utils/date';

export const getAllConfig = async (req: AuthRequest, res: Response) => {
  try {
    const configs = await prisma.systemConfig.findMany();

    // Convert to key-value object for easier frontend use
    const configMap: Record<string, string> = {};
    configs.forEach(config => {
      configMap[config.key] = config.value;
    });

    return sendSuccess(res, configMap);
  } catch (error: any) {
    console.error('Get config error:', error);
    return sendError(res, 'Failed to fetch configuration', 500);
  }
};

export const getConfigByKey = async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;

    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!config) {
      return sendError(res, 'Configuration not found', 404);
    }

    return sendSuccess(res, config);
  } catch (error: any) {
    console.error('Get config error:', error);
    return sendError(res, 'Failed to fetch configuration', 500);
  }
};

export const updateConfig = async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entity: 'SYSTEM_CONFIG',
        entityId: config.id,
        changes: JSON.stringify({ key, value }),
      },
    });

    return sendSuccess(res, config, 'Configuration updated successfully');
  } catch (error: any) {
    console.error('Update config error:', error);
    return sendError(res, 'Failed to update configuration', 500);
  }
};

export const updateMultipleConfig = async (req: AuthRequest, res: Response) => {
  try {
    const configs = req.body; // Array of { key, value, description }

    const results = await Promise.all(
      configs.map((config: { key: string; value: string; description?: string }) =>
        prisma.systemConfig.upsert({
          where: { key: config.key },
          update: { value: config.value, description: config.description },
          create: { key: config.key, value: config.value, description: config.description },
        })
      )
    );

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entity: 'SYSTEM_CONFIG',
        entityId: 'BATCH',
        changes: JSON.stringify(configs),
      },
    });

    return sendSuccess(res, results, 'Configuration updated successfully');
  } catch (error: any) {
    console.error('Update config error:', error);
    return sendError(res, 'Failed to update configuration', 500);
  }
};

// Helper function to calculate prorated leave
export const calculateProratedLeave = (annualLeave: number, joiningDate: Date): number => {
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const yearEnd = new Date(today.getFullYear(), 11, 31);

  // If joining date is before this year, give full leave
  if (joiningDate < yearStart) {
    return annualLeave;
  }

  // If joining date is after this year, return 0
  if (joiningDate > yearEnd) {
    return 0;
  }

  // Calculate remaining months in the year (including joining month)
  const remainingMonths = 12 - joiningDate.getMonth();
  const proratedLeave = Math.ceil((annualLeave / 12) * remainingMonths);

  return proratedLeave;
};

export const getPayrollCycle = async (req: AuthRequest, res: Response) => {
  try {
    const { month, year } = req.query;
    const monthNum = month ? parseInt(month as string) : new Date().getMonth() + 1;
    const yearNum = year ? parseInt(year as string) : new Date().getFullYear();

    const startDayConfig = await prisma.systemConfig.findUnique({
      where: { key: 'PAYROLL_CYCLE_START_DAY' },
    });
    const startDay = startDayConfig ? parseInt(startDayConfig.value) : 1;

    const { startDate, endDate } = getPayrollCycleDateRange(monthNum, yearNum, startDay);

    return sendSuccess(res, {
      startDay,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
      month: monthNum,
      year: yearNum,
    });
  } catch (error: any) {
    console.error('Get payroll cycle error:', error);
    return sendError(res, 'Failed to fetch payroll cycle', 500);
  }
};

// Returns when the financial year started/starts and whether a reset is due.
export const getLeaveYearStatus = async (req: AuthRequest, res: Response) => {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: { key: { in: ['FINANCIAL_YEAR_START_MONTH', 'FINANCIAL_YEAR_START_DAY', 'LAST_LEAVE_YEAR_RESET'] } },
    });
    const map: Record<string, string> = {};
    configs.forEach(c => { map[c.key] = c.value; });

    const month = parseInt(map['FINANCIAL_YEAR_START_MONTH'] || '1'); // 1-based
    const day   = parseInt(map['FINANCIAL_YEAR_START_DAY']   || '1');
    const lastReset = map['LAST_LEAVE_YEAR_RESET'] || '';

    const now = new Date();
    // Most recent FY start that is <= today
    let fyStart = new Date(now.getFullYear(), month - 1, day);
    if (fyStart > now) fyStart = new Date(now.getFullYear() - 1, month - 1, day);

    const resetDue = !lastReset || new Date(lastReset) < fyStart;

    return sendSuccess(res, {
      fyStartMonth: month,
      fyStartDay: day,
      lastReset: lastReset || null,
      currentFyStart: fyStart.toISOString().split('T')[0],
      resetDue,
    });
  } catch (error: any) {
    console.error('Get leave year status error:', error);
    return sendError(res, 'Failed to fetch leave year status', 500);
  }
};

// Resets leave balances for all active non-admin employees at the start of a new financial year.
// Annual leave: carries forward unused balance (new = entitlement + leftover).
// Sick leave: unused balance moves to sick leave bank; new balance = entitlement.
export const resetLeaveYear = async (req: AuthRequest, res: Response) => {
  try {
    const [localLeaveConfig, sickLeaveConfig] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'DEFAULT_LOCAL_LEAVE' } }),
      prisma.systemConfig.findUnique({ where: { key: 'DEFAULT_SICK_LEAVE' } }),
    ]);

    const defaultLocal = localLeaveConfig ? parseFloat(localLeaveConfig.value) : 15;
    const defaultSick  = sickLeaveConfig  ? parseFloat(sickLeaveConfig.value)  : 10;

    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE', NOT: { user: { role: 'ADMIN' } } },
      select: { id: true, localLeaveBalance: true, sickLeaveBalance: true, sickLeaveBank: true },
    });

    const updates = await prisma.$transaction(
      employees.map(emp => {
        const carryForward    = Number(emp.localLeaveBalance);
        const unusedSick      = Number(emp.sickLeaveBalance);
        const existingBank    = Number(emp.sickLeaveBank);

        return prisma.employee.update({
          where: { id: emp.id },
          data: {
            localLeaveBalance: defaultLocal + carryForward,
            sickLeaveBalance:  defaultSick,
            sickLeaveBank:     existingBank + unusedSick,
          },
        });
      })
    );

    // Record when the reset was performed
    await prisma.systemConfig.upsert({
      where: { key: 'LAST_LEAVE_YEAR_RESET' },
      update: { value: new Date().toISOString().split('T')[0] },
      create: { key: 'LAST_LEAVE_YEAR_RESET', value: new Date().toISOString().split('T')[0], description: 'ISO date of last leave year reset' },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'RESET',
        entity: 'LEAVE_YEAR',
        entityId: 'ALL',
        changes: JSON.stringify({ employeesUpdated: updates.length, defaultLocal, defaultSick }),
      },
    });

    return sendSuccess(res, { employeesUpdated: updates.length }, 'Leave year reset successfully');
  } catch (error: any) {
    console.error('Reset leave year error:', error);
    return sendError(res, 'Failed to reset leave year', 500);
  }
};

export const getLeaveDefaults = async (req: AuthRequest, res: Response) => {
  try {
    const localLeave = await prisma.systemConfig.findUnique({
      where: { key: 'DEFAULT_LOCAL_LEAVE' },
    });
    const sickLeave = await prisma.systemConfig.findUnique({
      where: { key: 'DEFAULT_SICK_LEAVE' },
    });

    return sendSuccess(res, {
      defaultLocalLeave: localLeave ? parseInt(localLeave.value) : 15,
      defaultSickLeave: sickLeave ? parseInt(sickLeave.value) : 10,
    });
  } catch (error: any) {
    console.error('Get leave defaults error:', error);
    return sendError(res, 'Failed to fetch leave defaults', 500);
  }
};
