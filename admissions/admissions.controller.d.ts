import type { Response } from 'express';
import type { AuthIdentity } from '../auth/auth.types.js';
import { CreateAdmissionApplicationDto } from './dto/create-admission-application.dto.js';
import { ReviewAdmissionApplicationDto } from './dto/review-admission-application.dto.js';
import { ReviewAdmissionDocumentDto } from './dto/review-admission-document.dto.js';
import { AdmissionsService } from './admissions.service.js';
export declare class PublicAdmissionsController {
    private readonly admissions;
    constructor(admissions: AdmissionsService);
    listInstitutes(): Promise<{
        id: string;
        name: string;
        branches: {
            id: string;
            name: string;
        }[];
        courses: {
            id: string;
            name: string;
            batches: {
                branchId: string;
                id: string;
                name: string;
            }[];
        }[];
    }[]>;
    createApplication(dto: CreateAdmissionApplicationDto, files: Array<{
        buffer: Buffer;
        originalname: string;
        mimetype: string;
        size: number;
    }>): Promise<{
        trackingToken: string;
        status: import("@prisma/client").$Enums.AdmissionStatus;
        createdAt: Date;
    }>;
    getApplicationStatus(trackingToken: string): Promise<{
        id: string;
        trackingToken: string;
        status: import("@prisma/client").$Enums.AdmissionStatus;
        admissionNumber: string | null;
        reviewNotes: string | null;
        createdAt: Date;
    }>;
}
export declare class InstituteAdmissionsController {
    private readonly admissions;
    constructor(admissions: AdmissionsService);
    list(actor: AuthIdentity): Promise<{
        branch: {
            id: string;
            name: string;
        } | null;
        course: {
            id: string;
            name: string;
        } | null;
        batch: {
            id: string;
            name: string;
        } | null;
        email: string;
        id: string;
        fullName: string;
        phone: string | null;
        createdAt: Date;
        status: import("@prisma/client").$Enums.AdmissionStatus;
        dateOfBirth: Date | null;
        admissionNumber: string | null;
        reviewNotes: string | null;
        reviewedAt: Date | null;
        documents: {
            id: string;
            createdAt: Date;
            mimeType: string;
            originalName: string;
            status: import("@prisma/client").$Enums.AdmissionDocumentStatus;
            verificationNotes: string | null;
            sizeBytes: number;
        }[];
    }[]>;
    review(applicationId: string, dto: ReviewAdmissionApplicationDto, actor: AuthIdentity): Promise<{
        branch: {
            id: string;
            name: string;
        } | null;
        course: {
            id: string;
            name: string;
        } | null;
        batch: {
            id: string;
            name: string;
        } | null;
        email: string;
        id: string;
        fullName: string;
        phone: string | null;
        createdAt: Date;
        status: import("@prisma/client").$Enums.AdmissionStatus;
        dateOfBirth: Date | null;
        admissionNumber: string | null;
        reviewNotes: string | null;
        reviewedAt: Date | null;
        documents: {
            id: string;
            createdAt: Date;
            mimeType: string;
            originalName: string;
            status: import("@prisma/client").$Enums.AdmissionDocumentStatus;
            verificationNotes: string | null;
            sizeBytes: number;
        }[];
    }>;
    reviewDocument(applicationId: string, documentId: string, dto: ReviewAdmissionDocumentDto, actor: AuthIdentity): Promise<{
        branch: {
            id: string;
            name: string;
        } | null;
        course: {
            id: string;
            name: string;
        } | null;
        batch: {
            id: string;
            name: string;
        } | null;
        email: string;
        id: string;
        fullName: string;
        phone: string | null;
        createdAt: Date;
        status: import("@prisma/client").$Enums.AdmissionStatus;
        dateOfBirth: Date | null;
        admissionNumber: string | null;
        reviewNotes: string | null;
        reviewedAt: Date | null;
        documents: {
            id: string;
            createdAt: Date;
            mimeType: string;
            originalName: string;
            status: import("@prisma/client").$Enums.AdmissionDocumentStatus;
            verificationNotes: string | null;
            sizeBytes: number;
        }[];
    }>;
    getDocumentFile(applicationId: string, documentId: string, actor: AuthIdentity, response: Response): Promise<void>;
}
