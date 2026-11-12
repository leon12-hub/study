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
import { CreateBranchDto } from './dto/create-branch.dto.js';
import { UpdateBranchDto } from './dto/update-branch.dto.js';
import { UpdateInstituteDto } from './dto/update-institute.dto.js';
import { InstitutesService } from './institutes.service.js';
let InstitutesController = class InstitutesController {
    institutesService;
    constructor(institutesService) {
        this.institutesService = institutesService;
    }
    getProfile(actor) {
        return this.institutesService.getProfile(actor);
    }
    updateProfile(dto, actor) {
        return this.institutesService.updateProfile(dto, actor);
    }
    getDashboard(actor) {
        return this.institutesService.getDashboard(actor);
    }
    getBranches(actor) {
        return this.institutesService.getBranches(actor);
    }
    getStudents(actor) {
        return this.institutesService.getStudents(actor);
    }
    getTeachers(actor) {
        return this.institutesService.getTeachers(actor);
    }
    createBranch(dto, actor) {
        return this.institutesService.createBranch(dto, actor);
    }
    updateBranch(branchId, dto, actor) {
        return this.institutesService.updateBranch(branchId, dto, actor);
    }
};
__decorate([
    Get(),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InstitutesController.prototype, "getProfile", null);
__decorate([
    Patch(),
    Roles(UserRole.INSTITUTE_ADMIN),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UpdateInstituteDto, Object]),
    __metadata("design:returntype", void 0)
], InstitutesController.prototype, "updateProfile", null);
__decorate([
    Get('dashboard'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InstitutesController.prototype, "getDashboard", null);
__decorate([
    Get('branches'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InstitutesController.prototype, "getBranches", null);
__decorate([
    Get('students'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InstitutesController.prototype, "getStudents", null);
__decorate([
    Get('teachers'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], InstitutesController.prototype, "getTeachers", null);
__decorate([
    Post('branches'),
    Roles(UserRole.INSTITUTE_ADMIN),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [CreateBranchDto, Object]),
    __metadata("design:returntype", void 0)
], InstitutesController.prototype, "createBranch", null);
__decorate([
    Patch('branches/:branchId'),
    Roles(UserRole.INSTITUTE_ADMIN),
    __param(0, Param('branchId')),
    __param(1, Body()),
    __param(2, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, UpdateBranchDto, Object]),
    __metadata("design:returntype", void 0)
], InstitutesController.prototype, "updateBranch", null);
InstitutesController = __decorate([
    Controller('institutes/me'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN),
    __metadata("design:paramtypes", [InstitutesService])
], InstitutesController);
export { InstitutesController };
//# sourceMappingURL=institutes.controller.js.map