import { AttendanceStatus, ClassMode } from '@prisma/client';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
export declare class CreateClassSessionDto {
    batchId: string;
    subjectId?: string;
    teacherMembershipId?: string;
    classroomId?: string;
    title: string;
    mode: ClassMode;
    startsAt: string;
    endsAt: string;
    joinUrl?: string;
}
export declare class AttendanceRecordDto {
    studentId: string;
    status: AttendanceStatus;
}
export declare class MarkAttendanceDto {
    records: AttendanceRecordDto[];
}
export declare class SessionListQueryDto {
    from?: string;
    to?: string;
    limit?: number;
}
export declare class VerifyPasskeyRegistrationDto {
    response: RegistrationResponseJSON;
}
export declare class VerifyPasskeyAuthenticationDto {
    response: AuthenticationResponseJSON;
}
