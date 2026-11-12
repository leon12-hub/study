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
import { Controller, Get, Param } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import { RoleDashboardsService } from './role-dashboards.service.js';
let StudentDashboardController = class StudentDashboardController {
    dashboards;
    constructor(dashboards) {
        this.dashboards = dashboards;
    }
    getDashboard(actor) {
        return this.dashboards.getStudentDashboard(actor);
    }
};
__decorate([
    Get('dashboard'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StudentDashboardController.prototype, "getDashboard", null);
StudentDashboardController = __decorate([
    Controller('students/me'),
    Roles(UserRole.STUDENT),
    __metadata("design:paramtypes", [RoleDashboardsService])
], StudentDashboardController);
export { StudentDashboardController };
let TeacherDashboardController = class TeacherDashboardController {
    dashboards;
    constructor(dashboards) {
        this.dashboards = dashboards;
    }
    getDashboard(actor) {
        return this.dashboards.getTeacherDashboard(actor);
    }
};
__decorate([
    Get('dashboard'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], TeacherDashboardController.prototype, "getDashboard", null);
TeacherDashboardController = __decorate([
    Controller('teachers/me'),
    Roles(UserRole.TEACHER),
    __metadata("design:paramtypes", [RoleDashboardsService])
], TeacherDashboardController);
export { TeacherDashboardController };
let ParentDashboardController = class ParentDashboardController {
    dashboards;
    constructor(dashboards) {
        this.dashboards = dashboards;
    }
    getDashboard(actor) {
        return this.dashboards.getParentDashboard(actor);
    }
};
__decorate([
    Get('dashboard'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ParentDashboardController.prototype, "getDashboard", null);
ParentDashboardController = __decorate([
    Controller('parents/me'),
    Roles(UserRole.PARENT),
    __metadata("design:paramtypes", [RoleDashboardsService])
], ParentDashboardController);
export { ParentDashboardController };
let AdminPortalPreviewController = class AdminPortalPreviewController {
    dashboards;
    constructor(dashboards) {
        this.dashboards = dashboards;
    }
    list(actor) {
        return this.dashboards.listAdminPortalPreview(actor);
    }
    student(studentId, actor) {
        return this.dashboards.getAdminStudentPreview(studentId, actor);
    }
    parent(membershipId, actor) {
        return this.dashboards.getAdminParentPreview(membershipId, actor);
    }
};
__decorate([
    Get(),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminPortalPreviewController.prototype, "list", null);
__decorate([
    Get('students/:studentId'),
    __param(0, Param('studentId')),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminPortalPreviewController.prototype, "student", null);
__decorate([
    Get('parents/:membershipId'),
    __param(0, Param('membershipId')),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AdminPortalPreviewController.prototype, "parent", null);
AdminPortalPreviewController = __decorate([
    Controller('institutes/me/portal-preview'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN),
    __metadata("design:paramtypes", [RoleDashboardsService])
], AdminPortalPreviewController);
export { AdminPortalPreviewController };
//# sourceMappingURL=role-dashboards.controller.js.map