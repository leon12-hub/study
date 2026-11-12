import { Prisma } from '@prisma/client';
import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { CreateBatchDto, UpdateBatchDto } from './dto/create-batch.dto.js';
import { CreateClassroomDto, UpdateClassroomDto } from './dto/create-classroom.dto.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { CreateExamDto, SubmitExamDto } from './dto/create-exam.dto.js';
import { CreateLessonDto } from './dto/create-lesson.dto.js';
import { GradeAssignmentSubmissionDto } from './dto/grade-assignment-submission.dto.js';
import { CreateSubjectDto } from './dto/create-subject.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
export declare class LearningService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getStudentProfile(actor: AuthIdentity): Promise<{
        fullName: string;
        admissionNumber: string;
    }>;
    getCourses(actor: AuthIdentity): Promise<{
        id: string;
        isActive: boolean;
        name: string;
        _count: {
            batches: number;
            lessons: number;
        };
        description: string | null;
        subjects: {
            id: string;
            name: string;
        }[];
    }[]>;
    createCourse(dto: CreateCourseDto, actor: AuthIdentity): Promise<{
        id: string;
        isActive: boolean;
        name: string;
        description: string | null;
        subjects: {
            id: string;
            name: string;
        }[];
    }>;
    updateCourse(courseId: string, dto: UpdateCourseDto, actor: AuthIdentity): Promise<{
        id: string;
        isActive: boolean;
        name: string;
        description: string | null;
        subjects: {
            id: string;
            name: string;
        }[];
    }>;
    createCourseSubject(courseId: string, dto: CreateSubjectDto, actor: AuthIdentity): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        courseId: string;
    }>;
    getInstituteCourseLessons(courseId: string, actor: AuthIdentity): Promise<{
        id: string;
        updatedAt: Date;
        title: string;
        originalName: string | null;
        content: string | null;
        position: number;
        isPublished: boolean;
        mediaKind: import("@prisma/client").$Enums.MaterialKind | null;
    }[]>;
    createCourseLesson(courseId: string, dto: CreateLessonDto, actor: AuthIdentity, file?: {
        path: string;
        originalname: string;
        mimetype: string;
        size: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        originalName: string | null;
        content: string | null;
        position: number;
        isPublished: boolean;
        mediaKind: import("@prisma/client").$Enums.MaterialKind | null;
    }>;
    getCourseLessonFile(courseId: string, lessonId: string, actor: AuthIdentity): Promise<{
        path: string;
        mimeType: string;
        originalName: string;
    }>;
    getAssignments(actor: AuthIdentity): Promise<{
        batch: {
            course: {
                name: string;
            };
            id: string;
            name: string;
        };
        id: string;
        _count: {
            submissions: number;
        };
        description: string | null;
        title: string;
        dueAt: Date;
    }[]>;
    getBatches(actor: AuthIdentity): Promise<{
        branch: {
            name: string;
        };
        course: {
            name: string;
        };
        branchId: string;
        id: string;
        name: string;
        teacher: {
            user: {
                email: string;
                fullName: string;
            };
        } | null;
        _count: {
            enrollments: number;
        };
        capacity: number | null;
        courseId: string;
        teacherMembershipId: string | null;
    }[]>;
    createBatch(dto: CreateBatchDto, actor: AuthIdentity): Promise<{
        branch: {
            name: string;
        };
        course: {
            name: string;
        };
        branchId: string;
        id: string;
        isActive: boolean;
        name: string;
        capacity: number | null;
        courseId: string;
        teacherMembershipId: string | null;
    }>;
    updateBatch(batchId: string, dto: UpdateBatchDto, actor: AuthIdentity): Promise<{
        branch: {
            name: string;
        };
        course: {
            name: string;
        };
        branchId: string;
        id: string;
        isActive: boolean;
        name: string;
        capacity: number | null;
        courseId: string;
        teacherMembershipId: string | null;
    }>;
    getClassrooms(actor: AuthIdentity): Promise<{
        branch: {
            name: string;
        };
        branchId: string;
        id: string;
        name: string;
        _count: {
            sessions: number;
        };
        capacity: number | null;
    }[]>;
    createClassroom(dto: CreateClassroomDto, actor: AuthIdentity): Promise<{
        branch: {
            name: string;
        };
        branchId: string;
        id: string;
        name: string;
        capacity: number | null;
    }>;
    updateClassroom(classroomId: string, dto: UpdateClassroomDto, actor: AuthIdentity): Promise<{
        branch: {
            name: string;
        };
        branchId: string;
        id: string;
        name: string;
        capacity: number | null;
    }>;
    createAssignment(dto: CreateAssignmentDto, actor: AuthIdentity): Promise<{
        batch: {
            id: string;
            name: string;
        };
        id: string;
        description: string | null;
        title: string;
        dueAt: Date;
    }>;
    getAssignmentSubmissions(assignmentId: string, actor: AuthIdentity): Promise<{
        id: string;
        student: {
            membership: {
                user: {
                    fullName: string;
                };
            };
            admissionNumber: string;
        };
        marksAwarded: Prisma.Decimal | null;
        answerText: string | null;
        submittedAt: Date;
    }[]>;
    gradeAssignmentSubmission(assignmentId: string, submissionId: string, dto: GradeAssignmentSubmissionDto, actor: AuthIdentity): Promise<{
        id: string;
        marksAwarded: Prisma.Decimal | null;
        submittedAt: Date;
    }>;
    getInstituteExams(actor: AuthIdentity): Promise<{
        subject: {
            course: {
                name: string;
            };
            name: string;
        };
        id: string;
        _count: {
            attempts: number;
        };
        title: string;
        startsAt: Date | null;
        endsAt: Date | null;
        status: import("@prisma/client").$Enums.ExamStatus;
        durationMinutes: number;
        totalMarks: Prisma.Decimal;
    }[]>;
    getExamReport(examId: string, actor: AuthIdentity): Promise<{
        id: string;
        title: string;
        status: import("@prisma/client").$Enums.ExamStatus;
        durationMinutes: number;
        totalMarks: number;
        startsAt: Date | null;
        endsAt: Date | null;
        subject: {
            name: string;
            course: {
                name: string;
            };
        };
        summary: {
            assignedStudents: number;
            submitted: number;
            evaluated: number;
            averagePercentage: number | null;
        };
        attempts: {
            student: {
                fullName: string;
                admissionNumber: string;
            };
            result: {
                score: number;
                percentage: number;
                publishedAt: Date;
            } | null;
            answers: {
                marksAwarded: number | null;
                question: {
                    marks: number;
                    options: {
                        id: string;
                        text: string;
                        isCorrect: boolean;
                    }[];
                    prompt: string;
                };
                selectedOptionIds: string[];
                responseText: string | null;
            }[];
            id: string;
            status: import("@prisma/client").$Enums.AttemptStatus;
            submittedAt: Date | null;
            startedAt: Date;
        }[];
    }>;
    createExam(dto: CreateExamDto, actor: AuthIdentity): Promise<{
        id: string;
        title: string;
        startsAt: Date | null;
        endsAt: Date | null;
        status: import("@prisma/client").$Enums.ExamStatus;
        durationMinutes: number;
        totalMarks: Prisma.Decimal;
    }>;
    startExam(examId: string, actor: AuthIdentity): Promise<{
        attempt: {
            id: string;
            status: import("@prisma/client").$Enums.AttemptStatus;
            startedAt: Date;
        };
        durationMinutes: number;
        questions: {
            id: string;
            type: import("@prisma/client").$Enums.QuestionType;
            prompt: string;
            marks: Prisma.Decimal;
            options: {
                id: string;
                text: string;
            }[];
        }[];
    }>;
    submitExam(examId: string, attemptId: string, dto: SubmitExamDto, actor: AuthIdentity): Promise<{
        score: Prisma.Decimal;
        percentage: Prisma.Decimal;
        publishedAt: Date;
    }>;
    getStudentCourses(actor: AuthIdentity): Promise<{
        course: {
            id: string;
            name: string;
            _count: {
                lessons: number;
            };
            description: string | null;
            subjects: {
                id: string;
                name: string;
            }[];
        };
        id: string;
        name: string;
    }[]>;
    getStudentCourseLessons(courseId: string, actor: AuthIdentity): Promise<{
        id: string;
        title: string;
        originalName: string | null;
        content: string | null;
        position: number;
        mediaKind: import("@prisma/client").$Enums.MaterialKind | null;
    }[]>;
    getStudentAssignments(actor: AuthIdentity): Promise<{
        submission: {
            id: string;
            marksAwarded: Prisma.Decimal | null;
            answerText: string | null;
            submittedAt: Date;
        };
        batch: {
            course: {
                name: string;
            };
            name: string;
        };
        id: string;
        description: string | null;
        title: string;
        dueAt: Date;
    }[]>;
    submitAssignment(assignmentId: string, answerText: string, actor: AuthIdentity): Promise<{
        id: string;
        marksAwarded: Prisma.Decimal | null;
        answerText: string | null;
        submittedAt: Date;
    }>;
    getStudentExams(actor: AuthIdentity): Promise<{
        subject: {
            name: string;
        };
        id: string;
        title: string;
        startsAt: Date | null;
        endsAt: Date | null;
        status: import("@prisma/client").$Enums.ExamStatus;
        durationMinutes: number;
        totalMarks: Prisma.Decimal;
        attempts: {
            result: {
                score: Prisma.Decimal;
                percentage: Prisma.Decimal;
                publishedAt: Date;
            } | null;
            id: string;
            status: import("@prisma/client").$Enums.AttemptStatus;
            submittedAt: Date | null;
        }[];
    }[]>;
    private requireStudentId;
    private requireCourseAccess;
    private notifyCourseParticipants;
    private requireInstitute;
    private requireRole;
    private getBranchScope;
    private findAssignmentInScope;
}
