import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    $transaction: ReturnType<typeof vi.fn>;
    batch: { findFirst: ReturnType<typeof vi.fn> };
    branch: { findFirst: ReturnType<typeof vi.fn> };
    studentProfile: { findMany: ReturnType<typeof vi.fn> };
    user: { findUnique: ReturnType<typeof vi.fn> };
  };
  let transaction: {
    user: { create: ReturnType<typeof vi.fn> };
    auditLog: { create: ReturnType<typeof vi.fn> };
  };
  let moduleRef: TestingModule;

  beforeEach(async () => {
    transaction = {
      user: {
        create: vi.fn().mockResolvedValue({
          id: 'student-user',
          email: 'student@example.com',
          fullName: 'Sample Student',
          createdAt: new Date(),
          memberships: [],
        }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    prisma = {
      $transaction: vi.fn(
        (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
      batch: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'batch-id',
          branchId: 'branch-id',
        }),
      },
      branch: { findFirst: vi.fn() },
      studentProfile: {
        findMany: vi.fn().mockResolvedValue([{ id: 'student-id' }]),
      },
      user: { findUnique: vi.fn() },
    };
    moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('prevents branch admins from assigning users to another branch', async () => {
    const dto = {
      email: 'student@example.com',
      fullName: 'Sample Student',
      password: 'correct-horse-battery-42',
      role: UserRole.STUDENT,
      branchId: 'other-branch',
    };
    const actor = {
      userId: 'branch-admin',
      membershipId: 'admin-membership',
      instituteId: 'institute-id',
      branchId: 'assigned-branch',
      role: UserRole.BRANCH_ADMIN,
    };

    await expect(service.create(dto, actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.branch.findFirst).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('does not allow institute admins to provision higher-privilege admins', async () => {
    const dto = {
      email: 'admin@example.com',
      fullName: 'Another Admin',
      password: 'correct-horse-battery-42',
      role: UserRole.INSTITUTE_ADMIN,
    };
    const actor = {
      userId: 'institute-admin',
      membershipId: 'admin-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.INSTITUTE_ADMIN,
    };

    await expect(service.create(dto, actor)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('creates a student profile and enrolls it in an in-scope batch', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const dto = {
      email: 'student@example.com',
      fullName: 'Sample Student',
      password: 'correct-horse-battery-42',
      role: UserRole.STUDENT,
      admissionNumber: 'ADM-1042',
      batchId: 'batch-id',
    };
    const actor = {
      userId: 'institute-admin',
      membershipId: 'admin-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.INSTITUTE_ADMIN,
    };

    await service.create(dto, actor);

    expect(prisma.batch.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'batch-id',
          instituteId: 'institute-id',
          isActive: true,
        },
      }),
    );
    expect(transaction.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          memberships: {
            create: expect.objectContaining({
              branchId: 'branch-id',
              student: {
                create: {
                  admissionNumber: 'ADM-1042',
                  enrollments: { create: { batchId: 'batch-id' } },
                },
              },
            }),
          },
        }),
      }),
    );
  });

  it('creates parent links only to students in the administrator institute', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const dto = {
      email: 'parent@example.com',
      fullName: 'Sample Parent',
      password: 'correct-horse-battery-42',
      role: UserRole.PARENT,
      studentIds: ['student-id'],
      relationship: 'Mother',
    };
    const actor = {
      userId: 'institute-admin',
      membershipId: 'admin-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.INSTITUTE_ADMIN,
    };

    await service.create(dto, actor);

    expect(prisma.studentProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ['student-id'] },
          membership: { instituteId: 'institute-id' },
        },
      }),
    );
    expect(transaction.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          memberships: {
            create: expect.objectContaining({
              parentLinks: {
                create: [{ studentId: 'student-id', relationship: 'Mother' }],
              },
            }),
          },
        }),
      }),
    );
  });

  it('rejects parent links to students outside the administrator scope', async () => {
    prisma.studentProfile.findMany.mockResolvedValue([]);

    await expect(
      service.create(
        {
          email: 'parent@example.com',
          fullName: 'Sample Parent',
          password: 'correct-horse-battery-42',
          role: UserRole.PARENT,
          studentIds: ['outside-student'],
        },
        {
          userId: 'institute-admin',
          membershipId: 'admin-membership',
          instituteId: 'institute-id',
          branchId: null,
          role: UserRole.INSTITUTE_ADMIN,
        },
      ),
    ).rejects.toThrow(
      'One or more linked students were not found in your scope.',
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
