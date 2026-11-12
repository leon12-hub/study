var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AdmissionDocumentStatus, AdmissionStatus, UserRole, } from '@prisma/client';
import { deletePrivateFile, getPrivateFilePath, getSafeOriginalName, storePrivateFile, } from '../files/private-file-storage.js';
import { PrismaService } from '../prisma/prisma.service.js';
const DOCUMENT_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const APPLICATION_SELECT = {
    id: true,
    fullName: true,
    email: true,
    phone: true,
    dateOfBirth: true,
    status: true,
    admissionNumber: true,
    reviewNotes: true,
    createdAt: true,
    reviewedAt: true,
    branch: { select: { id: true, name: true } },
    course: { select: { id: true, name: true } },
    batch: { select: { id: true, name: true } },
    documents: {
        select: {
            id: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            status: true,
            verificationNotes: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
    },
};
let AdmissionsService = class AdmissionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listPublicInstitutes() {
        return this.prisma.institute.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                branches: {
                    orderBy: { name: 'asc' },
                    select: { id: true, name: true },
                },
                courses: {
                    where: { isActive: true },
                    orderBy: { name: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        batches: {
                            where: { isActive: true },
                            orderBy: { name: 'asc' },
                            select: { id: true, name: true, branchId: true },
                        },
                    },
                },
            },
        });
    }
    async createPublicApplication(dto, files) {
        if (!files.length || files.length > 5) {
            throw new BadRequestException('Upload between one and five supporting documents.');
        }
        for (const file of files) {
            if (file.size > MAX_DOCUMENT_BYTES) {
                throw new BadRequestException('Each admission document must be 10 MB or smaller.');
            }
        }
        await this.validateApplicationScope(dto);
        const storedKeys = [];
        try {
            for (const file of files) {
                storedKeys.push(await storePrivateFile(file.buffer, file.mimetype, DOCUMENT_MIME_TYPES));
            }
            const application = await this.prisma.admissionApplication.create({
                data: {
                    id: randomUUID(),
                    instituteId: dto.instituteId,
                    branchId: dto.branchId || null,
                    courseId: dto.courseId || null,
                    batchId: dto.batchId || null,
                    fullName: dto.fullName.trim(),
                    email: dto.email,
                    phone: dto.phone?.trim() || null,
                    dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
                    documents: {
                        create: files.map((file, index) => ({
                            storageKey: storedKeys[index],
                            originalName: getSafeOriginalName(file.originalname),
                            mimeType: file.mimetype,
                            sizeBytes: file.size,
                        })),
                    },
                },
                select: { id: true, status: true, createdAt: true },
            });
            return {
                trackingToken: application.id,
                status: application.status,
                createdAt: application.createdAt,
            };
        }
        catch (error) {
            await Promise.all(storedKeys.map((key) => deletePrivateFile(key)));
            throw error;
        }
    }
    async getPublicApplicationStatus(trackingToken) {
        const application = await this.prisma.admissionApplication.findUnique({
            where: { id: trackingToken },
            select: {
                id: true,
                status: true,
                admissionNumber: true,
                reviewNotes: true,
                createdAt: true,
            },
        });
        if (!application) {
            throw new NotFoundException('Application reference was not found.');
        }
        return {
            id: application.id,
            trackingToken: application.id,
            status: application.status,
            admissionNumber: application.admissionNumber,
            reviewNotes: application.status === AdmissionStatus.REJECTED
                ? application.reviewNotes
                : null,
            createdAt: application.createdAt,
        };
    }
    async listApplications(actor) {
        const { instituteId, branchId } = this.requireReviewer(actor);
        return this.prisma.admissionApplication.findMany({
            where: { instituteId, ...(branchId ? { branchId } : {}) },
            orderBy: { createdAt: 'desc' },
            take: 200,
            select: APPLICATION_SELECT,
        });
    }
    async reviewApplication(applicationId, dto, actor) {
        const scope = this.requireReviewer(actor);
        const application = await this.prisma.admissionApplication.findFirst({
            where: {
                id: applicationId,
                instituteId: scope.instituteId,
                ...(scope.branchId ? { branchId: scope.branchId } : {}),
            },
            select: {
                id: true,
                status: true,
                instituteId: true,
                documents: { select: { status: true } },
            },
        });
        if (!application) {
            throw new NotFoundException('Admission application not found in your scope.');
        }
        if (application.status === AdmissionStatus.APPROVED ||
            application.status === AdmissionStatus.REJECTED) {
            throw new BadRequestException('This application has already been finalized.');
        }
        if (dto.status === AdmissionStatus.APPROVED &&
            (!application.documents.length ||
                application.documents.some((document) => document.status !== AdmissionDocumentStatus.VERIFIED))) {
            throw new BadRequestException('Verify every supporting document before approving this application.');
        }
        if (dto.status === AdmissionStatus.REJECTED && !dto.reviewNotes?.trim()) {
            throw new BadRequestException('Provide a reason when rejecting an application.');
        }
        if (dto.status !== AdmissionStatus.APPROVED &&
            dto.status !== AdmissionStatus.REJECTED &&
            dto.status !== AdmissionStatus.UNDER_REVIEW) {
            throw new BadRequestException('The requested application status is not allowed.');
        }
        const admissionNumber = dto.status === AdmissionStatus.APPROVED
            ? `BL-${new Date().getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`
            : undefined;
        return this.prisma.admissionApplication.update({
            where: { id: application.id },
            data: {
                status: dto.status,
                ...(admissionNumber ? { admissionNumber } : {}),
                reviewNotes: dto.reviewNotes?.trim() || null,
                reviewedAt: new Date(),
                reviewedByMembershipId: actor.membershipId,
            },
            select: APPLICATION_SELECT,
        });
    }
    async reviewDocument(applicationId, documentId, dto, actor) {
        const scope = this.requireReviewer(actor);
        const document = await this.prisma.admissionDocument.findFirst({
            where: {
                id: documentId,
                applicationId,
                application: {
                    instituteId: scope.instituteId,
                    ...(scope.branchId ? { branchId: scope.branchId } : {}),
                    status: {
                        in: [AdmissionStatus.SUBMITTED, AdmissionStatus.UNDER_REVIEW],
                    },
                },
            },
            select: { id: true },
        });
        if (!document) {
            throw new NotFoundException('Admission document not found in your scope.');
        }
        if (dto.status !== AdmissionDocumentStatus.VERIFIED &&
            dto.status !== AdmissionDocumentStatus.REJECTED &&
            dto.status !== AdmissionDocumentStatus.PENDING) {
            throw new BadRequestException('The requested document status is not allowed.');
        }
        if (dto.status === AdmissionDocumentStatus.REJECTED &&
            !dto.verificationNotes?.trim()) {
            throw new BadRequestException('Provide a reason when rejecting a document.');
        }
        await this.prisma.admissionDocument.update({
            where: { id: document.id },
            data: {
                status: dto.status,
                verificationNotes: dto.verificationNotes?.trim() || null,
                verifiedAt: dto.status === AdmissionDocumentStatus.PENDING ? null : new Date(),
            },
        });
        return this.getScopedApplication(applicationId, actor);
    }
    async getAdmissionDocument(applicationId, documentId, actor) {
        const scope = this.requireReviewer(actor);
        const document = await this.prisma.admissionDocument.findFirst({
            where: {
                id: documentId,
                applicationId,
                application: {
                    instituteId: scope.instituteId,
                    ...(scope.branchId ? { branchId: scope.branchId } : {}),
                },
            },
            select: { storageKey: true, originalName: true, mimeType: true },
        });
        if (!document) {
            throw new NotFoundException('Admission document not found in your scope.');
        }
        return { ...document, path: getPrivateFilePath(document.storageKey) };
    }
    async getScopedApplication(applicationId, actor) {
        const scope = this.requireReviewer(actor);
        const application = await this.prisma.admissionApplication.findFirst({
            where: {
                id: applicationId,
                instituteId: scope.instituteId,
                ...(scope.branchId ? { branchId: scope.branchId } : {}),
            },
            select: APPLICATION_SELECT,
        });
        if (!application) {
            throw new NotFoundException('Admission application not found in your scope.');
        }
        return application;
    }
    async validateApplicationScope(dto) {
        const institute = await this.prisma.institute.findUnique({
            where: { id: dto.instituteId },
            select: { id: true },
        });
        if (!institute) {
            throw new NotFoundException('Selected institute was not found.');
        }
        if (dto.branchId) {
            const branch = await this.prisma.branch.findFirst({
                where: { id: dto.branchId, instituteId: institute.id },
                select: { id: true },
            });
            if (!branch) {
                throw new BadRequestException('Selected branch does not belong to this institute.');
            }
        }
        if (dto.courseId) {
            const course = await this.prisma.course.findFirst({
                where: { id: dto.courseId, instituteId: institute.id, isActive: true },
                select: { id: true },
            });
            if (!course) {
                throw new BadRequestException('Selected course is not available at this institute.');
            }
        }
        if (dto.batchId) {
            const batch = await this.prisma.batch.findFirst({
                where: {
                    id: dto.batchId,
                    instituteId: institute.id,
                    isActive: true,
                    ...(dto.courseId ? { courseId: dto.courseId } : {}),
                    ...(dto.branchId ? { branchId: dto.branchId } : {}),
                },
                select: { id: true },
            });
            if (!batch) {
                throw new BadRequestException('Selected group is not available for this application.');
            }
        }
    }
    requireReviewer(actor) {
        if (actor.role !== UserRole.INSTITUTE_ADMIN &&
            actor.role !== UserRole.BRANCH_ADMIN) {
            throw new ForbiddenException('Your role cannot review admissions.');
        }
        if (!actor.instituteId) {
            throw new ForbiddenException('Your account has no institute membership.');
        }
        if (actor.role === UserRole.BRANCH_ADMIN && !actor.branchId) {
            throw new ForbiddenException('Your account has no branch assignment.');
        }
        return {
            instituteId: actor.instituteId,
            branchId: actor.role === UserRole.BRANCH_ADMIN ? actor.branchId : null,
        };
    }
};
AdmissionsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], AdmissionsService);
export { AdmissionsService };
//# sourceMappingURL=admissions.service.js.map