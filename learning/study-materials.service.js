var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ForbiddenException, Injectable, NotFoundException, } from '@nestjs/common';
import { EnrollmentStatus, MaterialKind, UserRole } from '@prisma/client';
import { deletePrivateFile, getPrivateFilePath, getSafeOriginalName, storePrivateFileFromPath, } from '../files/private-file-storage.js';
import { PrismaService } from '../prisma/prisma.service.js';
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
};
const STAFF_ROLES = [
    UserRole.INSTITUTE_ADMIN,
    UserRole.BRANCH_ADMIN,
    UserRole.TEACHER,
];
const PDF_MIME_TYPES = ['application/pdf'];
const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
let StudyMaterialsService = class StudyMaterialsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listSessionMaterials(sessionId, actor) {
        const session = await this.requireSession(sessionId, actor);
        return this.prisma.studyMaterial.findMany({
            where: { instituteId: actor.instituteId, sessionId: session.id },
            orderBy: { createdAt: 'desc' },
            select: MATERIAL_SELECT,
        });
    }
    async createSessionMaterial(sessionId, dto, actor) {
        const session = await this.requireSession(sessionId, actor);
        return this.prisma.studyMaterial.create({
            data: {
                instituteId: actor.instituteId,
                sessionId: session.id,
                createdByMembershipId: actor.membershipId,
                title: dto.title.trim(),
                kind: dto.kind,
                fileUrl: dto.fileUrl.trim(),
                downloadable: dto.kind === MaterialKind.LINK ? false : (dto.downloadable ?? true),
            },
            select: MATERIAL_SELECT,
        });
    }
    async createUploadedSessionMaterial(sessionId, dto, file, actor) {
        const session = await this.requireSession(sessionId, actor);
        const allowedMimeTypes = dto.kind === MaterialKind.PDF ? PDF_MIME_TYPES : VIDEO_MIME_TYPES;
        const storageKey = await storePrivateFileFromPath(file.path, file.mimetype, allowedMimeTypes);
        try {
            return await this.prisma.studyMaterial.create({
                data: {
                    instituteId: actor.instituteId,
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
        }
        catch (error) {
            await deletePrivateFile(storageKey);
            throw error;
        }
    }
    async listStudentMaterials(actor) {
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
    async listParentMaterials(actor) {
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
    async getStaffMaterialFile(sessionId, materialId, actor) {
        const session = await this.requireSession(sessionId, actor);
        const material = await this.prisma.studyMaterial.findFirst({
            where: {
                id: materialId,
                sessionId: session.id,
                instituteId: actor.instituteId,
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
    async getStudentMaterialFile(materialId, actor) {
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
    async getParentMaterialFile(materialId, actor) {
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
    async requireSession(sessionId, actor) {
        const instituteId = this.requireRole(actor, STAFF_ROLES);
        const branchId = actor.role === UserRole.BRANCH_ADMIN ? actor.branchId : null;
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
    requireRole(actor, roles) {
        if (!roles.includes(actor.role)) {
            throw new ForbiddenException('Your role cannot access study materials.');
        }
        if (!actor.instituteId) {
            throw new ForbiddenException('Your account has no institute membership.');
        }
        return actor.instituteId;
    }
};
StudyMaterialsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], StudyMaterialsService);
export { StudyMaterialsService };
//# sourceMappingURL=study-materials.service.js.map