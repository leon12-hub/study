import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import type { AuthIdentity } from '../auth/auth.types.js';
import { CreateBranchDto } from './dto/create-branch.dto.js';
import { UpdateBranchDto } from './dto/update-branch.dto.js';
import { UpdateInstituteDto } from './dto/update-institute.dto.js';
import { InstitutesService } from './institutes.service.js';

@Controller('institutes/me')
@Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN)
export class InstitutesController {
  constructor(private readonly institutesService: InstitutesService) {}

  @Get()
  getProfile(@CurrentUser() actor: AuthIdentity) {
    return this.institutesService.getProfile(actor);
  }

  @Patch()
  @Roles(UserRole.INSTITUTE_ADMIN)
  updateProfile(
    @Body() dto: UpdateInstituteDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.institutesService.updateProfile(dto, actor);
  }

  @Get('dashboard')
  getDashboard(@CurrentUser() actor: AuthIdentity) {
    return this.institutesService.getDashboard(actor);
  }

  @Get('branches')
  getBranches(@CurrentUser() actor: AuthIdentity) {
    return this.institutesService.getBranches(actor);
  }

  @Get('students')
  getStudents(@CurrentUser() actor: AuthIdentity) {
    return this.institutesService.getStudents(actor);
  }

  @Get('teachers')
  getTeachers(@CurrentUser() actor: AuthIdentity) {
    return this.institutesService.getTeachers(actor);
  }

  @Post('branches')
  @Roles(UserRole.INSTITUTE_ADMIN)
  createBranch(
    @Body() dto: CreateBranchDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.institutesService.createBranch(dto, actor);
  }

  @Patch('branches/:branchId')
  @Roles(UserRole.INSTITUTE_ADMIN)
  updateBranch(
    @Param('branchId') branchId: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.institutesService.updateBranch(branchId, dto, actor);
  }
}
