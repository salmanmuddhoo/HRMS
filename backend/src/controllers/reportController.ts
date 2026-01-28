import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { getMonthDateRange } from '../utils/date';

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
    const totalDays = leaves.reduce((sum, l) => sum + l.totalDays, 0);

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
      acc[dept].totalDays += leave.totalDays;
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

    const { startDate, endDate } = getMonthDateRange(
      parseInt(month as string),
      parseInt(year as string)
    );

    const where: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (employeeId) {
      where.employeeId = employeeId;
    } else if (department) {
      where.employee = {
        department,
      };
    }

    const attendance = await prisma.attendance.findMany({
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
      },
      orderBy: [{ employee: { employeeId: 'asc' } }, { date: 'asc' }],
    });

    // Group by employee
    const employeeAttendance = attendance.reduce((acc: any, record) => {
      const empId = record.employee.id;
      if (!acc[empId]) {
        acc[empId] = {
          employee: record.employee,
          totalDays: 0,
          presentDays: 0,
          leaveDays: 0,
          absenceDays: 0,
          localLeaveDays: 0,
          sickLeaveDays: 0,
          records: [],
        };
      }
      acc[empId].totalDays++;
      if (record.isPresent) acc[empId].presentDays++;
      if (record.isLeave) {
        acc[empId].leaveDays++;
        if (record.leaveType === 'LOCAL') acc[empId].localLeaveDays++;
        if (record.leaveType === 'SICK') acc[empId].sickLeaveDays++;
      }
      if (record.isAbsence) acc[empId].absenceDays++;
      acc[empId].records.push(record);
      return acc;
    }, {});

    return sendSuccess(res, {
      month: parseInt(month as string),
      year: parseInt(year as string),
      employeeAttendance: Object.values(employeeAttendance),
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
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    // Calculate statistics
    const totalEmployees = payrolls.length;
    const totalBaseSalary = payrolls.reduce((sum, p) => sum + p.baseSalary, 0);
    const totalAllowances = payrolls.reduce(
      (sum, p) => sum + p.travellingAllowance + p.otherAllowances,
      0
    );
    const totalDeductions = payrolls.reduce(
      (sum, p) => sum + p.totalDeductions,
      0
    );
    const totalGrossSalary = payrolls.reduce((sum, p) => sum + p.grossSalary, 0);
    const totalNetSalary = payrolls.reduce((sum, p) => sum + p.netSalary, 0);

    const payrollsByDepartment = payrolls.reduce((acc: any, payroll) => {
      const dept = payroll.employee.department;
      if (!acc[dept]) {
        acc[dept] = {
          count: 0,
          totalNetSalary: 0,
          totalDeductions: 0,
        };
      }
      acc[dept].count++;
      acc[dept].totalNetSalary += payroll.netSalary;
      acc[dept].totalDeductions += payroll.totalDeductions;
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
      (sum, p) => sum + p.netSalary,
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
