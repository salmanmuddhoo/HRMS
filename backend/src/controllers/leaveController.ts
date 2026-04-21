import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { calculateDaysBetween } from '../utils/date';
import emailService from '../services/emailService';

export const getAllLeaves = async (req: AuthRequest, res: Response) => {
  try {
    const { status, employeeId, leaveType, startDate, endDate } = req.query;

    const where: any = {};

    // If employee role, only show their leaves
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

    if (status) {
      where.status = status;
    }

    if (leaveType) {
      where.leaveType = leaveType;
    }

    if (startDate) {
      where.startDate = { gte: new Date(startDate as string) };
    }

    if (endDate) {
      where.endDate = { lte: new Date(endDate as string) };
    }

    const leaves = await prisma.leave.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return sendSuccess(res, leaves);
  } catch (error: any) {
    console.error('Get leaves error:', error);
    return sendError(res, 'Failed to fetch leaves', 500);
  }
};

export const getLeaveById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const leave = await prisma.leave.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: true,
            jobTitle: true,
            email: true,
          },
        },
      },
    });

    if (!leave) {
      return sendError(res, 'Leave not found', 404);
    }

    // Check if employee can access this leave
    if (req.user!.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findUnique({
        where: { userId: req.user!.userId },
      });
      if (employee && leave.employeeId !== employee.id) {
        return sendError(res, 'Unauthorized to view this leave', 403);
      }
    }

    return sendSuccess(res, leave);
  } catch (error: any) {
    console.error('Get leave error:', error);
    return sendError(res, 'Failed to fetch leave', 500);
  }
};

export const applyLeave = async (req: AuthRequest, res: Response) => {
  try {
    const { leaveType, startDate, endDate, reason, attachment, isHalfDay, halfDayPeriod } = req.body;

    // Get employee record
    const employee = await prisma.employee.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!employee) {
      return sendError(res, 'Employee record not found', 404);
    }

    if (employee.status !== 'ACTIVE') {
      return sendError(res, 'Cannot apply leave - account not active', 403);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = isHalfDay ? 0.5 : calculateDaysBetween(start, end);

    // Check leave balance
    if (leaveType === 'LOCAL' && employee.localLeaveBalance < totalDays) {
      return sendError(
        res,
        `Insufficient local leave balance. Available: ${employee.localLeaveBalance} days`,
        400
      );
    }

    if (leaveType === 'SICK' && employee.sickLeaveBalance < totalDays) {
      return sendError(
        res,
        `Insufficient sick leave balance. Available: ${employee.sickLeaveBalance} days`,
        400
      );
    }

    // Check for overlapping leaves
    const overlappingLeave = await prisma.leave.findFirst({
      where: {
        employeeId: employee.id,
        status: { in: ['PENDING', 'APPROVED'] },
        OR: [
          {
            startDate: { lte: end },
            endDate: { gte: start },
          },
        ],
      },
    });

    if (overlappingLeave) {
      return sendError(res, 'You have an overlapping leave request', 400);
    }

    // Create leave application
    const leave = await prisma.leave.create({
      data: {
        employeeId: employee.id,
        leaveType,
        startDate: start,
        endDate: end,
        totalDays,
        reason,
        attachment,
        status: 'PENDING',
        isHalfDay: Boolean(isHalfDay),
        halfDayPeriod: isHalfDay ? (halfDayPeriod || 'MORNING') : null,
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

    // PgBouncer corrupts binary float8 encoding — fix totalDays via raw SQL if fractional
    if (totalDays !== Math.floor(totalDays)) {
      await prisma.$executeRawUnsafe(
        `UPDATE leaves SET "totalDays" = CAST($1 AS float8) WHERE id = '${leave.id}'`,
        String(totalDays)
      );
    }

    // Send email notification to admins/employers who have notifications enabled
    const managers = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'EMPLOYER'] }, emailNotifications: true },
      select: { email: true },
    });
    if (managers.length > 0) {
      emailService.sendLeaveRequestNotification({
        to: managers.map((m) => m.email),
        employeeName: `${employee.firstName} ${employee.lastName}`,
        leaveType,
        startDate: start.toLocaleDateString(),
        endDate: end.toLocaleDateString(),
        totalDays,
        reason,
      }).catch(() => {});
    }

    return sendSuccess(res, leave, 'Leave application submitted successfully', 201);
  } catch (error: any) {
    console.error('Apply leave error:', error);
    return sendError(res, 'Failed to apply leave', 500);
  }
};

export const approveLeave = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const leave = await prisma.leave.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true, employeeId: true, firstName: true, lastName: true,
            department: true, email: true, userId: true,
          },
        },
      },
    });

    if (!leave) {
      return sendError(res, 'Leave not found', 404);
    }

    if (leave.status !== 'PENDING') {
      return sendError(res, 'Leave has already been processed', 400);
    }

    // Update leave status
    const updatedLeave = await prisma.$transaction(async (tx) => {
      // Approve leave
      const approved = await tx.leave.update({
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

      // Calculate deduction from dates — never use stored totalDays (PgBouncer corrupts float8 on write)
      const deductDays = leave.isHalfDay ? 0.5 : calculateDaysBetween(leave.startDate, leave.endDate);
      if (leave.leaveType === 'LOCAL') {
        await tx.$executeRawUnsafe(
          `UPDATE employees SET "localLeaveBalance" = "localLeaveBalance" - CAST($1 AS float8) WHERE id = '${leave.employeeId}'`,
          String(deductDays)
        );
      } else if (leave.leaveType === 'SICK') {
        await tx.$executeRawUnsafe(
          `UPDATE employees SET "sickLeaveBalance" = "sickLeaveBalance" - CAST($1 AS float8) WHERE id = '${leave.employeeId}'`,
          String(deductDays)
        );
      }

      if (leave.isHalfDay) {
        await tx.attendance.upsert({
          where: { employeeId_date: { employeeId: leave.employeeId, date: leave.startDate } },
          create: {
            employeeId: leave.employeeId,
            date: leave.startDate,
            isPresent: true,
            isLeave: true,
            leaveType: leave.leaveType,
            isHalfDay: true,
            halfDayPeriod: leave.halfDayPeriod,
            isAbsence: false,
          },
          update: {
            isLeave: true,
            leaveType: leave.leaveType,
            isHalfDay: true,
            halfDayPeriod: leave.halfDayPeriod,
          },
        });
      } else {
        const current = new Date(leave.startDate);
        const attendanceRecords = [];
        while (current <= leave.endDate) {
          attendanceRecords.push({
            employeeId: leave.employeeId,
            date: new Date(current),
            isPresent: false,
            isLeave: true,
            leaveType: leave.leaveType,
            isHalfDay: false,
            isAbsence: false,
          });
          current.setDate(current.getDate() + 1);
        }
        await tx.attendance.createMany({ data: attendanceRecords, skipDuplicates: true });
      }

      return approved;
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'APPROVE_LEAVE',
        entity: 'LEAVE',
        entityId: id,
        changes: JSON.stringify({ leave: updatedLeave }),
      },
    });

    // Notify employee
    const empUser = await prisma.user.findUnique({ where: { id: leave.employee.userId } });
    if (empUser?.emailNotifications) {
      emailService.sendLeaveStatusNotification({
        to: leave.employee.email,
        employeeName: `${leave.employee.firstName} ${leave.employee.lastName}`,
        leaveType: leave.leaveType,
        startDate: leave.startDate.toLocaleDateString(),
        endDate: leave.endDate.toLocaleDateString(),
        status: 'APPROVED',
      }).catch(() => {});
    }

    return sendSuccess(res, updatedLeave, 'Leave approved successfully');
  } catch (error: any) {
    console.error('Approve leave error:', error);
    return sendError(res, 'Failed to approve leave', 500);
  }
};

export const rejectLeave = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const leave = await prisma.leave.findUnique({
      where: { id },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true, userId: true },
        },
      },
    });

    if (!leave) {
      return sendError(res, 'Leave not found', 404);
    }

    if (leave.status !== 'PENDING') {
      return sendError(res, 'Leave has already been processed', 400);
    }

    const updatedLeave = await prisma.leave.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedBy: req.user!.userId,
        rejectedAt: new Date(),
        rejectionReason,
      },
      include: {
        employee: {
          select: { id: true, employeeId: true, firstName: true, lastName: true, department: true },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'REJECT_LEAVE',
        entity: 'LEAVE',
        entityId: id,
        changes: JSON.stringify({ leave: updatedLeave }),
      },
    });

    // Notify employee
    if (leave.employee) {
      const empUser = await prisma.user.findUnique({ where: { id: leave.employee.userId } });
      if (empUser?.emailNotifications) {
        emailService.sendLeaveStatusNotification({
          to: leave.employee.email,
          employeeName: `${leave.employee.firstName} ${leave.employee.lastName}`,
          leaveType: leave.leaveType,
          startDate: leave.startDate.toLocaleDateString(),
          endDate: leave.endDate.toLocaleDateString(),
          status: 'REJECTED',
          rejectionReason,
        }).catch(() => {});
      }
    }

    return sendSuccess(res, updatedLeave, 'Leave rejected successfully');
  } catch (error: any) {
    console.error('Reject leave error:', error);
    return sendError(res, 'Failed to reject leave', 500);
  }
};

export const addUrgentLeave = async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, leaveType, startDate, endDate, reason, isHalfDay, halfDayPeriod } = req.body;

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return sendError(res, 'Employee not found', 404);
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = isHalfDay ? 0.5 : calculateDaysBetween(start, end);

    // Check leave balance
    if (leaveType === 'LOCAL' && employee.localLeaveBalance < totalDays) {
      return sendError(res, `Insufficient annual leave balance. Available: ${employee.localLeaveBalance} days`, 400);
    }
    if (leaveType === 'SICK' && employee.sickLeaveBalance < totalDays) {
      return sendError(res, `Insufficient sick leave balance. Available: ${employee.sickLeaveBalance} days`, 400);
    }

    // Create urgent leave (auto-approved)
    const leave = await prisma.$transaction(async (tx) => {
      const urgentLeave = await tx.leave.create({
        data: {
          employeeId,
          leaveType,
          startDate: start,
          endDate: end,
          totalDays,
          reason,
          status: 'APPROVED',
          isUrgent: true,
          isHalfDay: Boolean(isHalfDay),
          halfDayPeriod: isHalfDay ? (halfDayPeriod || 'MORNING') : null,
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

      // PgBouncer corrupts binary float8 encoding — fix totalDays via raw SQL if fractional
      if (totalDays !== Math.floor(totalDays)) {
        await tx.$executeRawUnsafe(
          `UPDATE leaves SET "totalDays" = CAST($1 AS float8) WHERE id = '${urgentLeave.id}'`,
          String(totalDays)
        );
      }

      // Deduct leave balance — UUID embedded as literal, float as text param to avoid PgBouncer 22P03
      if (leaveType === 'LOCAL') {
        await tx.$executeRawUnsafe(
          `UPDATE employees SET "localLeaveBalance" = "localLeaveBalance" - CAST($1 AS float8) WHERE id = '${employeeId}'`,
          String(totalDays)
        );
      } else if (leaveType === 'SICK') {
        await tx.$executeRawUnsafe(
          `UPDATE employees SET "sickLeaveBalance" = "sickLeaveBalance" - CAST($1 AS float8) WHERE id = '${employeeId}'`,
          String(totalDays)
        );
      }

      // Create attendance records
      if (isHalfDay) {
        await tx.attendance.upsert({
          where: { employeeId_date: { employeeId, date: start } },
          create: {
            employeeId,
            date: start,
            isPresent: true,
            isLeave: true,
            leaveType,
            isHalfDay: true,
            halfDayPeriod: halfDayPeriod || 'MORNING',
            isAbsence: false,
          },
          update: {
            isLeave: true,
            leaveType,
            isHalfDay: true,
            halfDayPeriod: halfDayPeriod || 'MORNING',
          },
        });
      } else {
        const current = new Date(start);
        const attendanceRecords = [];
        while (current <= end) {
          attendanceRecords.push({
            employeeId,
            date: new Date(current),
            isPresent: false,
            isLeave: true,
            leaveType,
            isHalfDay: false,
            isAbsence: false,
          });
          current.setDate(current.getDate() + 1);
        }
        await tx.attendance.createMany({ data: attendanceRecords, skipDuplicates: true });
      }

      return urgentLeave;
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'ADD_URGENT_LEAVE',
        entity: 'LEAVE',
        entityId: leave.id,
        changes: JSON.stringify({ leave }),
      },
    });

    return sendSuccess(res, leave, 'Urgent leave added successfully', 201);
  } catch (error: any) {
    console.error('Add urgent leave error:', error);
    return sendError(res, 'Failed to add urgent leave', 500);
  }
};

export const cancelLeave = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const leave = await prisma.leave.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!leave) {
      return sendError(res, 'Leave not found', 404);
    }

    // Check if employee owns this leave
    if (req.user!.role === 'EMPLOYEE') {
      const employee = await prisma.employee.findUnique({
        where: { userId: req.user!.userId },
      });
      if (!employee || leave.employeeId !== employee.id) {
        return sendError(res, 'Unauthorized to cancel this leave', 403);
      }
    }

    if (leave.status === 'REJECTED') {
      return sendError(res, 'Cannot cancel rejected leave', 400);
    }

    // If leave was approved, restore leave balance
    if (leave.status === 'APPROVED') {
      await prisma.$transaction(async (tx) => {
        // Calculate restore from dates — never use stored totalDays (PgBouncer corrupts float8 on write)
        const restoreDays = leave.isHalfDay ? 0.5 : calculateDaysBetween(leave.startDate, leave.endDate);
        if (leave.leaveType === 'LOCAL') {
          await tx.$executeRawUnsafe(
            `UPDATE employees SET "localLeaveBalance" = "localLeaveBalance" + CAST($1 AS float8) WHERE id = '${leave.employeeId}'`,
            String(restoreDays)
          );
        } else if (leave.leaveType === 'SICK') {
          await tx.$executeRawUnsafe(
            `UPDATE employees SET "sickLeaveBalance" = "sickLeaveBalance" + CAST($1 AS float8) WHERE id = '${leave.employeeId}'`,
            String(restoreDays)
          );
        }

        // Delete attendance records
        await tx.attendance.deleteMany({
          where: {
            employeeId: leave.employeeId,
            date: {
              gte: leave.startDate,
              lte: leave.endDate,
            },
            isLeave: true,
          },
        });
      });
    }

    // Delete the leave
    await prisma.leave.delete({
      where: { id },
    });

    return sendSuccess(res, null, 'Leave cancelled successfully');
  } catch (error: any) {
    console.error('Cancel leave error:', error);
    return sendError(res, 'Failed to cancel leave', 500);
  }
};
