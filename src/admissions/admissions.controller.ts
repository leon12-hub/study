import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CurrentUser, Public, Roles } from '../auth/auth.decorators.js';
import type { AuthIdentity } from '../auth/auth.types.js';
import { CreateAdmissionApplicationDto } from './dto/create-admission-application.dto.js';
import { ReviewAdmissionApplicationDto } from './dto/review-admission-application.dto.js';
import { ReviewAdmissionDocumentDto } from './dto/review-admission-document.dto.js';
import { AdmissionsService } from './admissions.service.js';

@Controller('admissions')
export class PublicAdmissionsController {
  constructor(private readonly admissions: AdmissionsService) {}

  @Get('institutes')
  @Public()
  listInstitutes() {
    return this.admissions.listPublicInstitutes();
  }

  @Post('applications')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(
    FilesInterceptor('documents', 5, {
      limits: { fileSize: 10 * 1024 * 1024, files: 5 },
    }),
  )
  createApplication(
    @Body() dto: CreateAdmissionApplicationDto,
    @UploadedFiles()
    files: Array<{
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    }>,
  ) {
    return this.admissions.createPublicApplication(dto, files ?? []);
  }

  @Get('applications/:trackingToken')
  @Public()
  getApplicationStatus(@Param('trackingToken') trackingToken: string) {
    return this.admissions.getPublicApplicationStatus(trackingToken);
  }
}

@Controller('institutes/me/admissions')
@Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN)
export class InstituteAdmissionsController {
  constructor(private readonly admissions: AdmissionsService) {}

  @Get()
  list(@CurrentUser() actor: AuthIdentity) {
    return this.admissions.listApplications(actor);
  }

  @Patch(':applicationId')
  review(
    @Param('applicationId') applicationId: string,
    @Body() dto: ReviewAdmissionApplicationDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.admissions.reviewApplication(applicationId, dto, actor);
  }

  @Patch(':applicationId/documents/:documentId')
  reviewDocument(
    @Param('applicationId') applicationId: string,
    @Param('documentId') documentId: string,
    @Body() dto: ReviewAdmissionDocumentDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.admissions.reviewDocument(
      applicationId,
      documentId,
      dto,
      actor,
    );
  }

  @Get(':applicationId/documents/:documentId/file')
  async getDocumentFile(
    @Param('applicationId') applicationId: string,
    @Param('documentId') documentId: string,
    @CurrentUser() actor: AuthIdentity,
    @Res() response: Response,
  ) {
    const document = await this.admissions.getAdmissionDocument(
      applicationId,
      documentId,
      actor,
    );
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Type', document.mimeType);
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${document.originalName.replace(/["\r\n]/g, '_')}"`,
    );
    response.sendFile(document.path);
  }
}
