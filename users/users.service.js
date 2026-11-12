var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { hashPassword } from '../auth/password-hasher.js';
import { PrismaService } from '../prisma/prisma.service.js';
const INSTITUTE_ADMIN_ROLES = [
    UserRole.BRANCH_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
];
const BRANCH_ADMIN_ROLES = [
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
];
let UsersService = class UsersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, actor) {
        const instituteId = await this.resolveInstituteId(dto, actor);
        this.assertRoleMayBeAssigned(dto.role, actor.role);
        let branchId = await this.resolveBranchId(dto, actor, instituteId);
        const admissionNumber = dto.admissionNumber?.trim();
        if (dto.role === UserRole.STUDENT && !admissionNumber) {
            throw new BadRequestException('admissionNumber is required when creating a student.');
        }
        const batchId = dto.batchId?.trim();
        if (dto.role === UserRole.STUDENT && batchId) {
            const batch = await this.prisma.batch.findFirst({
                where: {
                    id: batchId,
                    instituteId,
                    isActive: true,
                    ...(branchId ? { branchId } : {}),
                },
                select: { id: true, branchId: true },
            });
            if (!batch) {
                throw new NotFoundException('Active batch not found in this institute.');
            }
            branchId = batch.branchId;
        }
        const studentIds = dto.studentIds?.map((id) => id.trim()) ?? [];
        if (dto.role === UserRole.PARENT && studentIds.length > 0) {
            const linkedStudents = await this.prisma.studentProfile.findMany({
                where: {
                    id: { in: studentIds },
                    membership: {
                        instituteId,
                        ...(branchId ? { branchId } : {}),
                    },
                },
                select: { id: true },
            });
            if (linkedStudents.length !== studentIds.length) {
                throw new NotFoundException('One or more linked students were not found in your scope.');
            }
        }
        const email = dto.email.trim().toLowerCase();
        const existingUser = await this.prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (existingUser) {
            throw new ConflictException('An account with this email already exists. Use the account invitation flow instead.');
        }
        const passwordHash = await hashPassword(dto.password);
        try {
            return await this.prisma.$transaction(async (transaction) => {
                const user = await transaction.user.create({
                    data: {
                        email,
                        fullName: dto.fullName.trim(),
                        passwordHash,
                        memberships: {
                            create: {
                                instituteId,
                                branchId,
                                role: dto.role,
                                ...(dto.role === UserRole.STUDENT
                                    ? {
                                        student: {
                                            create: {
                                                admissionNumber: admissionNumber,
                                                ...(batchId
                                                    ? { enrollments: { create: { batchId } } }
                                                    : {}),
                                            },
                                        },
                                    }
                                    : {}),
                                ...(dto.role === UserRole.PARENT && studentIds.length > 0
                                    ? {
                                        parentLinks: {
                                            create: studentIds.map((studentId) => ({
                                                studentId,
                                                relationship: dto.relationship?.trim() || null,
                                            })),
                                        },
                                    }
                                    : {}),
                            },
                        },
                    },
                    select: {
                        id: true,
                        email: true,
                        fullName: true,
                        createdAt: true,
                        memberships: {
                            where: { instituteId },
                            select: {
                                id: true,
                                instituteId: true,
                                branchId: true,
                                role: true,
                            },
                        },
                    },
                });
                await transaction.auditLog.create({
                    data: {
                        instituteId,
                        actorUserId: actor.userId,
                        action: 'USER_CREATED',
                        entityType: 'User',
                        entityId: user.id,
                        metadata: { role: dto.role },
                    },
                });
                return user;
            });
        }
        catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002') {
                throw new ConflictException('An account with this email already exists.');
            }
            throw error;
        }
    }
    async resolveInstituteId(dto, actor) {
        if (actor.role === UserRole.SUPER_ADMIN) {
            if (!dto.instituteId) {
                throw new NotFoundException('instituteId is required for super admins.');
            }
            const institute = await this.prisma.institute.findUnique({
                where: { id: dto.instituteId },
                select: { id: true },
            });
            if (!institute) {
                throw new NotFoundException('Institute not found.');
            }
            return dto.instituteId;
        }
        if (dto.instituteId && dto.instituteId !== actor.instituteId) {
            throw new ForbiddenException('You can only manage users in your own institute.');
        }
        if (!actor.instituteId) {
            throw new ForbiddenException('Your account has no institute membership.');
        }
        return actor.instituteId;
    }
    assertRoleMayBeAssigned(targetRole, actorRole) {
        if (targetRole === UserRole.SUPER_ADMIN) {
            throw new ForbiddenException('Platform administrator accounts must be provisioned outside the user API.');
        }
        const allowedRoles = actorRole === UserRole.SUPER_ADMIN
            ? Object.values(UserRole).filter((role) => role !== UserRole.SUPER_ADMIN)
            : actorRole === UserRole.INSTITUTE_ADMIN
                ? INSTITUTE_ADMIN_ROLES
                : actorRole === UserRole.BRANCH_ADMIN
                    ? BRANCH_ADMIN_ROLES
                    : [];
        if (!allowedRoles.includes(targetRole)) {
            throw new ForbiddenException('Your role cannot assign the requested user role.');
        }
    }
    async resolveBranchId(dto, actor, instituteId) {
        let branchId = dto.branchId ?? null;
        if (actor.role === UserRole.BRANCH_ADMIN) {
            if (!actor.branchId) {
                throw new ForbiddenException('Your branch administrator account has no branch assigned.');
            }
            if (branchId && branchId !== actor.branchId) {
                throw new ForbiddenException('You can only manage users in your assigned branch.');
            }
            branchId = actor.branchId;
        }
        if (branchId) {
            const branch = await this.prisma.branch.findFirst({
                where: { id: branchId, instituteId },
                select: { id: true },
            });
            if (!branch) {
                throw new NotFoundException('The requested branch does not belong to this institute.');
            }
        }
        return branchId;
    }
};
UsersService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], UsersService);
export { UsersService };
//# sourceMappingURL=users.service.js.map