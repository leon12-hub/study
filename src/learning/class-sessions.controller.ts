import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import type { AuthIdentity } from '../auth/auth.types.js';
import {
  CreateClassSessionDto,
  MarkAttendanceDto,
  SessionListQueryDto,
  VerifyPasskeyAuthenticationDto,
  VerifyPasskeyRegistrationDto,
} from './dto/create-class-session.dto.js';
import { ClassSessionsService } from './class-sessions.service.js';

@Controller('institutes/me/class-sessions')
@Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER)
export class InstituteClassSessionsController {
  constructor(private readonly sessions: ClassSessionsService) {}

  @Get()
  list(
    @Query() query: SessionListQueryDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.sessions.listInstituteSessions(query, actor);
  }

  @Post()
  create(
    @Body() dto: CreateClassSessionDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.sessions.createSession(dto, actor);
  }

  @Get(':sessionId/attendance')
  getAttendance(
    @Param('sessionId') sessionId: string,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.sessions.getSessionAttendance(sessionId, actor);
  }

  @Put(':sessionId/attendance')
  markAttendance(
    @Param('sessionId') sessionId: string,
    @Body() dto: MarkAttendanceDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.sessions.markAttendance(sessionId, dto, actor);
  }
}

@Controller('students/me')
@Roles(UserRole.STUDENT)
export class StudentClassSessionsController {
  constructor(private readonly sessions: ClassSessionsService) {}

  @Get('classes')
  list(@CurrentUser() actor: AuthIdentity) {
    return this.sessions.listStudentSessions(actor);
  }

  @Get('attendance/passkey')
  getPasskeyStatus(@CurrentUser() actor: AuthIdentity) {
    return this.sessions.getStudentPasskeyStatus(actor);
  }

  @Post('attendance/passkey/registration/options')
  getPasskeyRegistrationOptions(@CurrentUser() actor: AuthIdentity) {
    return this.sessions.getPasskeyRegistrationOptions(actor);
  }

  @Post('attendance/passkey/registration/verify')
  verifyPasskeyRegistration(
    @Body() dto: VerifyPasskeyRegistrationDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.sessions.verifyPasskeyRegistration(dto.response, actor);
  }

  @Post('classes/:sessionId/punch/options')
  getPunchOptions(
    @Param('sessionId') sessionId: string,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.sessions.getPunchOptions(sessionId, actor);
  }

  @Post('classes/:sessionId/punch')
  punchIn(
    @Param('sessionId') sessionId: string,
    @Body() dto: VerifyPasskeyAuthenticationDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.sessions.punchIn(sessionId, dto.response, actor);
  }
}
