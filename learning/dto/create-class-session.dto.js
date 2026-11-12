var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { AttendanceStatus, ClassMode } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength, ValidateNested, } from 'class-validator';
export class CreateClassSessionDto {
    batchId;
    subjectId;
    teacherMembershipId;
    classroomId;
    title;
    mode;
    startsAt;
    endsAt;
    joinUrl;
}
__decorate([
    IsString(),
    MinLength(1),
    __metadata("design:type", String)
], CreateClassSessionDto.prototype, "batchId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MinLength(1),
    __metadata("design:type", String)
], CreateClassSessionDto.prototype, "subjectId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MinLength(1),
    __metadata("design:type", String)
], CreateClassSessionDto.prototype, "teacherMembershipId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MinLength(1),
    __metadata("design:type", String)
], CreateClassSessionDto.prototype, "classroomId", void 0);
__decorate([
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    IsString(),
    MinLength(2),
    MaxLength(160),
    __metadata("design:type", String)
], CreateClassSessionDto.prototype, "title", void 0);
__decorate([
    IsEnum(ClassMode),
    __metadata("design:type", String)
], CreateClassSessionDto.prototype, "mode", void 0);
__decorate([
    IsDateString(),
    __metadata("design:type", String)
], CreateClassSessionDto.prototype, "startsAt", void 0);
__decorate([
    IsDateString(),
    __metadata("design:type", String)
], CreateClassSessionDto.prototype, "endsAt", void 0);
__decorate([
    IsOptional(),
    IsUrl({ protocols: ['https'], require_tld: true }),
    MaxLength(2048),
    __metadata("design:type", String)
], CreateClassSessionDto.prototype, "joinUrl", void 0);
export class AttendanceRecordDto {
    studentId;
    status;
}
__decorate([
    IsString(),
    MinLength(1),
    __metadata("design:type", String)
], AttendanceRecordDto.prototype, "studentId", void 0);
__decorate([
    IsEnum(AttendanceStatus),
    __metadata("design:type", String)
], AttendanceRecordDto.prototype, "status", void 0);
export class MarkAttendanceDto {
    records;
}
__decorate([
    IsArray(),
    ArrayMinSize(1),
    ArrayMaxSize(500),
    ValidateNested({ each: true }),
    Type(() => AttendanceRecordDto),
    __metadata("design:type", Array)
], MarkAttendanceDto.prototype, "records", void 0);
export class SessionListQueryDto {
    from;
    to;
    limit;
}
__decorate([
    IsOptional(),
    IsDateString(),
    __metadata("design:type", String)
], SessionListQueryDto.prototype, "from", void 0);
__decorate([
    IsOptional(),
    IsDateString(),
    __metadata("design:type", String)
], SessionListQueryDto.prototype, "to", void 0);
__decorate([
    IsOptional(),
    Type(() => Number),
    IsInt(),
    Min(1),
    Max(100),
    __metadata("design:type", Number)
], SessionListQueryDto.prototype, "limit", void 0);
export class VerifyPasskeyRegistrationDto {
    response;
}
__decorate([
    IsObject(),
    __metadata("design:type", Object)
], VerifyPasskeyRegistrationDto.prototype, "response", void 0);
export class VerifyPasskeyAuthenticationDto {
    response;
}
__decorate([
    IsObject(),
    __metadata("design:type", Object)
], VerifyPasskeyAuthenticationDto.prototype, "response", void 0);
//# sourceMappingURL=create-class-session.dto.js.map