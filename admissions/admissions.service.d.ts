import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAdmissionApplicationDto } from './dto/create-admission-application.dto.js';
import { ReviewAdmissionApplicationDto } from './dto/review-admission-application.dto.js';
import { ReviewAdmissionDocumentDto } from './dto/review-admission-document.dto.js';
export declare class AdmissionsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listPublicInstitutes(): Promise<{
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
    createPublicApplication(dto: CreateAdmissionApplicationDto, files: Array<{
        buffer: Buffer;
        originalname: string;
        mimetype: string;
        size: number;
    }>): Promise<{
        trackingToken: string;
        status: import("@prisma/client").$Enums.AdmissionStatus;
        createdAt: Date;
    }>;
    getPublicApplicationStatus(trackingToken: string): Promise<{
        id: string;
        trackingToken: string;
        status: import("@prisma/client").$Enums.AdmissionStatus;
        admissionNumber: string | null;
        reviewNotes: string | null;
        createdAt: Date;
    }>;
    listApplications(actor: AuthIdentity): Promise<{
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
    reviewApplication(applicationId: string, dto: ReviewAdmissionApplicationDto, actor: AuthIdentity): Promise<{
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
    getAdmissionDocument(applicationId: string, documentId: string, actor: AuthIdentity): Promise<{
        path: string;
        storageKey: string;
        mimeType: string;
        originalName: string;
    }>;
    private getScopedApplication;
    private validateApplicationScope;
    private requireReviewer;
}
