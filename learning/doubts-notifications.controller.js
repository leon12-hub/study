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
import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import { CreateDoubtDto } from './dto/create-doubt.dto.js';
import { ReplyToDoubtDto } from './dto/reply-to-doubt.dto.js';
import { DoubtsNotificationsService } from './doubts-notifications.service.js';
let StudentDoubtsController = class StudentDoubtsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(actor) {
        return this.service.listStudentDoubts(actor);
    }
    create(dto, actor) {
        return this.service.createStudentDoubt(dto, actor);
    }
    close(doubtId, actor) {
        return this.service.closeStudentDoubt(doubtId, actor);
    }
};
__decorate([
    Get(),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StudentDoubtsController.prototype, "list", null);
__decorate([
    Post(),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateDoubtDto, Object]),
    __metadata("design:returntype", void 0)
], StudentDoubtsController.prototype, "create", null);
__decorate([
    Patch(':doubtId/close'),
    __param(0, Param('doubtId')),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], StudentDoubtsController.prototype, "close", null);
StudentDoubtsController = __decorate([
    Controller('students/me/doubts'),
    Roles(UserRole.STUDENT),
    __metadata("design:paramtypes", [DoubtsNotificationsService])
], StudentDoubtsController);
export { StudentDoubtsController };
let StaffDoubtsController = class StaffDoubtsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(actor) {
        return this.service.listStaffDoubts(actor);
    }
    reply(doubtId, dto, actor) {
        return this.service.replyToDoubt(doubtId, dto, actor);
    }
};
__decorate([
    Get(),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StaffDoubtsController.prototype, "list", null);
__decorate([
    Post(':doubtId/replies'),
    __param(0, Param('doubtId')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ReplyToDoubtDto, Object]),
    __metadata("design:returntype", void 0)
], StaffDoubtsController.prototype, "reply", null);
StaffDoubtsController = __decorate([
    Controller('institutes/me/doubts'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER),
    __metadata("design:paramtypes", [DoubtsNotificationsService])
], StaffDoubtsController);
export { StaffDoubtsController };
let NotificationsController = class NotificationsController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(actor) {
        return this.service.listNotifications(actor);
    }
    markRead(notificationId, actor) {
        return this.service.markNotificationRead(notificationId, actor);
    }
    markAllRead(actor) {
        return this.service.markAllNotificationsRead(actor);
    }
};
__decorate([
    Get(),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "list", null);
__decorate([
    Patch(':notificationId/read'),
    __param(0, Param('notificationId')),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "markRead", null);
__decorate([
    Post('read-all'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], NotificationsController.prototype, "markAllRead", null);
NotificationsController = __decorate([
    Controller('notifications/me'),
    Roles(UserRole.STUDENT, UserRole.TEACHER, UserRole.BRANCH_ADMIN, UserRole.INSTITUTE_ADMIN, UserRole.PARENT),
    __metadata("design:paramtypes", [DoubtsNotificationsService])
], NotificationsController);
export { NotificationsController };
//# sourceMappingURL=doubts-notifications.controller.js.map