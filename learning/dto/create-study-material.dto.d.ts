import { MaterialKind } from '@prisma/client';
export declare class CreateStudyMaterialDto {
    title: string;
    kind: MaterialKind;
    fileUrl: string;
    downloadable?: boolean;
}
