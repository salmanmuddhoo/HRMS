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

// Helper function to calculate prorated leave
const calculateProratedLeave = (annualLeave: number, joiningDate: Date): number => {
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const yearEnd = new Date(today.getFullYear(), 11, 31);

  // If joining date is before this year, give full leave
  if (joiningDate < yearStart) {
    return annualLeave;
  }

  // If joining date is after this year, return 0
  if (joiningDate > yearEnd) {
    return 0;
  }

  // Calculate remaining months in the year (including joining month)
  const remainingMonths = 12 - joiningDate.getMonth();
  const proratedLeave = Math.ceil((annualLeave / 12) * remainingMonths);

  return proratedLeave;
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

    // Get default leave values from system config
    const defaultLocalLeaveConfig = await prisma.systemConfig.findUnique({
      where: { key: 'DEFAULT_LOCAL_LEAVE' },
    });
    const defaultSickLeaveConfig = await prisma.systemConfig.findUnique({
      where: { key: 'DEFAULT_SICK_LEAVE' },
    });

    const defaultLocalLeave = defaultLocalLeaveConfig ? parseInt(defaultLocalLeaveConfig.value) : 15;
    const defaultSickLeave = defaultSickLeaveConfig ? parseInt(defaultSickLeaveConfig.value) : 10;

    // Calculate leave balances
    const joinDate = new Date(joiningDate);
    let finalLocalLeave: number;
    let finalSickLeave: number;

    if (localLeaveBalance !== undefined && localLeaveBalance !== null && localLeaveBalance !== '') {
      // Use manually specified value
      finalLocalLeave = parseInt(localLeaveBalance);
    } else if (useProration !== false) {
      // Prorate based on joining date
      finalLocalLeave = calculateProratedLeave(defaultLocalLeave, joinDate);
    } else {
      finalLocalLeave = defaultLocalLeave;
    }

    if (sickLeaveBalance !== undefined && sickLeaveBalance !== null && sickLeaveBalance !== '') {
      // Use manually specified value
      finalSickLeave = parseInt(sickLeaveBalance);
    } else if (useProration !== false) {
      // Prorate based on joining date
      finalSickLeave = calculateProratedLeave(defaultSickLeave, joinDate);
    } else {
      finalSickLeave = defaultSickLeave;
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
        joiningDate: joinDate,
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

export const resetEmployeePassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    // Find the employee and their user account
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!employee || !employee.user) {
      return sendError(res, 'Employee or user account not found', 404);
    }

    // Hash the new password
    const hashedPassword = await hashPassword(newPassword);

    // Update the user's password
    await prisma.user.update({
      where: { id: employee.user.id },
      data: { password: hashedPassword },
    });

    // Log the password reset in audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'PASSWORD_RESET',
        entity: 'USER',
        entityId: employee.user.id,
        changes: JSON.stringify({
          message: `Password reset for employee ${employee.firstName} ${employee.lastName} (${employee.employeeId})`
        }),
      },
    });

    return sendSuccess(res, null, 'Password reset successfully');
  } catch (error: any) {
    console.error('Reset password error:', error);
    return sendError(res, 'Failed to reset password', 500);
  }
};
