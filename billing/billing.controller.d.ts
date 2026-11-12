import type { AuthIdentity } from '../auth/auth.types.js';
import { CreateFeeDto } from './dto/create-fee.dto.js';
import { RecordManualPaymentDto } from './dto/record-manual-payment.dto.js';
import { BillingService } from './billing.service.js';
export declare class InstituteBillingController {
    private readonly billing;
    constructor(billing: BillingService);
    list(actor: AuthIdentity): Promise<{
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
        amount: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        payments: {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.PaymentStatus;
            amount: import("@prisma/client/runtime/library").Decimal;
            providerReference: string | null;
            paidAt: Date | null;
        }[];
    }[]>;
    create(dto: CreateFeeDto, actor: AuthIdentity): Promise<{
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
        amount: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        payments: {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.PaymentStatus;
            amount: import("@prisma/client/runtime/library").Decimal;
            providerReference: string | null;
            paidAt: Date | null;
        }[];
    }>;
    recordManualPayment(feeId: string, dto: RecordManualPaymentDto, actor: AuthIdentity): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.PaymentStatus;
        amount: import("@prisma/client/runtime/library").Decimal;
        feeId: string;
        providerReference: string | null;
        paidAt: Date | null;
    }>;
}
export declare class StudentBillingController {
    private readonly billing;
    constructor(billing: BillingService);
    list(actor: AuthIdentity): Promise<{
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
        amount: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        payments: {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.PaymentStatus;
            amount: import("@prisma/client/runtime/library").Decimal;
            providerReference: string | null;
            paidAt: Date | null;
        }[];
    }[]>;
}
export declare class ParentBillingController {
    private readonly billing;
    constructor(billing: BillingService);
    list(actor: AuthIdentity): Promise<{
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
        amount: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        payments: {
            id: string;
            createdAt: Date;
            status: import("@prisma/client").$Enums.PaymentStatus;
            amount: import("@prisma/client/runtime/library").Decimal;
            providerReference: string | null;
            paidAt: Date | null;
        }[];
    }[]>;
}
