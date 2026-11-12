import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto, LoginPortal } from './dto/login.dto.js';
import type { AuthIdentity, TokenClaims, TokenPair } from './auth.types.js';
import { hashPassword, verifyPassword } from './password-hasher.js';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;
const TOKEN_ISSUER = 'highstudy';

type TokenStore = Pick<Prisma.TransactionClient, 'refreshToken'>;

function isTokenClaims(value: unknown): value is TokenClaims {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const claims = value as Record<string, unknown>;
  return (
    typeof claims.sub === 'string' &&
    typeof claims.membershipId === 'string' &&
    (typeof claims.instituteId === 'string' || claims.instituteId === null) &&
    (typeof claims.branchId === 'string' || claims.branchId === null) &&
    Object.values(UserRole).includes(claims.role as UserRole) &&
    (claims.tokenUse === 'access' || claims.tokenUse === 'refresh')
  );
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<TokenPair> {
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

    const passwordMatches = await verifyPassword(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches || !user.isActive) {
      throw new UnauthorizedException('Email or password is incorrect.');
    }

    const portalRoles: Record<LoginPortal, UserRole[]> = {
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
      ? user.memberships.find((item) => portalRoles[dto.portal!].includes(item.role))
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

  async refresh(refreshToken: string): Promise<TokenPair> {
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

      if (
        !membership ||
        !storedToken ||
        storedToken.userId !== claims.sub ||
        storedToken.revokedAt ||
        storedToken.expiresAt <= now
      ) {
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

  async logout(
    userId: string,
    refreshToken: string,
  ): Promise<{ success: true }> {
    const claims = await this.verifyToken(refreshToken, 'refresh');
    if (claims.sub !== userId) {
      throw new ForbiddenException(
        'This refresh token belongs to another user.',
      );
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

  async verifyAccessToken(token: string): Promise<AuthIdentity> {
    const claims = await this.verifyToken(token, 'access');
    return {
      userId: claims.sub,
      membershipId: claims.membershipId,
      instituteId: claims.instituteId,
      branchId: claims.branchId,
      role: claims.role,
    };
  }

  private async issueTokens(
    store: TokenStore,
    userId: string,
    membership: Omit<AuthIdentity, 'userId'>,
  ): Promise<TokenPair> {
    const claims = {
      sub: userId,
      membershipId: membership.membershipId,
      instituteId: membership.instituteId,
      branchId: membership.branchId,
      role: membership.role,
    };
    const accessToken = await this.jwtService.signAsync(
      { ...claims, tokenUse: 'access' },
      {
        secret: this.getSecret('JWT_ACCESS_SECRET'),
        expiresIn: ACCESS_TOKEN_TTL_SECONDS,
        issuer: TOKEN_ISSUER,
      },
    );
    const refreshToken = await this.jwtService.signAsync(
      { ...claims, tokenUse: 'refresh', jti: randomUUID() },
      {
        secret: this.getSecret('JWT_REFRESH_SECRET'),
        expiresIn: REFRESH_TOKEN_TTL_SECONDS,
        issuer: TOKEN_ISSUER,
      },
    );

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

  private async verifyToken(
    token: string,
    expectedUse: TokenClaims['tokenUse'],
  ): Promise<TokenClaims> {
    const secret = this.getSecret(
      expectedUse === 'access' ? 'JWT_ACCESS_SECRET' : 'JWT_REFRESH_SECRET',
    );
    let payload: unknown;

    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret,
        issuer: TOKEN_ISSUER,
      });
    } catch {
      throw new UnauthorizedException('Token is invalid or expired.');
    }

    if (!isTokenClaims(payload) || payload.tokenUse !== expectedUse) {
      throw new UnauthorizedException('Token is invalid or expired.');
    }

    return payload;
  }

  private getSecret(key: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET'): string {
    const secret = this.configService.get<string>(key);
    if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
      throw new InternalServerErrorException(
        `${key} must be configured with at least 32 bytes before using authentication.`,
      );
    }

    return secret;
  }
}
