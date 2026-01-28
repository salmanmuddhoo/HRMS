import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';

export const getAllConfig = async (req: AuthRequest, res: Response) => {
  try {
    const configs = await prisma.systemConfig.findMany();

    // Convert to key-value object for easier frontend use
    const configMap: Record<string, string> = {};
    configs.forEach(config => {
      configMap[config.key] = config.value;
    });

    return sendSuccess(res, configMap);
  } catch (error: any) {
    console.error('Get config error:', error);
    return sendError(res, 'Failed to fetch configuration', 500);
  }
};

export const getConfigByKey = async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;

    const config = await prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!config) {
      return sendError(res, 'Configuration not found', 404);
    }

    return sendSuccess(res, config);
  } catch (error: any) {
    console.error('Get config error:', error);
    return sendError(res, 'Failed to fetch configuration', 500);
  }
};

export const updateConfig = async (req: AuthRequest, res: Response) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    const config = await prisma.systemConfig.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entity: 'SYSTEM_CONFIG',
        entityId: config.id,
        changes: JSON.stringify({ key, value }),
      },
    });

    return sendSuccess(res, config, 'Configuration updated successfully');
  } catch (error: any) {
    console.error('Update config error:', error);
    return sendError(res, 'Failed to update configuration', 500);
  }
};

export const updateMultipleConfig = async (req: AuthRequest, res: Response) => {
  try {
    const configs = req.body; // Array of { key, value, description }

    const results = await Promise.all(
      configs.map((config: { key: string; value: string; description?: string }) =>
        prisma.systemConfig.upsert({
          where: { key: config.key },
          update: { value: config.value, description: config.description },
          create: { key: config.key, value: config.value, description: config.description },
        })
      )
    );

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'UPDATE',
        entity: 'SYSTEM_CONFIG',
        entityId: 'BATCH',
        changes: JSON.stringify(configs),
      },
    });

    return sendSuccess(res, results, 'Configuration updated successfully');
  } catch (error: any) {
    console.error('Update config error:', error);
    return sendError(res, 'Failed to update configuration', 500);
  }
};

// Helper function to calculate prorated leave
export const calculateProratedLeave = (annualLeave: number, joiningDate: Date): number => {
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

export const getLeaveDefaults = async (req: AuthRequest, res: Response) => {
  try {
    const localLeave = await prisma.systemConfig.findUnique({
      where: { key: 'DEFAULT_LOCAL_LEAVE' },
    });
    const sickLeave = await prisma.systemConfig.findUnique({
      where: { key: 'DEFAULT_SICK_LEAVE' },
    });

    return sendSuccess(res, {
      defaultLocalLeave: localLeave ? parseInt(localLeave.value) : 15,
      defaultSickLeave: sickLeave ? parseInt(sickLeave.value) : 10,
    });
  } catch (error: any) {
    console.error('Get leave defaults error:', error);
    return sendError(res, 'Failed to fetch leave defaults', 500);
  }
};
