import { Test, TestingModule } from '@nestjs/testing';
import { PaymentStatus, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { InstitutesService } from './institutes.service.js';

describe('InstitutesService', () => {
  let service: InstitutesService;
  let prisma: {
    institute: { findUnique: ReturnType<typeof vi.fn> };
    membership: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    course: { count: ReturnType<typeof vi.fn> };
    branch: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    batch: { count: ReturnType<typeof vi.fn> };
    attendance: { count: ReturnType<typeof vi.fn> };
    payment: { aggregate: ReturnType<typeof vi.fn> };
    exam: { count: ReturnType<typeof vi.fn> };
    auditLog: { findMany: ReturnType<typeof vi.fn> };
    studentProfile: { findMany: ReturnType<typeof vi.fn> };
  };
  let moduleRef: TestingModule;

  beforeEach(async () => {
    prisma = {
      institute: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'institute-id',
          name: 'North Campus',
          slug: 'north-campus',
          logoUrl: null,
          primaryColor: '#347563',
        }),
      },
      membership: {
        count: vi.fn().mockResolvedValueOnce(5).mockResolvedValueOnce(3),
        findMany: vi.fn().mockResolvedValue([]),
      },
      course: { count: vi.fn().mockResolvedValue(6) },
      branch: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([]),
      },
      batch: { count: vi.fn().mockResolvedValue(2) },
      attendance: {
        count: vi.fn().mockResolvedValueOnce(10).mockResolvedValueOnce(8),
      },
      payment: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: { amount: new Prisma.Decimal('1200.50') },
        }),
      },
      exam: {
        count: vi.fn().mockResolvedValueOnce(8).mockResolvedValueOnce(2),
      },
      auditLog: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'activity-id',
            action: 'BRANCH_CREATED',
            entityType: 'Branch',
            entityId: 'branch-id',
            createdAt: new Date('2026-11-05T10:00:00.000Z'),
            actor: { fullName: 'Branch Admin' },
          },
        ]),
      },
      studentProfile: { findMany: vi.fn().mockResolvedValue([]) },
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        InstitutesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(InstitutesService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('scopes dashboard metrics and audit activity to the caller branch', async () => {
    const actor = {
      userId: 'branch-admin',
      membershipId: 'membership-id',
      instituteId: 'institute-id',
      branchId: 'branch-id',
      role: UserRole.BRANCH_ADMIN,
    };

    const dashboard = await service.getDashboard(actor);

    expect(dashboard.metrics).toMatchObject({
      students: 5,
      teachers: 3,
      courses: 6,
      branches: 1,
      activeBatches: 2,
      attendanceRate: 80,
      feesCollected: 1200.5,
      exams: 8,
      upcomingExams: 2,
    });
    expect(prisma.membership.count).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          instituteId: 'institute-id',
          branchId: 'branch-id',
          role: UserRole.STUDENT,
        }),
      }),
    );
    expect(prisma.attendance.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          classSession: expect.objectContaining({
            is: expect.objectContaining({
              instituteId: 'institute-id',
              batch: { is: { branchId: 'branch-id' } },
            }),
          }),
        }),
      }),
    );
    expect(prisma.payment.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: PaymentStatus.PAID,
          fee: {
            is: {
              instituteId: 'institute-id',
              student: {
                is: { membership: { is: { branchId: 'branch-id' } } },
              },
            },
          },
        }),
      }),
    );
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          instituteId: 'institute-id',
          actorUserId: 'branch-admin',
        },
      }),
    );
  });

  it('restricts branch administrators to their own branch in branch listings', async () => {
    await service.getBranches({
      userId: 'branch-admin',
      membershipId: 'membership-id',
      instituteId: 'institute-id',
      branchId: 'branch-id',
      role: UserRole.BRANCH_ADMIN,
    });

    expect(prisma.branch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { instituteId: 'institute-id', id: 'branch-id' },
      }),
    );
  });

  it('lists students only from the branch-admin scope', async () => {
    await service.getStudents({
      userId: 'branch-admin',
      membershipId: 'membership-id',
      instituteId: 'institute-id',
      branchId: 'branch-id',
      role: UserRole.BRANCH_ADMIN,
    });

    expect(prisma.studentProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          membership: { instituteId: 'institute-id', branchId: 'branch-id' },
        },
      }),
    );
  });
});
