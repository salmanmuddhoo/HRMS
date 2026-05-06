import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { calculateDaysBetween } from '../utils/date';
import emailService from '../services/emailService';

function getLeaveDays(leave: {
  totalDays: any;
  isHalfDay: boolean;
  startDate: Date;
  endDate: Date;
}): number {
  const stored = parseFloat(String(leave.totalDays));
  if (!isNaN(stored) && stored > 0) return stored;
  return leave.isHalfDay ? 0.5 : calculateDaysBetween(leave.startDate, leave.endDate);
}

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
    if (leaveType === 'LOCAL' && Number(employee.localLeaveBalance) < totalDays) {
      return sendError(
        res,
        `Insufficient local leave balance. Available: ${employee.localLeaveBalance} days`,
        400
      );
    }

    if (leaveType === 'SICK' && Number(employee.sickLeaveBalance) < totalDays) {
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
      }).catch((err: any) => console.error('[Email] Notification failed:', err?.message || err));
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

    const deductDays = getLeaveDays(leave);

    if (typeof deductDays !== 'number' || isNaN(deductDays) || deductDays <= 0) {
      throw new Error(`Invalid deductDays: ${deductDays}`);
    }
    if (typeof leave.employeeId !== 'string' || !leave.employeeId) {
      throw new Error(`Invalid employeeId: ${leave.employeeId}`);
    }

    const updatedLeave = await prisma.$transaction(async (tx) => {
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

      if (leave.isHalfDay) {
        const existing = await tx.attendance.findUnique({
          where: { employeeId_date: { employeeId: leave.employeeId, date: leave.startDate } },
        });
        if (existing?.isHalfDay && existing.halfDayPeriod !== leave.halfDayPeriod) {
          // Other half already has a leave — just store the second type
          await tx.attendance.update({
            where: { employeeId_date: { employeeId: leave.employeeId, date: leave.startDate } },
            data: { secondHalfLeaveType: leave.leaveType },
          });
        } else {
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
              secondHalfLeaveType: null,
              isAbsence: false,
            },
            update: {
              isLeave: true,
              leaveType: leave.leaveType,
              isHalfDay: true,
              halfDayPeriod: leave.halfDayPeriod,
              secondHalfLeaveType: null,
            },
          });
        }
      } else {
        const current = new Date(leave.startDate);
        const attendanceRecords = [];
        let dayCount = 0;
        while (current <= leave.endDate && dayCount < 30) {
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
          dayCount++;
        }
        await tx.attendance.createMany({ data: attendanceRecords, skipDuplicates: true });
      }

      if (leave.leaveType === 'LOCAL') {
        await tx.employee.update({
          where: { id: leave.employeeId },
          data: { localLeaveBalance: { decrement: deductDays } },
        });
      } else if (leave.leaveType === 'SICK') {
        await tx.employee.update({
          where: { id: leave.employeeId },
          data: { sickLeaveBalance: { decrement: deductDays } },
        });
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
      }).catch((err: any) => console.error('[Email] Notification failed:', err?.message || err));
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
        }).catch((err: any) => console.error('[Email] Notification failed:', err?.message || err));
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

    const safeDays = parseFloat(String(totalDays));
    if (isNaN(safeDays) || safeDays <= 0) {
      throw new Error(`Invalid totalDays: ${totalDays}`);
    }
    if (typeof employeeId !== 'string' || !employeeId) {
      throw new Error(`Invalid employeeId: ${employeeId}`);
    }

    // Check leave balance
    if (leaveType === 'LOCAL' && Number(employee.localLeaveBalance) < safeDays) {
      return sendError(res, `Insufficient annual leave balance. Available: ${employee.localLeaveBalance} days`, 400);
    }
    if (leaveType === 'SICK' && Number(employee.sickLeaveBalance) < safeDays) {
      return sendError(res, `Insufficient sick leave balance. Available: ${employee.sickLeaveBalance} days`, 400);
    }

    const leave = await prisma.$transaction(async (tx) => {
      const urgentLeave = await tx.leave.create({
        data: {
          employeeId,
          leaveType,
          startDate: start,
          endDate: end,
          totalDays: safeDays,
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

      if (isHalfDay) {
        const existingAtt = await tx.attendance.findUnique({
          where: { employeeId_date: { employeeId, date: start } },
        });
        const period = halfDayPeriod || 'MORNING';
        if (existingAtt?.isHalfDay && existingAtt.halfDayPeriod !== period) {
          await tx.attendance.update({
            where: { employeeId_date: { employeeId, date: start } },
            data: { secondHalfLeaveType: leaveType },
          });
        } else {
          await tx.attendance.upsert({
            where: { employeeId_date: { employeeId, date: start } },
            create: {
              employeeId,
              date: start,
              isPresent: true,
              isLeave: true,
              leaveType,
              isHalfDay: true,
              halfDayPeriod: period,
              secondHalfLeaveType: null,
              isAbsence: false,
            },
            update: {
              isLeave: true,
              leaveType,
              isHalfDay: true,
              halfDayPeriod: period,
              secondHalfLeaveType: null,
            },
          });
        }
      } else {
        const current = new Date(start);
        const attendanceRecords = [];
        let dayCount = 0;
        while (current <= end && dayCount < 30) {
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
          dayCount++;
        }
        await tx.attendance.createMany({ data: attendanceRecords, skipDuplicates: true });
      }

      if (leaveType === 'LOCAL') {
        await tx.employee.update({
          where: { id: employeeId },
          data: { localLeaveBalance: { decrement: safeDays } },
        });
      } else if (leaveType === 'SICK') {
        await tx.employee.update({
          where: { id: employeeId },
          data: { sickLeaveBalance: { decrement: safeDays } },
        });
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

    await prisma.$transaction(async (tx) => {
      if (leave.status === 'APPROVED') {
        const restoreDays = getLeaveDays(leave);

        if (typeof restoreDays !== 'number' || isNaN(restoreDays) || restoreDays <= 0) {
          throw new Error(`Invalid restoreDays: ${restoreDays}`);
        }
        if (typeof leave.employeeId !== 'string' || !leave.employeeId) {
          throw new Error(`Invalid employeeId: ${leave.employeeId}`);
        }

        if (leave.leaveType === 'LOCAL') {
          await tx.employee.update({
            where: { id: leave.employeeId },
            data: { localLeaveBalance: { increment: restoreDays } },
          });
        } else if (leave.leaveType === 'SICK') {
          await tx.employee.update({
            where: { id: leave.employeeId },
            data: { sickLeaveBalance: { increment: restoreDays } },
          });
        }

        await tx.attendance.deleteMany({
          where: {
            employeeId: leave.employeeId,
            date: { gte: leave.startDate, lte: leave.endDate },
            isLeave: true,
          },
        });
      }

      await tx.leave.delete({ where: { id } });
    });

    return sendSuccess(res, null, 'Leave cancelled successfully');
  } catch (error: any) {
    console.error('Cancel leave error:', error);
    return sendError(res, 'Failed to cancel leave', 500);
  }
};
