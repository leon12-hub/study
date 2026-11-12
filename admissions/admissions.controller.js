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
import { Body, Controller, Get, Param, Patch, Post, Res, UploadedFiles, UseInterceptors, } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser, Public, Roles } from '../auth/auth.decorators.js';
import { CreateAdmissionApplicationDto } from './dto/create-admission-application.dto.js';
import { ReviewAdmissionApplicationDto } from './dto/review-admission-application.dto.js';
import { ReviewAdmissionDocumentDto } from './dto/review-admission-document.dto.js';
import { AdmissionsService } from './admissions.service.js';
let PublicAdmissionsController = class PublicAdmissionsController {
    admissions;
    constructor(admissions) {
        this.admissions = admissions;
    }
    listInstitutes() {
        return this.admissions.listPublicInstitutes();
    }
    createApplication(dto, files) {
        return this.admissions.createPublicApplication(dto, files ?? []);
    }
    getApplicationStatus(trackingToken) {
        return this.admissions.getPublicApplicationStatus(trackingToken);
    }
};
__decorate([
    Get('institutes'),
    Public(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], PublicAdmissionsController.prototype, "listInstitutes", null);
__decorate([
    Post('applications'),
    Public(),
    Throttle({ default: { limit: 5, ttl: 60_000 } }),
    UseInterceptors(FilesInterceptor('documents', 5, {
        limits: { fileSize: 10 * 1024 * 1024, files: 5 },
    })),
    __param(0, Body()),
    __param(1, UploadedFiles()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateAdmissionApplicationDto,
        Array]),
    __metadata("design:returntype", void 0)
], PublicAdmissionsController.prototype, "createApplication", null);
__decorate([
    Get('applications/:trackingToken'),
    Public(),
    __param(0, Param('trackingToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], PublicAdmissionsController.prototype, "getApplicationStatus", null);
PublicAdmissionsController = __decorate([
    Controller('admissions'),
    __metadata("design:paramtypes", [AdmissionsService])
], PublicAdmissionsController);
export { PublicAdmissionsController };
let InstituteAdmissionsController = class InstituteAdmissionsController {
    admissions;
    constructor(admissions) {
        this.admissions = admissions;
    }
    list(actor) {
        return this.admissions.listApplications(actor);
    }
    review(applicationId, dto, actor) {
        return this.admissions.reviewApplication(applicationId, dto, actor);
    }
    reviewDocument(applicationId, documentId, dto, actor) {
        return this.admissions.reviewDocument(applicationId, documentId, dto, actor);
    }
    async getDocumentFile(applicationId, documentId, actor, response) {
        const document = await this.admissions.getAdmissionDocument(applicationId, documentId, actor);
        response.setHeader('Cache-Control', 'private, no-store');
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.setHeader('Content-Type', document.mimeType);
        response.setHeader('Content-Disposition', `inline; filename="${document.originalName.replace(/["\r\n]/g, '_')}"`);
        response.sendFile(document.path);
    }
};
__decorate([
    Get(),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InstituteAdmissionsController.prototype, "list", null);
__decorate([
    Patch(':applicationId'),
    __param(0, Param('applicationId')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, ReviewAdmissionApplicationDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteAdmissionsController.prototype, "review", null);
__decorate([
    Patch(':applicationId/documents/:documentId'),
    __param(0, Param('applicationId')),
    __param(1, Param('documentId')),
    __param(2, Body()),
    __param(3, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, ReviewAdmissionDocumentDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteAdmissionsController.prototype, "reviewDocument", null);
__decorate([
    Get(':applicationId/documents/:documentId/file'),
    __param(0, Param('applicationId')),
    __param(1, Param('documentId')),
    __param(2, CurrentUser()),
    __param(3, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], InstituteAdmissionsController.prototype, "getDocumentFile", null);
InstituteAdmissionsController = __decorate([
    Controller('institutes/me/admissions'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN),
    __metadata("design:paramtypes", [AdmissionsService])
], InstituteAdmissionsController);
export { InstituteAdmissionsController };
//# sourceMappingURL=admissions.controller.js.map