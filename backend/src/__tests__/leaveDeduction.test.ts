import { calculateDaysBetween } from '../utils/date';
import prismaMock from './__mocks__/prisma';

jest.mock('../config/database', () => {
  const mock = jest.requireActual('./__mocks__/prisma');
  return { __esModule: true, default: mock.default };
});

jest.mock('../services/emailService', () => ({
  __esModule: true,
  default: { sendLeaveStatusNotification: jest.fn() },
}));

// ---------------------------------------------------------------------------
// calculateDaysBetween
// ---------------------------------------------------------------------------
describe('calculateDaysBetween', () => {
  it('returns 1 for same day', () => {
    const d = new Date('2024-01-15');
    expect(calculateDaysBetween(d, d)).toBe(1);
  });

  it('returns 3 for a 3-day range', () => {
    expect(calculateDaysBetween(new Date('2024-01-01'), new Date('2024-01-03'))).toBe(3);
  });

  it('returns 5 for a 5-day range', () => {
    expect(calculateDaysBetween(new Date('2024-06-10'), new Date('2024-06-14'))).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// getLeaveDays fallback logic
// ---------------------------------------------------------------------------
describe('deductDays derivation (fallback)', () => {
  const derive = (isHalfDay: boolean, start: Date, end: Date) =>
    isHalfDay ? 0.5 : calculateDaysBetween(start, end);

  it('returns 0.5 for half-day', () => {
    const d = new Date('2024-06-10');
    expect(derive(true, d, d)).toBe(0.5);
  });

  it('returns 1 for a full single-day leave', () => {
    const d = new Date('2024-06-10');
    expect(derive(false, d, d)).toBe(1);
  });

  it('never returns 0', () => {
    const d = new Date('2024-06-10');
    expect(derive(false, d, d)).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// approveLeave controller
// ---------------------------------------------------------------------------
describe('approveLeave controller', () => {
  let approveLeave: Function;

  beforeAll(async () => {
    const mod = await import('../controllers/leaveController');
    approveLeave = mod.approveLeave;
  });

  const makeLeave = (overrides: Record<string, any> = {}) => ({
    id: 'leave-id-123',
    employeeId: 'emp-id-456',
    leaveType: 'LOCAL',
    isHalfDay: false,
    startDate: new Date('2024-06-10T00:00:00.000Z'),
    endDate: new Date('2024-06-10T00:00:00.000Z'),
    totalDays: 0,
    status: 'PENDING',
    halfDayPeriod: null,
    employee: {
      id: 'emp-id-456', employeeId: 'EMP001',
      firstName: 'John', lastName: 'Doe',
      department: 'Engineering', email: 'j@test.com', userId: 'user-789',
    },
    ...overrides,
  });

  const makeReq = () => ({
    params: { id: 'leave-id-123' },
    user: { userId: 'admin-id', role: 'ADMIN', email: 'admin@test.com' },
  });

  const makeRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const approvedEmployee = { id: 'emp-id-456', localLeaveBalance: 9.5, sickLeaveBalance: 10 };

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.employee.update.mockResolvedValue(approvedEmployee);
    prismaMock.auditLog.create.mockResolvedValue({});
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.attendance.createMany.mockResolvedValue({ count: 1 });
    prismaMock.attendance.upsert.mockResolvedValue({});
  });

  // ── Primary path ──────────────────────────────────────────────────────────

  it('decrements localLeaveBalance by 0.5 for a LOCAL half-day leave', async () => {
    const leave = makeLeave({ leaveType: 'LOCAL', isHalfDay: true, totalDays: 0.5 });
    prismaMock.leave.findUnique.mockResolvedValue(leave);
    prismaMock.leave.update.mockResolvedValue({ ...leave, status: 'APPROVED' });

    await approveLeave(makeReq(), makeRes());

    expect(prismaMock.employee.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'emp-id-456' },
      data: { localLeaveBalance: { decrement: 0.5 } },
    }));
  });

  it('decrements localLeaveBalance by 3 for a 3-day LOCAL leave', async () => {
    const leave = makeLeave({
      leaveType: 'LOCAL', isHalfDay: false, totalDays: 3,
      startDate: new Date('2024-06-10T00:00:00.000Z'),
      endDate:   new Date('2024-06-12T00:00:00.000Z'),
    });
    prismaMock.leave.findUnique.mockResolvedValue(leave);
    prismaMock.leave.update.mockResolvedValue({ ...leave, status: 'APPROVED' });

    await approveLeave(makeReq(), makeRes());

    expect(prismaMock.employee.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'emp-id-456' },
      data: { localLeaveBalance: { decrement: 3 } },
    }));
  });

  it('decrements sickLeaveBalance for a SICK half-day leave', async () => {
    const leave = makeLeave({ leaveType: 'SICK', isHalfDay: true, totalDays: 0.5 });
    prismaMock.leave.findUnique.mockResolvedValue(leave);
    prismaMock.leave.update.mockResolvedValue({ ...leave, status: 'APPROVED' });

    await approveLeave(makeReq(), makeRes());

    expect(prismaMock.employee.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'emp-id-456' },
      data: { sickLeaveBalance: { decrement: 0.5 } },
    }));
  });

  // ── Fallback: totalDays = 0 ───────────────────────────────────────────────

  it('falls back to 1-day decrement for full-day LOCAL when totalDays is 0', async () => {
    const leave = makeLeave({ leaveType: 'LOCAL', isHalfDay: false, totalDays: 0 });
    prismaMock.leave.findUnique.mockResolvedValue(leave);
    prismaMock.leave.update.mockResolvedValue({ ...leave, status: 'APPROVED' });

    await approveLeave(makeReq(), makeRes());

    expect(prismaMock.employee.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { localLeaveBalance: { decrement: 1 } },
    }));
  });

  it('falls back to 0.5 decrement via isHalfDay when totalDays is 0', async () => {
    const leave = makeLeave({ leaveType: 'LOCAL', isHalfDay: true, totalDays: 0 });
    prismaMock.leave.findUnique.mockResolvedValue(leave);
    prismaMock.leave.update.mockResolvedValue({ ...leave, status: 'APPROVED' });

    await approveLeave(makeReq(), makeRes());

    expect(prismaMock.employee.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { localLeaveBalance: { decrement: 0.5 } },
    }));
  });

  it('decrements sickLeaveBalance for SICK leave (fallback path)', async () => {
    const leave = makeLeave({ leaveType: 'SICK', isHalfDay: false, totalDays: 0 });
    prismaMock.leave.findUnique.mockResolvedValue(leave);
    prismaMock.leave.update.mockResolvedValue({ ...leave, status: 'APPROVED' });

    await approveLeave(makeReq(), makeRes());

    expect(prismaMock.employee.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { sickLeaveBalance: { decrement: 1 } },
    }));
  });

  // ── Edge cases ────────────────────────────────────────────────────────────

  it('returns 400 and skips deduction when leave is already APPROVED', async () => {
    prismaMock.leave.findUnique.mockResolvedValue(makeLeave({ status: 'APPROVED' }));

    const res = makeRes();
    await approveLeave(makeReq(), res);

    expect(prismaMock.employee.update).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('returns 500 when employee.update throws (employee not found)', async () => {
    const leave = makeLeave({ leaveType: 'LOCAL', isHalfDay: false, totalDays: 1 });
    prismaMock.leave.findUnique.mockResolvedValue(leave);
    prismaMock.leave.update.mockResolvedValue({ ...leave, status: 'APPROVED' });
    prismaMock.employee.update.mockRejectedValue(new Error('Record not found'));

    const res = makeRes();
    await approveLeave(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
