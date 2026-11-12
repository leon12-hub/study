import { Controller, Get, Param } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import type { AuthIdentity } from '../auth/auth.types.js';
import { RoleDashboardsService } from './role-dashboards.service.js';

@Controller('students/me')
@Roles(UserRole.STUDENT)
export class StudentDashboardController {
  constructor(private readonly dashboards: RoleDashboardsService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() actor: AuthIdentity) {
    return this.dashboards.getStudentDashboard(actor);
  }
}

@Controller('teachers/me')
@Roles(UserRole.TEACHER)
export class TeacherDashboardController {
  constructor(private readonly dashboards: RoleDashboardsService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() actor: AuthIdentity) {
    return this.dashboards.getTeacherDashboard(actor);
  }
}

@Controller('parents/me')
@Roles(UserRole.PARENT)
export class ParentDashboardController {
  constructor(private readonly dashboards: RoleDashboardsService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() actor: AuthIdentity) {
    return this.dashboards.getParentDashboard(actor);
  }
}

@Controller('institutes/me/portal-preview')
@Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN)
export class AdminPortalPreviewController {
  constructor(private readonly dashboards: RoleDashboardsService) {}

  @Get()
  list(@CurrentUser() actor: AuthIdentity) {
    return this.dashboards.listAdminPortalPreview(actor);
  }

  @Get('students/:studentId')
  student(
    @Param('studentId') studentId: string,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.dashboards.getAdminStudentPreview(studentId, actor);
  }

  @Get('parents/:membershipId')
  parent(
    @Param('membershipId') membershipId: string,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.dashboards.getAdminParentPreview(membershipId, actor);
  }
}
