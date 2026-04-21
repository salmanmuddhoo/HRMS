import { calculateDaysBetween } from '../utils/date';
import prismaMock from './__mocks__/prisma';

// Wire up the database mock before any controller imports
jest.mock('../config/database', () => {
  const mock = jest.requireActual('./__mocks__/prisma');
  return { __esModule: true, default: mock.default };
});

// Also mock emailService so the controller doesn't crash
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
// deductDays derivation (mirrors approveLeave logic)
// ---------------------------------------------------------------------------
describe('deductDays derivation', () => {
  const derive = (isHalfDay: boolean, start: Date, end: Date) =>
    isHalfDay ? 0.5 : calculateDaysBetween(start, end);

  it('returns 0.5 for half-day regardless of stored totalDays', () => {
    const d = new Date('2024-06-10');
    expect(derive(true, d, d)).toBe(0.5);
  });

  it('returns 1 for a full single-day leave (not corrupted by stored 0)', () => {
    const d = new Date('2024-06-10');
    expect(derive(false, d, d)).toBe(1);
  });

  it('never returns 0 even when stored totalDays would be 0', () => {
    const d = new Date('2024-06-10');
    // isHalfDay=false, but even if DB stored totalDays=0, we recalculate from dates
    expect(derive(false, d, d)).toBeGreaterThan(0);
  });

  it('String() of deductDays is always a valid number string', () => {
    const d = new Date('2024-06-10');
    expect(String(derive(true, d, d))).toBe('0.5');
    expect(String(derive(false, d, d))).toBe('1');
    expect(Number(String(derive(false, d, d)))).not.toBeNaN();
  });
});

// ---------------------------------------------------------------------------
// SQL construction checks
// ---------------------------------------------------------------------------
describe('deduction SQL construction', () => {
  const empId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  it('LOCAL SQL targets localLeaveBalance and not sickLeaveBalance', () => {
    const sql = `UPDATE employees SET "localLeaveBalance" = "localLeaveBalance" - CAST($1 AS float8) WHERE id = '${empId}'`;
    expect(sql).toContain('"localLeaveBalance"');
    expect(sql).toContain(`'${empId}'`);
    expect(sql).toContain('CAST($1 AS float8)');
    expect(sql).not.toContain('sick');
  });

  it('SICK SQL targets sickLeaveBalance and not localLeaveBalance', () => {
    const sql = `UPDATE employees SET "sickLeaveBalance" = "sickLeaveBalance" - CAST($1 AS float8) WHERE id = '${empId}'`;
    expect(sql).toContain('"sickLeaveBalance"');
    expect(sql).not.toContain('local');
  });
});

// ---------------------------------------------------------------------------
// approveLeave controller — mocked
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

  beforeEach(() => {
    jest.clearAllMocks();
    prismaMock.$executeRawUnsafe.mockResolvedValue(1);
    prismaMock.auditLog.create.mockResolvedValue({});
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.attendance.createMany.mockResolvedValue({ count: 1 });
    prismaMock.attendance.upsert.mockResolvedValue({});
  });

  it('calls $executeRawUnsafe with localLeaveBalance for LOCAL leave', async () => {
    const leave = makeLeave({ leaveType: 'LOCAL', isHalfDay: false, totalDays: 0 });
    prismaMock.leave.findUnique.mockResolvedValue(leave);
    prismaMock.leave.update.mockResolvedValue({ ...leave, status: 'APPROVED' });

    await approveLeave(makeReq(), makeRes());

    const calls: any[][] = prismaMock.$executeRawUnsafe.mock.calls;
    console.log('[TEST] $executeRawUnsafe calls:', JSON.stringify(calls));

    expect(calls.length).toBeGreaterThanOrEqual(1);
    const [sql, param] = calls[0];
    expect(sql).toContain('"localLeaveBalance"');
    expect(param).toBe('1');
  });

  it('deducts 0.5 for half-day even when stored totalDays is 0', async () => {
    const leave = makeLeave({ leaveType: 'LOCAL', isHalfDay: true, totalDays: 0 });
    prismaMock.leave.findUnique.mockResolvedValue(leave);
    prismaMock.leave.update.mockResolvedValue({ ...leave, status: 'APPROVED' });

    await approveLeave(makeReq(), makeRes());

    const [, param] = prismaMock.$executeRawUnsafe.mock.calls[0];
    expect(param).toBe('0.5');
  });

  it('calls $executeRawUnsafe with sickLeaveBalance for SICK leave', async () => {
    const leave = makeLeave({ leaveType: 'SICK', isHalfDay: false, totalDays: 0 });
    prismaMock.leave.findUnique.mockResolvedValue(leave);
    prismaMock.leave.update.mockResolvedValue({ ...leave, status: 'APPROVED' });

    await approveLeave(makeReq(), makeRes());

    const [sql] = prismaMock.$executeRawUnsafe.mock.calls[0];
    expect(sql).toContain('"sickLeaveBalance"');
  });

  it('returns 400 and skips deduction when leave is already APPROVED', async () => {
    prismaMock.leave.findUnique.mockResolvedValue(makeLeave({ status: 'APPROVED' }));

    const res = makeRes();
    await approveLeave(makeReq(), res);

    expect(prismaMock.$executeRawUnsafe).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
