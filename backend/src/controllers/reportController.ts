import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { getMonthDateRange, countPayrollWorkingDays } from '../utils/date';

export const getLeaveBalancesReport = async (req: AuthRequest, res: Response) => {
  try {
    const { department } = req.query;

    const where: any = { status: 'ACTIVE', NOT: { user: { role: 'ADMIN' } } };
    if (department) where.department = department as string;

    const employees = await prisma.employee.findMany({
      where,
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        department: true,
        jobTitle: true,
        localLeaveBalance: true,
        sickLeaveBalance: true,
        sickLeaveBank: true,
      },
      orderBy: [{ department: 'asc' }, { firstName: 'asc' }],
    });

    const totalLocalLeave   = employees.reduce((s, e) => s + Number(e.localLeaveBalance), 0);
    const totalSickLeave    = employees.reduce((s, e) => s + Number(e.sickLeaveBalance),  0);
    const totalSickLeaveBank = employees.reduce((s, e) => s + Number(e.sickLeaveBank),    0);

    return sendSuccess(res, {
      employees,
      statistics: {
        totalEmployees: employees.length,
        totalLocalLeaveBalance: totalLocalLeave,
        totalSickLeaveBalance: totalSickLeave,
        totalSickLeaveBank,
      },
      asOf: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Get leave balances report error:', error);
    return sendError(res, 'Failed to generate leave balances report', 500);
  }
};

export const getLeaveReport = async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, department, leaveType, status } = req.query;

    const where: any = {};

    if (startDate && endDate) {
      where.startDate = { gte: new Date(startDate as string) };
      where.endDate = { lte: new Date(endDate as string) };
    }

    if (department) {
      where.employee = {
        department,
      };
    }

    if (leaveType) {
      where.leaveType = leaveType;
    }

    if (status) {
      where.status = status;
    }

    const leaves = await prisma.leave.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeId: true,
            firstName: true,
            lastName: true,
            department: true,
            jobTitle: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    // Calculate statistics
    const totalLeaves = leaves.length;
    const approvedLeaves = leaves.filter((l) => l.status === 'APPROVED').length;
    const pendingLeaves = leaves.filter((l) => l.status === 'PENDING').length;
    const rejectedLeaves = leaves.filter((l) => l.status === 'REJECTED').length;
    const totalDays = leaves.reduce((sum, l) => sum + Number(l.totalDays), 0);

    const leavesByType = {
      LOCAL: leaves.filter((l) => l.leaveType === 'LOCAL').length,
      SICK: leaves.filter((l) => l.leaveType === 'SICK').length,
    };

    const leavesByDepartment = leaves.reduce((acc: any, leave) => {
      const dept = leave.employee.department;
      if (!acc[dept]) {
        acc[dept] = { count: 0, totalDays: 0 };
      }
      acc[dept].count++;
      acc[dept].totalDays += Number(leave.totalDays);
      return acc;
    }, {});

    return sendSuccess(res, {
      leaves,
      statistics: {
        totalLeaves,
        approvedLeaves,
        pendingLeaves,
        rejectedLeaves,
        totalDays,
        leavesByType,
        leavesByDepartment,
      },
    });
  } catch (error: any) {
    console.error('Get leave report error:', error);
    return sendError(res, 'Failed to generate leave report', 500);
  }
};

export const getAttendanceReport = async (req: AuthRequest, res: Response) => {
  try {
    const { month, year, department, employeeId } = req.query;

    if (!month || !year) {
      return sendError(res, 'Month and year are required', 400);
    }

    const monthNum = parseInt(month as string);
    const yearNum  = parseInt(year as string);
    const { startDate, endDate } = getMonthDateRange(monthNum, yearNum);

    // "As at date": cap at today so present days reflect what has actually elapsed
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const effectiveEnd = endDate <= todayEnd ? endDate : todayEnd;

    // Public holidays within the effective range (Mon–Sat working day calendar)
    const holidayRecords = await prisma.publicHoliday.findMany({
      where: { date: { gte: startDate, lte: effectiveEnd } },
      select: { date: true },
    });
    const holidayDates = holidayRecords.map(h => new Date(h.date));
    const workingDaysToDate = countPayrollWorkingDays(startDate, effectiveEnd, holidayDates);

    // Fetch all active employees matching the filter
    const empWhere: any = { status: 'ACTIVE' };
    if (employeeId) {
      empWhere.id = employeeId as string;
    } else if (department) {
      empWhere.department = department as string;
    }

    const employees = await prisma.employee.findMany({
      where: empWhere,
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        department: true,
        jobTitle: true,
      },
      orderBy: [{ department: 'asc' }, { employeeId: 'asc' }],
    });

    // Fetch attendance records for the effective range
    const allAttendance = await prisma.attendance.findMany({
      where: {
        employeeId: { in: employees.map(e => e.id) },
        date: { gte: startDate, lte: effectiveEnd },
      },
      orderBy: [{ employeeId: 'asc' }, { date: 'asc' }],
    });

    // Index records by employeeId
    const attByEmp: Record<string, typeof allAttendance> = {};
    for (const r of allAttendance) {
      if (!attByEmp[r.employeeId]) attByEmp[r.employeeId] = [];
      attByEmp[r.employeeId].push(r);
    }

    // Build summary for every employee (including those with no attendance records)
    const employeeAttendance = employees.map(emp => {
      const records = attByEmp[emp.id] || [];

      // Half-day-aware leave counting (mirrors payroll logic)
      const leaveDays = records.reduce((sum, a) => {
        if (!a.isLeave) return sum;
        if (a.isHalfDay && !a.secondHalfLeaveType) return sum + 0.5;
        return sum + 1;
      }, 0);

      const absenceDays = records.filter(a => a.isAbsence).length;

      const localLeaveDays = records.reduce((sum, a) => {
        if (!a.isLeave || a.leaveType !== 'LOCAL') return sum;
        if (a.isHalfDay && !a.secondHalfLeaveType) return sum + 0.5;
        return sum + 1;
      }, 0);

      const sickLeaveDays = records.reduce((sum, a) => {
        if (!a.isLeave || a.leaveType !== 'SICK') return sum;
        if (a.isHalfDay && !a.secondHalfLeaveType) return sum + 0.5;
        return sum + 1;
      }, 0);

      // Present = working days elapsed minus leave and absence
      const presentDays = Math.max(0, workingDaysToDate - leaveDays - absenceDays);

      return {
        employee: emp,
        totalDays: workingDaysToDate,
        presentDays,
        leaveDays,
        absenceDays,
        localLeaveDays,
        sickLeaveDays,
        records,
      };
    });

    return sendSuccess(res, {
      month: monthNum,
      year: yearNum,
      employeeAttendance,
    });
  } catch (error: any) {
    console.error('Get attendance report error:', error);
    return sendError(res, 'Failed to generate attendance report', 500);
  }
};

export const getPayrollReport = async (req: AuthRequest, res: Response) => {
  try {
    const { month, year, department, status } = req.query;

    const where: any = {};

    if (month) {
      where.month = parseInt(month as string);
    }

    if (year) {
      where.year = parseInt(year as string);
    }

    if (department) {
      where.employee = {
        department,
      };
    }

    if (status) {
      where.status = status;
    }

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        employee: {
          select: {
            employeeId: true,
            firstName: true,
            lastName: true,
            department: true,
            jobTitle: true,
          },
        },
        adjustments: { select: { label: true, type: true, amount: true } },
        transfers: { select: { accountType: true, label: true, amount: true } },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // Calculate statistics
    const totalEmployees = payrolls.length;
    const totalBaseSalary = payrolls.reduce((sum, p) => sum + Number(p.baseSalary), 0);
    const totalAllowances = payrolls.reduce(
      (sum, p) => sum + Number(p.travellingAllowance) + Number(p.otherAllowances),
      0
    );
    const totalDeductions = payrolls.reduce(
      (sum, p) => sum + Number(p.totalDeductions),
      0
    );
    const totalGrossSalary = payrolls.reduce((sum, p) => sum + Number(p.grossSalary), 0);
    const totalNetSalary = payrolls.reduce((sum, p) => sum + Number(p.netSalary), 0);

    // Employee CSG and NSF (deducted from employee salary, remitted by employer)
    const totalEmployeeCSG = payrolls.reduce((sum, p) => {
      const csg = p.adjustments.find(a => a.label === 'CSG');
      return sum + (csg ? Number(csg.amount) : 0);
    }, 0);
    const totalEmployeeNSF = payrolls.reduce((sum, p) => {
      const nsf = p.adjustments.find(a => a.label === 'NSF');
      return sum + (nsf ? Number(nsf.amount) : 0);
    }, 0);

    // Employer CSG, NSF, and Training Levy (additional employer contributions, not deducted from employee)
    const totalEmployerCSG = payrolls.reduce((sum, p) => {
      const base = Number(p.baseSalary);
      return sum + (base <= 50000 ? base * 0.03 : base * 0.06);
    }, 0);
    const totalEmployerNSF = payrolls.reduce((sum, p) => {
      return sum + Math.min(Number(p.baseSalary), 28570) * 0.025;
    }, 0);
    const totalTrainingLevy = payrolls.reduce((sum, p) => {
      return sum + Number(p.baseSalary) * 0.015;
    }, 0);

    // Transfer totals by account type
    const transfersByAccount: Record<string, { label: string; total: number }> = {};
    for (const p of payrolls) {
      for (const t of p.transfers) {
        if (!transfersByAccount[t.accountType]) {
          transfersByAccount[t.accountType] = { label: t.label, total: 0 };
        }
        transfersByAccount[t.accountType].total += Number(t.amount);
      }
    }

    const payrollsByDepartment = payrolls.reduce((acc: any, payroll) => {
      const dept = payroll.employee.department;
      if (!acc[dept]) {
        acc[dept] = { count: 0, totalNetSalary: 0, totalDeductions: 0 };
      }
      acc[dept].count++;
      acc[dept].totalNetSalary += Number(payroll.netSalary);
      acc[dept].totalDeductions += Number(payroll.totalDeductions);
      return acc;
    }, {});

    return sendSuccess(res, {
      payrolls,
      statistics: {
        totalEmployees,
        totalBaseSalary,
        totalAllowances,
        totalDeductions,
        totalGrossSalary,
        totalNetSalary,
        totalEmployeeCSG,
        totalEmployeeNSF,
        totalEmployerCSG,
        totalEmployerNSF,
        totalTrainingLevy,
        transfersByAccount,
        payrollsByDepartment,
      },
    });
  } catch (error: any) {
    console.error('Get payroll report error:', error);
    return sendError(res, 'Failed to generate payroll report', 500);
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    // Total active employees
    const totalEmployees = await prisma.employee.count({
      where: { status: 'ACTIVE' },
    });

    // Employees on leave today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const onLeaveToday = await prisma.leave.count({
      where: {
        status: 'APPROVED',
        startDate: { lte: today },
        endDate: { gte: today },
      },
    });

    // Pending leave approvals
    const pendingLeaves = await prisma.leave.count({
      where: { status: 'PENDING' },
    });

    // Current month payroll summary
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();

    const currentPayroll = await prisma.payroll.findMany({
      where: {
        month: currentMonth,
        year: currentYear,
      },
    });

    const totalPayroll = currentPayroll.reduce(
      (sum, p) => sum + Number(p.netSalary),
      0
    );

    // Department breakdown
    const departments = await prisma.employee.groupBy({
      by: ['department'],
      where: { status: 'ACTIVE' },
      _count: true,
    });

    // Recent leaves
    const recentLeaves = await prisma.leave.findMany({
      where: { status: 'PENDING' },
      include: {
        employee: {
          select: {
            employeeId: true,
            firstName: true,
            lastName: true,
            department: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    // Upcoming holidays
    const upcomingHolidays = await prisma.publicHoliday.findMany({
      where: {
        date: { gte: today },
      },
      orderBy: {
        date: 'asc',
      },
      take: 3,
    });

    return sendSuccess(res, {
      totalEmployees,
      onLeaveToday,
      pendingLeaves,
      currentMonthPayroll: {
        month: currentMonth,
        year: currentYear,
        totalAmount: totalPayroll,
        employeeCount: currentPayroll.length,
      },
      departments,
      recentLeaves,
      upcomingHolidays,
    });
  } catch (error: any) {
    console.error('Get dashboard stats error:', error);
    return sendError(res, 'Failed to fetch dashboard statistics', 500);
  }
};
