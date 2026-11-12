import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateClassSessionDto, MarkAttendanceDto, SessionListQueryDto } from './dto/create-class-session.dto.js';
export declare class ClassSessionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listInstituteSessions(query: SessionListQueryDto, actor: AuthIdentity): Promise<{
        subject: {
            name: string;
        } | null;
        batch: {
            branch: {
                name: string;
            };
            course: {
                id: string;
                name: string;
            };
            branchId: string;
            name: string;
        };
        classroom: {
            name: string;
        } | null;
        id: string;
        teacher: {
            user: {
                fullName: string;
            };
        };
        _count: {
            attendances: number;
        };
        teacherMembershipId: string;
        title: string;
        mode: import("@prisma/client").$Enums.ClassMode;
        startsAt: Date;
        endsAt: Date;
        joinUrl: string | null;
        batchId: string;
        subjectId: string | null;
        classroomId: string | null;
    }[]>;
    createSession(dto: CreateClassSessionDto, actor: AuthIdentity): Promise<{
        subject: {
            name: string;
        } | null;
        batch: {
            branch: {
                name: string;
            };
            course: {
                id: string;
                name: string;
            };
            branchId: string;
            name: string;
        };
        classroom: {
            name: string;
        } | null;
        id: string;
        teacher: {
            user: {
                fullName: string;
            };
        };
        _count: {
            attendances: number;
        };
        teacherMembershipId: string;
        title: string;
        mode: import("@prisma/client").$Enums.ClassMode;
        startsAt: Date;
        endsAt: Date;
        joinUrl: string | null;
        batchId: string;
        subjectId: string | null;
        classroomId: string | null;
    }>;
    getSessionAttendance(sessionId: string, actor: AuthIdentity): Promise<{
        studentId: string;
        admissionNumber: string;
        fullName: string;
        attendance: {
            status: import("@prisma/client").$Enums.AttendanceStatus;
            source: import("@prisma/client").$Enums.AttendanceSource;
            markedAt: Date;
        };
    }[]>;
    markAttendance(sessionId: string, dto: MarkAttendanceDto, actor: AuthIdentity): Promise<{
        status: import("@prisma/client").$Enums.AttendanceStatus;
        studentId: string;
        source: import("@prisma/client").$Enums.AttendanceSource;
        markedAt: Date;
    }[]>;
    listStudentSessions(actor: AuthIdentity): Promise<{
        subject: {
            name: string;
        } | null;
        batch: {
            course: {
                name: string;
            };
            name: string;
        };
        id: string;
        teacher: {
            user: {
                fullName: string;
            };
        };
        title: string;
        mode: import("@prisma/client").$Enums.ClassMode;
        startsAt: Date;
        endsAt: Date;
        joinUrl: string | null;
        attendances: {
            status: import("@prisma/client").$Enums.AttendanceStatus;
            source: import("@prisma/client").$Enums.AttendanceSource;
            markedAt: Date;
        }[];
    }[]>;
    getStudentPasskeyStatus(actor: AuthIdentity): Promise<{
        configured: boolean;
        count: number;
    }>;
    getPasskeyRegistrationOptions(actor: AuthIdentity): Promise<import("@simplewebauthn/server").PublicKeyCredentialCreationOptionsJSON>;
    verifyPasskeyRegistration(value: RegistrationResponseJSON, actor: AuthIdentity): Promise<{
        configured: boolean;
    }>;
    getPunchOptions(sessionId: string, actor: AuthIdentity): Promise<import("@simplewebauthn/server").PublicKeyCredentialRequestOptionsJSON>;
    punchIn(sessionId: string, value: AuthenticationResponseJSON, actor: AuthIdentity): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.AttendanceStatus;
        source: import("@prisma/client").$Enums.AttendanceSource;
        markedAt: Date;
    }>;
    private requirePunchableSession;
    private requireStudentProfile;
    private storePasskeyChallenge;
    private getWebAuthnSettings;
    private requireSessionScope;
    private requireRole;
    private getBranchScope;
}
