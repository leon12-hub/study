import { Prisma } from '@prisma/client';
import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateFeeDto } from './dto/create-fee.dto.js';
import { RecordManualPaymentDto } from './dto/record-manual-payment.dto.js';
export declare class BillingService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listInstituteFees(actor: AuthIdentity): Promise<{
        id: string;
        createdAt: Date;
        student: {
            membership: {
                user: {
                    email: string;
                    fullName: string;
                };
                branchId: string | null;
            };
            id: string;
            admissionNumber: string;
        };
        title: string;
        dueAt: Date;
        status: import("@prisma/client").$Enums.PaymentStatus;
        amount: Prisma.Decimal;
        currency: string;
        payments: {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.PaymentStatus;
            amount: Prisma.Decimal;
            providerReference: string | null;
            paidAt: Date | null;
        }[];
    }[]>;
    createFee(dto: CreateFeeDto, actor: AuthIdentity): Promise<{
        id: string;
        createdAt: Date;
        student: {
            membership: {
                user: {
                    email: string;
                    fullName: string;
                };
                branchId: string | null;
            };
            id: string;
            admissionNumber: string;
        };
        title: string;
        dueAt: Date;
        status: import("@prisma/client").$Enums.PaymentStatus;
        amount: Prisma.Decimal;
        currency: string;
        payments: {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.PaymentStatus;
            amount: Prisma.Decimal;
            providerReference: string | null;
            paidAt: Date | null;
        }[];
    }>;
    listStudentFees(actor: AuthIdentity): Promise<{
        id: string;
        createdAt: Date;
        student: {
            membership: {
                user: {
                    email: string;
                    fullName: string;
                };
                branchId: string | null;
            };
            id: string;
            admissionNumber: string;
        };
        title: string;
        dueAt: Date;
        status: import("@prisma/client").$Enums.PaymentStatus;
        amount: Prisma.Decimal;
        currency: string;
        payments: {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.PaymentStatus;
            amount: Prisma.Decimal;
            providerReference: string | null;
            paidAt: Date | null;
        }[];
    }[]>;
    listParentFees(actor: AuthIdentity): Promise<{
        id: string;
        createdAt: Date;
        student: {
            membership: {
                user: {
                    email: string;
                    fullName: string;
                };
                branchId: string | null;
            };
            id: string;
            admissionNumber: string;
        };
        title: string;
        dueAt: Date;
        status: import("@prisma/client").$Enums.PaymentStatus;
        amount: Prisma.Decimal;
        currency: string;
        payments: {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.PaymentStatus;
            amount: Prisma.Decimal;
            providerReference: string | null;
            paidAt: Date | null;
        }[];
    }[]>;
    recordManualPayment(feeId: string, dto: RecordManualPaymentDto, actor: AuthIdentity): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        amount: Prisma.Decimal;
        feeId: string;
        providerReference: string | null;
        paidAt: Date | null;
    }>;
    private requireStudent;
    private getBranchScope;
    private requireAdmin;
    private requireRole;
}
