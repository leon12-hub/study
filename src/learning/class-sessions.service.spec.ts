import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceStatus, ClassMode, UserRole } from '@prisma/client';
import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ClassSessionsService } from './class-sessions.service.js';

describe('ClassSessionsService', () => {
  let service: ClassSessionsService;
  let prisma: {
    batch: { findFirst: ReturnType<typeof vi.fn> };
    classroom: { findFirst: ReturnType<typeof vi.fn> };
    subject: { findFirst: ReturnType<typeof vi.fn> };
    membership: { findFirst: ReturnType<typeof vi.fn> };
    classSession: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    enrollment: { findMany: ReturnType<typeof vi.fn> };
    studentProfile: { findFirst: ReturnType<typeof vi.fn> };
    attendance: { findMany: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let transaction: { attendance: { upsert: ReturnType<typeof vi.fn> } };
  let moduleRef: TestingModule;

  beforeEach(async () => {
    transaction = {
      attendance: {
        upsert: vi.fn().mockResolvedValue({
          studentId: 'student-id',
          status: AttendanceStatus.PRESENT,
          markedAt: new Date(),
        }),
      },
    };
    prisma = {
      batch: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'batch-id',
          branchId: 'branch-id',
          courseId: 'course-id',
          teacherMembershipId: 'teacher-membership',
        }),
      },
      classroom: { findFirst: vi.fn().mockResolvedValue({ id: 'room-id' }) },
      subject: { findFirst: vi.fn().mockResolvedValue({ id: 'subject-id' }) },
      membership: {
        findFirst: vi.fn().mockResolvedValue({ id: 'teacher-membership' }),
      },
      classSession: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 'session-id' }),
      },
      enrollment: {
        findMany: vi.fn().mockResolvedValue([{ studentId: 'student-id' }]),
      },
      studentProfile: {
        findFirst: vi.fn().mockResolvedValue({ id: 'student-id' }),
      },
      attendance: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(
        (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    };
    moduleRef = await Test.createTestingModule({
      providers: [
        ClassSessionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(ClassSessionsService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('creates online classes with validated HTTPS meeting links for assigned teachers', async () => {
    const actor: AuthIdentity = {
      userId: 'teacher-user',
      membershipId: 'teacher-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.TEACHER,
    };

    await service.createSession(
      {
        batchId: 'batch-id',
        title: 'Cell biology',
        mode: ClassMode.ONLINE,
        startsAt: '2026-11-06T10:00:00.000Z',
        endsAt: '2026-11-06T11:00:00.000Z',
        joinUrl: 'https://meet.google.com/abc-defg-hij',
      },
      actor,
    );

    expect(prisma.batch.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'batch-id',
          instituteId: 'institute-id',
          teacherMembershipId: 'teacher-membership',
        }),
      }),
    );
    expect(prisma.classSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          instituteId: 'institute-id',
          batchId: 'batch-id',
          teacherMembershipId: 'teacher-membership',
          mode: ClassMode.ONLINE,
          joinUrl: 'https://meet.google.com/abc-defg-hij',
        }),
      }),
    );
  });

  it('rejects classes without a meeting URL or with invalid time ranges', async () => {
    await expect(
      service.createSession(
        {
          batchId: 'batch-id',
          title: 'Online class',
          mode: ClassMode.ONLINE,
          startsAt: '2026-11-06T10:00:00.000Z',
          endsAt: '2026-11-06T11:00:00.000Z',
        },
        {
          userId: 'admin-user',
          membershipId: 'admin-membership',
          instituteId: 'institute-id',
          branchId: null,
          role: UserRole.INSTITUTE_ADMIN,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.classSession.create).not.toHaveBeenCalled();
  });

  it('does not expose sessions to teachers outside their assignment scope', async () => {
    prisma.classSession.findFirst.mockResolvedValue(null);

    await expect(
      service.getSessionAttendance('other-session', {
        userId: 'teacher-user',
        membershipId: 'teacher-membership',
        instituteId: 'institute-id',
        branchId: null,
        role: UserRole.TEACHER,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.enrollment.findMany).not.toHaveBeenCalled();
  });

  it('marks attendance only for active students in that session batch', async () => {
    prisma.classSession.findFirst.mockResolvedValue({
      id: 'session-id',
      batchId: 'batch-id',
    });
    await service.markAttendance(
      'session-id',
      {
        records: [
          { studentId: 'student-id', status: AttendanceStatus.PRESENT },
        ],
      },
      {
        userId: 'teacher-user',
        membershipId: 'teacher-membership',
        instituteId: 'institute-id',
        branchId: null,
        role: UserRole.TEACHER,
      },
    );

    expect(prisma.enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          batchId: 'batch-id',
          status: 'ACTIVE',
          studentId: { in: ['student-id'] },
        },
      }),
    );
    expect(transaction.attendance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          studentId_classSessionId: {
            studentId: 'student-id',
            classSessionId: 'session-id',
          },
        },
      }),
    );
  });

  it('rejects attendance for students not actively enrolled in the batch', async () => {
    prisma.enrollment.findMany.mockResolvedValue([]);
    prisma.classSession.findFirst.mockResolvedValue({
      id: 'session-id',
      batchId: 'batch-id',
    });

    await expect(
      service.markAttendance(
        'session-id',
        {
          records: [
            { studentId: 'not-enrolled', status: AttendanceStatus.ABSENT },
          ],
        },
        {
          userId: 'teacher-user',
          membershipId: 'teacher-membership',
          instituteId: 'institute-id',
          branchId: null,
          role: UserRole.TEACHER,
        },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.attendance.upsert).not.toHaveBeenCalled();
  });
});
