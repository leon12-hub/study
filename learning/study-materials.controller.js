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
import { Body, Controller, Get, BadRequestException, Param, Post, Res, UploadedFile, UseInterceptors, } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { createPrivateUploadStorage, deleteTemporaryUpload, } from '../files/private-file-storage.js';
import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import { CreateStudyMaterialDto } from './dto/create-study-material.dto.js';
import { CreateUploadedStudyMaterialDto } from './dto/create-uploaded-study-material.dto.js';
import { StudyMaterialsService } from './study-materials.service.js';
let InstituteStudyMaterialsController = class InstituteStudyMaterialsController {
    materials;
    constructor(materials) {
        this.materials = materials;
    }
    list(sessionId, actor) {
        return this.materials.listSessionMaterials(sessionId, actor);
    }
    create(sessionId, dto, actor) {
        return this.materials.createSessionMaterial(sessionId, dto, actor);
    }
    async upload(sessionId, dto, file, actor) {
        if (!file) {
            throw new BadRequestException('A study material file is required.');
        }
        try {
            return await this.materials.createUploadedSessionMaterial(sessionId, dto, file, actor);
        }
        finally {
            await deleteTemporaryUpload(file.filename);
        }
    }
    async file(sessionId, materialId, actor, response) {
        const material = await this.materials.getStaffMaterialFile(sessionId, materialId, actor);
        sendPrivateFile(response, material);
    }
};
__decorate([
    Get(),
    __param(0, Param('sessionId')),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], InstituteStudyMaterialsController.prototype, "list", null);
__decorate([
    Post(),
    __param(0, Param('sessionId')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateStudyMaterialDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteStudyMaterialsController.prototype, "create", null);
__decorate([
    Post('upload'),
    UseInterceptors(FileInterceptor('file', {
        storage: createPrivateUploadStorage(),
    })),
    __param(0, Param('sessionId')),
    __param(1, Body()),
    __param(2, UploadedFile()),
    __param(3, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, CreateUploadedStudyMaterialDto, Object, Object]),
    __metadata("design:returntype", Promise)
], InstituteStudyMaterialsController.prototype, "upload", null);
__decorate([
    Get(':materialId/file'),
    __param(0, Param('sessionId')),
    __param(1, Param('materialId')),
    __param(2, CurrentUser()),
    __param(3, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], InstituteStudyMaterialsController.prototype, "file", null);
InstituteStudyMaterialsController = __decorate([
    Controller('institutes/me/class-sessions/:sessionId/materials'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER),
    __metadata("design:paramtypes", [StudyMaterialsService])
], InstituteStudyMaterialsController);
export { InstituteStudyMaterialsController };
let StudentStudyMaterialsController = class StudentStudyMaterialsController {
    materials;
    constructor(materials) {
        this.materials = materials;
    }
    list(actor) {
        return this.materials.listStudentMaterials(actor);
    }
    async file(materialId, actor, response) {
        const material = await this.materials.getStudentMaterialFile(materialId, actor);
        sendPrivateFile(response, material);
    }
};
__decorate([
    Get(),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StudentStudyMaterialsController.prototype, "list", null);
__decorate([
    Get(':materialId/file'),
    __param(0, Param('materialId')),
    __param(1, CurrentUser()),
    __param(2, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], StudentStudyMaterialsController.prototype, "file", null);
StudentStudyMaterialsController = __decorate([
    Controller('students/me/materials'),
    Roles(UserRole.STUDENT),
    __metadata("design:paramtypes", [StudyMaterialsService])
], StudentStudyMaterialsController);
export { StudentStudyMaterialsController };
let ParentStudyMaterialsController = class ParentStudyMaterialsController {
    materials;
    constructor(materials) {
        this.materials = materials;
    }
    list(actor) {
        return this.materials.listParentMaterials(actor);
    }
    async file(materialId, actor, response) {
        const material = await this.materials.getParentMaterialFile(materialId, actor);
        sendPrivateFile(response, material);
    }
};
__decorate([
    Get(),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ParentStudyMaterialsController.prototype, "list", null);
__decorate([
    Get(':materialId/file'),
    __param(0, Param('materialId')),
    __param(1, CurrentUser()),
    __param(2, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ParentStudyMaterialsController.prototype, "file", null);
ParentStudyMaterialsController = __decorate([
    Controller('parents/me/materials'),
    Roles(UserRole.PARENT),
    __metadata("design:paramtypes", [StudyMaterialsService])
], ParentStudyMaterialsController);
export { ParentStudyMaterialsController };
function sendPrivateFile(response, file) {
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Type', file.mimeType);
    response.setHeader('Content-Disposition', `inline; filename="${file.originalName.replace(/["\r\n]/g, '_')}"`);
    response.sendFile(file.path);
}
//# sourceMappingURL=study-materials.controller.js.map