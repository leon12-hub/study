var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ForbiddenException, Injectable, NotFoundException, } from '@nestjs/common';
import { DoubtStatus, EnrollmentStatus, UserRole, } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
const DOUBT_SELECT = {
    id: true,
    batchId: true,
    topic: true,
    questionText: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    subject: { select: { id: true, name: true } },
    student: {
        select: {
            id: true,
            admissionNumber: true,
            membership: { select: { user: { select: { fullName: true } } } },
        },
    },
    assignedTeacher: {
        select: { user: { select: { fullName: true } } },
    },
    replies: {
        orderBy: { createdAt: 'asc' },
        select: {
            id: true,
            message: true,
            createdAt: true,
            author: { select: { role: true, user: { select: { fullName: true } } } },
        },
    },
};
const NOTIFICATION_SELECT = {
    id: true,
    category: true,
    title: true,
    body: true,
    readAt: true,
    createdAt: true,
};
let DoubtsNotificationsService = class DoubtsNotificationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listStudentDoubts(actor) {
        const { instituteId, studentId } = await this.requireStudent(actor);
        return this.prisma.doubt.findMany({
            where: { instituteId, studentId },
            orderBy: { updatedAt: 'desc' },
            take: 100,
            select: DOUBT_SELECT,
        });
    }
    async createStudentDoubt(dto, actor) {
        const { instituteId, studentId } = await this.requireStudent(actor);
        const subject = await this.prisma.subject.findFirst({
            where: {
                id: dto.subjectId,
                course: { is: { instituteId, isActive: true } },
            },
            select: { id: true, name: true, courseId: true },
        });
        if (!subject) {
            throw new NotFoundException('Subject not found in your institute.');
        }
        const enrollment = await this.prisma.enrollment.findFirst({
            where: {
                studentId,
                status: EnrollmentStatus.ACTIVE,
                batch: {
                    is: {
                        instituteId,
                        isActive: true,
                        courseId: subject.courseId,
                    },
                },
            },
            select: {
                id: true,
                batch: {
                    select: { id: true, branchId: true, teacherMembershipId: true },
                },
            },
        });
        if (!enrollment) {
            throw new NotFoundException('You are not actively enrolled in this subject.');
        }
        const notificationRecipients = enrollment.batch.teacherMembershipId
            ? [enrollment.batch.teacherMembershipId]
            : await this.findFallbackStaffRecipients(instituteId, enrollment.batch.branchId);
        return this.prisma.$transaction(async (transaction) => {
            const doubt = await transaction.doubt.create({
                data: {
                    instituteId,
                    studentId,
                    batchId: enrollment.batch.id,
                    subjectId: subject.id,
                    assignedTeacherId: enrollment.batch.teacherMembershipId,
                    status: enrollment.batch.teacherMembershipId
                        ? DoubtStatus.ASSIGNED
                        : DoubtStatus.OPEN,
                    topic: dto.topic?.trim() || null,
                    questionText: dto.questionText.trim(),
                },
                select: DOUBT_SELECT,
            });
            if (notificationRecipients.length > 0) {
                await transaction.notification.createMany({
                    data: notificationRecipients.map((membershipId) => ({
                        membershipId,
                        category: 'DOUBT',
                        title: 'New student question',
                        body: `A student asked a question about ${subject.name}.`,
                    })),
                });
            }
            return doubt;
        });
    }
    async listStaffDoubts(actor) {
        const instituteId = this.requireRole(actor, [
            UserRole.INSTITUTE_ADMIN,
            UserRole.BRANCH_ADMIN,
            UserRole.TEACHER,
        ]);
        const branchId = this.getBranchScope(actor);
        const where = {
            instituteId,
            ...(actor.role === UserRole.TEACHER
                ? { assignedTeacherId: actor.membershipId }
                : {}),
            ...(branchId ? { batch: { is: { instituteId, branchId } } } : {}),
        };
        return this.prisma.doubt.findMany({
            where,
            orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
            take: 100,
            select: DOUBT_SELECT,
        });
    }
    async replyToDoubt(doubtId, dto, actor) {
        const instituteId = this.requireRole(actor, [
            UserRole.INSTITUTE_ADMIN,
            UserRole.BRANCH_ADMIN,
            UserRole.TEACHER,
        ]);
        const branchId = this.getBranchScope(actor);
        const where = {
            id: doubtId,
            instituteId,
            status: { not: DoubtStatus.CLOSED },
            ...(actor.role === UserRole.TEACHER
                ? { assignedTeacherId: actor.membershipId }
                : {}),
            ...(branchId ? { batch: { is: { instituteId, branchId } } } : {}),
        };
        const doubt = await this.prisma.doubt.findFirst({
            where,
            select: {
                id: true,
                subject: { select: { name: true } },
                student: { select: { membershipId: true } },
            },
        });
        if (!doubt) {
            throw new NotFoundException('Doubt not found in your scope.');
        }
        return this.prisma.$transaction(async (transaction) => {
            const reply = await transaction.doubtReply.create({
                data: {
                    doubtId: doubt.id,
                    authorMembershipId: actor.membershipId,
                    message: dto.message.trim(),
                },
                select: {
                    id: true,
                    message: true,
                    createdAt: true,
                    author: {
                        select: { role: true, user: { select: { fullName: true } } },
                    },
                },
            });
            await transaction.doubt.update({
                where: { id: doubt.id },
                data: { status: DoubtStatus.ANSWERED },
            });
            await transaction.notification.create({
                data: {
                    membershipId: doubt.student.membershipId,
                    category: 'DOUBT',
                    title: 'Your question has been answered',
                    body: `An educator replied to your question${doubt.subject ? ` about ${doubt.subject.name}` : ''}.`,
                },
                select: { id: true },
            });
            return reply;
        });
    }
    async closeStudentDoubt(doubtId, actor) {
        const { instituteId, studentId } = await this.requireStudent(actor);
        const result = await this.prisma.doubt.updateMany({
            where: {
                id: doubtId,
                instituteId,
                studentId,
                status: { not: DoubtStatus.CLOSED },
            },
            data: { status: DoubtStatus.CLOSED },
        });
        if (result.count === 0) {
            throw new NotFoundException('Open doubt not found.');
        }
        return { id: doubtId, status: DoubtStatus.CLOSED };
    }
    async listNotifications(actor) {
        this.requireRole(actor, [
            UserRole.STUDENT,
            UserRole.TEACHER,
            UserRole.BRANCH_ADMIN,
            UserRole.INSTITUTE_ADMIN,
            UserRole.PARENT,
        ]);
        return this.prisma.notification.findMany({
            where: { membershipId: actor.membershipId },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: NOTIFICATION_SELECT,
        });
    }
    async markNotificationRead(notificationId, actor) {
        this.requireRole(actor, [
            UserRole.STUDENT,
            UserRole.TEACHER,
            UserRole.BRANCH_ADMIN,
            UserRole.INSTITUTE_ADMIN,
            UserRole.PARENT,
        ]);
        const result = await this.prisma.notification.updateMany({
            where: {
                id: notificationId,
                membershipId: actor.membershipId,
                readAt: null,
            },
            data: { readAt: new Date() },
        });
        if (result.count === 0) {
            const existing = await this.prisma.notification.findFirst({
                where: { id: notificationId, membershipId: actor.membershipId },
                select: { id: true },
            });
            if (!existing) {
                throw new NotFoundException('Notification not found.');
            }
        }
        return { id: notificationId, read: true };
    }
    async markAllNotificationsRead(actor) {
        this.requireRole(actor, [
            UserRole.STUDENT,
            UserRole.TEACHER,
            UserRole.BRANCH_ADMIN,
            UserRole.INSTITUTE_ADMIN,
            UserRole.PARENT,
        ]);
        const result = await this.prisma.notification.updateMany({
            where: { membershipId: actor.membershipId, readAt: null },
            data: { readAt: new Date() },
        });
        return { updatedCount: result.count };
    }
    async requireStudent(actor) {
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
        return { instituteId, studentId: student.id };
    }
    async findFallbackStaffRecipients(instituteId, branchId) {
        const memberships = await this.prisma.membership.findMany({
            where: {
                instituteId,
                OR: [
                    { role: UserRole.INSTITUTE_ADMIN },
                    ...(branchId ? [{ role: UserRole.BRANCH_ADMIN, branchId }] : []),
                ],
            },
            select: { id: true },
        });
        return memberships.map(({ id }) => id);
    }
    getBranchScope(actor) {
        if (actor.role !== UserRole.BRANCH_ADMIN) {
            return null;
        }
        if (!actor.branchId) {
            throw new ForbiddenException('Your account has no branch assignment.');
        }
        return actor.branchId;
    }
    requireRole(actor, roles) {
        if (!roles.includes(actor.role)) {
            throw new ForbiddenException('Your role cannot access this resource.');
        }
        if (!actor.instituteId) {
            throw new ForbiddenException('Your account has no institute membership.');
        }
        return actor.instituteId;
    }
};
DoubtsNotificationsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], DoubtsNotificationsService);
export { DoubtsNotificationsService };
//# sourceMappingURL=doubts-notifications.service.js.map