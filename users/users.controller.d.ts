import type { AuthIdentity } from '../auth/auth.types.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UsersService } from './users.service.js';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
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
}
