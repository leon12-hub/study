import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  EnrollmentStatus,
  Prisma,
  QuestionType,
  UserRole,
} from '@prisma/client';
import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { LearningService } from './learning.service.js';

describe('LearningService', () => {
  let service: LearningService;
  let prisma: {
    course: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    courseLesson: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
    branch: { findFirst: ReturnType<typeof vi.fn> };
    batch: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    classroom: { findMany: ReturnType<typeof vi.fn> };
    membership: { findFirst: ReturnType<typeof vi.fn> };
    exam: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    subject: {
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    enrollment: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    studentAttempt: {
      findFirst: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
    studentProfile: { findFirst: ReturnType<typeof vi.fn> };
    assignment: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
    assignmentSubmission: {
      findFirst: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      upsert: ReturnType<typeof vi.fn>;
    };
  };
  let transaction: {
    studentAttempt: { updateMany: ReturnType<typeof vi.fn> };
    studentAnswer: { createMany: ReturnType<typeof vi.fn> };
    result: { create: ReturnType<typeof vi.fn> };
    exam: { create: ReturnType<typeof vi.fn> };
    auditLog: { create: ReturnType<typeof vi.fn> };
    courseLesson: { create: ReturnType<typeof vi.fn> };
    batch: { findMany: ReturnType<typeof vi.fn> };
    notification: { createMany: ReturnType<typeof vi.fn> };
  };
  let moduleRef: TestingModule;

  beforeEach(async () => {
    transaction = {
      studentAttempt: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      studentAnswer: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
      result: {
        create: vi.fn().mockResolvedValue({
          score: new Prisma.Decimal(2),
          percentage: new Prisma.Decimal(100),
          publishedAt: new Date(),
        }),
      },
      exam: {
        create: vi.fn().mockResolvedValue({
          id: 'exam-id',
          title: 'Unit check',
          status: 'PUBLISHED',
          durationMinutes: 20,
          totalMarks: new Prisma.Decimal(1),
          startsAt: null,
          endsAt: null,
        }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
      courseLesson: {
        create: vi.fn().mockResolvedValue({
          id: 'lesson-id',
          title: 'Lesson one',
          content: null,
          mediaKind: null,
          originalName: null,
          position: 0,
          isPublished: true,
          createdAt: new Date(),
        }),
      },
      batch: { findMany: vi.fn().mockResolvedValue([]) },
      notification: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };
    prisma = {
      course: {
        findFirst: vi.fn().mockResolvedValue({ id: 'course-id' }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      courseLesson: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
      },
      branch: { findFirst: vi.fn().mockResolvedValue({ id: 'branch-id' }) },
      batch: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue({
          id: 'batch-id',
          branchId: 'branch-id',
        }),
        create: vi.fn().mockResolvedValue({ id: 'batch-id' }),
      },
      classroom: { findMany: vi.fn().mockResolvedValue([]) },
      membership: {
        findFirst: vi.fn().mockResolvedValue({ id: 'teacher-id' }),
      },
      exam: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      subject: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'subject-id',
          name: 'Math',
          courseId: 'course-id',
        }),
        create: vi.fn().mockResolvedValue({ id: 'subject-id' }),
      },
      enrollment: {
        findFirst: vi.fn().mockResolvedValue({ id: 'enrollment-id' }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      studentProfile: {
        findFirst: vi.fn().mockResolvedValue({ id: 'student-id' }),
      },
      studentAttempt: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn(
        (callback: (tx: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
      assignment: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue({ id: 'assignment-id' }),
      },
      assignmentSubmission: {
        findFirst: vi.fn().mockResolvedValue({ id: 'submission-id' }),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue({
          id: 'submission-id',
          marksAwarded: new Prisma.Decimal(8),
          submittedAt: new Date(),
        }),
        upsert: vi.fn().mockResolvedValue({ id: 'submission-id' }),
      },
    };
    moduleRef = await Test.createTestingModule({
      providers: [
        LearningService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(LearningService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('limits branch administrators course batch counts to their own branch', async () => {
    const actor: AuthIdentity = {
      userId: 'admin-id',
      membershipId: 'membership-id',
      instituteId: 'institute-id',
      branchId: 'branch-id',
      role: UserRole.BRANCH_ADMIN,
    };

    await service.getCourses(actor);

    expect(prisma.course.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { instituteId: 'institute-id' },
        select: expect.objectContaining({
          _count: {
            select: {
              batches: { where: { branchId: 'branch-id', isActive: true } },
              lessons: true,
            },
          },
        }),
      }),
    );
  });

  it('limits teachers to assignments for their assigned active batches', async () => {
    const actor: AuthIdentity = {
      userId: 'teacher-user',
      membershipId: 'teacher-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.TEACHER,
    };

    await service.getAssignments(actor);

    expect(prisma.assignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          instituteId: 'institute-id',
          batch: {
            is: {
              isActive: true,
              teacherMembershipId: 'teacher-membership',
            },
          },
        },
      }),
    );
  });

  it('creates batches only for an in-scope branch, active course and teacher', async () => {
    const actor: AuthIdentity = {
      userId: 'admin-user',
      membershipId: 'admin-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.INSTITUTE_ADMIN,
    };

    await service.createBatch(
      {
        branchId: 'branch-id',
        courseId: 'course-id',
        teacherMembershipId: 'teacher-id',
        name: 'Evening batch',
        capacity: 30,
      },
      actor,
    );

    expect(prisma.branch.findFirst).toHaveBeenCalledWith({
      where: { id: 'branch-id', instituteId: 'institute-id' },
      select: { id: true },
    });
    expect(prisma.course.findFirst).toHaveBeenCalledWith({
      where: { id: 'course-id', instituteId: 'institute-id', isActive: true },
      select: { id: true },
    });
    expect(prisma.membership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'teacher-id',
          instituteId: 'institute-id',
          role: UserRole.TEACHER,
        }),
      }),
    );
    expect(prisma.batch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          instituteId: 'institute-id',
          branchId: 'branch-id',
          courseId: 'course-id',
          teacherMembershipId: 'teacher-id',
          name: 'Evening batch',
          capacity: 30,
        }),
      }),
    );
  });

  it('rejects a branch admin batch request outside the assigned branch', async () => {
    await expect(
      service.createBatch(
        {
          branchId: 'other-branch',
          courseId: 'course-id',
          name: 'Out of scope batch',
        },
        {
          userId: 'branch-admin',
          membershipId: 'branch-membership',
          instituteId: 'institute-id',
          branchId: 'branch-id',
          role: UserRole.BRANCH_ADMIN,
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.branch.findFirst).not.toHaveBeenCalled();
    expect(prisma.batch.create).not.toHaveBeenCalled();
  });

  it('creates a submission only for an active enrollment in the assignment batch', async () => {
    const actor: AuthIdentity = {
      userId: 'student-user',
      membershipId: 'student-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.STUDENT,
    };

    await service.submitAssignment('assignment-id', 'My answer', actor);

    expect(prisma.assignment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'assignment-id',
          instituteId: 'institute-id',
          batch: {
            enrollments: {
              some: {
                studentId: 'student-id',
                status: EnrollmentStatus.ACTIVE,
              },
            },
          },
        }),
      }),
    );
    expect(prisma.assignmentSubmission.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          assignmentId_studentId: {
            assignmentId: 'assignment-id',
            studentId: 'student-id',
          },
        },
        update: expect.objectContaining({ marksAwarded: null }),
      }),
    );
  });

  it('limits assignment reviews and grading to the teacher’s batches', async () => {
    const teacher: AuthIdentity = {
      userId: 'teacher-user',
      membershipId: 'teacher-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.TEACHER,
    };

    await service.getAssignmentSubmissions('assignment-id', teacher);
    await service.gradeAssignmentSubmission(
      'assignment-id',
      'submission-id',
      { marksAwarded: 8.5 },
      teacher,
    );

    expect(prisma.assignment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'assignment-id',
          instituteId: 'institute-id',
          batch: { is: { teacherMembershipId: 'teacher-membership' } },
        },
      }),
    );
    expect(prisma.assignmentSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'submission-id' },
        data: { marksAwarded: new Prisma.Decimal(8.5) },
      }),
    );
  });

  it('only returns published lessons for a course the student is enrolled in', async () => {
    const actor: AuthIdentity = {
      userId: 'student-user',
      membershipId: 'student-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.STUDENT,
    };

    await service.getStudentCourseLessons('course-id', actor);

    expect(prisma.enrollment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          studentId: 'student-id',
          status: EnrollmentStatus.ACTIVE,
          batch: { is: { courseId: 'course-id' } },
        },
      }),
    );
    expect(prisma.courseLesson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { courseId: 'course-id', isPublished: true },
      }),
    );
  });

  it('does not disclose lessons for a course without an active enrollment', async () => {
    prisma.enrollment.findFirst.mockResolvedValue(null);
    const actor: AuthIdentity = {
      userId: 'student-user',
      membershipId: 'student-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.STUDENT,
    };

    await expect(
      service.getStudentCourseLessons('other-course', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.courseLesson.findMany).not.toHaveBeenCalled();
  });

  it('only serves published course lesson files to enrolled students', async () => {
    const actor: AuthIdentity = {
      userId: 'student-user',
      membershipId: 'student-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.STUDENT,
    };
    prisma.courseLesson.findFirst.mockResolvedValue({
      storageKey: '00000000-0000-0000-0000-000000000001.pdf',
      mimeType: 'application/pdf',
      originalName: 'lesson-notes.pdf',
    });

    await expect(
      service.getCourseLessonFile('course-id', 'lesson-id', actor),
    ).resolves.toMatchObject({
      mimeType: 'application/pdf',
      originalName: 'lesson-notes.pdf',
      path: expect.stringMatching(/00000000-0000-0000-0000-000000000001\.pdf$/),
    });
    expect(prisma.courseLesson.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'lesson-id',
          courseId: 'course-id',
          isPublished: true,
          storageKey: { not: null },
        },
      }),
    );
  });

  it('does not return files from unpublished lessons to enrolled students', async () => {
    const actor: AuthIdentity = {
      userId: 'student-user',
      membershipId: 'student-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.STUDENT,
    };
    prisma.courseLesson.findFirst.mockResolvedValue(null);

    await expect(
      service.getCourseLessonFile('course-id', 'lesson-id', actor),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.courseLesson.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isPublished: true }),
      }),
    );
  });

  it('publishes new lessons by default and notifies course participants', async () => {
    transaction.batch.findMany.mockResolvedValue([
      {
        teacherMembershipId: 'teacher-membership',
        enrollments: [
          {
            student: {
              membershipId: 'student-membership',
              parentLinks: [{ parentMembershipId: 'parent-membership' }],
            },
          },
        ],
      },
    ]);
    const actor: AuthIdentity = {
      userId: 'admin-user',
      membershipId: 'admin-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.INSTITUTE_ADMIN,
    };

    await service.createCourseLesson(
      'course-id',
      { title: 'Lesson one', position: 0 },
      actor,
    );

    expect(transaction.courseLesson.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPublished: true }),
      }),
    );
    expect(transaction.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ membershipId: 'student-membership' }),
        expect.objectContaining({ membershipId: 'parent-membership' }),
        expect.objectContaining({ membershipId: 'teacher-membership' }),
      ]),
    });
  });

  it('returns an exam report limited to the teacher’s assigned batches', async () => {
    prisma.exam.findFirst.mockResolvedValue({
      id: 'exam-id',
      title: 'Unit check',
      status: 'PUBLISHED',
      durationMinutes: 20,
      totalMarks: new Prisma.Decimal(2),
      startsAt: null,
      endsAt: null,
      subject: {
        name: 'Math',
        course: {
          name: 'Algebra',
          batches: [
            {
              id: 'assigned-batch',
              enrollments: [{ studentId: 'student-id' }],
            },
          ],
        },
      },
    });
    prisma.studentAttempt.findMany.mockResolvedValue([
      {
        id: 'attempt-id',
        status: 'EVALUATED',
        submittedAt: new Date(),
        student: {
          admissionNumber: 'A-1',
          membership: { user: { fullName: 'Student One' } },
        },
        result: {
          score: new Prisma.Decimal(2),
          percentage: new Prisma.Decimal(100),
          publishedAt: new Date(),
        },
        answers: [
          {
            responseText: null,
            selectedOptionIds: ['right-option'],
            marksAwarded: new Prisma.Decimal(2),
            question: {
              prompt: 'Choose one',
              marks: new Prisma.Decimal(2),
              options: [
                { id: 'right-option', text: 'Correct', isCorrect: true },
                { id: 'wrong-option', text: 'Incorrect', isCorrect: false },
              ],
            },
          },
        ],
      },
    ]);
    const actor: AuthIdentity = {
      userId: 'teacher-user',
      membershipId: 'teacher-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.TEACHER,
    };

    const report = await service.getExamReport('exam-id', actor);

    expect(prisma.exam.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'exam-id',
          subject: {
            course: {
              batches: {
                some: expect.objectContaining({
                  teacherMembershipId: 'teacher-membership',
                }),
              },
            },
          },
        }),
      }),
    );
    expect(prisma.studentAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          examId: 'exam-id',
          student: {
            enrollments: {
              some: {
                batchId: { in: ['assigned-batch'] },
                status: EnrollmentStatus.ACTIVE,
              },
            },
          },
        }),
      }),
    );
    expect(report).toMatchObject({
      summary: {
        assignedStudents: 1,
        submitted: 1,
        evaluated: 1,
        averagePercentage: 100,
      },
      attempts: [
        {
          student: { fullName: 'Student One', admissionNumber: 'A-1' },
          answers: [
            {
              marksAwarded: 2,
              question: { marks: 2 },
            },
          ],
        },
      ],
    });
  });

  it('starts an eligible student attempt without returning correct options', async () => {
    prisma.exam.findFirst.mockResolvedValue({
      id: 'exam-id',
      durationMinutes: 30,
      questions: [
        {
          question: {
            id: 'question-id',
            prompt: 'Choose one',
            type: 'SINGLE_CHOICE',
            marks: new Prisma.Decimal(1),
            options: [{ id: 'option-id', text: 'Option A' }],
          },
        },
      ],
    });
    prisma.studentAttempt.findUnique.mockResolvedValue({
      id: 'attempt-id',
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    });

    const result = await service.startExam('exam-id', {
      userId: 'student-user',
      membershipId: 'student-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.STUDENT,
    });

    expect(result.questions[0].options[0]).toEqual({
      id: 'option-id',
      text: 'Option A',
    });
    expect(prisma.exam.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ['PUBLISHED', 'SCHEDULED'] },
        }),
      }),
    );
  });

  it('scores objective exam answers and publishes a result once', async () => {
    prisma.studentAttempt.findFirst.mockResolvedValue({
      id: 'attempt-id',
      startedAt: new Date(Date.now() - 1_000),
      exam: {
        durationMinutes: 30,
        endsAt: null,
        totalMarks: new Prisma.Decimal(2),
        negativeMarking: new Prisma.Decimal(0.5),
        questions: [
          {
            question: {
              id: 'question-id',
              marks: new Prisma.Decimal(2),
              options: [
                { id: 'right-option', isCorrect: true },
                { id: 'wrong-option', isCorrect: false },
              ],
            },
          },
        ],
      },
    });

    const result = await service.submitExam(
      'exam-id',
      'attempt-id',
      {
        answers: [
          { questionId: 'question-id', selectedOptionIds: ['right-option'] },
        ],
      },
      {
        userId: 'student-user',
        membershipId: 'student-membership',
        instituteId: 'institute-id',
        branchId: null,
        role: UserRole.STUDENT,
      },
    );

    expect(result.score.toString()).toBe('2');
    expect(result.percentage.toString()).toBe('100');
    expect(result.publishedAt).toBeInstanceOf(Date);
  });

  it('creates a scoped single-choice assessment and records its correct option', async () => {
    transaction.batch.findMany.mockResolvedValue([
      {
        teacherMembershipId: 'teacher-membership',
        enrollments: [
          {
            student: {
              membershipId: 'student-membership',
              parentLinks: [{ parentMembershipId: 'parent-membership' }],
            },
          },
        ],
      },
    ]);
    const actor: AuthIdentity = {
      userId: 'institute-admin',
      membershipId: 'admin-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.INSTITUTE_ADMIN,
    };

    await service.createExam(
      {
        subjectId: 'subject-id',
        title: 'Unit check',
        durationMinutes: 20,
        questions: [
          {
            type: QuestionType.SINGLE_CHOICE,
            prompt: 'Choose one',
            options: [
              { text: 'Correct', isCorrect: true },
              { text: 'Incorrect', isCorrect: false },
            ],
          },
        ],
      },
      actor,
    );

    expect(prisma.subject.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'subject-id',
          course: { is: { instituteId: 'institute-id' } },
        }),
      }),
    );
    expect(transaction.exam.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          questions: {
            create: [
              expect.objectContaining({
                question: {
                  create: expect.objectContaining({
                    options: {
                      create: [
                        expect.objectContaining({ isCorrect: true }),
                        expect.objectContaining({ isCorrect: false }),
                      ],
                    },
                  }),
                },
              }),
            ],
          },
        }),
      }),
    );
    expect(transaction.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          membershipId: 'student-membership',
          category: 'EXAM',
        }),
        expect.objectContaining({ membershipId: 'parent-membership' }),
        expect.objectContaining({ membershipId: 'teacher-membership' }),
      ]),
    });
  });

  it('creates multiple-choice questions with partial negative marking', async () => {
    const actor: AuthIdentity = {
      userId: 'institute-admin',
      membershipId: 'admin-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.INSTITUTE_ADMIN,
    };

    await service.createExam(
      {
        subjectId: 'subject-id',
        title: 'Advanced unit check',
        durationMinutes: 45,
        negativeMarking: 0.25,
        questions: [
          {
            type: QuestionType.MULTIPLE_CHOICE,
            prompt: 'Select all correct statements.',
            marks: 2,
            options: [
              { text: 'Correct A', isCorrect: true },
              { text: 'Correct B', isCorrect: true },
              { text: 'Incorrect', isCorrect: false },
            ],
          },
        ],
      },
      actor,
    );

    expect(transaction.exam.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          negativeMarking: new Prisma.Decimal(0.25),
          totalMarks: new Prisma.Decimal(2),
          questions: {
            create: [
              expect.objectContaining({
                question: {
                  create: expect.objectContaining({
                    type: QuestionType.MULTIPLE_CHOICE,
                    options: {
                      create: [
                        expect.objectContaining({ isCorrect: true }),
                        expect.objectContaining({ isCorrect: true }),
                        expect.objectContaining({ isCorrect: false }),
                      ],
                    },
                  }),
                },
              }),
            ],
          },
        }),
      }),
    );
  });
});
