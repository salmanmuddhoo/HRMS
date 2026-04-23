import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { hashPassword } from '../utils/bcrypt';
import { sendSuccess, sendError } from '../utils/response';

export const getAllEmployees = async (req: AuthRequest, res: Response) => {
  try {
    const { status, department, search } = req.query;

    const where: any = {};

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
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
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
        user: {
          select: {
            email: true,
            role: true,
          },
        },
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

export const createEmployee = async (req: AuthRequest, res: Response) => {
  try {
    const {
      employeeId,
      firstName,
      lastName,
      email,
      phone,
      department,
      jobTitle,
      joiningDate,
      baseSalary,
      travellingAllowance,
      otherAllowances,
      localLeaveBalance,
      sickLeaveBalance,
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
      },
    });

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        employeeId,
        userId: user.id,
        firstName,
        lastName,
        email,
        phone,
        department,
        jobTitle,
        joiningDate: new Date(joiningDate),
        baseSalary: parseFloat(baseSalary),
        travellingAllowance: parseFloat(travellingAllowance || 0),
        otherAllowances: parseFloat(otherAllowances || 0),
        localLeaveBalance: parseFloat(localLeaveBalance || 0),
        sickLeaveBalance: parseFloat(sickLeaveBalance || 0),
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
      firstName, lastName, phone, department, jobTitle, joiningDate,
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
