import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentStatus, UserRole } from '@prisma/client';
import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BillingService } from './billing.service.js';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: {
    fee: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    studentProfile: { findFirst: ReturnType<typeof vi.fn> };
    payment: { create: ReturnType<typeof vi.fn> };
    notification: { create: ReturnType<typeof vi.fn> };
    auditLog: { create: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let moduleRef: TestingModule;

  const admin: AuthIdentity = {
    userId: 'admin-user',
    membershipId: 'admin-membership',
    instituteId: 'institute-id',
    branchId: null,
    role: UserRole.INSTITUTE_ADMIN,
  };
  const student: AuthIdentity = {
    userId: 'student-user',
    membershipId: 'student-membership',
    instituteId: 'institute-id',
    branchId: null,
    role: UserRole.STUDENT,
  };

  beforeEach(async () => {
    const transaction = {
      fee: {
        create: vi.fn().mockResolvedValue({
          id: 'fee-id',
          title: 'Tuition',
          dueAt: new Date('2026-12-01T00:00:00.000Z'),
        }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      payment: {
        create: vi.fn().mockResolvedValue({
          id: 'payment-id',
          feeId: 'fee-id',
          status: PaymentStatus.PAID,
        }),
      },
      notification: {
        create: vi.fn().mockResolvedValue({ id: 'notification-id' }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({ id: 'audit-id' }) },
    };
    prisma = {
      fee: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue({
          id: 'fee-id',
          title: 'Tuition',
          amount: { toString: () => '2500.00' },
          student: { membershipId: 'student-membership' },
        }),
        create: transaction.fee.create,
        updateMany: transaction.fee.updateMany,
      },
      studentProfile: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'student-id',
          membershipId: 'student-membership',
          enrollments: [{ id: 'enrollment-id' }],
        }),
      },
      payment: { create: transaction.payment.create },
      notification: { create: transaction.notification.create },
      auditLog: { create: transaction.auditLog.create },
      $transaction: vi.fn(
        (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    };
    moduleRef = await Test.createTestingModule({
      providers: [BillingService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(BillingService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('creates an institute-scoped fee only for an actively enrolled student', async () => {
    await service.createFee(
      {
        studentId: 'student-id',
        title: 'Tuition',
        amount: 2500,
        dueAt: '2026-12-01T00:00:00.000Z',
      },
      admin,
    );

    expect(prisma.studentProfile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'student-id',
          membership: { instituteId: 'institute-id' },
        },
      }),
    );
    expect(prisma.fee.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          instituteId: 'institute-id',
          studentId: 'student-id',
          currency: 'INR',
        }),
      }),
    );
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          membershipId: 'student-membership',
          category: 'FEE',
        }),
      }),
    );
  });

  it('rejects fee creation when the student has no active enrollment', async () => {
    prisma.studentProfile.findFirst.mockResolvedValue({
      id: 'student-id',
      membershipId: 'student-membership',
      enrollments: [],
    });

    await expect(
      service.createFee(
        {
          studentId: 'student-id',
          title: 'Tuition',
          amount: 2500,
          dueAt: '2026-12-01T00:00:00.000Z',
        },
        admin,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('records a full manual payment once and notifies the student', async () => {
    await service.recordManualPayment(
      'fee-id',
      { reference: 'cash-receipt-7' },
      admin,
    );

    expect(prisma.fee.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'fee-id',
          instituteId: 'institute-id',
          status: PaymentStatus.PENDING,
        },
      }),
    );
    expect(prisma.fee.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'fee-id',
          status: PaymentStatus.PENDING,
        }),
        data: { status: PaymentStatus.PAID },
      }),
    );
    expect(prisma.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          feeId: 'fee-id',
          providerReference: 'cash-receipt-7',
          status: PaymentStatus.PAID,
        }),
      }),
    );
    expect(prisma.notification.create).toHaveBeenCalled();
  });

  it('rejects a payment if the pending fee was concurrently reconciled', async () => {
    prisma.fee.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.recordManualPayment('fee-id', {}, admin),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.payment.create).not.toHaveBeenCalled();
  });

  it('returns only the authenticated student fee records', async () => {
    await service.listStudentFees(student);

    expect(prisma.fee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { instituteId: 'institute-id', studentId: 'student-id' },
      }),
    );
  });

  it('returns parent fees only for linked children in the same institute', async () => {
    await service.listParentFees({
      userId: 'parent-user',
      membershipId: 'parent-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.PARENT,
    });

    expect(prisma.fee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          instituteId: 'institute-id',
          student: {
            is: {
              parentLinks: {
                some: {
                  parentMembershipId: 'parent-membership',
                  parentMembership: { instituteId: 'institute-id' },
                },
              },
            },
          },
        },
      }),
    );
  });

  it('does not expose fees outside a branch administrator branch', async () => {
    await service.listInstituteFees({
      userId: 'branch-admin-user',
      membershipId: 'branch-admin-membership',
      instituteId: 'institute-id',
      branchId: 'branch-id',
      role: UserRole.BRANCH_ADMIN,
    });

    expect(prisma.fee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          instituteId: 'institute-id',
          student: { is: { membership: { is: { branchId: 'branch-id' } } } },
        },
      }),
    );
  });

  it('does not reconcile fees outside the caller scope', async () => {
    prisma.fee.findFirst.mockResolvedValue(null);

    await expect(
      service.recordManualPayment('foreign-fee-id', {}, admin),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
