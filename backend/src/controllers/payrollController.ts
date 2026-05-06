import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { getPayrollCycleDateRange } from '../utils/date';
import emailService from '../services/emailService';

// ── Statutory contribution calculators ─────────────────────────
const calcCSG = (baseSalary: number): number =>
  baseSalary <= 50000 ? baseSalary * 0.015 : baseSalary * 0.03;

const calcNSF = (baseSalary: number): number =>
  baseSalary >= 21435 ? 21435 * 0.01 : baseSalary * 0.01;

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
          select: { id: true, generatedAt: true, downloadedAt: true },
        },
        adjustments: { orderBy: { createdAt: 'asc' } },
        compensations: { orderBy: { createdAt: 'asc' } },
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
        compensations: { orderBy: { createdAt: 'asc' } },
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

    // Get all active employees with their compensation history
    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: { compensations: { orderBy: { createdAt: 'asc' } } },
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
    // Track CSG/NSF per employeeId for adjustment creation after payrolls are saved
    const empStatutory = new Map<string, { csg: number; nsf: number }>();

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

      // Statutory contributions (CSG & NSF)
      const baseSal = Number(employee.baseSalary);
      const csg = calcCSG(baseSal);
      const nsf = calcNSF(baseSal);
      empStatutory.set(employee.id, { csg, nsf });

      // Sum all compensation entries for this employee
      const compensationTotal = employee.compensations.reduce((s, c) => s + Number(c.amount), 0);
      const grossSalary =
        baseSal +
        Number(employee.travellingAllowance) +
        Number(employee.otherAllowances) +
        compensationTotal;
      const totalDeductions = travellingDeduction + csg + nsf;
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
        compensation: compensationTotal,
        travellingDeduction,
        totalDeductions,
        grossSalary,
        netSalary,
        status: 'DRAFT' as const,
      });
    }

    // Create payroll records
    await prisma.payroll.createMany({ data: payrollRecords });

    // Fetch created payrolls to get their IDs, then snapshot compensation entries
    const payrolls = await prisma.payroll.findMany({
      where: { month: monthNum, year: yearNum },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: true,
            compensations: { orderBy: { createdAt: 'asc' } },
          },
        },
      },
    });

    // Create PayrollCompensation snapshots
    const compensationSnapshots = payrolls.flatMap((pr) =>
      pr.employee.compensations.map((c) => ({
        payrollId: pr.id,
        label: c.label,
        amount: Number(c.amount),
      }))
    );
    if (compensationSnapshots.length > 0) {
      await prisma.payrollCompensation.createMany({ data: compensationSnapshots });
    }

    // Create CSG and NSF adjustment records for each payroll
    const statutoryAdjustments = payrolls.flatMap((pr) => {
      const s = empStatutory.get(pr.employeeId);
      if (!s) return [];
      return [
        { payrollId: pr.id, label: 'CSG', type: 'DEDUCTION' as const, amount: s.csg },
        { payrollId: pr.id, label: 'NSF', type: 'DEDUCTION' as const, amount: s.nsf },
      ];
    });
    if (statutoryAdjustments.length > 0) {
      await prisma.payrollAdjustment.createMany({ data: statutoryAdjustments });
    }

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

export const rejectPayroll = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return sendError(res, 'Rejection reason is required', 400);
    }

    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, employeeId: true, firstName: true, lastName: true } },
      },
    });

    if (!payroll) return sendError(res, 'Payroll not found', 404);
    if (payroll.status === 'LOCKED') return sendError(res, 'Cannot reject a locked payroll', 400);

    const rejecter = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { email: true, employee: { select: { firstName: true, lastName: true } } },
    });
    const secretaryName = rejecter?.employee
      ? `${rejecter.employee.firstName} ${rejecter.employee.lastName}`
      : rejecter?.email || 'Secretary';

    const updatedPayroll = await prisma.payroll.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedBy: req.user!.userId,
        rejectedAt: new Date(),
        rejectionReason: rejectionReason.trim(),
        // Clear previous approval if it was re-reviewed
        approvedBy: null,
        approvedAt: null,
      },
      include: {
        employee: { select: { id: true, employeeId: true, firstName: true, lastName: true, department: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'REJECT_PAYROLL',
        entity: 'PAYROLL',
        entityId: id,
        changes: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      },
    });

    // Notify Treasurer(s) and Admin(s) by email
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthName = months[payroll.month - 1];
    const treasurers = await prisma.user.findMany({
      where: { role: { in: ['TREASURER', 'ADMIN'] }, emailNotifications: true },
      select: { email: true },
    });
    const employeeName = `${payroll.employee.firstName} ${payroll.employee.lastName}`;
    emailService.sendPayrollRejectionNotification({
      to: treasurers.map(t => t.email),
      employeeName,
      month: monthName,
      year: payroll.year,
      rejectionReason: rejectionReason.trim(),
      secretaryName,
    }).catch(err => console.error('[PayrollReject] Email error:', err));

    return sendSuccess(res, updatedPayroll, 'Payroll rejected successfully');
  } catch (error: any) {
    console.error('Reject payroll error:', error);
    return sendError(res, 'Failed to reject payroll', 500);
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

    // Validate and normalise user-submitted adjustments (strip CSG/NSF — always auto-computed)
    type AdjInput = { label: string; type: 'DEDUCTION' | 'ADDITION'; amount: number };
    const userAdjList: AdjInput[] = Array.isArray(adjustments)
      ? adjustments
          .filter((a: any) => a.label && a.label !== 'CSG' && a.label !== 'NSF' && (a.type === 'DEDUCTION' || a.type === 'ADDITION') && !isNaN(parseFloat(a.amount)) && parseFloat(a.amount) > 0)
          .map((a: any) => ({ label: String(a.label).trim(), type: a.type, amount: parseFloat(a.amount) }))
      : [];

    const newBaseSalary = baseSalary ? parseFloat(baseSalary) : Number(payroll.baseSalary);
    const newTravellingAllowance = travellingAllowance ? parseFloat(travellingAllowance) : Number(payroll.travellingAllowance);
    const newOtherAllowances = otherAllowances ? parseFloat(otherAllowances) : Number(payroll.otherAllowances);
    // Compensation total is derived from the stored PayrollCompensation snapshot
    const compensationTotal = Number(payroll.compensation);

    // Recalculate statutory contributions from new base salary
    const csg = calcCSG(newBaseSalary);
    const nsf = calcNSF(newBaseSalary);
    const adjList: AdjInput[] = [
      ...userAdjList,
      { label: 'CSG', type: 'DEDUCTION', amount: csg },
      { label: 'NSF', type: 'DEDUCTION', amount: nsf },
    ];

    const travellingDeduction = (newTravellingAllowance / payroll.workingDays) * payroll.absenceDays;
    const grossSalary = newBaseSalary + newTravellingAllowance + newOtherAllowances + compensationTotal;

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
          // Reset REJECTED back to DRAFT so secretary can re-review after corrections
          ...(payroll.status === 'REJECTED' ? {
            status: 'DRAFT',
            rejectionReason: null,
            rejectedBy: null,
            rejectedAt: null,
          } : {}),
        },
        include: {
          employee: { select: { id: true, employeeId: true, firstName: true, lastName: true, department: true } },
          adjustments: { orderBy: { createdAt: 'asc' } },
          compensations: { orderBy: { createdAt: 'asc' } },
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

export const resetMonthlyPayroll = async (req: AuthRequest, res: Response) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return sendError(res, 'Month and year are required', 400);
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    const existing = await prisma.payroll.findFirst({
      where: { month: monthNum, year: yearNum },
    });

    if (!existing) {
      return sendError(res, `No payroll found for ${monthNum}/${yearNum}`, 404);
    }

    // Delete all payrolls for the month (cascade handles adjustments, compensations, payslips)
    const { count } = await prisma.payroll.deleteMany({
      where: { month: monthNum, year: yearNum },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'RESET_PAYROLL',
        entity: 'PAYROLL',
        entityId: `${monthNum}-${yearNum}`,
        changes: JSON.stringify({ month: monthNum, year: yearNum, deletedCount: count }),
      },
    });

    return sendSuccess(res, { month: monthNum, year: yearNum, deletedCount: count }, `Payroll for ${monthNum}/${yearNum} has been reset`);
  } catch (error: any) {
    console.error('Reset payroll error:', error);
    return sendError(res, 'Failed to reset payroll', 500);
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
