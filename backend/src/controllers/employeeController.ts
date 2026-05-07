import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { hashPassword } from '../utils/bcrypt';
import { sendSuccess, sendError } from '../utils/response';

export const getAllEmployees = async (req: AuthRequest, res: Response) => {
  try {
    const { status, department, search } = req.query;

    const where: any = {};

    // Non-admins cannot see admin accounts
    if (req.user!.role !== 'ADMIN') {
      where.NOT = { user: { role: 'ADMIN' } };
    }

    if (status) {
      where.status = status;
    }

    if (department) {
      where.department = department;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { employeeId: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        user: { select: { email: true, role: true } },
        compensations: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendSuccess(res, employees);
  } catch (error: any) {
    console.error('Get employees error:', error);
    return sendError(res, 'Failed to fetch employees', 500);
  }
};

export const getEmployeeById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: { select: { email: true, role: true } },
        compensations: { orderBy: { createdAt: 'asc' } },
        transfers: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!employee) {
      return sendError(res, 'Employee not found', 404);
    }

    return sendSuccess(res, employee);
  } catch (error: any) {
    console.error('Get employee error:', error);
    return sendError(res, 'Failed to fetch employee', 500);
  }
};

function proratedLeave(annualDays: number, joiningDate: Date): number {
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const yearEnd = new Date(today.getFullYear(), 11, 31);
  if (joiningDate <= yearStart) return annualDays;
  if (joiningDate > yearEnd) return 0;
  const remainingMonths = 12 - joiningDate.getMonth();
  return Math.ceil((annualDays / 12) * remainingMonths);
}

export const createEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const {
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      nationalId,
      department,
      jobTitle,
      joiningDate,
      baseSalary,
      travellingAllowance,
      otherAllowances,
      localLeaveBalance,
      sickLeaveBalance,
      useProration,
      password,
      role,
    } = req.body;

    // Check if employee ID already exists
    const existingEmployee = await prisma.employee.findUnique({
      where: { employeeId },
    });

    if (existingEmployee) {
      return sendError(res, 'Employee ID already exists', 400);
    }

    // Check if email already exists
    const existingEmail = await prisma.employee.findUnique({
      where: { email },
    });

    if (existingEmail) {
      return sendError(res, 'Email already exists', 400);
    }

    // Create user account
    const hashedPassword = await hashPassword(password || 'Employee@123');

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || 'EMPLOYEE',
        emailNotifications: !['ADMIN', 'DIRECTOR'].includes(role || 'EMPLOYEE'),
      },
    });

    // Determine leave balances — prorate from defaults when not set manually
    const joiningDateObj = new Date(joiningDate);
    let finalLocalLeave: number;
    let finalSickLeave: number;

    if (localLeaveBalance !== null && localLeaveBalance !== undefined && localLeaveBalance !== '') {
      finalLocalLeave = parseFloat(localLeaveBalance);
      finalSickLeave = parseFloat(sickLeaveBalance || 0);
    } else {
      const [localCfg, sickCfg] = await Promise.all([
        prisma.systemConfig.findUnique({ where: { key: 'DEFAULT_LOCAL_LEAVE' } }),
        prisma.systemConfig.findUnique({ where: { key: 'DEFAULT_SICK_LEAVE' } }),
      ]);
      const defaultLocal = localCfg ? parseFloat(localCfg.value) : 15;
      const defaultSick = sickCfg ? parseFloat(sickCfg.value) : 10;
      if (useProration !== false) {
        finalLocalLeave = proratedLeave(defaultLocal, joiningDateObj);
        finalSickLeave = proratedLeave(defaultSick, joiningDateObj);
      } else {
        finalLocalLeave = defaultLocal;
        finalSickLeave = defaultSick;
      }
    }

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        employeeId,
        userId: user.id,
        firstName,
        lastName,
        email,
        phone,
        nationalId: nationalId || '',
        department,
        jobTitle,
        joiningDate: joiningDateObj,
        baseSalary: parseFloat(baseSalary),
        travellingAllowance: parseFloat(travellingAllowance || 0),
        otherAllowances: parseFloat(otherAllowances || 0),
        localLeaveBalance: finalLocalLeave,
        sickLeaveBalance: finalSickLeave,
        status: 'ACTIVE',
      },
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entity: 'EMPLOYEE',
        entityId: employee.id,
        changes: JSON.stringify({ employee }),
      },
    });

    return sendSuccess(res, employee, 'Employee created successfully', 201);
  } catch (error: any) {
    console.error('Create employee error:', error);
    return sendError(res, 'Failed to create employee', 500);
  }
};

export const updateEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      firstName, lastName, phone, nationalId, department, jobTitle, joiningDate,
      baseSalary, travellingAllowance, otherAllowances,
      localLeaveBalance, sickLeaveBalance, status, role,
    } = req.body;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: { select: { id: true, role: true } } },
    });
    if (!employee) return sendError(res, 'Employee not found', 404);

    const data: any = {};
    if (firstName) data.firstName = firstName;
    if (lastName) data.lastName = lastName;
    if (phone !== undefined) data.phone = phone;
    if (nationalId !== undefined) data.nationalId = nationalId;
    if (department) data.department = department;
    if (jobTitle) data.jobTitle = jobTitle;
    if (joiningDate) data.joiningDate = new Date(joiningDate);
    if (status) data.status = status;
    const parseDecimal = (v: any) => (v !== undefined && v !== null && v !== '') ? parseFloat(v) : undefined;
    const bs = parseDecimal(baseSalary); if (bs !== undefined && !isNaN(bs)) data.baseSalary = bs;
    const ta = parseDecimal(travellingAllowance); if (ta !== undefined && !isNaN(ta)) data.travellingAllowance = ta;
    const oa = parseDecimal(otherAllowances); if (oa !== undefined && !isNaN(oa)) data.otherAllowances = oa;
    const llb = parseDecimal(localLeaveBalance); if (llb !== undefined && !isNaN(llb)) data.localLeaveBalance = llb;
    const slb = parseDecimal(sickLeaveBalance); if (slb !== undefined && !isNaN(slb)) data.sickLeaveBalance = slb;

    if (Object.keys(data).length > 0) {
      await prisma.employee.update({ where: { id }, data });
    }

    const updated = await prisma.employee.findUnique({
      where: { id },
      include: { user: { select: { email: true, role: true } } },
    });

    if (role && employee.user && role !== employee.user.role) {
      if (req.user!.role !== 'ADMIN') {
        return sendError(res, 'Only admins can change a user\'s role', 403);
      }
      await prisma.user.update({ where: { id: employee.user.id }, data: { role } });
    }

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId, action: 'UPDATE', entity: 'EMPLOYEE', entityId: id,
        changes: JSON.stringify({ employeeId: employee.employeeId }),
      },
    }).catch(() => {});

    return sendSuccess(res, updated, 'Employee updated successfully');
  } catch (error: any) {
    console.error('Update employee error:', error.message || error);
    return sendError(res, error.message || 'Failed to update employee', 500);
  }
};

export const deactivateEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return sendError(res, 'Employee not found', 404);
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        status: 'INACTIVE',
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'DEACTIVATE',
        entity: 'EMPLOYEE',
        entityId: employee.id,
        changes: JSON.stringify({ employee: updatedEmployee }),
      },
    });

    return sendSuccess(res, updatedEmployee, 'Employee deactivated successfully');
  } catch (error: any) {
    console.error('Deactivate employee error:', error);
    return sendError(res, 'Failed to deactivate employee', 500);
  }
};

export const getEmployeeStats = async (req: AuthRequest, res: Response) => {
  try {
    const totalEmployees = await prisma.employee.count({
      where: { status: 'ACTIVE' },
    });

    const onLeaveToday = await prisma.leave.count({
      where: {
        status: 'APPROVED',
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
    });

    const pendingLeaves = await prisma.leave.count({
      where: { status: 'PENDING' },
    });

    const departments = await prisma.employee.groupBy({
      by: ['department'],
      where: { status: 'ACTIVE' },
      _count: true,
    });

    return sendSuccess(res, {
      totalEmployees,
      onLeaveToday,
      pendingLeaves,
      departments,
    });
  } catch (error: any) {
    console.error('Get employee stats error:', error);
    return sendError(res, 'Failed to fetch employee stats', 500);
  }
};

export const deleteEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (req.user!.role !== 'ADMIN') {
      return sendError(res, 'Only admins can permanently delete employees', 403);
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee) {
      return sendError(res, 'Employee not found', 404);
    }

    // Cascade delete: deleting the user deletes the employee (onDelete: Cascade)
    await prisma.user.delete({ where: { id: employee.userId } });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'DELETE',
        entity: 'EMPLOYEE',
        entityId: id,
        changes: JSON.stringify({ deletedEmployee: `${employee.firstName} ${employee.lastName}` }),
      },
    });

    return sendSuccess(res, null, 'Employee permanently deleted');
  } catch (error: any) {
    console.error('Delete employee error:', error);
    return sendError(res, 'Failed to delete employee', 500);
  }
};

export const resetEmployeePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!employee || !employee.user) {
      return sendError(res, 'Employee not found', 404);
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: employee.user.id },
      data: { password: hashedPassword },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'PASSWORD_RESET',
        entity: 'USER',
        entityId: employee.user.id,
        changes: JSON.stringify({ employee: `${employee.firstName} ${employee.lastName}` }),
      },
    });

    return sendSuccess(res, null, 'Password reset successfully');
  } catch (error: any) {
    console.error('Reset password error:', error);
    return sendError(res, 'Failed to reset password', 500);
  }
};

export const bulkSetCompensation = async (req: AuthRequest, res: Response) => {
  try {
    const { label, amount } = req.body;
    if (!label || typeof label !== 'string' || !label.trim()) {
      return sendError(res, 'Compensation label is required', 400);
    }
    const compensationAmount = parseFloat(amount);
    if (isNaN(compensationAmount) || compensationAmount < 0) {
      return sendError(res, 'Valid compensation amount is required', 400);
    }

    const activeEmployees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true },
    });

    await Promise.all(
      activeEmployees.map((emp) =>
        prisma.employeeCompensation.upsert({
          where: { employeeId_label: { employeeId: emp.id, label: label.trim() } },
          update: { amount: compensationAmount },
          create: { employeeId: emp.id, label: label.trim(), amount: compensationAmount },
        })
      )
    );

    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'BULK_SET_COMPENSATION',
        entity: 'EMPLOYEE',
        entityId: 'ALL',
        changes: JSON.stringify({ label: label.trim(), amount: compensationAmount, affectedCount: activeEmployees.length }),
      },
    });

    return sendSuccess(res, { affectedCount: activeEmployees.length }, `"${label.trim()}" set to Rs ${compensationAmount} for ${activeEmployees.length} active employees`);
  } catch (error: any) {
    console.error('Bulk set compensation error:', error);
    return sendError(res, 'Failed to set compensation', 500);
  }
};

export const upsertEmployeeCompensation = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { label, amount } = req.body;
    if (!label?.trim()) return sendError(res, 'Label is required', 400);
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) return sendError(res, 'Valid amount is required', 400);

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return sendError(res, 'Employee not found', 404);

    const entry = await prisma.employeeCompensation.upsert({
      where: { employeeId_label: { employeeId: id, label: label.trim() } },
      update: { amount: amt },
      create: { employeeId: id, label: label.trim(), amount: amt },
    });

    return sendSuccess(res, entry, 'Compensation saved');
  } catch (error: any) {
    console.error('Upsert compensation error:', error);
    return sendError(res, 'Failed to save compensation', 500);
  }
};

export const deleteEmployeeCompensation = async (req: AuthRequest, res: Response) => {
  try {
    const { id, compensationId } = req.params;
    const entry = await prisma.employeeCompensation.findFirst({ where: { id: compensationId, employeeId: id } });
    if (!entry) return sendError(res, 'Compensation entry not found', 404);
    await prisma.employeeCompensation.delete({ where: { id: compensationId } });
    return sendSuccess(res, null, 'Compensation entry deleted');
  } catch (error: any) {
    console.error('Delete compensation error:', error);
    return sendError(res, 'Failed to delete compensation', 500);
  }
};

// ── Transfers ───────────────────────────────────────────────────────────────

const TRANSFER_LABELS: Record<string, string> = {
  SHARES: 'Shares A/C',
  MSA: 'MSA',
  HSA: 'HSA',
  SHARIAH: 'Shariah Compliant Financing',
};

export const getEmployeeTransfers = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return sendError(res, 'Employee not found', 404);
    const transfers = await prisma.employeeTransfer.findMany({
      where: { employeeId: id },
      orderBy: { createdAt: 'asc' },
    });
    return sendSuccess(res, transfers);
  } catch (error: any) {
    return sendError(res, 'Failed to fetch transfers', 500);
  }
};

export const upsertEmployeeTransfer = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { accountType, amount } = req.body;

    if (!accountType || !TRANSFER_LABELS[accountType]) {
      return sendError(res, `accountType must be one of: ${Object.keys(TRANSFER_LABELS).join(', ')}`, 400);
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) return sendError(res, 'Valid amount is required', 400);

    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) return sendError(res, 'Employee not found', 404);

    const entry = await prisma.employeeTransfer.upsert({
      where: { employeeId_accountType: { employeeId: id, accountType } },
      update: { amount: amt, label: TRANSFER_LABELS[accountType] },
      create: { employeeId: id, accountType, label: TRANSFER_LABELS[accountType], amount: amt },
    });

    return sendSuccess(res, entry, 'Transfer saved');
  } catch (error: any) {
    console.error('Upsert transfer error:', error);
    return sendError(res, 'Failed to save transfer', 500);
  }
};

export const deleteEmployeeTransfer = async (req: AuthRequest, res: Response) => {
  try {
    const { id, transferId } = req.params;
    const entry = await prisma.employeeTransfer.findFirst({ where: { id: transferId, employeeId: id } });
    if (!entry) return sendError(res, 'Transfer entry not found', 404);
    await prisma.employeeTransfer.delete({ where: { id: transferId } });
    return sendSuccess(res, null, 'Transfer deleted');
  } catch (error: any) {
    return sendError(res, 'Failed to delete transfer', 500);
  }
};
