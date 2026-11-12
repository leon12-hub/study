var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ForbiddenException, Injectable, InternalServerErrorException, UnauthorizedException, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginPortal } from './dto/login.dto.js';
import { hashPassword, verifyPassword } from './password-hasher.js';
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const TOKEN_ISSUER = 'highstudy';
function isTokenClaims(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const claims = value;
    return (typeof claims.sub === 'string' &&
        typeof claims.membershipId === 'string' &&
        (typeof claims.instituteId === 'string' || claims.instituteId === null) &&
        (typeof claims.branchId === 'string' || claims.branchId === null) &&
        Object.values(UserRole).includes(claims.role) &&
        (claims.tokenUse === 'access' || claims.tokenUse === 'refresh'));
}
function hashToken(token) {
    return createHash('sha256').update(token).digest('hex');
}
let AuthService = class AuthService {
    prisma;
    jwtService;
    configService;
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async login(dto) {
        const email = dto.email.trim().toLowerCase();
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                memberships: {
                    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
                },
            },
        });
        if (!user) {
            await hashPassword(dto.password);
            throw new UnauthorizedException('Email or password is incorrect.');
        }
        const passwordMatches = await verifyPassword(dto.password, user.passwordHash);
        if (!passwordMatches || !user.isActive) {
            throw new UnauthorizedException('Email or password is incorrect.');
        }
        const portalRoles = {
            [LoginPortal.ADMIN]: [
                UserRole.SUPER_ADMIN,
                UserRole.INSTITUTE_ADMIN,
                UserRole.BRANCH_ADMIN,
            ],
            [LoginPortal.TEACHER]: [UserRole.TEACHER],
            [LoginPortal.STUDENT]: [UserRole.STUDENT],
            [LoginPortal.PARENT]: [UserRole.PARENT],
        };
        const membership = dto.portal
            ? user.memberships.find((item) => portalRoles[dto.portal].includes(item.role))
            : user.memberships[0];
        if (!membership) {
            throw new UnauthorizedException('Email or password is incorrect.');
        }
        return this.issueTokens(this.prisma, user.id, {
            membershipId: membership.id,
            instituteId: membership.instituteId,
            branchId: membership.branchId,
            role: membership.role,
        });
    }
    async refresh(refreshToken) {
        const claims = await this.verifyToken(refreshToken, 'refresh');
        const tokenHash = hashToken(refreshToken);
        const now = new Date();
        return this.prisma.$transaction(async (transaction) => {
            const membership = await transaction.membership.findFirst({
                where: {
                    id: claims.membershipId,
                    userId: claims.sub,
                    instituteId: claims.instituteId,
                    branchId: claims.branchId,
                    role: claims.role,
                    user: { isActive: true },
                },
            });
            const storedToken = await transaction.refreshToken.findUnique({
                where: { tokenHash },
            });
            if (!membership ||
                !storedToken ||
                storedToken.userId !== claims.sub ||
                storedToken.revokedAt ||
                storedToken.expiresAt <= now) {
                throw new UnauthorizedException('Refresh token is invalid or expired.');
            }
            const revoked = await transaction.refreshToken.updateMany({
                where: {
                    id: storedToken.id,
                    revokedAt: null,
                    expiresAt: { gt: now },
                },
                data: { revokedAt: now },
            });
            if (revoked.count !== 1) {
                throw new UnauthorizedException('Refresh token has already been used.');
            }
            return this.issueTokens(transaction, claims.sub, {
                membershipId: membership.id,
                instituteId: membership.instituteId,
                branchId: membership.branchId,
                role: membership.role,
            });
        });
    }
    async logout(userId, refreshToken) {
        const claims = await this.verifyToken(refreshToken, 'refresh');
        if (claims.sub !== userId) {
            throw new ForbiddenException('This refresh token belongs to another user.');
        }
        await this.prisma.refreshToken.updateMany({
            where: {
                userId,
                tokenHash: hashToken(refreshToken),
                revokedAt: null,
            },
            data: { revokedAt: new Date() },
        });
        return { success: true };
    }
    async verifyAccessToken(token) {
        const claims = await this.verifyToken(token, 'access');
        return {
            userId: claims.sub,
            membershipId: claims.membershipId,
            instituteId: claims.instituteId,
            branchId: claims.branchId,
            role: claims.role,
        };
    }
    async issueTokens(store, userId, membership) {
        const claims = {
            sub: userId,
            membershipId: membership.membershipId,
            instituteId: membership.instituteId,
            branchId: membership.branchId,
            role: membership.role,
        };
        const accessToken = await this.jwtService.signAsync({ ...claims, tokenUse: 'access' }, {
            secret: this.getSecret('JWT_ACCESS_SECRET'),
            expiresIn: ACCESS_TOKEN_TTL_SECONDS,
            issuer: TOKEN_ISSUER,
        });
        const refreshToken = await this.jwtService.signAsync({ ...claims, tokenUse: 'refresh', jti: randomUUID() }, {
            secret: this.getSecret('JWT_REFRESH_SECRET'),
            expiresIn: REFRESH_TOKEN_TTL_SECONDS,
            issuer: TOKEN_ISSUER,
        });
        await store.refreshToken.create({
            data: {
                userId,
                tokenHash: hashToken(refreshToken),
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
            },
        });
        return {
            accessToken,
            refreshToken,
            tokenType: 'Bearer',
            expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        };
    }
    async verifyToken(token, expectedUse) {
        const secret = this.getSecret(expectedUse === 'access' ? 'JWT_ACCESS_SECRET' : 'JWT_REFRESH_SECRET');
        let payload;
        try {
            payload = await this.jwtService.verifyAsync(token, {
                secret,
                issuer: TOKEN_ISSUER,
            });
        }
        catch {
            throw new UnauthorizedException('Token is invalid or expired.');
        }
        if (!isTokenClaims(payload) || payload.tokenUse !== expectedUse) {
            throw new UnauthorizedException('Token is invalid or expired.');
        }
        return payload;
    }
    getSecret(key) {
        const secret = this.configService.get(key);
        if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
            throw new InternalServerErrorException(`${key} must be configured with at least 32 bytes before using authentication.`);
        }
        return secret;
    }
};
AuthService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService,
        JwtService,
        ConfigService])
], AuthService);
export { AuthService };
//# sourceMappingURL=auth.service.js.map