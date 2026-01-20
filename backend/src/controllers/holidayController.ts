import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';

export const getAllHolidays = async (req: AuthRequest, res: Response) => {
  try {
    const { year, month } = req.query;

    const where: any = {};

    if (year) {
      const yearNum = parseInt(year as string);
      where.date = {
        gte: new Date(yearNum, 0, 1),
        lt: new Date(yearNum + 1, 0, 1),
      };
    }

    if (month && year) {
      const yearNum = parseInt(year as string);
      const monthNum = parseInt(month as string);
      where.date = {
        gte: new Date(yearNum, monthNum - 1, 1),
        lt: new Date(yearNum, monthNum, 1),
      };
    }

    const holidays = await prisma.publicHoliday.findMany({
      where,
      orderBy: {
        date: 'asc',
      },
    });

    return sendSuccess(res, holidays);
  } catch (error: any) {
    console.error('Get holidays error:', error);
    return sendError(res, 'Failed to fetch holidays', 500);
  }
};

export const getHolidayById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const holiday = await prisma.publicHoliday.findUnique({
      where: { id },
    });

    if (!holiday) {
      return sendError(res, 'Holiday not found', 404);
    }

    return sendSuccess(res, holiday);
  } catch (error: any) {
    console.error('Get holiday error:', error);
    return sendError(res, 'Failed to fetch holiday', 500);
  }
};

export const createHoliday = async (req: AuthRequest, res: Response) => {
  try {
    const { name, date, description } = req.body;

    // Check if holiday already exists on this date
    const existingHoliday = await prisma.publicHoliday.findUnique({
      where: { date: new Date(date) },
    });

    if (existingHoliday) {
      return sendError(res, 'A holiday already exists on this date', 400);
    }

    const holiday = await prisma.publicHoliday.create({
      data: {
        name,
        date: new Date(date),
        description,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'CREATE',
        entity: 'PUBLIC_HOLIDAY',
        entityId: holiday.id,
        changes: JSON.stringify({ holiday }),
      },
    });

    return sendSuccess(res, holiday, 'Holiday created successfully', 201);
  } catch (error: any) {
    console.error('Create holiday error:', error);
    return sendError(res, 'Failed to create holiday', 500);
  }
};

export const updateHoliday = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, date, description } = req.body;

    const holiday = await prisma.publicHoliday.findUnique({
      where: { id },
    });

    if (!holiday) {
      return sendError(res, 'Holiday not found', 404);
    }

    // If date is being changed, check for conflicts
    if (date && new Date(date).getTime() !== holiday.date.getTime()) {
      const existingHoliday = await prisma.publicHoliday.findUnique({
        where: { date: new Date(date) },
      });

      if (existingHoliday && existingHoliday.id !== id) {
        return sendError(res, 'A holiday already exists on this date', 400);
      }
    }

    const updatedHoliday = await prisma.publicHoliday.update({
      where: { id },
      data: {
        name,
        date: date ? new Date(date) : undefined,
        description,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entity: 'PUBLIC_HOLIDAY',
        entityId: id,
        changes: JSON.stringify({ before: holiday, after: updatedHoliday }),
      },
    });

    return sendSuccess(res, updatedHoliday, 'Holiday updated successfully');
  } catch (error: any) {
    console.error('Update holiday error:', error);
    return sendError(res, 'Failed to update holiday', 500);
  }
};

export const deleteHoliday = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const holiday = await prisma.publicHoliday.findUnique({
      where: { id },
    });

    if (!holiday) {
      return sendError(res, 'Holiday not found', 404);
    }

    await prisma.publicHoliday.delete({
      where: { id },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'DELETE',
        entity: 'PUBLIC_HOLIDAY',
        entityId: id,
        changes: JSON.stringify({ holiday }),
      },
    });

    return sendSuccess(res, null, 'Holiday deleted successfully');
  } catch (error: any) {
    console.error('Delete holiday error:', error);
    return sendError(res, 'Failed to delete holiday', 500);
  }
};

export const getUpcomingHolidays = async (req: AuthRequest, res: Response) => {
  try {
    const { limit = 5 } = req.query;

    const holidays = await prisma.publicHoliday.findMany({
      where: {
        date: {
          gte: new Date(),
        },
      },
      orderBy: {
        date: 'asc',
      },
      take: parseInt(limit as string),
    });

    return sendSuccess(res, holidays);
  } catch (error: any) {
    console.error('Get upcoming holidays error:', error);
    return sendError(res, 'Failed to fetch upcoming holidays', 500);
  }
};
