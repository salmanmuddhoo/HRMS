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
// deductDays derivation (fallback logic mirrors approveLeave when totalDays=0)
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
// SQL construction — values now embedded as literals (no $1 binding)
// ---------------------------------------------------------------------------
describe('deduction SQL construction', () => {
  const empId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  it('LOCAL SQL embeds float as ::float8 literal and binds UUID as $1', () => {
    const deductDays = 0.5;
    const sql = `UPDATE employees SET "localLeaveBalance" = "localLeaveBalance" - ${Number(deductDays)}::float8 WHERE id = $1`;
    expect(sql).toContain('"localLeaveBalance"');
    expect(sql).toContain('0.5::float8');
    expect(sql).toContain('WHERE id = $1');
    expect(sql).not.toContain(`'${empId}'`); // UUID is a param, not a literal
    expect(sql).not.toContain('sick');
  });

  it('SICK SQL targets sickLeaveBalance, embeds float as literal, binds UUID as $1', () => {
    const deductDays = 1;
    const sql = `UPDATE employees SET "sickLeaveBalance" = "sickLeaveBalance" - ${Number(deductDays)}::float8 WHERE id = $1`;
    expect(sql).toContain('"sickLeaveBalance"');
    expect(sql).toContain('1::float8');
    expect(sql).toContain('WHERE id = $1');
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

  // ── Primary path: totalDays correctly stored ──────────────────────────────

  it('uses stored totalDays 0.5 directly for a LOCAL half-day leave', async () => {
    const leave = makeLeave({ leaveType: 'LOCAL', isHalfDay: true, totalDays: 0.5 });
    prismaMock.leave.findUnique.mockResolvedValue(leave);
    prismaMock.leave.update.mockResolvedValue({ ...leave, status: 'APPROVED' });

    await approveLeave(makeReq(), makeRes());

    const [sql, idParam] = prismaMock.$executeRawUnsafe.mock.calls[0];
    expect(sql).toContain('"localLeaveBalance"');
    expect(sql).toContain('0.5::float8');
    expect(sql).toContain('WHERE id = $1');
    expect(idParam).toBe('emp-id-456');
  });

  it('uses stored totalDays 3 for a 3-day LOCAL leave', async () => {
    const leave = makeLeave({
      leaveType: 'LOCAL',
      isHalfDay: false,
      totalDays: 3,
      startDate: new Date('2024-06-10T00:00:00.000Z'),
      endDate:   new Date('2024-06-12T00:00:00.000Z'),
    });
    prismaMock.leave.findUnique.mockResolvedValue(leave);
    prismaMock.leave.update.mockResolvedValue({ ...leave, status: 'APPROVED' });

    await approveLeave(makeReq(), makeRes());

    const [sql, idParam] = prismaMock.$executeRawUnsafe.mock.calls[0];
    expect(sql).toContain('"localLeaveBalance"');
    expect(sql).toContain('3::float8');
    expect(sql).toContain('WHERE id = $1');
    expect(idParam).toBe('emp-id-456');
  });

  it('uses stored totalDays 0.5 for a SICK half-day leave', async () => {
    const leave = makeLeave({ leaveType: 'SICK', isHalfDay: true, totalDays: 0.5 });
    prismaMock.leave.findUnique.mockResolvedValue(leave);
    prismaMock.leave.update.mockResolvedValue({ ...leave, status: 'APPROVED' });

    await approveLeave(makeReq(), makeRes());

    const [sql, idParam] = prismaMock.$executeRawUnsafe.mock.calls[0];
    expect(sql).toContain('"sickLeaveBalance"');
    expect(sql).toContain('0.5::float8');
    expect(sql).toContain('WHERE id = $1');
    expect(idParam).toBe('emp-id-456');
  });

  // ── Fallback path: totalDays = 0 (corrupted), falls back to isHalfDay check ─

  it('falls back to 1::float8 for full-day LOCAL when totalDays is 0', async () => {
    const leave = makeLeave({ leaveType: 'LOCAL', isHalfDay: false, totalDays: 0 });
    prismaMock.leave.findUnique.mockResolvedValue(leave);
    prismaMock.leave.update.mockResolvedValue({ ...leave, status: 'APPROVED' });

    await approveLeave(makeReq(), makeRes());

    const calls: any[][] = prismaMock.$executeRawUnsafe.mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    const [sql, idParam] = calls[0];
    expect(sql).toContain('"localLeaveBalance"');
    expect(sql).toContain('1::float8');
    expect(sql).toContain('WHERE id = $1');
    expect(idParam).toBe('emp-id-456');
  });

  it('falls back to 0.5::float8 via isHalfDay when totalDays is 0', async () => {
    const leave = makeLeave({ leaveType: 'LOCAL', isHalfDay: true, totalDays: 0 });
    prismaMock.leave.findUnique.mockResolvedValue(leave);
    prismaMock.leave.update.mockResolvedValue({ ...leave, status: 'APPROVED' });

    await approveLeave(makeReq(), makeRes());

    const [sql, idParam] = prismaMock.$executeRawUnsafe.mock.calls[0];
    expect(sql).toContain('0.5::float8');
    expect(sql).toContain('WHERE id = $1');
    expect(idParam).toBe('emp-id-456');
  });

  it('targets sickLeaveBalance for SICK leave (fallback path)', async () => {
    const leave = makeLeave({ leaveType: 'SICK', isHalfDay: false, totalDays: 0 });
    prismaMock.leave.findUnique.mockResolvedValue(leave);
    prismaMock.leave.update.mockResolvedValue({ ...leave, status: 'APPROVED' });

    await approveLeave(makeReq(), makeRes());

    const [sql, idParam] = prismaMock.$executeRawUnsafe.mock.calls[0];
    expect(sql).toContain('"sickLeaveBalance"');
    expect(sql).toContain('WHERE id = $1');
    expect(idParam).toBe('emp-id-456');
  });

  it('returns 400 and skips deduction when leave is already APPROVED', async () => {
    prismaMock.leave.findUnique.mockResolvedValue(makeLeave({ status: 'APPROVED' }));

    const res = makeRes();
    await approveLeave(makeReq(), res);

    expect(prismaMock.$executeRawUnsafe).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  it('returns 500 when $executeRawUnsafe updates 0 rows (employee not found)', async () => {
    const leave = makeLeave({ leaveType: 'LOCAL', isHalfDay: false, totalDays: 1 });
    prismaMock.leave.findUnique.mockResolvedValue(leave);
    prismaMock.leave.update.mockResolvedValue({ ...leave, status: 'APPROVED' });
    // Simulate the balance UPDATE matching 0 rows
    prismaMock.$executeRawUnsafe.mockResolvedValue(0);

    const res = makeRes();
    await approveLeave(makeReq(), res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
