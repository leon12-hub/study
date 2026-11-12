import { UserRole } from '@prisma/client';
export declare class CreateUserDto {
    email: string;
    fullName: string;
    password: string;
    role: UserRole;
    instituteId?: string;
    branchId?: string;
    admissionNumber?: string;
    batchId?: string;
    studentIds?: string[];
    relationship?: string;
}
