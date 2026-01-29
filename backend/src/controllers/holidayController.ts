import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import * as XLSX from 'xlsx';

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

export const uploadHolidays = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return sendError(res, 'No file uploaded', 400);
    }

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    if (data.length === 0) {
      return sendError(res, 'Excel file is empty', 400);
    }

    // Skip header row if present (check if first row looks like headers)
    const startRow = (typeof data[0][0] === 'string' &&
      (data[0][0].toLowerCase().includes('name') || data[0][0].toLowerCase().includes('holiday'))) ? 1 : 0;

    const holidays: { name: string; date: Date }[] = [];
    const errors: string[] = [];

    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 2) continue;

      const name = row[0]?.toString().trim();
      let dateValue = row[1];

      if (!name) {
        errors.push(`Row ${i + 1}: Missing holiday name`);
        continue;
      }

      let parsedDate: Date | null = null;

      // Handle Excel date serial number
      if (typeof dateValue === 'number') {
        // Excel stores dates as number of days since 1900-01-01
        const dateObj = XLSX.SSF.parse_date_code(dateValue) as { y: number; m: number; d: number } | null;
        if (dateObj) {
          parsedDate = new Date(dateObj.y, dateObj.m - 1, dateObj.d);
        }
      } else if (typeof dateValue === 'string') {
        // Try parsing string date
        const dateStr = dateValue.trim();
        parsedDate = new Date(dateStr);

        // Try DD/MM/YYYY format
        if (isNaN(parsedDate.getTime())) {
          const parts = dateStr.split(/[\/\-\.]/);
          if (parts.length === 3) {
            // Try DD/MM/YYYY
            parsedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            // If still invalid, try MM/DD/YYYY
            if (isNaN(parsedDate.getTime())) {
              parsedDate = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
            }
          }
        }
      }

      if (!parsedDate || isNaN(parsedDate.getTime())) {
        errors.push(`Row ${i + 1}: Invalid date format for "${name}"`);
        continue;
      }

      holidays.push({ name, date: parsedDate });
    }

    if (holidays.length === 0) {
      return sendError(res, `No valid holidays found. ${errors.join('; ')}`, 400);
    }

    // Upsert holidays (update if date exists, create if not)
    let created = 0;
    let updated = 0;

    for (const holiday of holidays) {
      const existing = await prisma.publicHoliday.findFirst({
        where: {
          date: {
            gte: new Date(holiday.date.setHours(0, 0, 0, 0)),
            lt: new Date(holiday.date.setHours(23, 59, 59, 999)),
          },
        },
      });

      if (existing) {
        await prisma.publicHoliday.update({
          where: { id: existing.id },
          data: { name: holiday.name },
        });
        updated++;
      } else {
        await prisma.publicHoliday.create({
          data: {
            name: holiday.name,
            date: holiday.date,
          },
        });
        created++;
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPLOAD_HOLIDAYS',
        entity: 'PUBLIC_HOLIDAY',
        entityId: 'bulk',
        changes: JSON.stringify({ created, updated, errors }),
      },
    });

    const message = `Successfully processed ${holidays.length} holidays (${created} created, ${updated} updated)${errors.length > 0 ? `. Warnings: ${errors.length} rows skipped` : ''}`;

    return sendSuccess(res, { created, updated, errors }, message, 201);
  } catch (error: any) {
    console.error('Upload holidays error:', error);
    return sendError(res, 'Failed to process holiday file', 500);
  }
};
