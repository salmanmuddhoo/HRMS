import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { getPayrollCycleDateRange } from '../utils/date';

export const getAllPayrolls = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, month, year, status } = req.query;

    const where: any = {};

    if (req.user!.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findUnique({
        where: { userId: req.user!.userId },
      });
      if (employee) {
        where.employeeId = employee.id;
      }
    } else if (employeeId) {
      where.employeeId = employeeId;
    }

    if (month) {
      where.month = parseInt(month as string);
    }

    if (year) {
      where.year = parseInt(year as string);
    }

    if (status) {
      where.status = status;
    }

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: true,
            jobTitle: true,
          },
        },
        payslip: {
          select: {
            id: true,
            generatedAt: true,
            downloadedAt: true,
          },
        },
        adjustments: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return sendSuccess(res, payrolls);
  } catch (error: any) {
    console.error('Get payrolls error:', error);
    return sendError(res, 'Failed to fetch payrolls', 500);
  }
};

export const getPayrollById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            department: true,
            jobTitle: true,
          },
        },
        adjustments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!payroll) {
      return sendError(res, 'Payroll not found', 404);
    }

    // Check if employee can access this payroll
    if (req.user!.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findUnique({
        where: { userId: req.user!.userId },
      });
      if (employee && payroll.employeeId !== employee.id) {
        return sendError(res, 'Unauthorized to view this payroll', 403);
      }
    }

    return sendSuccess(res, payroll);
  } catch (error: any) {
    console.error('Get payroll error:', error);
    return sendError(res, 'Failed to fetch payroll', 500);
  }
};

export const processMonthlyPayroll = async (req: AuthRequest, res: Response) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return sendError(res, 'Month and year are required', 400);
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Check if payroll already exists for this month
    const existingPayroll = await prisma.payroll.findFirst({
      where: {
        month: monthNum,
        year: yearNum,
      },
    });

    if (existingPayroll) {
      return sendError(
        res,
        `Payroll for ${monthNum}/${yearNum} already exists`,
        400
      );
    }

    // Get all active employees
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
    });

    if (employees.length === 0) {
      return sendError(res, 'No active employees found', 400);
    }

    // Get working days configuration
    const workingDaysConfig = await prisma.systemConfig.findUnique({
      where: { key: 'WORKING_DAYS_PER_MONTH' },
    });

    const workingDays = workingDaysConfig
      ? parseInt(workingDaysConfig.value)
      : 22;

    // Determine attendance date range based on payroll cycle
    const cycleStartDayConfig = await prisma.systemConfig.findUnique({
      where: { key: 'PAYROLL_CYCLE_START_DAY' },
    });
    const cycleStartDay = cycleStartDayConfig ? parseInt(cycleStartDayConfig.value) : 1;
    const { startDate: cycleStart, endDate: cycleEnd } = getPayrollCycleDateRange(monthNum, yearNum, cycleStartDay);

    const payrollRecords = [];

    for (const employee of employees) {
      // Get attendance for the month
      const attendance = await prisma.attendance.findMany({
        where: {
          employeeId: employee.id,
          date: {
            gte: cycleStart,
            lte: cycleEnd,
          },
        },
      });

      const presentDays = attendance.filter((a) => a.isPresent).length;
      const leaveDays = attendance.filter((a) => a.isLeave).length;
      const absenceDays = attendance.filter((a) => a.isAbsence).length;

      // Calculate travelling allowance deduction (per day of absence)
      const dailyTravellingAllowance = Number(employee.travellingAllowance) / workingDays;
      const travellingDeduction = dailyTravellingAllowance * absenceDays;

      // Calculate gross and net salary
      const grossSalary =
        Number(employee.baseSalary) +
        Number(employee.travellingAllowance) +
        Number(employee.otherAllowances);
      const totalDeductions = travellingDeduction;
      const netSalary = grossSalary - totalDeductions;

      payrollRecords.push({
        employeeId: employee.id,
        month: monthNum,
        year: yearNum,
        workingDays,
        presentDays,
        leaveDays,
        absenceDays,
        baseSalary: employee.baseSalary,
        travellingAllowance: employee.travellingAllowance,
        otherAllowances: employee.otherAllowances,
        travellingDeduction,
        totalDeductions,
        grossSalary,
        netSalary,
        status: 'DRAFT' as const,
      });
    }

    // Create payroll records
    const createdPayrolls = await prisma.payroll.createMany({
      data: payrollRecords,
    });

    // Fetch created payrolls with employee details
    const payrolls = await prisma.payroll.findMany({
      where: {
        month: monthNum,
        year: yearNum,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'PROCESS_PAYROLL',
        entity: 'PAYROLL',
        entityId: `${monthNum}-${yearNum}`,
        changes: JSON.stringify({
          month: monthNum,
          year: yearNum,
          employeeCount: payrolls.length,
        }),
      },
    });

    return sendSuccess(
      res,
      payrolls,
      `Payroll processed for ${payrolls.length} employees`,
      201
    );
  } catch (error: any) {
    console.error('Process payroll error:', error);
    return sendError(res, 'Failed to process payroll', 500);
  }
};

export const approvePayroll = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const payroll = await prisma.payroll.findUnique({
      where: { id },
    });

    if (!payroll) {
      return sendError(res, 'Payroll not found', 404);
    }

    if (payroll.status === 'LOCKED') {
      return sendError(res, 'Payroll is already locked', 400);
    }

    const updatedPayroll = await prisma.payroll.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: req.user!.userId,
        approvedAt: new Date(),
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'APPROVE_PAYROLL',
        entity: 'PAYROLL',
        entityId: id,
        changes: JSON.stringify({ payroll: updatedPayroll }),
      },
    });

    return sendSuccess(res, updatedPayroll, 'Payroll approved successfully');
  } catch (error: any) {
    console.error('Approve payroll error:', error);
    return sendError(res, 'Failed to approve payroll', 500);
  }
};

export const lockPayroll = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const payroll = await prisma.payroll.findUnique({
      where: { id },
    });

    if (!payroll) {
      return sendError(res, 'Payroll not found', 404);
    }

    if (payroll.status !== 'APPROVED') {
      return sendError(res, 'Can only lock approved payroll', 400);
    }

    const updatedPayroll = await prisma.payroll.update({
      where: { id },
      data: {
        status: 'LOCKED',
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'LOCK_PAYROLL',
        entity: 'PAYROLL',
        entityId: id,
        changes: JSON.stringify({ payroll: updatedPayroll }),
      },
    });

    return sendSuccess(res, updatedPayroll, 'Payroll locked successfully');
  } catch (error: any) {
    console.error('Lock payroll error:', error);
    return sendError(res, 'Failed to lock payroll', 500);
  }
};

export const updatePayroll = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { baseSalary, travellingAllowance, otherAllowances, remarks, adjustments } = req.body;

    const payroll = await prisma.payroll.findUnique({ where: { id } });

    if (!payroll) {
      return sendError(res, 'Payroll not found', 404);
    }

    if (payroll.status === 'LOCKED') {
      return sendError(res, 'Cannot update locked payroll', 400);
    }

    // Validate and normalise adjustments
    type AdjInput = { label: string; type: 'DEDUCTION' | 'ADDITION'; amount: number };
    const adjList: AdjInput[] = Array.isArray(adjustments)
      ? adjustments
          .filter((a: any) => a.label && (a.type === 'DEDUCTION' || a.type === 'ADDITION') && !isNaN(parseFloat(a.amount)) && parseFloat(a.amount) > 0)
          .map((a: any) => ({ label: String(a.label).trim(), type: a.type, amount: parseFloat(a.amount) }))
      : [];

    const newBaseSalary = baseSalary ? parseFloat(baseSalary) : Number(payroll.baseSalary);
    const newTravellingAllowance = travellingAllowance ? parseFloat(travellingAllowance) : Number(payroll.travellingAllowance);
    const newOtherAllowances = otherAllowances ? parseFloat(otherAllowances) : Number(payroll.otherAllowances);

    const travellingDeduction = (newTravellingAllowance / payroll.workingDays) * payroll.absenceDays;
    const grossSalary = newBaseSalary + newTravellingAllowance + newOtherAllowances;

    const adjDeductions = adjList.filter(a => a.type === 'DEDUCTION').reduce((s, a) => s + a.amount, 0);
    const adjAdditions  = adjList.filter(a => a.type === 'ADDITION').reduce((s, a) => s + a.amount, 0);
    const totalDeductions = travellingDeduction + adjDeductions;
    const netSalary = grossSalary + adjAdditions - totalDeductions;

    const updatedPayroll = await prisma.$transaction(async (tx) => {
      // Replace all adjustments atomically
      await tx.payrollAdjustment.deleteMany({ where: { payrollId: id } });
      if (adjList.length > 0) {
        await tx.payrollAdjustment.createMany({
          data: adjList.map(a => ({ payrollId: id, label: a.label, type: a.type, amount: a.amount })),
        });
      }

      return tx.payroll.update({
        where: { id },
        data: {
          baseSalary: newBaseSalary,
          travellingAllowance: newTravellingAllowance,
          otherAllowances: newOtherAllowances,
          travellingDeduction,
          totalDeductions,
          grossSalary,
          netSalary,
          remarks,
        },
        include: {
          employee: { select: { id: true, employeeId: true, firstName: true, lastName: true, department: true } },
          adjustments: { orderBy: { createdAt: 'asc' } },
        },
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE_PAYROLL',
        entity: 'PAYROLL',
        entityId: id,
        changes: JSON.stringify({ before: payroll, after: updatedPayroll }),
      },
    });

    return sendSuccess(res, updatedPayroll, 'Payroll updated successfully');
  } catch (error: any) {
    console.error('Update payroll error:', error);
    return sendError(res, 'Failed to update payroll', 500);
  }
};

export const deletePayroll = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const payroll = await prisma.payroll.findUnique({
      where: { id },
    });

    if (!payroll) {
      return sendError(res, 'Payroll not found', 404);
    }

    if (payroll.status === 'LOCKED') {
      return sendError(res, 'Cannot delete locked payroll', 400);
    }

    await prisma.payroll.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'DELETE_PAYROLL',
        entity: 'PAYROLL',
        entityId: id,
        changes: JSON.stringify({ payroll }),
      },
    });

    return sendSuccess(res, null, 'Payroll deleted successfully');
  } catch (error: any) {
    console.error('Delete payroll error:', error);
    return sendError(res, 'Failed to delete payroll', 500);
  }
};
