import {
  BadGatewayException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, UserRole } from '@prisma/client';
import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AI_PROVIDER } from './ai-provider.js';
import { AiLearningService } from './ai-learning.service.js';

describe('AiLearningService', () => {
  let service: AiLearningService;
  let prisma: {
    subject: { findFirst: ReturnType<typeof vi.fn> };
    studentProfile: { findFirst: ReturnType<typeof vi.fn> };
    enrollment: { findFirst: ReturnType<typeof vi.fn> };
    courseLesson: { findMany: ReturnType<typeof vi.fn> };
    result: { findMany: ReturnType<typeof vi.fn> };
    aiUsage: {
      count: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };
  let provider: { generateJson: ReturnType<typeof vi.fn> };
  let moduleRef: TestingModule;

  beforeEach(async () => {
    prisma = {
      subject: { findFirst: vi.fn().mockResolvedValue({ name: 'Biology' }) },
      studentProfile: {
        findFirst: vi.fn().mockResolvedValue({ id: 'student-id' }),
      },
      enrollment: {
        findFirst: vi.fn().mockResolvedValue({ id: 'enrollment-id' }),
      },
      courseLesson: {
        findMany: vi
          .fn()
          .mockResolvedValue([
            { title: 'Cell structure', content: 'Cells contain organelles.' },
          ]),
      },
      result: { findMany: vi.fn().mockResolvedValue([]) },
      aiUsage: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({ id: 'usage-id' }),
      },
    };
    provider = {
      generateJson: vi.fn().mockResolvedValue({
        content: {
          questions: [
            {
              prompt: 'Which organelle contains genetic material?',
              options: [
                { text: 'Nucleus', isCorrect: true },
                { text: 'Ribosome', isCorrect: false },
                { text: 'Vacuole', isCorrect: false },
                { text: 'Cell wall', isCorrect: false },
              ],
            },
          ],
        },
        inputTokens: 25,
        outputTokens: 35,
      }),
    };
    moduleRef = await Test.createTestingModule({
      providers: [
        AiLearningService,
        { provide: PrismaService, useValue: prisma },
        { provide: AI_PROVIDER, useValue: provider },
      ],
    }).compile();
    service = moduleRef.get(AiLearningService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('generates validated draft questions within the teacher subject scope', async () => {
    const actor: AuthIdentity = {
      userId: 'teacher-user',
      membershipId: 'teacher-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.TEACHER,
    };

    const generated = await service.generateQuestions(
      {
        subjectId: 'subject-id',
        topic: 'Cell biology',
        count: 1,
        difficulty: 'MEDIUM',
        questionType: 'SINGLE_CHOICE',
      },
      actor,
    );

    expect(prisma.subject.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'subject-id',
          course: {
            is: {
              instituteId: 'institute-id',
              batches: {
                some: {
                  isActive: true,
                  teacherMembershipId: 'teacher-membership',
                },
              },
            },
          },
        }),
      }),
    );
    expect(generated.questions[0]).toMatchObject({
      type: 'SINGLE_CHOICE',
      marks: 1,
      prompt: 'Which organelle contains genetic material?',
    });
    expect(prisma.aiUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          instituteId: 'institute-id',
          membershipId: 'teacher-membership',
          feature: 'QUESTION_GENERATION',
          inputTokens: 25,
          outputTokens: 35,
        }),
      }),
    );
  });

  it('rejects malformed provider questions instead of returning them to staff', async () => {
    provider.generateJson.mockResolvedValue({
      content: { questions: [{ prompt: 'Invalid', options: [] }] },
      inputTokens: 1,
      outputTokens: 1,
    });

    await expect(
      service.generateQuestions(
        {
          subjectId: 'subject-id',
          topic: 'Cell biology',
          count: 1,
          difficulty: 'EASY',
          questionType: 'SINGLE_CHOICE',
        },
        {
          userId: 'admin-user',
          membershipId: 'admin-membership',
          instituteId: 'institute-id',
          branchId: null,
          role: UserRole.INSTITUTE_ADMIN,
        },
      ),
    ).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('enforces a daily user limit before calling the provider', async () => {
    prisma.aiUsage.count.mockResolvedValue(20);

    await expect(
      service.generateQuestions(
        {
          subjectId: 'subject-id',
          topic: 'Cell biology',
          count: 1,
          difficulty: 'EASY',
          questionType: 'SINGLE_CHOICE',
        },
        {
          userId: 'admin-user',
          membershipId: 'admin-membership',
          instituteId: 'institute-id',
          branchId: null,
          role: UserRole.INSTITUTE_ADMIN,
        },
      ),
    ).rejects.toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
    expect(provider.generateJson).not.toHaveBeenCalled();
  });

  it('analyzes anonymized assessment percentages for the authenticated student', async () => {
    prisma.result.findMany.mockResolvedValue([
      {
        percentage: new Prisma.Decimal(82),
        attempt: { exam: { subject: { name: 'Biology' } } },
      },
    ]);
    provider.generateJson.mockResolvedValue({
      content: {
        summary: 'Your recent biology result is strong.',
        strengths: ['Biology'],
        focusAreas: ['Review cell division'],
      },
      inputTokens: 20,
      outputTokens: 15,
    });
    const student: AuthIdentity = {
      userId: 'student-user',
      membershipId: 'student-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.STUDENT,
    };

    const analysis = await service.analyzeStudentPerformance(student);

    expect(analysis).toEqual({
      summary: 'Your recent biology result is strong.',
      strengths: ['Biology'],
      focusAreas: ['Review cell division'],
      assessmentCount: 1,
    });
    const prompt = provider.generateJson.mock.calls[0][0] as string;
    expect(prompt).toContain('"percentage":82');
    expect(prompt).not.toContain('student-user');
    expect(prompt).not.toContain('student-membership');
  });

  it('answers tutor questions using published notes from an actively enrolled course', async () => {
    provider.generateJson.mockResolvedValue({
      content: {
        answer: 'Organelles are specialized structures inside a cell.',
        followUpQuestions: ['What does the nucleus do?'],
      },
      inputTokens: 30,
      outputTokens: 20,
    });
    const student: AuthIdentity = {
      userId: 'student-user',
      membershipId: 'student-membership',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.STUDENT,
    };

    await expect(
      service.answerTutorQuestion(
        { courseId: 'course-id', question: 'What are organelles?' },
        student,
      ),
    ).resolves.toEqual({
      answer: 'Organelles are specialized structures inside a cell.',
      followUpQuestions: ['What does the nucleus do?'],
    });

    expect(prisma.enrollment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          studentId: 'student-id',
          status: 'ACTIVE',
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
    const prompt = provider.generateJson.mock.calls[0][0] as string;
    expect(prompt).toContain('Cells contain organelles.');
    expect(prompt).not.toContain('student-user');
    expect(prisma.aiUsage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ feature: 'AI_TUTOR' }),
      }),
    );
  });

  it('does not answer questions for courses the student is not enrolled in', async () => {
    prisma.enrollment.findFirst.mockResolvedValue(null);

    await expect(
      service.answerTutorQuestion(
        { courseId: 'other-course', question: 'Explain photosynthesis.' },
        {
          userId: 'student-user',
          membershipId: 'student-membership',
          instituteId: 'institute-id',
          branchId: null,
          role: UserRole.STUDENT,
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(provider.generateJson).not.toHaveBeenCalled();
  });
});
