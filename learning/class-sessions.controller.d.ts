import type { AuthIdentity } from '../auth/auth.types.js';
import { CreateClassSessionDto, MarkAttendanceDto, SessionListQueryDto, VerifyPasskeyAuthenticationDto, VerifyPasskeyRegistrationDto } from './dto/create-class-session.dto.js';
import { ClassSessionsService } from './class-sessions.service.js';
export declare class InstituteClassSessionsController {
    private readonly sessions;
    constructor(sessions: ClassSessionsService);
    list(query: SessionListQueryDto, actor: AuthIdentity): Promise<{
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
    create(dto: CreateClassSessionDto, actor: AuthIdentity): Promise<{
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
    getAttendance(sessionId: string, actor: AuthIdentity): Promise<{
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
}
export declare class StudentClassSessionsController {
    private readonly sessions;
    constructor(sessions: ClassSessionsService);
    list(actor: AuthIdentity): Promise<{
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
    getPasskeyStatus(actor: AuthIdentity): Promise<{
        configured: boolean;
        count: number;
    }>;
    getPasskeyRegistrationOptions(actor: AuthIdentity): Promise<import("@simplewebauthn/server").PublicKeyCredentialCreationOptionsJSON>;
    verifyPasskeyRegistration(dto: VerifyPasskeyRegistrationDto, actor: AuthIdentity): Promise<{
        configured: boolean;
    }>;
    getPunchOptions(sessionId: string, actor: AuthIdentity): Promise<import("@simplewebauthn/server").PublicKeyCredentialRequestOptionsJSON>;
    punchIn(sessionId: string, dto: VerifyPasskeyAuthenticationDto, actor: AuthIdentity): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.AttendanceStatus;
        source: import("@prisma/client").$Enums.AttendanceSource;
        markedAt: Date;
    }>;
}
