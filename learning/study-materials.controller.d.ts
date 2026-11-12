import type { Response } from 'express';
import type { AuthIdentity } from '../auth/auth.types.js';
import { CreateStudyMaterialDto } from './dto/create-study-material.dto.js';
import { CreateUploadedStudyMaterialDto } from './dto/create-uploaded-study-material.dto.js';
import { StudyMaterialsService } from './study-materials.service.js';
export declare class InstituteStudyMaterialsController {
    private readonly materials;
    constructor(materials: StudyMaterialsService);
    list(sessionId: string, actor: AuthIdentity): Promise<{
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
    create(sessionId: string, dto: CreateStudyMaterialDto, actor: AuthIdentity): Promise<{
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
    upload(sessionId: string, dto: CreateUploadedStudyMaterialDto, file: {
        path: string;
        filename: string;
        originalname: string;
        mimetype: string;
        size: number;
    } | undefined, actor: AuthIdentity): Promise<{
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
    file(sessionId: string, materialId: string, actor: AuthIdentity, response: Response): Promise<void>;
}
export declare class StudentStudyMaterialsController {
    private readonly materials;
    constructor(materials: StudyMaterialsService);
    list(actor: AuthIdentity): Promise<{
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
    file(materialId: string, actor: AuthIdentity, response: Response): Promise<void>;
}
export declare class ParentStudyMaterialsController {
    private readonly materials;
    constructor(materials: StudyMaterialsService);
    list(actor: AuthIdentity): Promise<{
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
    file(materialId: string, actor: AuthIdentity, response: Response): Promise<void>;
}
