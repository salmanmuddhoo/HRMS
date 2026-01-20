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
        localLeaveBalance: parseInt(localLeaveBalance || 0),
        sickLeaveBalance: parseInt(sickLeaveBalance || 0),
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
      firstName,
      lastName,
      phone,
      department,
      jobTitle,
      baseSalary,
      travellingAllowance,
      otherAllowances,
      localLeaveBalance,
      sickLeaveBalance,
      status,
    } = req.body;

    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return sendError(res, 'Employee not found', 404);
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: {
        firstName,
        lastName,
        phone,
        department,
        jobTitle,
        baseSalary: baseSalary ? parseFloat(baseSalary) : undefined,
        travellingAllowance: travellingAllowance
          ? parseFloat(travellingAllowance)
          : undefined,
        otherAllowances: otherAllowances ? parseFloat(otherAllowances) : undefined,
        localLeaveBalance: localLeaveBalance
          ? parseInt(localLeaveBalance)
          : undefined,
        sickLeaveBalance: sickLeaveBalance ? parseInt(sickLeaveBalance) : undefined,
        status,
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
        action: 'UPDATE',
        entity: 'EMPLOYEE',
        entityId: employee.id,
        changes: JSON.stringify({ before: employee, after: updatedEmployee }),
      },
    });

    return sendSuccess(res, updatedEmployee, 'Employee updated successfully');
  } catch (error: any) {
    console.error('Update employee error:', error);
    return sendError(res, 'Failed to update employee', 500);
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
