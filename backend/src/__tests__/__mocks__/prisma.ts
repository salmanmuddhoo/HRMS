const makeMock = (): any => {
  const mock: any = {
    leave: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    attendance: {
      upsert: jest.fn(),
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    user: { findUnique: jest.fn() },
    $executeRawUnsafe: jest.fn().mockResolvedValue(1),
    $executeRaw: jest.fn().mockResolvedValue(1),
  };
  mock.$transaction = jest.fn((fn: (tx: any) => Promise<any>) => fn(mock));
  return mock;
};

const prismaMock = makeMock();
export default prismaMock;
