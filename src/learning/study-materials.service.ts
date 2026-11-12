import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EnrollmentStatus, MaterialKind, UserRole } from '@prisma/client';
import type { AuthIdentity } from '../auth/auth.types.js';
import {
  deletePrivateFile,
  getPrivateFilePath,
  getSafeOriginalName,
  storePrivateFileFromPath,
} from '../files/private-file-storage.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStudyMaterialDto } from './dto/create-study-material.dto.js';
import { CreateUploadedStudyMaterialDto } from './dto/create-uploaded-study-material.dto.js';

const MATERIAL_SELECT = {
  id: true,
  title: true,
  kind: true,
  fileUrl: true,
  mimeType: true,
  originalName: true,
  downloadable: true,
  createdAt: true,
  session: {
    select: {
      id: true,
      title: true,
      startsAt: true,
      batch: { select: { id: true, name: true, branchId: true } },
    },
  },
  createdBy: { select: { user: { select: { fullName: true } } } },
} as const;

const STAFF_ROLES = [
  UserRole.INSTITUTE_ADMIN,
  UserRole.BRANCH_ADMIN,
  UserRole.TEACHER,
];
const PDF_MIME_TYPES = ['application/pdf'];
const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

@Injectable()
export class StudyMaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async listSessionMaterials(sessionId: string, actor: AuthIdentity) {
    const session = await this.requireSession(sessionId, actor);
    return this.prisma.studyMaterial.findMany({
      where: { instituteId: actor.instituteId!, sessionId: session.id },
      orderBy: { createdAt: 'desc' },
      select: MATERIAL_SELECT,
    });
  }

  async createSessionMaterial(
    sessionId: string,
    dto: CreateStudyMaterialDto,
    actor: AuthIdentity,
  ) {
    const session = await this.requireSession(sessionId, actor);
    return this.prisma.studyMaterial.create({
      data: {
        instituteId: actor.instituteId!,
        sessionId: session.id,
        createdByMembershipId: actor.membershipId,
        title: dto.title.trim(),
        kind: dto.kind,
        fileUrl: dto.fileUrl.trim(),
        downloadable:
          dto.kind === MaterialKind.LINK ? false : (dto.downloadable ?? true),
      },
      select: MATERIAL_SELECT,
    });
  }

  async createUploadedSessionMaterial(
    sessionId: string,
    dto: CreateUploadedStudyMaterialDto,
    file: {
      path: string;
      originalname: string;
      mimetype: string;
      size: number;
    },
    actor: AuthIdentity,
  ) {
    const session = await this.requireSession(sessionId, actor);
    const allowedMimeTypes =
      dto.kind === MaterialKind.PDF ? PDF_MIME_TYPES : VIDEO_MIME_TYPES;
    const storageKey = await storePrivateFileFromPath(
      file.path,
      file.mimetype,
      allowedMimeTypes,
    );
    try {
      return await this.prisma.studyMaterial.create({
        data: {
          instituteId: actor.instituteId!,
          sessionId: session.id,
          createdByMembershipId: actor.membershipId,
          title: dto.title.trim(),
          kind: dto.kind,
          fileUrl: 'protected-upload',
          storageKey,
          mimeType: file.mimetype,
          originalName: getSafeOriginalName(file.originalname),
          downloadable: dto.downloadable,
        },
        select: MATERIAL_SELECT,
      });
    } catch (error) {
      await deletePrivateFile(storageKey);
      throw error;
    }
  }

  async listStudentMaterials(actor: AuthIdentity) {
    const instituteId = this.requireRole(actor, [UserRole.STUDENT]);
    const student = await this.prisma.studentProfile.findFirst({
      where: {
        membershipId: actor.membershipId,
        membership: { instituteId },
      },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found.');
    }

    return this.prisma.studyMaterial.findMany({
      where: {
        instituteId,
        session: {
          is: {
            batch: {
              is: {
                enrollments: {
                  some: {
                    studentId: student.id,
                    status: EnrollmentStatus.ACTIVE,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: MATERIAL_SELECT,
    });
  }

  async listParentMaterials(actor: AuthIdentity) {
    const instituteId = this.requireRole(actor, [UserRole.PARENT]);
    return this.prisma.studyMaterial.findMany({
      where: {
        instituteId,
        session: {
          is: {
            batch: {
              is: {
                instituteId,
                isActive: true,
                enrollments: {
                  some: {
                    status: EnrollmentStatus.ACTIVE,
                    student: {
                      is: {
                        parentLinks: {
                          some: {
                            parentMembershipId: actor.membershipId,
                            parentMembership: { instituteId },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: MATERIAL_SELECT,
    });
  }

  async getStaffMaterialFile(
    sessionId: string,
    materialId: string,
    actor: AuthIdentity,
  ) {
    const session = await this.requireSession(sessionId, actor);
    const material = await this.prisma.studyMaterial.findFirst({
      where: {
        id: materialId,
        sessionId: session.id,
        instituteId: actor.instituteId!,
        storageKey: { not: null },
      },
      select: { storageKey: true, mimeType: true, originalName: true },
    });
    if (!material) {
      throw new NotFoundException('Uploaded study material not found.');
    }
    if (!material.storageKey || !material.mimeType || !material.originalName) {
      throw new NotFoundException('Uploaded study material not found.');
    }
    return {
      path: getPrivateFilePath(material.storageKey),
      mimeType: material.mimeType,
      originalName: material.originalName,
    };
  }

  async getStudentMaterialFile(materialId: string, actor: AuthIdentity) {
    const instituteId = this.requireRole(actor, [UserRole.STUDENT]);
    const student = await this.prisma.studentProfile.findFirst({
      where: {
        membershipId: actor.membershipId,
        membership: { instituteId },
      },
      select: { id: true },
    });
    if (!student) {
      throw new NotFoundException('Student profile not found.');
    }
    const material = await this.prisma.studyMaterial.findFirst({
      where: {
        id: materialId,
        instituteId,
        storageKey: { not: null },
        session: {
          is: {
            batch: {
              is: {
                enrollments: {
                  some: {
                    studentId: student.id,
                    status: EnrollmentStatus.ACTIVE,
                  },
                },
              },
            },
          },
        },
      },
      select: { storageKey: true, mimeType: true, originalName: true },
    });
    if (!material) {
      throw new NotFoundException('Uploaded study material not found.');
    }
    if (!material.storageKey || !material.mimeType || !material.originalName) {
      throw new NotFoundException('Uploaded study material not found.');
    }
    return {
      path: getPrivateFilePath(material.storageKey),
      mimeType: material.mimeType,
      originalName: material.originalName,
    };
  }

  async getParentMaterialFile(materialId: string, actor: AuthIdentity) {
    const instituteId = this.requireRole(actor, [UserRole.PARENT]);
    const material = await this.prisma.studyMaterial.findFirst({
      where: {
        id: materialId,
        instituteId,
        storageKey: { not: null },
        session: {
          is: {
            batch: {
              is: {
                instituteId,
                isActive: true,
                enrollments: {
                  some: {
                    status: EnrollmentStatus.ACTIVE,
                    student: {
                      is: {
                        parentLinks: {
                          some: {
                            parentMembershipId: actor.membershipId,
                            parentMembership: { instituteId },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      select: { storageKey: true, mimeType: true, originalName: true },
    });
    if (!material?.storageKey || !material.mimeType || !material.originalName) {
      throw new NotFoundException('Uploaded study material not found.');
    }
    return {
      path: getPrivateFilePath(material.storageKey),
      mimeType: material.mimeType,
      originalName: material.originalName,
    };
  }

  private async requireSession(sessionId: string, actor: AuthIdentity) {
    const instituteId = this.requireRole(actor, STAFF_ROLES);
    const branchId =
      actor.role === UserRole.BRANCH_ADMIN ? actor.branchId : null;
    if (actor.role === UserRole.BRANCH_ADMIN && !branchId) {
      throw new ForbiddenException('Your account has no branch assignment.');
    }

    const session = await this.prisma.classSession.findFirst({
      where: {
        id: sessionId,
        instituteId,
        ...(branchId ? { batch: { is: { branchId } } } : {}),
        ...(actor.role === UserRole.TEACHER
          ? { teacherMembershipId: actor.membershipId }
          : {}),
      },
      select: { id: true },
    });
    if (!session) {
      throw new NotFoundException('Class session not found in your scope.');
    }
    return session;
  }

  private requireRole(actor: AuthIdentity, roles: UserRole[]): string {
    if (!roles.includes(actor.role)) {
      throw new ForbiddenException('Your role cannot access study materials.');
    }
    if (!actor.instituteId) {
      throw new ForbiddenException('Your account has no institute membership.');
    }
    return actor.instituteId;
  }
}
