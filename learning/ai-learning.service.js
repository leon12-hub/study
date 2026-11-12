var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { BadGatewayException, ForbiddenException, HttpException, HttpStatus, Inject, Injectable, NotFoundException, } from '@nestjs/common';
import { EnrollmentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
const AI_STAFF_ROLES = [
    UserRole.INSTITUTE_ADMIN,
    UserRole.BRANCH_ADMIN,
    UserRole.TEACHER,
];
const DAILY_REQUEST_LIMIT = 20;
let AiLearningService = class AiLearningService {
    prisma;
    provider;
    constructor(prisma, provider) {
        this.prisma = prisma;
        this.provider = provider;
    }
    async generateQuestions(dto, actor) {
        const instituteId = this.requireRole(actor, AI_STAFF_ROLES);
        const branchId = this.getBranchScope(actor);
        const subject = await this.prisma.subject.findFirst({
            where: {
                id: dto.subjectId,
                course: {
                    is: {
                        instituteId,
                        ...(branchId || actor.role === UserRole.TEACHER
                            ? {
                                batches: {
                                    some: {
                                        isActive: true,
                                        ...(branchId ? { branchId } : {}),
                                        ...(actor.role === UserRole.TEACHER
                                            ? { teacherMembershipId: actor.membershipId }
                                            : {}),
                                    },
                                },
                            }
                            : {}),
                    },
                },
            },
            select: { name: true },
        });
        if (!subject) {
            throw new NotFoundException('Subject not found in your scope.');
        }
        const content = await this.generateJson(actor, 'QUESTION_GENERATION', [
            'Create original educational multiple-choice questions.',
            `Subject: ${subject.name}`,
            `Topic: ${dto.topic.trim()}`,
            `Difficulty: ${dto.difficulty}`,
            `Question type: ${dto.questionType}`,
            `Create exactly ${dto.count} questions.`,
            'Return a JSON object with a "questions" array.',
            'Each item must contain "prompt" and "options".',
            'Each option must contain "text" and boolean "isCorrect".',
            'Use 4 options per question. Do not mark all options correct.',
            'Do not include explanations, markdown, personal data, or any text outside the JSON object.',
        ].join('\n'));
        return {
            questions: this.validateGeneratedQuestions(content, dto),
        };
    }
    async analyzeStudentPerformance(actor) {
        const instituteId = this.requireRole(actor, [UserRole.STUDENT]);
        const student = await this.prisma.studentProfile.findFirst({
            where: {
                membershipId: actor.membershipId,
                membership: { instituteId },
            },
            select: { id: true },
        });
        if (!student) {
            throw new NotFoundException('Student profile not found.');
        }
        const results = await this.prisma.result.findMany({
            where: {
                attempt: {
                    is: {
                        studentId: student.id,
                        exam: { is: { instituteId } },
                    },
                },
            },
            orderBy: { publishedAt: 'desc' },
            take: 10,
            select: {
                percentage: true,
                attempt: {
                    select: {
                        exam: { select: { subject: { select: { name: true } } } },
                    },
                },
            },
        });
        const performance = results.map((result) => ({
            subject: result.attempt.exam.subject.name,
            percentage: Number(result.percentage),
        }));
        if (performance.length === 0) {
            return {
                summary: 'Complete a graded assessment to receive a performance review.',
                strengths: [],
                focusAreas: [],
                assessmentCount: 0,
            };
        }
        const content = await this.generateJson(actor, 'PERFORMANCE_ANALYSIS', [
            'Review these anonymized educational assessment scores.',
            'Give supportive, practical study guidance; do not diagnose, label, or make high-stakes recommendations.',
            'Return JSON with "summary" (string), "strengths" (array of strings), and "focusAreas" (array of strings).',
            'Do not infer personal characteristics. Use only the subject scores provided.',
            JSON.stringify(performance),
        ].join('\n'));
        return {
            ...this.validatePerformanceAnalysis(content),
            assessmentCount: performance.length,
        };
    }
    async answerTutorQuestion(dto, actor) {
        const instituteId = this.requireRole(actor, [UserRole.STUDENT]);
        const student = await this.prisma.studentProfile.findFirst({
            where: {
                membershipId: actor.membershipId,
                membership: { instituteId },
            },
            select: { id: true },
        });
        if (!student) {
            throw new NotFoundException('Student profile not found.');
        }
        const enrollment = await this.prisma.enrollment.findFirst({
            where: {
                studentId: student.id,
                status: EnrollmentStatus.ACTIVE,
                batch: {
                    is: {
                        instituteId,
                        isActive: true,
                        courseId: dto.courseId,
                    },
                },
            },
            select: { id: true },
        });
        if (!enrollment) {
            throw new NotFoundException('Course not found for this student.');
        }
        const lessons = await this.prisma.courseLesson.findMany({
            where: { courseId: dto.courseId, isPublished: true },
            orderBy: { position: 'asc' },
            take: 20,
            select: { title: true, content: true },
        });
        let remainingCharacters = 8000;
        const studyContext = lessons.map((lesson) => {
            const content = remainingCharacters > 0
                ? (lesson.content ?? '').slice(0, remainingCharacters)
                : '';
            remainingCharacters -= content.length;
            return { title: lesson.title, content };
        });
        const content = await this.generateJson(actor, 'AI_TUTOR', [
            'You are a supportive educational tutor. Explain concepts clearly for a student.',
            'Use the published study notes below as the primary source. If they do not contain the answer, say so and distinguish general knowledge from course material.',
            'Do not provide medical, legal, or other high-stakes advice.',
            'Return JSON with "answer" (string) and "followUpQuestions" (array of at most 3 short strings).',
            `Question: ${dto.question.trim()}`,
            `Published study notes: ${JSON.stringify(studyContext)}`,
        ].join('\n'));
        return this.validateTutorAnswer(content);
    }
    async generateJson(actor, feature, prompt) {
        const instituteId = this.requireInstitute(actor);
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const usageCount = await this.prisma.aiUsage.count({
            where: {
                instituteId,
                membershipId: actor.membershipId,
                createdAt: { gte: since },
            },
        });
        if (usageCount >= DAILY_REQUEST_LIMIT) {
            throw new HttpException('Your daily AI request limit has been reached.', HttpStatus.TOO_MANY_REQUESTS);
        }
        const response = await this.provider.generateJson(prompt);
        await this.prisma.aiUsage.create({
            data: {
                instituteId,
                membershipId: actor.membershipId,
                feature,
                inputTokens: response.inputTokens,
                outputTokens: response.outputTokens,
            },
            select: { id: true },
        });
        return response.content;
    }
    validateGeneratedQuestions(content, dto) {
        if (!isRecord(content) || !Array.isArray(content.questions)) {
            throw new BadGatewayException('The AI provider returned invalid questions.');
        }
        if (content.questions.length !== dto.count) {
            throw new BadGatewayException('The AI provider returned the wrong number of questions.');
        }
        return content.questions.map((question) => {
            if (!isRecord(question) || typeof question.prompt !== 'string') {
                throw new BadGatewayException('The AI provider returned an invalid question.');
            }
            const prompt = question.prompt.trim();
            const rawOptions = question.options;
            if (prompt.length < 2 ||
                prompt.length > 4000 ||
                !Array.isArray(rawOptions) ||
                rawOptions.length < 2 ||
                rawOptions.length > 8) {
                throw new BadGatewayException('The AI provider returned an invalid question.');
            }
            const options = rawOptions.map((option) => {
                if (!isRecord(option) ||
                    typeof option.text !== 'string' ||
                    typeof option.isCorrect !== 'boolean') {
                    throw new BadGatewayException('The AI provider returned invalid answer options.');
                }
                const text = option.text.trim();
                if (!text || text.length > 500) {
                    throw new BadGatewayException('The AI provider returned invalid answer options.');
                }
                return { text, isCorrect: option.isCorrect };
            });
            const correctCount = options.filter(({ isCorrect }) => isCorrect).length;
            if (correctCount === 0 ||
                (dto.questionType === 'SINGLE_CHOICE' && correctCount !== 1) ||
                (dto.questionType === 'MULTIPLE_CHOICE' &&
                    correctCount === options.length)) {
                throw new BadGatewayException('The AI provider returned invalid correct answers.');
            }
            return {
                type: dto.questionType,
                prompt,
                marks: 1,
                options,
            };
        });
    }
    validatePerformanceAnalysis(content) {
        if (!isRecord(content) ||
            typeof content.summary !== 'string' ||
            content.summary.trim().length === 0 ||
            content.summary.length > 1000) {
            throw new BadGatewayException('The AI provider returned an invalid performance review.');
        }
        return {
            summary: content.summary.trim(),
            strengths: validateStringList(content.strengths),
            focusAreas: validateStringList(content.focusAreas),
        };
    }
    validateTutorAnswer(content) {
        if (!isRecord(content) ||
            typeof content.answer !== 'string' ||
            content.answer.trim().length === 0 ||
            content.answer.length > 3000) {
            throw new BadGatewayException('The AI provider returned an invalid tutor answer.');
        }
        return {
            answer: content.answer.trim(),
            followUpQuestions: validateStringList(content.followUpQuestions, 3),
        };
    }
    requireRole(actor, roles) {
        if (!roles.includes(actor.role)) {
            throw new ForbiddenException('Your role cannot use this AI feature.');
        }
        return this.requireInstitute(actor);
    }
    requireInstitute(actor) {
        if (!actor.instituteId) {
            throw new ForbiddenException('Your account has no institute membership.');
        }
        return actor.instituteId;
    }
    getBranchScope(actor) {
        if (actor.role !== UserRole.BRANCH_ADMIN)
            return null;
        if (!actor.branchId) {
            throw new ForbiddenException('Your branch administrator account has no branch assigned.');
        }
        return actor.branchId;
    }
};
AiLearningService = __decorate([
    Injectable(),
    __param(1, Inject('AI_PROVIDER')),
    __metadata("design:paramtypes", [PrismaService, Object])
], AiLearningService);
export { AiLearningService };
function isRecord(value) {
    return typeof value === 'object' && value !== null;
}
function validateStringList(value, maxItems = 5) {
    if (!Array.isArray(value) || value.length > maxItems) {
        throw new BadGatewayException('The AI provider returned invalid performance details.');
    }
    return value.map((item) => {
        if (typeof item !== 'string' ||
            item.trim().length === 0 ||
            item.length > 300) {
            throw new BadGatewayException('The AI provider returned invalid performance details.');
        }
        return item.trim();
    });
}
//# sourceMappingURL=ai-learning.service.js.map