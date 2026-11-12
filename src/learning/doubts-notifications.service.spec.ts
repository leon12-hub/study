import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DoubtStatus, UserRole } from '@prisma/client';
import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DoubtsNotificationsService } from './doubts-notifications.service.js';

describe('DoubtsNotificationsService', () => {
  let service: DoubtsNotificationsService;
  let prisma: {
    studentProfile: { findFirst: ReturnType<typeof vi.fn> };
    subject: { findFirst: ReturnType<typeof vi.fn> };
    enrollment: { findFirst: ReturnType<typeof vi.fn> };
    membership: { findMany: ReturnType<typeof vi.fn> };
    doubt: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    doubtReply: { create: ReturnType<typeof vi.fn> };
    notification: {
      create: ReturnType<typeof vi.fn>;
      createMany: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let moduleRef: TestingModule;

  const student: AuthIdentity = {
    userId: 'student-user',
    membershipId: 'student-membership',
    instituteId: 'institute-id',
    branchId: null,
    role: UserRole.STUDENT,
  };
  const teacher: AuthIdentity = {
    userId: 'teacher-user',
    membershipId: 'teacher-membership',
    instituteId: 'institute-id',
    branchId: null,
    role: UserRole.TEACHER,
  };

  beforeEach(async () => {
    prisma = {
      studentProfile: {
        findFirst: vi.fn().mockResolvedValue({ id: 'student-id' }),
      },
      subject: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'subject-id',
          name: 'Biology',
          courseId: 'course-id',
        }),
      },
      enrollment: {
        findFirst: vi.fn().mockResolvedValue({
          batch: {
            id: 'batch-id',
            branchId: 'branch-id',
            teacherMembershipId: 'teacher-membership',
          },
        }),
      },
      membership: { findMany: vi.fn().mockResolvedValue([]) },
      doubt: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue({
          id: 'doubt-id',
          subject: { name: 'Biology' },
          student: { membershipId: 'student-membership' },
        }),
        create: vi.fn().mockResolvedValue({ id: 'doubt-id' }),
        update: vi.fn().mockResolvedValue({ id: 'doubt-id' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      doubtReply: {
        create: vi.fn().mockResolvedValue({
          id: 'reply-id',
          message: 'Review cell structure.',
        }),
      },
      notification: {
        create: vi.fn().mockResolvedValue({ id: 'notification-id' }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue({ id: 'notification-id' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: vi.fn((callback: (tx: typeof prisma) => unknown) =>
        callback(prisma),
      ),
    };
    moduleRef = await Test.createTestingModule({
      providers: [
        DoubtsNotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(DoubtsNotificationsService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('creates a doubt for an enrolled subject and notifies its teacher', async () => {
    await expect(
      service.createStudentDoubt(
        {
          subjectId: 'subject-id',
          topic: 'Cell structure',
          questionText: 'How do mitochondria produce energy?',
        },
        student,
      ),
    ).resolves.toEqual({ id: 'doubt-id' });

    expect(prisma.enrollment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentId: 'student-id',
          batch: {
            is: {
              instituteId: 'institute-id',
              isActive: true,
              courseId: 'course-id',
            },
          },
        }),
      }),
    );
    expect(prisma.doubt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          batchId: 'batch-id',
          status: DoubtStatus.ASSIGNED,
        }),
      }),
    );
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          membershipId: 'teacher-membership',
          category: 'DOUBT',
        }),
      ],
    });
  });

  it('rejects doubts for subjects without an active enrollment', async () => {
    prisma.enrollment.findFirst.mockResolvedValue(null);

    await expect(
      service.createStudentDoubt(
        {
          subjectId: 'subject-id',
          questionText: 'How do mitochondria produce energy?',
        },
        student,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('limits teacher doubt lists to their assigned questions', async () => {
    await service.listStaffDoubts(teacher);

    expect(prisma.doubt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          instituteId: 'institute-id',
          assignedTeacherId: 'teacher-membership',
        },
      }),
    );
  });

  it('scopes branch administrator doubt lists to the assigned batch', async () => {
    await service.listStaffDoubts({
      userId: 'branch-admin-user',
      membershipId: 'branch-admin-membership',
      instituteId: 'institute-id',
      branchId: 'branch-id',
      role: UserRole.BRANCH_ADMIN,
    });

    expect(prisma.doubt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          instituteId: 'institute-id',
          batch: { is: { instituteId: 'institute-id', branchId: 'branch-id' } },
        },
      }),
    );
  });

  it('answers a scoped doubt and notifies its student transactionally', async () => {
    await service.replyToDoubt(
      'doubt-id',
      { message: 'Review cell structure.' },
      teacher,
    );

    expect(prisma.doubt.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'doubt-id',
          instituteId: 'institute-id',
          status: { not: DoubtStatus.CLOSED },
          assignedTeacherId: 'teacher-membership',
        },
      }),
    );
    expect(prisma.doubt.update).toHaveBeenCalledWith({
      where: { id: 'doubt-id' },
      data: { status: DoubtStatus.ANSWERED },
    });
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          membershipId: 'student-membership',
          category: 'DOUBT',
        }),
      }),
    );
  });

  it('marks only the authenticated membership notification as read', async () => {
    await service.markNotificationRead('notification-id', student);

    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'notification-id',
          membershipId: 'student-membership',
          readAt: null,
        },
      }),
    );
  });
});
