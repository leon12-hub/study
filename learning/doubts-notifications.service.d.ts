import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDoubtDto } from './dto/create-doubt.dto.js';
import { ReplyToDoubtDto } from './dto/reply-to-doubt.dto.js';
export declare class DoubtsNotificationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    listStudentDoubts(actor: AuthIdentity): Promise<{
        subject: {
            id: string;
            name: string;
        } | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        student: {
            membership: {
                user: {
                    fullName: string;
                };
            };
            id: string;
            admissionNumber: string;
        };
        batchId: string | null;
        status: import("@prisma/client").$Enums.DoubtStatus;
        topic: string | null;
        questionText: string;
        assignedTeacher: {
            user: {
                fullName: string;
            };
        } | null;
        replies: {
            id: string;
            createdAt: Date;
            message: string;
            author: {
                user: {
                    fullName: string;
                };
                role: import("@prisma/client").$Enums.UserRole;
            };
        }[];
    }[]>;
    createStudentDoubt(dto: CreateDoubtDto, actor: AuthIdentity): Promise<{
        subject: {
            id: string;
            name: string;
        } | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        student: {
            membership: {
                user: {
                    fullName: string;
                };
            };
            id: string;
            admissionNumber: string;
        };
        batchId: string | null;
        status: import("@prisma/client").$Enums.DoubtStatus;
        topic: string | null;
        questionText: string;
        assignedTeacher: {
            user: {
                fullName: string;
            };
        } | null;
        replies: {
            id: string;
            createdAt: Date;
            message: string;
            author: {
                user: {
                    fullName: string;
                };
                role: import("@prisma/client").$Enums.UserRole;
            };
        }[];
    }>;
    listStaffDoubts(actor: AuthIdentity): Promise<{
        subject: {
            id: string;
            name: string;
        } | null;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        student: {
            membership: {
                user: {
                    fullName: string;
                };
            };
            id: string;
            admissionNumber: string;
        };
        batchId: string | null;
        status: import("@prisma/client").$Enums.DoubtStatus;
        topic: string | null;
        questionText: string;
        assignedTeacher: {
            user: {
                fullName: string;
            };
        } | null;
        replies: {
            id: string;
            createdAt: Date;
            message: string;
            author: {
                user: {
                    fullName: string;
                };
                role: import("@prisma/client").$Enums.UserRole;
            };
        }[];
    }[]>;
    replyToDoubt(doubtId: string, dto: ReplyToDoubtDto, actor: AuthIdentity): Promise<{
        id: string;
        createdAt: Date;
        message: string;
        author: {
            user: {
                fullName: string;
            };
            role: import("@prisma/client").$Enums.UserRole;
        };
    }>;
    closeStudentDoubt(doubtId: string, actor: AuthIdentity): Promise<{
        id: string;
        status: "CLOSED";
    }>;
    listNotifications(actor: AuthIdentity): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        category: string;
        body: string;
        readAt: Date | null;
    }[]>;
    markNotificationRead(notificationId: string, actor: AuthIdentity): Promise<{
        id: string;
        read: boolean;
    }>;
    markAllNotificationsRead(actor: AuthIdentity): Promise<{
        updatedCount: number;
    }>;
    private requireStudent;
    private findFallbackStaffRecipients;
    private getBranchScope;
    private requireRole;
}
