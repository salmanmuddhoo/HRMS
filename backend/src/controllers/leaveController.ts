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

    // Float literal embedded (no binding) to avoid PgBouncer float8 corruption.
    // UUID bound as $1 (text param — safe with PgBouncer).
    if (totalDays !== Math.floor(totalDays)) {
      await prisma.$executeRawUnsafe(
        `UPDATE leaves SET "totalDays" = ${Number(totalDays)}::float8 WHERE id = $1`,
        leave.id
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

    // Update leave status and attendance — ORM only inside transaction (no raw SQL)
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

    // Balance deduction OUTSIDE transaction — $executeRawUnsafe inside prisma.$transaction
    // does not reliably execute via PgBouncer (different connection context).
    //
    // Use stored totalDays as the source of truth — it was patched via raw SQL after create
    // so it holds the correct value (0.5 for half-days, N for multi-day).
    // Only fall back to date/isHalfDay recomputation if totalDays is somehow zero.
    const storedDays = Number(leave.totalDays);
    const deductDays = storedDays > 0
      ? storedDays
      : leave.isHalfDay ? 0.5 : calculateDaysBetween(leave.startDate, leave.endDate);

    console.log('[approveLeave] leave.id:', leave.id);
    console.log('[approveLeave] leave.leaveType:', leave.leaveType, '| typeof:', typeof leave.leaveType);
    console.log('[approveLeave] leave.isHalfDay:', leave.isHalfDay, '| typeof:', typeof leave.isHalfDay);
    console.log('[approveLeave] leave.totalDays (DB stored):', leave.totalDays, '| Number(leave.totalDays):', storedDays);
    console.log('[approveLeave] leave.startDate:', leave.startDate, '| leave.endDate:', leave.endDate);
    console.log('[approveLeave] deductDays (final):', deductDays, '| String(deductDays):', String(deductDays));
    console.log('[approveLeave] leave.employeeId:', leave.employeeId);

    if (leave.leaveType === 'LOCAL') {
      console.log('[approveLeave] Running LOCAL deduction SQL...');
      const rowsAffected = await prisma.$executeRawUnsafe(
        `UPDATE employees SET "localLeaveBalance" = "localLeaveBalance" - ${Number(deductDays)}::float8 WHERE id = $1`,
        leave.employeeId
      );
      console.log('[approveLeave] LOCAL deduction rows affected:', rowsAffected);
      if (rowsAffected === 0) {
        throw new Error(`Leave approved but localLeaveBalance not updated — employeeId ${leave.employeeId} matched 0 rows`);
      }
    } else if (leave.leaveType === 'SICK') {
      console.log('[approveLeave] Running SICK deduction SQL...');
      const rowsAffected = await prisma.$executeRawUnsafe(
        `UPDATE employees SET "sickLeaveBalance" = "sickLeaveBalance" - ${Number(deductDays)}::float8 WHERE id = $1`,
        leave.employeeId
      );
      console.log('[approveLeave] SICK deduction rows affected:', rowsAffected);
      if (rowsAffected === 0) {
        throw new Error(`Leave approved but sickLeaveBalance not updated — employeeId ${leave.employeeId} matched 0 rows`);
      }
    } else {
      console.log('[approveLeave] WARNING: leaveType did not match LOCAL or SICK — no deduction made. leaveType was:', JSON.stringify(leave.leaveType));
    }

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

    // Create urgent leave (auto-approved) — ORM only inside transaction (no raw SQL)
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

    // Float literal embedded to avoid PgBouncer float8 corruption; UUID bound as $1 (safe).
    if (totalDays !== Math.floor(totalDays)) {
      await prisma.$executeRawUnsafe(
        `UPDATE leaves SET "totalDays" = ${Number(totalDays)}::float8 WHERE id = $1`,
        leave.id
      );
    }

    // Deduct leave balance OUTSIDE transaction — float embedded, UUID bound as $1
    if (leaveType === 'LOCAL') {
      const rows = await prisma.$executeRawUnsafe(
        `UPDATE employees SET "localLeaveBalance" = "localLeaveBalance" - ${Number(totalDays)}::float8 WHERE id = $1`,
        employeeId
      );
      if (rows === 0) throw new Error(`Urgent leave created but localLeaveBalance not updated — employeeId ${employeeId} matched 0 rows`);
    } else if (leaveType === 'SICK') {
      const rows = await prisma.$executeRawUnsafe(
        `UPDATE employees SET "sickLeaveBalance" = "sickLeaveBalance" - ${Number(totalDays)}::float8 WHERE id = $1`,
        employeeId
      );
      if (rows === 0) throw new Error(`Urgent leave created but sickLeaveBalance not updated — employeeId ${employeeId} matched 0 rows`);
    }

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

    // If leave was approved, restore leave balance and delete attendance records
    if (leave.status === 'APPROVED') {
      // Use stored totalDays as source of truth (patched correctly after create).
      // Fall back to recomputation only if totalDays is zero.
      const storedDays = Number(leave.totalDays);
      const restoreDays = storedDays > 0
        ? storedDays
        : leave.isHalfDay ? 0.5 : calculateDaysBetween(leave.startDate, leave.endDate);

      // Balance restore — float embedded, UUID bound as $1
      if (leave.leaveType === 'LOCAL') {
        const rows = await prisma.$executeRawUnsafe(
          `UPDATE employees SET "localLeaveBalance" = "localLeaveBalance" + ${Number(restoreDays)}::float8 WHERE id = $1`,
          leave.employeeId
        );
        if (rows === 0) throw new Error(`Cancel: localLeaveBalance not restored — employeeId ${leave.employeeId} matched 0 rows`);
      } else if (leave.leaveType === 'SICK') {
        const rows = await prisma.$executeRawUnsafe(
          `UPDATE employees SET "sickLeaveBalance" = "sickLeaveBalance" + ${Number(restoreDays)}::float8 WHERE id = $1`,
          leave.employeeId
        );
        if (rows === 0) throw new Error(`Cancel: sickLeaveBalance not restored — employeeId ${leave.employeeId} matched 0 rows`);
      }

      // Delete attendance records (ORM only)
      await prisma.attendance.deleteMany({
        where: {
          employeeId: leave.employeeId,
          date: {
            gte: leave.startDate,
            lte: leave.endDate,
          },
          isLeave: true,
        },
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
