import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStudyMaterialDto } from './dto/create-study-material.dto.js';
import { CreateUploadedStudyMaterialDto } from './dto/create-uploaded-study-material.dto.js';
export declare class StudyMaterialsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listSessionMaterials(sessionId: string, actor: AuthIdentity): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        kind: import("@prisma/client").$Enums.MaterialKind;
        fileUrl: string;
        mimeType: string | null;
        originalName: string | null;
        downloadable: boolean;
        session: {
            batch: {
                branchId: string;
                id: string;
                name: string;
            };
            id: string;
            title: string;
            startsAt: Date;
        } | null;
        createdBy: {
            user: {
                fullName: string;
            };
        };
    }[]>;
    createSessionMaterial(sessionId: string, dto: CreateStudyMaterialDto, actor: AuthIdentity): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        kind: import("@prisma/client").$Enums.MaterialKind;
        fileUrl: string;
        mimeType: string | null;
        originalName: string | null;
        downloadable: boolean;
        session: {
            batch: {
                branchId: string;
                id: string;
                name: string;
            };
            id: string;
            title: string;
            startsAt: Date;
        } | null;
        createdBy: {
            user: {
                fullName: string;
            };
        };
    }>;
    createUploadedSessionMaterial(sessionId: string, dto: CreateUploadedStudyMaterialDto, file: {
        path: string;
        originalname: string;
        mimetype: string;
        size: number;
    }, actor: AuthIdentity): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        kind: import("@prisma/client").$Enums.MaterialKind;
        fileUrl: string;
        mimeType: string | null;
        originalName: string | null;
        downloadable: boolean;
        session: {
            batch: {
                branchId: string;
                id: string;
                name: string;
            };
            id: string;
            title: string;
            startsAt: Date;
        } | null;
        createdBy: {
            user: {
                fullName: string;
            };
        };
    }>;
    listStudentMaterials(actor: AuthIdentity): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        kind: import("@prisma/client").$Enums.MaterialKind;
        fileUrl: string;
        mimeType: string | null;
        originalName: string | null;
        downloadable: boolean;
        session: {
            batch: {
                branchId: string;
                id: string;
                name: string;
            };
            id: string;
            title: string;
            startsAt: Date;
        } | null;
        createdBy: {
            user: {
                fullName: string;
            };
        };
    }[]>;
    listParentMaterials(actor: AuthIdentity): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        kind: import("@prisma/client").$Enums.MaterialKind;
        fileUrl: string;
        mimeType: string | null;
        originalName: string | null;
        downloadable: boolean;
        session: {
            batch: {
                branchId: string;
                id: string;
                name: string;
            };
            id: string;
            title: string;
            startsAt: Date;
        } | null;
        createdBy: {
            user: {
                fullName: string;
            };
        };
    }[]>;
    getStaffMaterialFile(sessionId: string, materialId: string, actor: AuthIdentity): Promise<{
        path: string;
        mimeType: string;
        originalName: string;
    }>;
    getStudentMaterialFile(materialId: string, actor: AuthIdentity): Promise<{
        path: string;
        mimeType: string;
        originalName: string;
    }>;
    getParentMaterialFile(materialId: string, actor: AuthIdentity): Promise<{
        path: string;
        mimeType: string;
        originalName: string;
    }>;
    private requireSession;
    private requireRole;
}
