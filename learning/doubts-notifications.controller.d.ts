import type { AuthIdentity } from '../auth/auth.types.js';
import { CreateDoubtDto } from './dto/create-doubt.dto.js';
import { ReplyToDoubtDto } from './dto/reply-to-doubt.dto.js';
import { DoubtsNotificationsService } from './doubts-notifications.service.js';
export declare class StudentDoubtsController {
    private readonly service;
    constructor(service: DoubtsNotificationsService);
    list(actor: AuthIdentity): Promise<{
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
    create(dto: CreateDoubtDto, actor: AuthIdentity): Promise<{
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
    close(doubtId: string, actor: AuthIdentity): Promise<{
        id: string;
        status: "CLOSED";
    }>;
}
export declare class StaffDoubtsController {
    private readonly service;
    constructor(service: DoubtsNotificationsService);
    list(actor: AuthIdentity): Promise<{
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
    reply(doubtId: string, dto: ReplyToDoubtDto, actor: AuthIdentity): Promise<{
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
}
export declare class NotificationsController {
    private readonly service;
    constructor(service: DoubtsNotificationsService);
    list(actor: AuthIdentity): Promise<{
        id: string;
        createdAt: Date;
        title: string;
        category: string;
        body: string;
        readAt: Date | null;
    }[]>;
    markRead(notificationId: string, actor: AuthIdentity): Promise<{
        id: string;
        read: boolean;
    }>;
    markAllRead(actor: AuthIdentity): Promise<{
        updatedCount: number;
    }>;
}
