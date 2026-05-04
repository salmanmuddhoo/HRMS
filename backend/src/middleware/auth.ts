import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../config/jwt';
import { sendError } from '../utils/response';

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

// All roles that can manage HR (employees, leaves, attendance, holidays)
export const HR_ROLES = ['ADMIN', 'EMPLOYER', 'DIRECTOR', 'TREASURER', 'SECRETARY'] as const;

// Roles that can mutate payroll (process, lock, edit, delete)
export const PAYROLL_WRITE_ROLES = ['ADMIN', 'TREASURER'] as const;

// Role that can approve payroll
export const PAYROLL_APPROVE_ROLES = ['ADMIN', 'SECRETARY'] as const;

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'No token provided', 401);
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    req.user = decoded;
    next();
  } catch (error) {
    return sendError(res, 'Invalid or expired token', 401);
  }
};

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized', 401);
    }

    if (!roles.includes(req.user.role)) {
      return sendError(res, 'Forbidden - Insufficient permissions', 403);
    }

    next();
  };
};
