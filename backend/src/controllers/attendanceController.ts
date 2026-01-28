import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { getMonthDateRange } from '../utils/date';

export const getAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, startDate, endDate, month, year } = req.query;

    const where: any = {};

    if (employeeId) {
      where.employeeId = employeeId;
    } else if (req.user!.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findUnique({
        where: { userId: req.user!.userId },
      });
      if (employee) {
        where.employeeId = employee.id;
      }
    }

    if (month && year) {
      const { startDate: monthStart, endDate: monthEnd } = getMonthDateRange(
        parseInt(month as string),
        parseInt(year as string)
      );
      where.date = {
        gte: monthStart,
        lte: monthEnd,
      };
    } else if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
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
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return sendSuccess(res, attendance);
  } catch (error: any) {
    console.error('Get attendance error:', error);
    return sendError(res, 'Failed to fetch attendance', 500);
  }
};

export const getMonthlyAttendanceSummary = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;

    if (!month || !year) {
      return sendError(res, 'Month and year are required', 400);
    }

    const { startDate, endDate } = getMonthDateRange(
      parseInt(month as string),
      parseInt(year as string)
    );

    const attendance = await prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const summary = {
      totalDays: attendance.length,
      presentDays: attendance.filter((a) => a.isPresent).length,
      leaveDays: attendance.filter((a) => a.isLeave).length,
      localLeaveDays: attendance.filter(
        (a) => a.isLeave && a.leaveType === 'LOCAL'
      ).length,
      sickLeaveDays: attendance.filter(
        (a) => a.isLeave && a.leaveType === 'SICK'
      ).length,
      absenceDays: attendance.filter((a) => a.isAbsence).length,
      records: attendance,
    };

    return sendSuccess(res, summary);
  } catch (error: any) {
    console.error('Get attendance summary error:', error);
    return sendError(res, 'Failed to fetch attendance summary', 500);
  }
};

export const markAbsence = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, date, remarks } = req.body;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return sendError(res, 'Employee not found', 404);
    }

    const attendanceDate = new Date(date);

    // Check if attendance already exists
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        employeeId_date: {
          employeeId,
          date: attendanceDate,
        },
      },
    });

    if (existingAttendance && existingAttendance.isLeave) {
      return sendError(res, 'Employee is on approved leave for this date', 400);
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: attendanceDate,
        },
      },
      update: {
        isPresent: false,
        isAbsence: true,
        isLeave: false,
        remarks,
      },
      create: {
        employeeId,
        date: attendanceDate,
        isPresent: false,
        isAbsence: true,
        isLeave: false,
        remarks,
      },
    });

    return sendSuccess(res, attendance, 'Absence marked successfully');
  } catch (error: any) {
    console.error('Mark absence error:', error);
    return sendError(res, 'Failed to mark absence', 500);
  }
};

export const updateAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isPresent, isAbsence, remarks } = req.body;

    const attendance = await prisma.attendance.findUnique({
      where: { id },
    });

    if (!attendance) {
      return sendError(res, 'Attendance record not found', 404);
    }

    if (attendance.isLeave) {
      return sendError(
        res,
        'Cannot modify attendance for approved leave',
        400
      );
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id },
      data: {
        isPresent,
        isAbsence,
        remarks,
      },
    });

    return sendSuccess(res, updatedAttendance, 'Attendance updated successfully');
  } catch (error: any) {
    console.error('Update attendance error:', error);
    return sendError(res, 'Failed to update attendance', 500);
  }
};
