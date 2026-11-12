import {
  Body,
  Controller,
  Get,
  BadRequestException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import {
  createPrivateUploadStorage,
  deleteTemporaryUpload,
} from '../files/private-file-storage.js';
import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import type { AuthIdentity } from '../auth/auth.types.js';
import { CreateStudyMaterialDto } from './dto/create-study-material.dto.js';
import { CreateUploadedStudyMaterialDto } from './dto/create-uploaded-study-material.dto.js';
import { StudyMaterialsService } from './study-materials.service.js';

@Controller('institutes/me/class-sessions/:sessionId/materials')
@Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER)
export class InstituteStudyMaterialsController {
  constructor(private readonly materials: StudyMaterialsService) {}

  @Get()
  list(
    @Param('sessionId') sessionId: string,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.materials.listSessionMaterials(sessionId, actor);
  }

  @Post()
  create(
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateStudyMaterialDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.materials.createSessionMaterial(sessionId, dto, actor);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createPrivateUploadStorage(),
    }),
  )
  async upload(
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateUploadedStudyMaterialDto,
    @UploadedFile()
    file:
      | {
          path: string;
          filename: string;
          originalname: string;
          mimetype: string;
          size: number;
        }
      | undefined,
    @CurrentUser() actor: AuthIdentity,
  ) {
    if (!file) {
      throw new BadRequestException('A study material file is required.');
    }
    try {
      return await this.materials.createUploadedSessionMaterial(
        sessionId,
        dto,
        file,
        actor,
      );
    } finally {
      await deleteTemporaryUpload(file.filename);
    }
  }

  @Get(':materialId/file')
  async file(
    @Param('sessionId') sessionId: string,
    @Param('materialId') materialId: string,
    @CurrentUser() actor: AuthIdentity,
    @Res() response: Response,
  ) {
    const material = await this.materials.getStaffMaterialFile(
      sessionId,
      materialId,
      actor,
    );
    sendPrivateFile(response, material);
  }
}

@Controller('students/me/materials')
@Roles(UserRole.STUDENT)
export class StudentStudyMaterialsController {
  constructor(private readonly materials: StudyMaterialsService) {}

  @Get()
  list(@CurrentUser() actor: AuthIdentity) {
    return this.materials.listStudentMaterials(actor);
  }

  @Get(':materialId/file')
  async file(
    @Param('materialId') materialId: string,
    @CurrentUser() actor: AuthIdentity,
    @Res() response: Response,
  ) {
    const material = await this.materials.getStudentMaterialFile(
      materialId,
      actor,
    );
    sendPrivateFile(response, material);
  }
}

@Controller('parents/me/materials')
@Roles(UserRole.PARENT)
export class ParentStudyMaterialsController {
  constructor(private readonly materials: StudyMaterialsService) {}

  @Get()
  list(@CurrentUser() actor: AuthIdentity) {
    return this.materials.listParentMaterials(actor);
  }

  @Get(':materialId/file')
  async file(
    @Param('materialId') materialId: string,
    @CurrentUser() actor: AuthIdentity,
    @Res() response: Response,
  ) {
    const material = await this.materials.getParentMaterialFile(
      materialId,
      actor,
    );
    sendPrivateFile(response, material);
  }
}

function sendPrivateFile(
  response: Response,
  file: { path: string; mimeType: string; originalName: string },
) {
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Type', file.mimeType);
  response.setHeader(
    'Content-Disposition',
    `inline; filename="${file.originalName.replace(/["\r\n]/g, '_')}"`,
  );
  response.sendFile(file.path);
}
