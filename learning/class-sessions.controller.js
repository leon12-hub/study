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
import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import { CreateClassSessionDto, MarkAttendanceDto, SessionListQueryDto, VerifyPasskeyAuthenticationDto, VerifyPasskeyRegistrationDto, } from './dto/create-class-session.dto.js';
import { ClassSessionsService } from './class-sessions.service.js';
let InstituteClassSessionsController = class InstituteClassSessionsController {
    sessions;
    constructor(sessions) {
        this.sessions = sessions;
    }
    list(query, actor) {
        return this.sessions.listInstituteSessions(query, actor);
    }
    create(dto, actor) {
        return this.sessions.createSession(dto, actor);
    }
    getAttendance(sessionId, actor) {
        return this.sessions.getSessionAttendance(sessionId, actor);
    }
    markAttendance(sessionId, dto, actor) {
        return this.sessions.markAttendance(sessionId, dto, actor);
    }
};
__decorate([
    Get(),
    __param(0, Query()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [SessionListQueryDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteClassSessionsController.prototype, "list", null);
__decorate([
    Post(),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateClassSessionDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteClassSessionsController.prototype, "create", null);
__decorate([
    Get(':sessionId/attendance'),
    __param(0, Param('sessionId')),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InstituteClassSessionsController.prototype, "getAttendance", null);
__decorate([
    Put(':sessionId/attendance'),
    __param(0, Param('sessionId')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, MarkAttendanceDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteClassSessionsController.prototype, "markAttendance", null);
InstituteClassSessionsController = __decorate([
    Controller('institutes/me/class-sessions'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER),
    __metadata("design:paramtypes", [ClassSessionsService])
], InstituteClassSessionsController);
export { InstituteClassSessionsController };
let StudentClassSessionsController = class StudentClassSessionsController {
    sessions;
    constructor(sessions) {
        this.sessions = sessions;
    }
    list(actor) {
        return this.sessions.listStudentSessions(actor);
    }
    getPasskeyStatus(actor) {
        return this.sessions.getStudentPasskeyStatus(actor);
    }
    getPasskeyRegistrationOptions(actor) {
        return this.sessions.getPasskeyRegistrationOptions(actor);
    }
    verifyPasskeyRegistration(dto, actor) {
        return this.sessions.verifyPasskeyRegistration(dto.response, actor);
    }
    getPunchOptions(sessionId, actor) {
        return this.sessions.getPunchOptions(sessionId, actor);
    }
    punchIn(sessionId, dto, actor) {
        return this.sessions.punchIn(sessionId, dto.response, actor);
    }
};
__decorate([
    Get('classes'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StudentClassSessionsController.prototype, "list", null);
__decorate([
    Get('attendance/passkey'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StudentClassSessionsController.prototype, "getPasskeyStatus", null);
__decorate([
    Post('attendance/passkey/registration/options'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StudentClassSessionsController.prototype, "getPasskeyRegistrationOptions", null);
__decorate([
    Post('attendance/passkey/registration/verify'),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [VerifyPasskeyRegistrationDto, Object]),
    __metadata("design:returntype", void 0)
], StudentClassSessionsController.prototype, "verifyPasskeyRegistration", null);
__decorate([
    Post('classes/:sessionId/punch/options'),
    __param(0, Param('sessionId')),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], StudentClassSessionsController.prototype, "getPunchOptions", null);
__decorate([
    Post('classes/:sessionId/punch'),
    __param(0, Param('sessionId')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, VerifyPasskeyAuthenticationDto, Object]),
    __metadata("design:returntype", void 0)
], StudentClassSessionsController.prototype, "punchIn", null);
StudentClassSessionsController = __decorate([
    Controller('students/me'),
    Roles(UserRole.STUDENT),
    __metadata("design:paramtypes", [ClassSessionsService])
], StudentClassSessionsController);
export { StudentClassSessionsController };
//# sourceMappingURL=class-sessions.controller.js.map