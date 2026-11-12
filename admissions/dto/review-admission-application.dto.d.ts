import { AdmissionStatus } from '@prisma/client';
export declare class ReviewAdmissionApplicationDto {
    status: AdmissionStatus;
    reviewNotes?: string;
}
