import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RoleDashboardsService } from './role-dashboards.service.js';

describe('RoleDashboardsService', () => {
  let service: RoleDashboardsService;
  let prisma: Record<string, Record<string, ReturnType<typeof vi.fn>>>;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    prisma = {
      studentProfile: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'student-id',
          admissionNumber: 'A-1',
          membership: { user: { fullName: 'Student One' } },
        }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      enrollment: {
        findMany: vi.fn().mockResolvedValue([]),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      assignment: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      exam: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      result: { findMany: vi.fn().mockResolvedValue([]) },
      attendance: {
        count: vi.fn().mockResolvedValue(0),
        groupBy: vi.fn().mockResolvedValue([]),
        findMany: vi.fn().mockResolvedValue([]),
      },
      membership: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ user: { fullName: 'Teacher' } }),
        findFirst: vi.fn(),
      },
      batch: { findMany: vi.fn().mockResolvedValue([]) },
      classSession: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      parentStudent: { findMany: vi.fn().mockResolvedValue([]) },
      assignmentSubmission: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    };
    moduleRef = await Test.createTestingModule({
      providers: [
        RoleDashboardsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(RoleDashboardsService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('scopes student dashboard learning and attendance to the active student', async () => {
    const actor: AuthIdentity = {
      userId: 'student-user',
      membershipId: 'student-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.STUDENT,
    };

    await service.getStudentDashboard(actor);

    expect(prisma.studentProfile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          membershipId: 'student-membership',
          membership: { instituteId: 'institute-id' },
        },
      }),
    );
    expect(prisma.assignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          instituteId: 'institute-id',
          batch: {
            is: {
              instituteId: 'institute-id',
              isActive: true,
              enrollments: {
                some: {
                  studentId: 'student-id',
                  status: 'ACTIVE',
                },
              },
            },
          },
        },
      }),
    );
    expect(prisma.attendance.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          studentId: 'student-id',
          classSession: { instituteId: 'institute-id' },
        },
      }),
    );
    expect(prisma.attendance.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['status'],
        where: {
          studentId: 'student-id',
          classSession: { instituteId: 'institute-id' },
        },
      }),
    );
    expect(prisma.attendance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentId: 'student-id',
          classSession: { instituteId: 'institute-id' },
          markedAt: { gte: expect.any(Date) },
        }),
        take: 500,
      }),
    );
    expect(prisma.result.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          attempt: {
            is: {
              studentId: 'student-id',
              exam: { is: { instituteId: 'institute-id' } },
            },
          },
        },
        orderBy: { publishedAt: 'desc' },
        take: 20,
      }),
    );
  });

  it('calculates student attendance and score summaries from recorded data', async () => {
    prisma.attendance.count.mockResolvedValue(4);
    prisma.attendance.groupBy.mockResolvedValue([
      { status: 'PRESENT', _count: { _all: 2 } },
      { status: 'LATE', _count: { _all: 1 } },
      { status: 'ABSENT', _count: { _all: 1 } },
    ]);
    prisma.exam.findMany.mockResolvedValue([
      {
        id: 'exam-1',
        subject: { name: 'Biology' },
        attempts: [],
      },
    ]);
    prisma.result.findMany.mockResolvedValue([
      {
        percentage: { toString: () => '80.00' },
        publishedAt: new Date('2026-11-09T10:00:00.000Z'),
        attempt: { exam: { subject: { name: 'Biology' } } },
      },
      {
        percentage: { toString: () => '90.00' },
        publishedAt: new Date('2026-11-10T10:00:00.000Z'),
        attempt: { exam: { subject: { name: 'Biology' } } },
      },
    ]);
    prisma.attendance.findMany.mockResolvedValue([
      {
        markedAt: new Date('2026-11-10T10:00:00.000Z'),
        status: 'PRESENT',
        source: 'PHONE_BIOMETRIC',
      },
    ]);

    const result = await service.getStudentDashboard({
      userId: 'student-user',
      membershipId: 'student-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.STUDENT,
    });

    expect(result.metrics.attendanceRate).toBe(75);
    expect(result.metrics.averageTestScore).toBe(85);
    expect(result.performance).toHaveLength(2);
    expect(result.activity).toEqual([
      {
        markedAt: new Date('2026-11-10T10:00:00.000Z'),
        status: 'PRESENT',
        source: 'PHONE_BIOMETRIC',
      },
    ]);
  });

  it('restricts teacher dashboard batches and sessions to assignments', async () => {
    prisma.enrollment.groupBy.mockResolvedValue([
      { studentId: 'student-1' },
      { studentId: 'student-2' },
      { studentId: 'student-3' },
    ]);
    prisma.classSession.count.mockResolvedValue(8);
    prisma.assignment.count.mockResolvedValue(4);
    prisma.assignmentSubmission.count.mockResolvedValue(2);
    prisma.exam.count.mockResolvedValue(1);
    prisma.attendance.groupBy.mockResolvedValue([
      { status: 'PRESENT', _count: { _all: 8 } },
      { status: 'LATE', _count: { _all: 1 } },
      { status: 'ABSENT', _count: { _all: 3 } },
      { status: 'EXCUSED', _count: { _all: 2 } },
    ]);
    const actor: AuthIdentity = {
      userId: 'teacher-user',
      membershipId: 'teacher-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.TEACHER,
    };

    const result = await service.getTeacherDashboard(actor);

    expect(prisma.batch.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          instituteId: 'institute-id',
          isActive: true,
          teacherMembershipId: 'teacher-membership',
        },
      }),
    );
    expect(prisma.classSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          instituteId: 'institute-id',
          teacherMembershipId: 'teacher-membership',
        }),
      }),
    );
    expect(prisma.classSession.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          instituteId: 'institute-id',
          teacherMembershipId: 'teacher-membership',
          startsAt: {
            gte: expect.any(Date),
            lt: expect.any(Date),
          },
        },
      }),
    );
    expect(prisma.enrollment.groupBy).toHaveBeenCalledWith({
      by: ['studentId'],
      where: {
        status: 'ACTIVE',
        batch: {
          is: {
            instituteId: 'institute-id',
            isActive: true,
            teacherMembershipId: 'teacher-membership',
          },
        },
      },
    });
    expect(prisma.assignmentSubmission.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          marksAwarded: null,
          assignment: {
            is: {
              instituteId: 'institute-id',
              batch: {
                is: {
                  instituteId: 'institute-id',
                  isActive: true,
                  teacherMembershipId: 'teacher-membership',
                },
              },
            },
          },
        },
      }),
    );
    expect(prisma.attendance.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          classSession: {
            instituteId: 'institute-id',
            teacherMembershipId: 'teacher-membership',
          },
        },
      }),
    );
    expect(result.metrics).toMatchObject({
      upcomingClasses: 8,
      students: 3,
      assignments: 4,
      pendingEvaluations: 2,
      upcomingExams: 1,
      attendanceRate: 75,
    });
  });

  it('returns only linked children in the parent institute', async () => {
    const actor: AuthIdentity = {
      userId: 'parent-user',
      membershipId: 'parent-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.PARENT,
    };

    await service.getParentDashboard(actor);

    expect(prisma.parentStudent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          parentMembershipId: 'parent-membership',
          student: { membership: { instituteId: 'institute-id' } },
        },
      }),
    );
  });

  it('returns parent timetable and attendance only for linked children', async () => {
    prisma.parentStudent.findMany.mockResolvedValue([
      {
        relationship: 'Mother',
        student: {
          id: 'linked-student',
          admissionNumber: 'A-7',
          membership: { user: { fullName: 'Linked Student' } },
          enrollments: [
            {
              batch: {
                id: 'batch-id',
                name: 'Batch 7',
                branch: { name: 'Central', city: 'Pune' },
                teacher: { user: { fullName: 'Teacher One' } },
                course: { name: 'Science' },
                sessions: [
                  {
                    id: 'session-id',
                    title: 'Biology class',
                    startsAt: new Date('2026-11-11T08:00:00.000Z'),
                    endsAt: new Date('2026-11-11T09:00:00.000Z'),
                    mode: 'ONLINE',
                    subject: { name: 'Biology' },
                    teacher: { user: { fullName: 'Teacher One' } },
                  },
                ],
                assignments: [
                  {
                    id: 'assignment-id',
                    title: 'Cell worksheet',
                    dueAt: new Date('2026-11-12T10:00:00.000Z'),
                  },
                ],
              },
            },
          ],
          attempts: [],
          _count: { attendances: 4 },
        },
      },
    ]);
    prisma.assignmentSubmission.findMany.mockResolvedValue([
      {
        assignmentId: 'assignment-id',
        studentId: 'linked-student',
        submittedAt: new Date('2026-11-10T09:00:00.000Z'),
      },
    ]);
    prisma.attendance.groupBy.mockResolvedValue([
      { studentId: 'linked-student', status: 'PRESENT', _count: { _all: 2 } },
      { studentId: 'linked-student', status: 'ABSENT', _count: { _all: 1 } },
      { studentId: 'linked-student', status: 'LATE', _count: { _all: 1 } },
    ]);
    prisma.attendance.findMany.mockResolvedValue([
      {
        id: 'attendance-id',
        studentId: 'linked-student',
        status: 'PRESENT',
        source: 'PHONE_BIOMETRIC',
        markedAt: new Date('2026-11-10T09:00:00.000Z'),
        classSession: {
          id: 'session-id',
          title: 'Biology class',
          startsAt: new Date('2026-11-10T08:00:00.000Z'),
          subject: { name: 'Biology' },
          batch: { name: 'Batch 7' },
        },
      },
    ]);

    const result = await service.getParentDashboard({
      userId: 'parent-user',
      membershipId: 'parent-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.PARENT,
    });

    expect(prisma.attendance.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          studentId: { in: ['linked-student'] },
          classSession: { instituteId: 'institute-id' },
        },
      }),
    );
    expect(prisma.attendance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          studentId: { in: ['linked-student'] },
          markedAt: { gte: expect.any(Date) },
          classSession: { instituteId: 'institute-id' },
        },
        take: 500,
        select: expect.objectContaining({ source: true }),
      }),
    );
    expect(result.children[0]).toMatchObject({
      attendance: {
        present: 2,
        absent: 1,
        late: 1,
        recorded: 4,
        rate: 75,
      },
      courses: [
        {
          branch: { name: 'Central', city: 'Pune' },
          teacher: { fullName: 'Teacher One' },
          sessions: [{ title: 'Biology class' }],
        },
      ],
      assignments: [
        {
          id: 'assignment-id',
          batch: { id: 'batch-id', name: 'Batch 7', course: 'Science' },
          submittedAt: new Date('2026-11-10T09:00:00.000Z'),
        },
      ],
      attendanceRecords: [
        {
          id: 'attendance-id',
          source: 'PHONE_BIOMETRIC',
          classSession: { subject: { name: 'Biology' } },
        },
      ],
    });
  });

  it('fails when the student has no institute-scoped profile', async () => {
    prisma.studentProfile.findFirst.mockResolvedValue(null);

    await expect(
      service.getStudentDashboard({
        userId: 'student-user',
        membershipId: 'student-membership',
        instituteId: 'institute-id',
        branchId: null,
        role: UserRole.STUDENT,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('limits branch-admin student portal previews to their own branch', async () => {
    prisma.studentProfile.findFirst
      .mockResolvedValueOnce({
        membershipId: 'student-membership',
        membership: { userId: 'student-user' },
      })
      .mockResolvedValueOnce({
        id: 'student-id',
        admissionNumber: 'A-1',
        membership: { user: { fullName: 'Student One' } },
      });

    await service.getAdminStudentPreview('student-id', {
      userId: 'branch-admin',
      membershipId: 'branch-admin-membership',
      instituteId: 'institute-id',
      branchId: 'branch-id',
      role: UserRole.BRANCH_ADMIN,
    });

    expect(prisma.studentProfile.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: {
          id: 'student-id',
          membership: {
            instituteId: 'institute-id',
            role: UserRole.STUDENT,
            branchId: 'branch-id',
          },
        },
      }),
    );
    expect(prisma.studentProfile.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          membershipId: 'student-membership',
          membership: { instituteId: 'institute-id' },
        },
      }),
    );
  });

  it('limits parent portal previews to parents linked to the admin branch', async () => {
    prisma.membership.findFirst.mockResolvedValue({
      id: 'parent-membership',
      userId: 'parent-user',
      branchId: null,
    });

    await service.getAdminParentPreview('parent-membership', {
      userId: 'branch-admin',
      membershipId: 'branch-admin-membership',
      instituteId: 'institute-id',
      branchId: 'branch-id',
      role: UserRole.BRANCH_ADMIN,
    });

    expect(prisma.membership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'parent-membership',
          instituteId: 'institute-id',
          role: UserRole.PARENT,
          OR: expect.arrayContaining([
            { branchId: 'branch-id' },
            {
              parentLinks: {
                some: {
                  student: {
                    membership: { branchId: 'branch-id' },
                  },
                },
              },
            },
          ]),
        }),
      }),
    );
    expect(prisma.parentStudent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          parentMembershipId: 'parent-membership',
          student: {
            membership: {
              instituteId: 'institute-id',
              branchId: 'branch-id',
            },
          },
        },
      }),
    );
  });
});
