import { AdmissionDocumentStatus } from '@prisma/client';
export declare class ReviewAdmissionDocumentDto {
    status: AdmissionDocumentStatus;
    verificationNotes?: string;
}
