var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, } from '@nestjs/common';
import { AttendanceSource, AttendanceStatus, ClassMode, EnrollmentStatus, PasskeyChallengePurpose, Prisma, UserRole, } from '@prisma/client';
import { generateAuthenticationOptions, generateRegistrationOptions, SimpleWebAuthnError, verifyAuthenticationResponse, verifyRegistrationResponse, } from '@simplewebauthn/server';
import { PrismaService } from '../prisma/prisma.service.js';
const SESSION_SELECT = {
    id: true,
    title: true,
    mode: true,
    startsAt: true,
    endsAt: true,
    joinUrl: true,
    batchId: true,
    subjectId: true,
    teacherMembershipId: true,
    classroomId: true,
    batch: {
        select: {
            name: true,
            branchId: true,
            course: { select: { id: true, name: true } },
            branch: { select: { name: true } },
        },
    },
    subject: { select: { name: true } },
    teacher: { select: { user: { select: { fullName: true } } } },
    classroom: { select: { name: true } },
    _count: { select: { attendances: true } },
};
const CLASS_SESSION_ROLES = [
    UserRole.INSTITUTE_ADMIN,
    UserRole.BRANCH_ADMIN,
    UserRole.TEACHER,
];
function assertRegistrationResponse(value) {
    if (!value ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        !('id' in value) ||
        !('rawId' in value) ||
        !('type' in value) ||
        !('response' in value)) {
        throw new BadRequestException('The phone passkey response is invalid.');
    }
    const response = value;
    const payload = response.response;
    if (typeof response.id !== 'string' ||
        response.id.length === 0 ||
        response.id !== response.rawId ||
        response.type !== 'public-key' ||
        !payload ||
        typeof payload !== 'object' ||
        Array.isArray(payload) ||
        !('attestationObject' in payload) ||
        !('clientDataJSON' in payload) ||
        typeof payload.attestationObject !== 'string' ||
        typeof payload.clientDataJSON !== 'string') {
        throw new BadRequestException('The phone passkey response is invalid.');
    }
}
function assertAuthenticationResponse(value) {
    if (!value ||
        typeof value !== 'object' ||
        Array.isArray(value) ||
        !('id' in value) ||
        !('rawId' in value) ||
        !('type' in value) ||
        !('response' in value)) {
        throw new BadRequestException('The phone verification response is invalid.');
    }
    const response = value;
    const payload = response.response;
    if (typeof response.id !== 'string' ||
        response.id.length === 0 ||
        response.id !== response.rawId ||
        response.type !== 'public-key' ||
        !payload ||
        typeof payload !== 'object' ||
        Array.isArray(payload) ||
        !('clientDataJSON' in payload) ||
        !('authenticatorData' in payload) ||
        !('signature' in payload) ||
        typeof payload.clientDataJSON !== 'string' ||
        typeof payload.authenticatorData !== 'string' ||
        typeof payload.signature !== 'string') {
        throw new BadRequestException('The phone verification response is invalid.');
    }
}
let ClassSessionsService = class ClassSessionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listInstituteSessions(query, actor) {
        const instituteId = this.requireRole(actor, CLASS_SESSION_ROLES);
        const branchId = this.getBranchScope(actor);
        const from = query.from
            ? new Date(query.from)
            : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const to = query.to ? new Date(query.to) : undefined;
        if (to && to <= from) {
            throw new BadRequestException('to must be later than from.');
        }
        return this.prisma.classSession.findMany({
            where: {
                instituteId,
                startsAt: { gte: from, ...(to ? { lte: to } : {}) },
                ...(branchId ? { batch: { is: { branchId } } } : {}),
                ...(actor.role === UserRole.TEACHER
                    ? { teacherMembershipId: actor.membershipId }
                    : {}),
            },
            orderBy: { startsAt: 'asc' },
            take: query.limit ?? 50,
            select: SESSION_SELECT,
        });
    }
    async createSession(dto, actor) {
        const instituteId = this.requireRole(actor, CLASS_SESSION_ROLES);
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
            select: {
                id: true,
                branchId: true,
                courseId: true,
                teacherMembershipId: true,
            },
        });
        if (!batch) {
            throw new NotFoundException('Active batch not found in your scope.');
        }
        const startsAt = new Date(dto.startsAt);
        const endsAt = new Date(dto.endsAt);
        if (!Number.isFinite(startsAt.getTime()) ||
            !Number.isFinite(endsAt.getTime())) {
            throw new BadRequestException('Class times must be valid dates.');
        }
        if (endsAt <= startsAt) {
            throw new BadRequestException('endsAt must be later than startsAt.');
        }
        const classroomId = dto.classroomId?.trim() || null;
        const joinUrl = dto.joinUrl?.trim() || null;
        if (dto.mode === ClassMode.IN_PERSON) {
            if (!classroomId) {
                throw new BadRequestException('A classroom is required for in-person classes.');
            }
            if (joinUrl) {
                throw new BadRequestException('Meeting links are only allowed for online classes.');
            }
        }
        else {
            if (!joinUrl) {
                throw new BadRequestException('An HTTPS meeting link is required for online classes.');
            }
            if (classroomId) {
                throw new BadRequestException('Online classes cannot reserve an in-person classroom.');
            }
        }
        if (classroomId) {
            const classroom = await this.prisma.classroom.findFirst({
                where: {
                    id: classroomId,
                    instituteId,
                    branchId: batch.branchId,
                },
                select: { id: true },
            });
            if (!classroom) {
                throw new NotFoundException('Classroom not found in the selected batch branch.');
            }
        }
        if (dto.subjectId) {
            const subject = await this.prisma.subject.findFirst({
                where: { id: dto.subjectId, courseId: batch.courseId },
                select: { id: true },
            });
            if (!subject) {
                throw new NotFoundException('Subject does not belong to the selected batch course.');
            }
        }
        const teacherMembershipId = actor.role === UserRole.TEACHER
            ? actor.membershipId
            : dto.teacherMembershipId?.trim() || batch.teacherMembershipId;
        if (!teacherMembershipId) {
            throw new BadRequestException('Assign a teacher to the batch or select a class teacher.');
        }
        const teacher = await this.prisma.membership.findFirst({
            where: {
                id: teacherMembershipId,
                instituteId,
                role: UserRole.TEACHER,
                OR: [{ branchId: batch.branchId }, { branchId: null }],
            },
            select: { id: true },
        });
        if (!teacher) {
            throw new NotFoundException('Teacher not found in the selected branch.');
        }
        const conflict = await this.prisma.classSession.findFirst({
            where: {
                instituteId,
                startsAt: { lt: endsAt },
                endsAt: { gt: startsAt },
                OR: [
                    ...(classroomId ? [{ classroomId }] : []),
                    { teacherMembershipId },
                ],
            },
            select: { id: true },
        });
        if (conflict) {
            throw new ConflictException('The classroom or teacher already has a class during this time.');
        }
        return this.prisma.classSession.create({
            data: {
                instituteId,
                batchId: batch.id,
                subjectId: dto.subjectId ?? null,
                teacherMembershipId,
                classroomId,
                title: dto.title.trim(),
                mode: dto.mode,
                startsAt,
                endsAt,
                joinUrl,
            },
            select: SESSION_SELECT,
        });
    }
    async getSessionAttendance(sessionId, actor) {
        const session = await this.requireSessionScope(sessionId, actor);
        const enrollments = await this.prisma.enrollment.findMany({
            where: {
                batchId: session.batchId,
                status: EnrollmentStatus.ACTIVE,
            },
            orderBy: { student: { membership: { user: { fullName: 'asc' } } } },
            select: {
                student: {
                    select: {
                        id: true,
                        admissionNumber: true,
                        membership: { select: { user: { select: { fullName: true } } } },
                        attendances: {
                            where: { classSessionId: sessionId },
                            select: { status: true, source: true, markedAt: true },
                            take: 1,
                        },
                    },
                },
            },
        });
        return enrollments.map(({ student }) => ({
            studentId: student.id,
            admissionNumber: student.admissionNumber,
            fullName: student.membership.user.fullName,
            attendance: student.attendances[0] ?? null,
        }));
    }
    async markAttendance(sessionId, dto, actor) {
        const session = await this.requireSessionScope(sessionId, actor);
        const studentIds = dto.records.map(({ studentId }) => studentId);
        if (new Set(studentIds).size !== studentIds.length) {
            throw new BadRequestException('Attendance records must be unique per student.');
        }
        const enrollments = await this.prisma.enrollment.findMany({
            where: {
                batchId: session.batchId,
                status: EnrollmentStatus.ACTIVE,
                studentId: { in: studentIds },
            },
            select: { studentId: true },
        });
        const enrolledIds = new Set(enrollments.map(({ studentId }) => studentId));
        if (studentIds.some((studentId) => !enrolledIds.has(studentId))) {
            throw new BadRequestException('Attendance can only be recorded for actively enrolled students.');
        }
        return this.prisma.$transaction(async (transaction) => Promise.all(dto.records.map(({ studentId, status }) => transaction.attendance.upsert({
            where: {
                studentId_classSessionId: {
                    studentId,
                    classSessionId: sessionId,
                },
            },
            create: {
                studentId,
                classSessionId: sessionId,
                status,
                source: AttendanceSource.STAFF,
            },
            update: {
                status,
                source: AttendanceSource.STAFF,
                markedAt: new Date(),
            },
            select: {
                studentId: true,
                status: true,
                source: true,
                markedAt: true,
            },
        }))));
    }
    async listStudentSessions(actor) {
        const instituteId = this.requireRole(actor, [UserRole.STUDENT]);
        const student = await this.requireStudentProfile(actor);
        const now = new Date();
        const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        return this.prisma.classSession.findMany({
            where: {
                instituteId,
                startsAt: { gte: from },
                endsAt: { gte: new Date(now.getTime() - 4 * 60 * 60 * 1000) },
                batch: {
                    is: {
                        isActive: true,
                        enrollments: {
                            some: {
                                studentId: student.id,
                                status: EnrollmentStatus.ACTIVE,
                            },
                        },
                    },
                },
            },
            orderBy: { startsAt: 'asc' },
            take: 50,
            select: {
                id: true,
                title: true,
                mode: true,
                startsAt: true,
                endsAt: true,
                joinUrl: true,
                batch: {
                    select: {
                        name: true,
                        course: { select: { name: true } },
                    },
                },
                subject: { select: { name: true } },
                teacher: { select: { user: { select: { fullName: true } } } },
                attendances: {
                    where: { studentId: student.id },
                    select: { status: true, source: true, markedAt: true },
                    take: 1,
                },
            },
        });
    }
    async getStudentPasskeyStatus(actor) {
        const student = await this.requireStudentProfile(actor);
        const count = await this.prisma.studentPasskey.count({
            where: { studentId: student.id },
        });
        return { configured: count > 0, count };
    }
    async getPasskeyRegistrationOptions(actor) {
        const student = await this.requireStudentProfile(actor);
        const credentials = await this.prisma.studentPasskey.findMany({
            where: { studentId: student.id },
            select: { credentialId: true, transports: true },
        });
        const options = await generateRegistrationOptions({
            rpName: 'BIOLOGY by Amit Kumar',
            rpID: this.getWebAuthnSettings().rpID,
            userID: new TextEncoder().encode(student.id),
            userName: student.admissionNumber,
            userDisplayName: student.fullName,
            attestationType: 'none',
            excludeCredentials: credentials.map((credential) => ({
                id: credential.credentialId,
                transports: credential.transports,
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'required',
                authenticatorAttachment: 'platform',
            },
        });
        await this.storePasskeyChallenge(student.id, options.challenge, PasskeyChallengePurpose.REGISTRATION, null);
        return options;
    }
    async verifyPasskeyRegistration(value, actor) {
        assertRegistrationResponse(value);
        const response = value;
        const student = await this.requireStudentProfile(actor);
        const challenge = await this.prisma.studentPasskeyChallenge.findFirst({
            where: {
                studentId: student.id,
                purpose: PasskeyChallengePurpose.REGISTRATION,
                expiresAt: { gt: new Date() },
            },
        });
        if (!challenge) {
            throw new ConflictException('Passkey setup expired. Start the setup again.');
        }
        const { origin, rpID } = this.getWebAuthnSettings();
        let verification;
        try {
            verification = await verifyRegistrationResponse({
                response,
                expectedChallenge: challenge.challenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
                requireUserVerification: true,
            });
        }
        catch (error) {
            if (error instanceof SimpleWebAuthnError) {
                throw new BadRequestException('Phone passkey setup could not be verified.');
            }
            throw error;
        }
        if (!verification.verified || !verification.registrationInfo.userVerified) {
            throw new BadRequestException('Phone biometric verification was not completed.');
        }
        const credential = verification.registrationInfo.credential;
        try {
            await this.prisma.$transaction(async (transaction) => {
                const consumed = await transaction.studentPasskeyChallenge.deleteMany({
                    where: {
                        studentId: student.id,
                        challenge: challenge.challenge,
                        purpose: PasskeyChallengePurpose.REGISTRATION,
                        expiresAt: { gt: new Date() },
                    },
                });
                if (consumed.count !== 1) {
                    throw new ConflictException('Passkey setup expired. Start the setup again.');
                }
                await transaction.studentPasskey.create({
                    data: {
                        studentId: student.id,
                        credentialId: credential.id,
                        publicKey: Buffer.from(credential.publicKey),
                        counter: credential.counter,
                        transports: credential.transports ?? [],
                        deviceType: verification.registrationInfo.credentialDeviceType,
                        backedUp: verification.registrationInfo.credentialBackedUp,
                    },
                    select: { id: true },
                });
            });
        }
        catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002') {
                throw new ConflictException('This phone passkey is already registered.');
            }
            throw error;
        }
        return { configured: true };
    }
    async getPunchOptions(sessionId, actor) {
        const { studentId } = await this.requirePunchableSession(sessionId, actor);
        const credentials = await this.prisma.studentPasskey.findMany({
            where: { studentId },
            select: { credentialId: true, transports: true },
        });
        if (credentials.length === 0) {
            throw new ConflictException('Set up a phone passkey before punching in.');
        }
        const options = await generateAuthenticationOptions({
            rpID: this.getWebAuthnSettings().rpID,
            allowCredentials: credentials.map((credential) => ({
                id: credential.credentialId,
                transports: credential.transports,
            })),
            userVerification: 'required',
        });
        await this.storePasskeyChallenge(studentId, options.challenge, PasskeyChallengePurpose.PUNCH_IN, sessionId);
        return options;
    }
    async punchIn(sessionId, value, actor) {
        assertAuthenticationResponse(value);
        const response = value;
        const { studentId, session } = await this.requirePunchableSession(sessionId, actor);
        const challenge = await this.prisma.studentPasskeyChallenge.findFirst({
            where: {
                studentId,
                sessionId,
                purpose: PasskeyChallengePurpose.PUNCH_IN,
                expiresAt: { gt: new Date() },
            },
        });
        if (!challenge) {
            throw new ConflictException('Punch-in verification expired. Try again.');
        }
        const storedCredential = await this.prisma.studentPasskey.findFirst({
            where: { studentId, credentialId: response.id },
        });
        if (!storedCredential) {
            throw new NotFoundException('Phone passkey is not registered.');
        }
        const { origin, rpID } = this.getWebAuthnSettings();
        let verification;
        try {
            verification = await verifyAuthenticationResponse({
                response,
                expectedChallenge: challenge.challenge,
                expectedOrigin: origin,
                expectedRPID: rpID,
                requireUserVerification: true,
                credential: {
                    id: storedCredential.credentialId,
                    publicKey: new Uint8Array(storedCredential.publicKey),
                    counter: storedCredential.counter,
                    transports: storedCredential.transports,
                },
            });
        }
        catch (error) {
            if (error instanceof SimpleWebAuthnError) {
                throw new BadRequestException('Phone biometric verification failed.');
            }
            throw error;
        }
        if (!verification.verified ||
            !verification.authenticationInfo.userVerified) {
            throw new BadRequestException('Phone biometric verification was not completed.');
        }
        const now = new Date();
        const status = now.getTime() > session.startsAt.getTime() + 10 * 60 * 1000
            ? AttendanceStatus.LATE
            : AttendanceStatus.PRESENT;
        try {
            return await this.prisma.$transaction(async (transaction) => {
                const consumed = await transaction.studentPasskeyChallenge.deleteMany({
                    where: {
                        studentId,
                        challenge: challenge.challenge,
                        sessionId,
                        purpose: PasskeyChallengePurpose.PUNCH_IN,
                        expiresAt: { gt: now },
                    },
                });
                if (consumed.count !== 1) {
                    throw new ConflictException('Punch-in verification expired. Try again.');
                }
                await transaction.studentPasskey.update({
                    where: { id: storedCredential.id },
                    data: {
                        counter: verification.authenticationInfo.newCounter,
                        backedUp: verification.authenticationInfo.credentialBackedUp,
                        lastUsedAt: now,
                    },
                });
                const attendance = await transaction.attendance.create({
                    data: {
                        studentId,
                        classSessionId: sessionId,
                        status,
                        source: 'PHONE_BIOMETRIC',
                        markedAt: now,
                    },
                    select: { id: true, status: true, source: true, markedAt: true },
                });
                await transaction.auditLog.create({
                    data: {
                        instituteId: actor.instituteId,
                        actorUserId: actor.userId,
                        action: 'STUDENT_ATTENDANCE_PUNCHED_IN',
                        entityType: 'Attendance',
                        entityId: attendance.id,
                        metadata: {
                            classSessionId: sessionId,
                            status,
                            source: AttendanceSource.PHONE_BIOMETRIC,
                        },
                    },
                });
                return attendance;
            });
        }
        catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002') {
                throw new ConflictException('Attendance has already been recorded for this class.');
            }
            throw error;
        }
    }
    async requirePunchableSession(sessionId, actor) {
        const instituteId = this.requireRole(actor, [UserRole.STUDENT]);
        const student = await this.requireStudentProfile(actor);
        const now = new Date();
        const session = await this.prisma.classSession.findFirst({
            where: {
                id: sessionId,
                instituteId,
                startsAt: { lte: new Date(now.getTime() + 15 * 60 * 1000) },
                endsAt: { gt: now },
                batch: {
                    is: {
                        isActive: true,
                        enrollments: {
                            some: {
                                studentId: student.id,
                                status: EnrollmentStatus.ACTIVE,
                            },
                        },
                    },
                },
            },
            select: { id: true, startsAt: true, endsAt: true },
        });
        if (!session) {
            throw new NotFoundException('No active class is available for attendance punch-in.');
        }
        const existing = await this.prisma.attendance.findUnique({
            where: {
                studentId_classSessionId: {
                    studentId: student.id,
                    classSessionId: sessionId,
                },
            },
            select: { id: true },
        });
        if (existing) {
            throw new ConflictException('Attendance has already been recorded for this class.');
        }
        return { studentId: student.id, session };
    }
    async requireStudentProfile(actor) {
        const instituteId = this.requireRole(actor, [UserRole.STUDENT]);
        const student = await this.prisma.studentProfile.findFirst({
            where: {
                membershipId: actor.membershipId,
                membership: { instituteId },
            },
            select: {
                id: true,
                admissionNumber: true,
                membership: { select: { user: { select: { fullName: true } } } },
            },
        });
        if (!student) {
            throw new NotFoundException('Student profile not found.');
        }
        return {
            ...student,
            fullName: student.membership.user.fullName,
        };
    }
    async storePasskeyChallenge(studentId, challenge, purpose, sessionId) {
        await this.prisma.studentPasskeyChallenge.upsert({
            where: { studentId },
            create: {
                studentId,
                challenge,
                purpose,
                sessionId,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            },
            update: {
                challenge,
                purpose,
                sessionId,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            },
        });
    }
    getWebAuthnSettings() {
        const origin = new URL(process.env.WEB_ORIGIN ?? 'http://localhost:3000')
            .origin;
        const hostname = new URL(origin).hostname;
        const rpID = process.env.WEBAUTHN_RP_ID ?? hostname;
        if (hostname !== 'localhost' && new URL(origin).protocol !== 'https:') {
            throw new BadRequestException('Phone passkeys require a secure HTTPS BIOLOGY address.');
        }
        if (hostname !== rpID && !hostname.endsWith(`.${rpID}`)) {
            throw new BadRequestException('WEBAUTHN_RP_ID must match the BIOLOGY web address.');
        }
        return { origin, rpID };
    }
    async requireSessionScope(sessionId, actor) {
        const instituteId = this.requireRole(actor, CLASS_SESSION_ROLES);
        const branchId = this.getBranchScope(actor);
        const session = await this.prisma.classSession.findFirst({
            where: {
                id: sessionId,
                instituteId,
                ...(branchId ? { batch: { is: { branchId } } } : {}),
                ...(actor.role === UserRole.TEACHER
                    ? { teacherMembershipId: actor.membershipId }
                    : {}),
            },
            select: { id: true, batchId: true },
        });
        if (!session) {
            throw new NotFoundException('Class session not found in your scope.');
        }
        return session;
    }
    requireRole(actor, roles) {
        if (!roles.includes(actor.role)) {
            throw new ForbiddenException('Your role cannot access class sessions.');
        }
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
ClassSessionsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], ClassSessionsService);
export { ClassSessionsService };
//# sourceMappingURL=class-sessions.service.js.map