import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import type { AuthIdentity } from '../auth/auth.types.js';
import { CreateDoubtDto } from './dto/create-doubt.dto.js';
import { ReplyToDoubtDto } from './dto/reply-to-doubt.dto.js';
import { DoubtsNotificationsService } from './doubts-notifications.service.js';

@Controller('students/me/doubts')
@Roles(UserRole.STUDENT)
export class StudentDoubtsController {
  constructor(private readonly service: DoubtsNotificationsService) {}

  @Get()
  list(@CurrentUser() actor: AuthIdentity) {
    return this.service.listStudentDoubts(actor);
  }

  @Post()
  create(@Body() dto: CreateDoubtDto, @CurrentUser() actor: AuthIdentity) {
    return this.service.createStudentDoubt(dto, actor);
  }

  @Patch(':doubtId/close')
  close(@Param('doubtId') doubtId: string, @CurrentUser() actor: AuthIdentity) {
    return this.service.closeStudentDoubt(doubtId, actor);
  }
}

@Controller('institutes/me/doubts')
@Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER)
export class StaffDoubtsController {
  constructor(private readonly service: DoubtsNotificationsService) {}

  @Get()
  list(@CurrentUser() actor: AuthIdentity) {
    return this.service.listStaffDoubts(actor);
  }

  @Post(':doubtId/replies')
  reply(
    @Param('doubtId') doubtId: string,
    @Body() dto: ReplyToDoubtDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.service.replyToDoubt(doubtId, dto, actor);
  }
}

@Controller('notifications/me')
@Roles(
  UserRole.STUDENT,
  UserRole.TEACHER,
  UserRole.BRANCH_ADMIN,
  UserRole.INSTITUTE_ADMIN,
  UserRole.PARENT,
)
export class NotificationsController {
  constructor(private readonly service: DoubtsNotificationsService) {}

  @Get()
  list(@CurrentUser() actor: AuthIdentity) {
    return this.service.listNotifications(actor);
  }

  @Patch(':notificationId/read')
  markRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.service.markNotificationRead(notificationId, actor);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() actor: AuthIdentity) {
    return this.service.markAllNotificationsRead(actor);
  }
}
