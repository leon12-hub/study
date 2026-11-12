import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  EnrollmentStatus,
  ExamStatus,
  Prisma,
  QuestionType,
  UserRole,
} from '@prisma/client';
import type { AuthIdentity } from '../auth/auth.types.js';
import {
  deletePrivateFile,
  getPrivateFilePath,
  getSafeOriginalName,
  storePrivateFileFromPath,
} from '../files/private-file-storage.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { CreateBatchDto, UpdateBatchDto } from './dto/create-batch.dto.js';
import {
  CreateClassroomDto,
  UpdateClassroomDto,
} from './dto/create-classroom.dto.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { CreateExamDto, SubmitExamDto } from './dto/create-exam.dto.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { GradeAssignmentSubmissionDto } from './dto/grade-assignment-submission.dto.js';
import { CreateSubjectDto } from './dto/create-subject.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';

const COURSE_WITH_CONTENT = {
  id: true,
  name: true,
  description: true,
  isActive: true,
  subjects: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
} satisfies Prisma.CourseSelect;

const ASSIGNMENT_CREATOR_ROLES: UserRole[] = [
  UserRole.INSTITUTE_ADMIN,
  UserRole.BRANCH_ADMIN,
  UserRole.TEACHER,
];
const COURSE_LESSON_MIME_TYPES = {
  PDF: ['application/pdf'],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime'],
} as const;

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  async getStudentProfile(actor: AuthIdentity) {
    await this.requireStudentId(actor);
    const membership = await this.prisma.membership.findUnique({
      where: { id: actor.membershipId },
      select: {
        student: { select: { admissionNumber: true } },
        user: { select: { fullName: true } },
      },
    });
    if (!membership?.student) {
      throw new NotFoundException('Student profile not found.');
    }
    return {
      fullName: membership.user.fullName,
      admissionNumber: membership.student.admissionNumber,
    };
  }

  async getCourses(actor: AuthIdentity) {
    const instituteId = this.requireInstitute(actor);
    const branchId = this.getBranchScope(actor);
    const batchScope: Prisma.BatchWhereInput = {
      isActive: true,
      ...(branchId ? { branchId } : {}),
      ...(actor.role === UserRole.TEACHER
        ? { teacherMembershipId: actor.membershipId }
        : {}),
    };
    return this.prisma.course.findMany({
      where: {
        instituteId,
        ...(actor.role === UserRole.TEACHER
          ? { batches: { some: batchScope } }
          : {}),
      },
      orderBy: { name: 'asc' },
      select: {
        ...COURSE_WITH_CONTENT,
        _count: {
          select: {
            batches: { where: batchScope },
            lessons: true,
          },
        },
      },
    });
  }

  async createCourse(dto: CreateCourseDto, actor: AuthIdentity) {
    const instituteId = this.requireRole(actor, [UserRole.INSTITUTE_ADMIN]);
    try {
      const course = await this.prisma.course.create({
        data: {
          instituteId,
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          subjects: {
            create: (dto.subjects ?? []).map((name) => ({
              name: name.trim(),
            })),
          },
        },
        select: COURSE_WITH_CONTENT,
      });
      return course;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A course with this name already exists.');
      }
      throw error;
    }
  }

  async updateCourse(
    courseId: string,
    dto: UpdateCourseDto,
    actor: AuthIdentity,
  ) {
    const instituteId = this.requireRole(actor, [UserRole.INSTITUTE_ADMIN]);
    const data: Prisma.CourseUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'Provide at least one course field to update.',
      );
    }
    try {
      return await this.prisma.course.update({
        where: { id: courseId, instituteId },
        data,
        select: COURSE_WITH_CONTENT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A course with this name already exists.');
      }
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Course not found in your institute.');
      }
      throw error;
    }
  }

  async createCourseSubject(
    courseId: string,
    dto: CreateSubjectDto,
    actor: AuthIdentity,
  ) {
    this.requireRole(actor, [UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN]);
    await this.requireCourseAccess(courseId, actor);
    try {
      return await this.prisma.subject.create({
        data: { courseId, name: dto.name.trim() },
        select: { id: true, name: true, courseId: true, createdAt: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A subject with this name already exists in the course.',
        );
      }
      throw error;
    }
  }

  async getInstituteCourseLessons(courseId: string, actor: AuthIdentity) {
    await this.requireCourseAccess(courseId, actor);
    return this.prisma.courseLesson.findMany({
      where: { courseId },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        title: true,
        content: true,
        mediaKind: true,
        originalName: true,
        position: true,
        isPublished: true,
        updatedAt: true,
      },
    });
  }

  async createCourseLesson(
    courseId: string,
    dto: CreateLessonDto,
    actor: AuthIdentity,
    file?: {
      path: string;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ) {
    await this.requireCourseAccess(courseId, actor);
    if (file && !dto.mediaKind) {
      throw new BadRequestException(
        'Choose PDF or Video for the uploaded file.',
      );
    }
    let position = dto.position;
    if (position === undefined) {
      const currentPosition = await this.prisma.courseLesson.aggregate({
        where: { courseId },
        _max: { position: true },
      });
      position = (currentPosition._max.position ?? -1) + 1;
    }

    const storageKey =
      file && dto.mediaKind
        ? await storePrivateFileFromPath(
            file.path,
            file.mimetype,
            COURSE_LESSON_MIME_TYPES[dto.mediaKind],
          )
        : null;
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const lesson = await transaction.courseLesson.create({
          data: {
            courseId,
            title: dto.title.trim(),
            content: dto.content?.trim() || null,
            mediaKind: file && dto.mediaKind ? dto.mediaKind : null,
            storageKey,
            mimeType: file?.mimetype ?? null,
            originalName: file ? getSafeOriginalName(file.originalname) : null,
            position,
            isPublished: dto.isPublished ?? true,
          },
          select: {
            id: true,
            title: true,
            content: true,
            mediaKind: true,
            originalName: true,
            position: true,
            isPublished: true,
            createdAt: true,
          },
        });
        if (lesson.isPublished) {
          await this.notifyCourseParticipants(
            transaction,
            courseId,
            actor,
            'COURSE_LESSON',
            'New course lesson',
            `${lesson.title} is now available in your course.`,
          );
        }
        return lesson;
      });
    } catch (error) {
      if (storageKey) await deletePrivateFile(storageKey);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A lesson already uses this position in the course.',
        );
      }
      throw error;
    }
  }

  async getCourseLessonFile(
    courseId: string,
    lessonId: string,
    actor: AuthIdentity,
  ) {
    if (actor.role === UserRole.STUDENT) {
      const studentId = await this.requireStudentId(actor);
      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          studentId,
          status: EnrollmentStatus.ACTIVE,
          batch: { is: { courseId } },
        },
        select: { id: true },
      });
      if (!enrollment) {
        throw new NotFoundException('Course not found for this student.');
      }
    } else {
      await this.requireCourseAccess(courseId, actor);
    }

    const lesson = await this.prisma.courseLesson.findFirst({
      where: {
        id: lessonId,
        courseId,
        ...(actor.role === UserRole.STUDENT ? { isPublished: true } : {}),
        storageKey: { not: null },
      },
      select: { storageKey: true, mimeType: true, originalName: true },
    });
    if (!lesson?.storageKey || !lesson.mimeType || !lesson.originalName) {
      throw new NotFoundException('Course lesson file not found.');
    }
    return {
      path: getPrivateFilePath(lesson.storageKey),
      mimeType: lesson.mimeType,
      originalName: lesson.originalName,
    };
  }

  async getAssignments(actor: AuthIdentity) {
    const instituteId = this.requireInstitute(actor);
    const branchId = this.getBranchScope(actor);
    const batchScope: Prisma.BatchWhereInput = {
      isActive: true,
      ...(branchId ? { branchId } : {}),
      ...(actor.role === UserRole.TEACHER
        ? { teacherMembershipId: actor.membershipId }
        : {}),
    };
    return this.prisma.assignment.findMany({
      where: {
        instituteId,
        ...(branchId || actor.role === UserRole.TEACHER
          ? { batch: { is: batchScope } }
          : {}),
      },
      orderBy: { dueAt: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        dueAt: true,
        batch: {
          select: { id: true, name: true, course: { select: { name: true } } },
        },
        _count: { select: { submissions: true } },
      },
    });
  }

  async getBatches(actor: AuthIdentity) {
    const instituteId = this.requireInstitute(actor);
    const branchId = this.getBranchScope(actor);
    return this.prisma.batch.findMany({
      where: {
        instituteId,
        isActive: true,
        ...(branchId ? { branchId } : {}),
        ...(actor.role === UserRole.TEACHER
          ? { teacherMembershipId: actor.membershipId }
          : {}),
      },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        branchId: true,
        courseId: true,
        teacherMembershipId: true,
        capacity: true,
        course: { select: { name: true } },
        branch: { select: { name: true } },
        teacher: {
          select: { user: { select: { fullName: true, email: true } } },
        },
        _count: {
          select: {
            enrollments: { where: { status: EnrollmentStatus.ACTIVE } },
          },
        },
      },
    });
  }

  async createBatch(dto: CreateBatchDto, actor: AuthIdentity) {
    const instituteId = this.requireRole(actor, [
      UserRole.INSTITUTE_ADMIN,
      UserRole.BRANCH_ADMIN,
    ]);
    const branchId = this.getBranchScope(actor);
    if (branchId && dto.branchId !== branchId) {
      throw new NotFoundException('Branch not found in your institute scope.');
    }
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: dto.branchId,
        instituteId,
      },
      select: { id: true },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found in your institute scope.');
    }

    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, instituteId, isActive: true },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException('Active course not found in your institute.');
    }

    const teacherMembershipId = dto.teacherMembershipId?.trim() || null;
    if (teacherMembershipId) {
      const teacher = await this.prisma.membership.findFirst({
        where: {
          id: teacherMembershipId,
          instituteId,
          role: UserRole.TEACHER,
          OR: [{ branchId: branch.id }, { branchId: null }],
        },
        select: { id: true },
      });
      if (!teacher) {
        throw new NotFoundException(
          'Teacher not found in the selected branch.',
        );
      }
    }

    try {
      return await this.prisma.batch.create({
        data: {
          instituteId,
          branchId: branch.id,
          courseId: course.id,
          teacherMembershipId,
          name: dto.name.trim(),
          capacity: dto.capacity ?? null,
        },
        select: {
          id: true,
          name: true,
          branchId: true,
          courseId: true,
          teacherMembershipId: true,
          capacity: true,
          isActive: true,
          course: { select: { name: true } },
          branch: { select: { name: true } },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A batch with this name already exists in the institute.',
        );
      }
      throw error;
    }
  }

  async updateBatch(batchId: string, dto: UpdateBatchDto, actor: AuthIdentity) {
    const instituteId = this.requireRole(actor, [
      UserRole.INSTITUTE_ADMIN,
      UserRole.BRANCH_ADMIN,
    ]);
    const branchScope = this.getBranchScope(actor);
    const batch = await this.prisma.batch.findFirst({
      where: {
        id: batchId,
        instituteId,
        ...(branchScope ? { branchId: branchScope } : {}),
      },
      select: { id: true, branchId: true },
    });
    if (!batch) {
      throw new NotFoundException('Batch not found in your institute scope.');
    }

    const branchId = dto.branchId ?? batch.branchId;
    if (branchScope && branchId !== branchScope) {
      throw new NotFoundException('Branch not found in your institute scope.');
    }
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        instituteId,
      },
      select: { id: true },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found in your institute scope.');
    }

    const data: Prisma.BatchUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.branchId !== undefined)
      data.branch = { connect: { id: branch.id } };
    if (dto.courseId !== undefined) {
      const course = await this.prisma.course.findFirst({
        where: { id: dto.courseId, instituteId, isActive: true },
        select: { id: true },
      });
      if (!course) {
        throw new NotFoundException(
          'Active course not found in your institute.',
        );
      }
      data.course = { connect: { id: course.id } };
    }
    if (dto.teacherMembershipId !== undefined) {
      const teacherMembershipId = dto.teacherMembershipId?.trim() || null;
      if (teacherMembershipId) {
        const teacher = await this.prisma.membership.findFirst({
          where: {
            id: teacherMembershipId,
            instituteId,
            role: UserRole.TEACHER,
            OR: [{ branchId: branch.id }, { branchId: null }],
          },
          select: { id: true },
        });
        if (!teacher) {
          throw new NotFoundException(
            'Teacher not found in the selected branch.',
          );
        }
        data.teacher = { connect: { id: teacher.id } };
      } else {
        data.teacher = { disconnect: true };
      }
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'Provide at least one batch field to update.',
      );
    }

    try {
      return await this.prisma.batch.update({
        where: { id: batchId, instituteId },
        data,
        select: {
          id: true,
          name: true,
          branchId: true,
          courseId: true,
          teacherMembershipId: true,
          capacity: true,
          isActive: true,
          course: { select: { name: true } },
          branch: { select: { name: true } },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A batch with this name already exists in the institute.',
        );
      }
      throw error;
    }
  }

  async getClassrooms(actor: AuthIdentity) {
    const instituteId = this.requireInstitute(actor);
    const branchId = this.getBranchScope(actor);
    return this.prisma.classroom.findMany({
      where: { instituteId, ...(branchId ? { branchId } : {}) },
      orderBy: [{ branch: { name: 'asc' } }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        branchId: true,
        capacity: true,
        branch: { select: { name: true } },
        _count: { select: { sessions: true } },
      },
    });
  }

  async createClassroom(dto: CreateClassroomDto, actor: AuthIdentity) {
    const instituteId = this.requireRole(actor, [
      UserRole.INSTITUTE_ADMIN,
      UserRole.BRANCH_ADMIN,
    ]);
    const branchScope = this.getBranchScope(actor);
    if (branchScope && dto.branchId !== branchScope) {
      throw new NotFoundException('Branch not found in your institute scope.');
    }
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: dto.branchId,
        instituteId,
      },
      select: { id: true },
    });
    if (!branch) {
      throw new NotFoundException('Branch not found in your institute scope.');
    }
    try {
      return await this.prisma.classroom.create({
        data: {
          instituteId,
          branchId: branch.id,
          name: dto.name.trim(),
          capacity: dto.capacity ?? null,
        },
        select: {
          id: true,
          name: true,
          branchId: true,
          capacity: true,
          branch: { select: { name: true } },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A classroom with this name already exists in the branch.',
        );
      }
      throw error;
    }
  }

  async updateClassroom(
    classroomId: string,
    dto: UpdateClassroomDto,
    actor: AuthIdentity,
  ) {
    const instituteId = this.requireRole(actor, [
      UserRole.INSTITUTE_ADMIN,
      UserRole.BRANCH_ADMIN,
    ]);
    const branchScope = this.getBranchScope(actor);
    const classroom = await this.prisma.classroom.findFirst({
      where: {
        id: classroomId,
        instituteId,
        ...(branchScope ? { branchId: branchScope } : {}),
      },
      select: { id: true },
    });
    if (!classroom) {
      throw new NotFoundException(
        'Classroom not found in your institute scope.',
      );
    }
    const data: Prisma.ClassroomUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.capacity !== undefined) data.capacity = dto.capacity;
    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'Provide at least one classroom field to update.',
      );
    }
    try {
      return await this.prisma.classroom.update({
        where: { id: classroomId, instituteId },
        data,
        select: {
          id: true,
          name: true,
          branchId: true,
          capacity: true,
          branch: { select: { name: true } },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A classroom with this name already exists in the branch.',
        );
      }
      throw error;
    }
  }

  async createAssignment(dto: CreateAssignmentDto, actor: AuthIdentity) {
    const instituteId = this.requireInstitute(actor);
    if (!ASSIGNMENT_CREATOR_ROLES.includes(actor.role)) {
      throw new ForbiddenException('Your role cannot create assignments.');
    }
    const branchId = this.getBranchScope(actor);
    const batch = await this.prisma.batch.findFirst({
      where: {
        id: dto.batchId,
        instituteId,
        isActive: true,
        ...(branchId ? { branchId } : {}),
        ...(actor.role === UserRole.TEACHER
          ? { teacherMembershipId: actor.membershipId }
          : {}),
      },
      select: { id: true },
    });
    if (!batch) {
      throw new NotFoundException('Active batch not found in your scope.');
    }

    const dueAt = new Date(dto.dueAt);
    if (!Number.isFinite(dueAt.getTime())) {
      throw new BadRequestException('dueAt must be a valid date.');
    }

    return this.prisma.assignment.create({
      data: {
        instituteId,
        batchId: batch.id,
        createdByMembershipId: actor.membershipId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        dueAt,
      },
      select: {
        id: true,
        title: true,
        description: true,
        dueAt: true,
        batch: { select: { id: true, name: true } },
      },
    });
  }

  async getAssignmentSubmissions(assignmentId: string, actor: AuthIdentity) {
    const assignment = await this.findAssignmentInScope(assignmentId, actor);
    if (!assignment) {
      throw new NotFoundException('Assignment not found in your scope.');
    }
    return this.prisma.assignmentSubmission.findMany({
      where: { assignmentId: assignment.id },
      orderBy: [
        { submittedAt: 'asc' },
        { student: { membership: { user: { fullName: 'asc' } } } },
      ],
      select: {
        id: true,
        answerText: true,
        submittedAt: true,
        marksAwarded: true,
        student: {
          select: {
            admissionNumber: true,
            membership: { select: { user: { select: { fullName: true } } } },
          },
        },
      },
    });
  }

  async gradeAssignmentSubmission(
    assignmentId: string,
    submissionId: string,
    dto: GradeAssignmentSubmissionDto,
    actor: AuthIdentity,
  ) {
    const assignment = await this.findAssignmentInScope(assignmentId, actor);
    if (!assignment) {
      throw new NotFoundException('Assignment not found in your scope.');
    }
    const submission = await this.prisma.assignmentSubmission.findFirst({
      where: { id: submissionId, assignmentId: assignment.id },
      select: { id: true },
    });
    if (!submission) {
      throw new NotFoundException('Submission not found for this assignment.');
    }
    return this.prisma.assignmentSubmission.update({
      where: { id: submission.id },
      data: { marksAwarded: new Prisma.Decimal(dto.marksAwarded) },
      select: {
        id: true,
        marksAwarded: true,
        submittedAt: true,
      },
    });
  }

  async getInstituteExams(actor: AuthIdentity) {
    const instituteId = this.requireInstitute(actor);
    const branchId = this.getBranchScope(actor);
    const batchScope: Prisma.BatchWhereInput = {
      isActive: true,
      ...(branchId ? { branchId } : {}),
      ...(actor.role === UserRole.TEACHER
        ? { teacherMembershipId: actor.membershipId }
        : {}),
    };
    return this.prisma.exam.findMany({
      where: {
        instituteId,
        ...(branchId || actor.role === UserRole.TEACHER
          ? { subject: { course: { batches: { some: batchScope } } } }
          : {}),
      },
      orderBy: [{ startsAt: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        status: true,
        durationMinutes: true,
        totalMarks: true,
        startsAt: true,
        endsAt: true,
        subject: { select: { name: true, course: { select: { name: true } } } },
        _count: { select: { attempts: true } },
      },
    });
  }

  async getExamReport(examId: string, actor: AuthIdentity) {
    const instituteId = this.requireRole(actor, [
      UserRole.INSTITUTE_ADMIN,
      UserRole.BRANCH_ADMIN,
      UserRole.TEACHER,
    ]);
    const branchId = this.getBranchScope(actor);
    const batchScope: Prisma.BatchWhereInput = {
      instituteId,
      isActive: true,
      ...(branchId ? { branchId } : {}),
      ...(actor.role === UserRole.TEACHER
        ? { teacherMembershipId: actor.membershipId }
        : {}),
    };
    const exam = await this.prisma.exam.findFirst({
      where: {
        id: examId,
        instituteId,
        ...(branchId || actor.role === UserRole.TEACHER
          ? {
              subject: {
                course: { batches: { some: batchScope } },
              },
            }
          : {}),
      },
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        status: true,
        durationMinutes: true,
        totalMarks: true,
        startsAt: true,
        endsAt: true,
        subject: {
          select: {
            name: true,
            course: {
              select: {
                name: true,
                batches: {
                  where: batchScope,
                  select: {
                    id: true,
                    enrollments: {
                      where: { status: EnrollmentStatus.ACTIVE },
                      select: { studentId: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!exam) {
      throw new NotFoundException('Exam not found in your teaching scope.');
    }

    const batchIds = exam.subject.course.batches.map(({ id }) => id);
    const attempts = batchIds.length
      ? await this.prisma.studentAttempt.findMany({
          where: {
            examId,
            student: {
              enrollments: {
                some: {
                  batchId: { in: batchIds },
                  status: EnrollmentStatus.ACTIVE,
                },
              },
            },
          },
          orderBy: {
            student: { membership: { user: { fullName: 'asc' } } },
          },
          select: {
            id: true,
            status: true,
            startedAt: true,
            submittedAt: true,
            student: {
              select: {
                admissionNumber: true,
                membership: {
                  select: { user: { select: { fullName: true } } },
                },
              },
            },
            result: {
              select: { score: true, percentage: true, publishedAt: true },
            },
            answers: {
              orderBy: { questionId: 'asc' },
              select: {
                responseText: true,
                selectedOptionIds: true,
                marksAwarded: true,
                question: {
                  select: {
                    prompt: true,
                    marks: true,
                    options: {
                      orderBy: { position: 'asc' },
                      select: { id: true, text: true, isCorrect: true },
                    },
                  },
                },
              },
            },
          },
        })
      : [];
    const results = attempts.flatMap((attempt) =>
      attempt.result ? [Number(attempt.result.percentage)] : [],
    );
    const assignedStudentIds = new Set(
      exam.subject.course.batches.flatMap((batch) =>
        batch.enrollments.map(({ studentId }) => studentId),
      ),
    );
    return {
      id: exam.id,
      title: exam.title,
      status: exam.status,
      durationMinutes: exam.durationMinutes,
      totalMarks: Number(exam.totalMarks),
      startsAt: exam.startsAt,
      endsAt: exam.endsAt,
      subject: {
        name: exam.subject.name,
        course: { name: exam.subject.course.name },
      },
      summary: {
        assignedStudents: assignedStudentIds.size,
        submitted: attempts.filter(
          (attempt) => attempt.status !== 'IN_PROGRESS',
        ).length,
        evaluated: results.length,
        averagePercentage:
          results.length > 0
            ? Math.round(
                (results.reduce((total, percentage) => total + percentage, 0) /
                  results.length) *
                  100,
              ) / 100
            : null,
      },
      attempts: attempts.map(({ student, result, answers, ...attempt }) => ({
        ...attempt,
        student: {
          fullName: student.membership.user.fullName,
          admissionNumber: student.admissionNumber,
        },
        result: result
          ? {
              score: Number(result.score),
              percentage: Number(result.percentage),
              publishedAt: result.publishedAt,
            }
          : null,
        answers: answers.map((answer) => ({
          ...answer,
          marksAwarded:
            answer.marksAwarded === null ? null : Number(answer.marksAwarded),
          question: {
            ...answer.question,
            marks: Number(answer.question.marks),
            options: answer.question.options.map(({ id, text, isCorrect }) => ({
              id,
              text,
              isCorrect,
            })),
          },
        })),
      })),
    };
  }

  async createExam(dto: CreateExamDto, actor: AuthIdentity) {
    const instituteId = this.requireInstitute(actor);
    const branchId = this.getBranchScope(actor);
    const batchScope: Prisma.BatchWhereInput = {
      isActive: true,
      ...(branchId ? { branchId } : {}),
      ...(actor.role === UserRole.TEACHER
        ? { teacherMembershipId: actor.membershipId }
        : {}),
    };
    const subject = await this.prisma.subject.findFirst({
      where: {
        id: dto.subjectId,
        course: {
          is: {
            instituteId,
            ...(branchId || actor.role === UserRole.TEACHER
              ? { batches: { some: batchScope } }
              : {}),
          },
        },
      },
      select: { id: true, courseId: true, name: true },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found in your scope.');
    }

    for (const question of dto.questions) {
      if (
        question.type !== QuestionType.SINGLE_CHOICE &&
        question.type !== QuestionType.MULTIPLE_CHOICE
      ) {
        throw new BadRequestException(
          'Exams currently support single-choice and multiple-choice questions.',
        );
      }
      const correctCount = question.options.filter(
        (option) => option.isCorrect,
      ).length;
      if (
        correctCount === 0 ||
        (question.type === QuestionType.SINGLE_CHOICE && correctCount !== 1) ||
        (question.type === QuestionType.MULTIPLE_CHOICE &&
          correctCount === question.options.length)
      ) {
        throw new BadRequestException(
          'Each question must have the correct number of correct options.',
        );
      }
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new BadRequestException('endsAt must be later than startsAt.');
    }
    const totalMarks = dto.questions.reduce(
      (total, question) => total + (question.marks ?? 1),
      0,
    );
    const status =
      startsAt && startsAt.getTime() > Date.now()
        ? ExamStatus.SCHEDULED
        : ExamStatus.PUBLISHED;

    return this.prisma.$transaction(async (transaction) => {
      const exam = await transaction.exam.create({
        data: {
          instituteId,
          subjectId: subject.id,
          title: dto.title.trim(),
          status,
          durationMinutes: dto.durationMinutes,
          totalMarks: new Prisma.Decimal(totalMarks),
          negativeMarking: new Prisma.Decimal(dto.negativeMarking ?? 0),
          startsAt,
          endsAt,
          questions: {
            create: dto.questions.map((question, questionIndex) => ({
              position: questionIndex + 1,
              question: {
                create: {
                  subjectId: subject.id,
                  type: question.type,
                  prompt: question.prompt.trim(),
                  marks: new Prisma.Decimal(question.marks ?? 1),
                  options: {
                    create: question.options.map((option, optionIndex) => ({
                      text: option.text.trim(),
                      isCorrect: option.isCorrect,
                      position: optionIndex + 1,
                    })),
                  },
                },
              },
            })),
          },
        },
        select: {
          id: true,
          title: true,
          status: true,
          durationMinutes: true,
          totalMarks: true,
          startsAt: true,
          endsAt: true,
        },
      });
      await transaction.auditLog.create({
        data: {
          instituteId,
          actorUserId: actor.userId,
          action: 'EXAM_CREATED',
          entityType: 'Exam',
          entityId: exam.id,
          metadata: { questionCount: dto.questions.length, status },
        },
      });
      await this.notifyCourseParticipants(
        transaction,
        subject.courseId,
        actor,
        'EXAM',
        status === ExamStatus.SCHEDULED
          ? 'Exam scheduled'
          : 'New exam available',
        `${exam.title} is available for ${subject.name}.`,
      );
      return exam;
    });
  }

  async startExam(examId: string, actor: AuthIdentity) {
    const studentId = await this.requireStudentId(actor);
    const now = new Date();
    const exam = await this.prisma.exam.findFirst({
      where: {
        id: examId,
        instituteId: actor.instituteId!,
        status: { in: [ExamStatus.PUBLISHED, ExamStatus.SCHEDULED] },
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
        subject: {
          course: {
            batches: {
              some: {
                enrollments: {
                  some: { studentId, status: EnrollmentStatus.ACTIVE },
                },
              },
            },
          },
        },
      },
      select: {
        id: true,
        durationMinutes: true,
        questions: {
          orderBy: { position: 'asc' },
          select: {
            question: {
              select: {
                id: true,
                prompt: true,
                type: true,
                marks: true,
                options: {
                  orderBy: { position: 'asc' },
                  select: { id: true, text: true },
                },
              },
            },
          },
        },
      },
    });
    if (!exam) {
      throw new NotFoundException(
        'Assessment is unavailable for this student.',
      );
    }

    let attempt = await this.prisma.studentAttempt.findUnique({
      where: { examId_studentId: { examId, studentId } },
      select: { id: true, status: true, startedAt: true },
    });
    if (attempt && attempt.status !== 'IN_PROGRESS') {
      throw new ConflictException(
        'This assessment attempt has already been submitted.',
      );
    }
    if (!attempt) {
      try {
        attempt = await this.prisma.studentAttempt.create({
          data: { examId, studentId },
          select: { id: true, status: true, startedAt: true },
        });
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== 'P2002'
        ) {
          throw error;
        }
        attempt = await this.prisma.studentAttempt.findUnique({
          where: { examId_studentId: { examId, studentId } },
          select: { id: true, status: true, startedAt: true },
        });
        if (!attempt || attempt.status !== 'IN_PROGRESS') {
          throw new ConflictException(
            'This assessment attempt has already been submitted.',
          );
        }
      }
    }
    if (
      attempt.startedAt.getTime() + exam.durationMinutes * 60_000 <=
      now.getTime()
    ) {
      throw new ConflictException(
        'The time limit for this assessment has expired.',
      );
    }

    return {
      attempt,
      durationMinutes: exam.durationMinutes,
      questions: exam.questions.map(({ question }) => question),
    };
  }

  async submitExam(
    examId: string,
    attemptId: string,
    dto: SubmitExamDto,
    actor: AuthIdentity,
  ) {
    const studentId = await this.requireStudentId(actor);
    const attempt = await this.prisma.studentAttempt.findFirst({
      where: {
        id: attemptId,
        examId,
        studentId,
        status: 'IN_PROGRESS',
        exam: { instituteId: actor.instituteId! },
      },
      select: {
        id: true,
        startedAt: true,
        exam: {
          select: {
            durationMinutes: true,
            endsAt: true,
            totalMarks: true,
            negativeMarking: true,
            questions: {
              orderBy: { position: 'asc' },
              select: {
                question: {
                  select: {
                    id: true,
                    marks: true,
                    options: {
                      select: { id: true, isCorrect: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!attempt) {
      throw new NotFoundException('Active assessment attempt not found.');
    }

    const now = new Date();
    if (
      attempt.startedAt.getTime() + attempt.exam.durationMinutes * 60_000 <
        now.getTime() ||
      (attempt.exam.endsAt && attempt.exam.endsAt < now)
    ) {
      throw new ForbiddenException(
        'The time limit for this assessment has expired.',
      );
    }

    const questions = attempt.exam.questions.map(({ question }) => question);
    const questionIds = new Set(questions.map(({ id }) => id));
    const providedAnswers = new Map<string, Set<string>>();
    for (const answer of dto.answers) {
      if (!questionIds.has(answer.questionId)) {
        throw new BadRequestException(
          'An answer references a question outside this assessment.',
        );
      }
      if (providedAnswers.has(answer.questionId)) {
        throw new BadRequestException(
          'Each question may be answered only once.',
        );
      }
      const selected = new Set(answer.selectedOptionIds);
      if (selected.size !== answer.selectedOptionIds.length) {
        throw new BadRequestException('Selected options must be unique.');
      }
      const allowedOptions = new Set(
        questions
          .find(({ id }) => id === answer.questionId)!
          .options.map(({ id }) => id),
      );
      if ([...selected].some((optionId) => !allowedOptions.has(optionId))) {
        throw new BadRequestException(
          'An answer contains an option outside its question.',
        );
      }
      providedAnswers.set(answer.questionId, selected);
    }

    let score = 0;
    const answerRecords = questions.map((question) => {
      const selected = providedAnswers.get(question.id) ?? new Set<string>();
      const correct = new Set(
        question.options
          .filter(({ isCorrect }) => isCorrect)
          .map(({ id }) => id),
      );
      const isCorrect =
        selected.size === correct.size &&
        [...selected].every((optionId) => correct.has(optionId));
      const marksAwarded =
        selected.size === 0
          ? 0
          : isCorrect
            ? Number(question.marks)
            : -Number(attempt.exam.negativeMarking);
      score += marksAwarded;
      return {
        attemptId,
        questionId: question.id,
        selectedOptionIds: [...selected],
        marksAwarded: new Prisma.Decimal(marksAwarded),
      };
    });
    score = Math.max(0, score);
    const totalMarks = Number(attempt.exam.totalMarks);
    const percentage =
      totalMarks === 0 ? 0 : Math.round((score / totalMarks) * 10_000) / 100;

    return this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.studentAttempt.updateMany({
        where: { id: attemptId, status: 'IN_PROGRESS' },
        data: { status: 'EVALUATED', submittedAt: now },
      });
      if (updated.count !== 1) {
        throw new ConflictException(
          'This assessment attempt has already been submitted.',
        );
      }
      await transaction.studentAnswer.createMany({ data: answerRecords });
      return transaction.result.create({
        data: {
          attemptId,
          score: new Prisma.Decimal(score),
          percentage: new Prisma.Decimal(percentage),
          publishedAt: now,
        },
        select: { score: true, percentage: true, publishedAt: true },
      });
    });
  }

  async getStudentCourses(actor: AuthIdentity) {
    const studentId = await this.requireStudentId(actor);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId, status: EnrollmentStatus.ACTIVE },
      orderBy: { enrolledAt: 'desc' },
      select: {
        batch: {
          select: {
            id: true,
            name: true,
            course: {
              select: {
                id: true,
                name: true,
                description: true,
                subjects: {
                  select: { id: true, name: true },
                  orderBy: { name: 'asc' },
                },
                _count: {
                  select: { lessons: { where: { isPublished: true } } },
                },
              },
            },
          },
        },
      },
    });
    return enrollments.map(({ batch }) => batch);
  }

  async getStudentCourseLessons(courseId: string, actor: AuthIdentity) {
    const studentId = await this.requireStudentId(actor);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        status: EnrollmentStatus.ACTIVE,
        batch: { is: { courseId } },
      },
      select: { id: true },
    });
    if (!enrollment) {
      throw new NotFoundException('Course not found for this student.');
    }

    return this.prisma.courseLesson.findMany({
      where: { courseId, isPublished: true },
      orderBy: { position: 'asc' },
      select: {
        id: true,
        title: true,
        content: true,
        mediaKind: true,
        originalName: true,
        position: true,
      },
    });
  }

  async getStudentAssignments(actor: AuthIdentity) {
    const studentId = await this.requireStudentId(actor);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId, status: EnrollmentStatus.ACTIVE },
      select: { batchId: true },
    });
    const batchIds = enrollments.map(({ batchId }) => batchId);
    if (batchIds.length === 0) return [];

    const assignments = await this.prisma.assignment.findMany({
      where: { batchId: { in: batchIds }, instituteId: actor.instituteId! },
      orderBy: { dueAt: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        dueAt: true,
        batch: { select: { name: true, course: { select: { name: true } } } },
        submissions: {
          where: { studentId },
          select: {
            id: true,
            answerText: true,
            submittedAt: true,
            marksAwarded: true,
          },
          take: 1,
        },
      },
    });
    return assignments.map(({ submissions, ...assignment }) => ({
      ...assignment,
      submission: submissions[0] ?? null,
    }));
  }

  async submitAssignment(
    assignmentId: string,
    answerText: string,
    actor: AuthIdentity,
  ) {
    if (typeof answerText !== 'string' || answerText.trim().length === 0) {
      throw new BadRequestException('answerText is required.');
    }
    if (answerText.length > 10_000) {
      throw new BadRequestException(
        'answerText must be at most 10000 characters.',
      );
    }

    const studentId = await this.requireStudentId(actor);
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        instituteId: actor.instituteId!,
        batch: {
          enrollments: {
            some: { studentId, status: EnrollmentStatus.ACTIVE },
          },
        },
      },
      select: { id: true },
    });
    if (!assignment) {
      throw new NotFoundException('Assignment not found for this student.');
    }

    return this.prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      create: { assignmentId, studentId, answerText: answerText.trim() },
      update: {
        answerText: answerText.trim(),
        submittedAt: new Date(),
        marksAwarded: null,
      },
      select: {
        id: true,
        answerText: true,
        submittedAt: true,
        marksAwarded: true,
      },
    });
  }

  async getStudentExams(actor: AuthIdentity) {
    const studentId = await this.requireStudentId(actor);
    return this.prisma.exam.findMany({
      where: {
        instituteId: actor.instituteId!,
        status: {
          in: [
            ExamStatus.PUBLISHED,
            ExamStatus.SCHEDULED,
            ExamStatus.COMPLETED,
          ],
        },
        subject: {
          course: {
            batches: {
              some: {
                enrollments: {
                  some: { studentId, status: EnrollmentStatus.ACTIVE },
                },
              },
            },
          },
        },
      },
      orderBy: [{ startsAt: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        title: true,
        status: true,
        durationMinutes: true,
        totalMarks: true,
        startsAt: true,
        endsAt: true,
        subject: { select: { name: true } },
        attempts: {
          where: { studentId },
          select: {
            id: true,
            status: true,
            submittedAt: true,
            result: {
              select: { score: true, percentage: true, publishedAt: true },
            },
          },
          take: 1,
        },
      },
    });
  }

  private async requireStudentId(actor: AuthIdentity): Promise<string> {
    if (!actor.instituteId) {
      throw new ForbiddenException('Your account has no institute membership.');
    }
    const profile = await this.prisma.studentProfile.findFirst({
      where: {
        membershipId: actor.membershipId,
        membership: { instituteId: actor.instituteId },
      },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException('Student profile not found.');
    }
    return profile.id;
  }

  private async requireCourseAccess(courseId: string, actor: AuthIdentity) {
    const instituteId = this.requireInstitute(actor);
    const branchId = this.getBranchScope(actor);
    const batchScope: Prisma.BatchWhereInput = {
      isActive: true,
      ...(branchId ? { branchId } : {}),
      ...(actor.role === UserRole.TEACHER
        ? { teacherMembershipId: actor.membershipId }
        : {}),
    };
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        instituteId,
        ...(actor.role === UserRole.TEACHER
          ? { batches: { some: batchScope } }
          : {}),
      },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found in your scope.');
    }
    return course;
  }

  private async notifyCourseParticipants(
    transaction: Prisma.TransactionClient,
    courseId: string,
    actor: AuthIdentity,
    category: string,
    title: string,
    body: string,
  ) {
    const batches = await transaction.batch.findMany({
      where: {
        instituteId: actor.instituteId!,
        courseId,
        isActive: true,
        ...(actor.role === UserRole.BRANCH_ADMIN
          ? { branchId: actor.branchId! }
          : {}),
        ...(actor.role === UserRole.TEACHER
          ? { teacherMembershipId: actor.membershipId }
          : {}),
      },
      select: {
        teacherMembershipId: true,
        enrollments: {
          where: { status: EnrollmentStatus.ACTIVE },
          select: {
            student: {
              select: {
                membershipId: true,
                parentLinks: { select: { parentMembershipId: true } },
              },
            },
          },
        },
      },
    });
    const membershipIds = new Set<string>();
    for (const batch of batches) {
      if (batch.teacherMembershipId) {
        membershipIds.add(batch.teacherMembershipId);
      }
      for (const { student } of batch.enrollments) {
        membershipIds.add(student.membershipId);
        for (const link of student.parentLinks) {
          membershipIds.add(link.parentMembershipId);
        }
      }
    }
    membershipIds.delete(actor.membershipId);
    if (membershipIds.size === 0) return;

    await transaction.notification.createMany({
      data: [...membershipIds].map((membershipId) => ({
        membershipId,
        category,
        title,
        body,
      })),
    });
  }

  private requireInstitute(actor: AuthIdentity): string {
    if (!actor.instituteId) {
      throw new ForbiddenException('Your account has no institute membership.');
    }
    return actor.instituteId;
  }

  private requireRole(actor: AuthIdentity, roles: UserRole[]): string {
    if (!roles.includes(actor.role)) {
      throw new ForbiddenException('Your role cannot perform this action.');
    }
    return this.requireInstitute(actor);
  }

  private getBranchScope(actor: AuthIdentity): string | null {
    if (actor.role !== UserRole.BRANCH_ADMIN) return null;
    if (!actor.branchId) {
      throw new ForbiddenException(
        'Your branch administrator account has no branch assigned.',
      );
    }
    return actor.branchId;
  }

  private findAssignmentInScope(assignmentId: string, actor: AuthIdentity) {
    const instituteId = this.requireRole(actor, ASSIGNMENT_CREATOR_ROLES);
    const branchId = this.getBranchScope(actor);
    const batchScope: Prisma.BatchWhereInput = {
      ...(branchId ? { branchId } : {}),
      ...(actor.role === UserRole.TEACHER
        ? { teacherMembershipId: actor.membershipId }
        : {}),
    };
    return this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        instituteId,
        ...(branchId || actor.role === UserRole.TEACHER
          ? { batch: { is: batchScope } }
          : {}),
      },
      select: { id: true },
    });
  }
}
