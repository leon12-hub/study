import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateUserDto, actor: AuthIdentity): Promise<{
        email: string;
        id: string;
        fullName: string;
        createdAt: Date;
        memberships: {
            instituteId: string | null;
            branchId: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            id: string;
        }[];
    }>;
    private resolveInstituteId;
    private assertRoleMayBeAssigned;
    private resolveBranchId;
}
