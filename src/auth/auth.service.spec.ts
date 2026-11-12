import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from './auth.service.js';
import { LoginPortal } from './dto/login.dto.js';
import { hashPassword } from './password-hasher.js';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    refreshToken: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
    membership: { findFirst: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let transaction: {
    membership: { findFirst: ReturnType<typeof vi.fn> };
    refreshToken: {
      create: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
  let moduleRef: TestingModule;

  beforeEach(async () => {
    transaction = {
      membership: { findFirst: vi.fn() },
      refreshToken: {
        create: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
    };
    prisma = {
      user: { findUnique: vi.fn() },
      refreshToken: {
        create: vi.fn().mockResolvedValue({}),
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      membership: { findFirst: vi.fn() },
      $transaction: vi.fn(
        (callback: (client: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    };

    moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: new JwtService({}) },
        {
          provide: ConfigService,
          useValue: new ConfigService({
            JWT_ACCESS_SECRET: 'a'.repeat(48),
            JWT_REFRESH_SECRET: 'r'.repeat(48),
          }),
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('issues scoped tokens and stores only a hash of the refresh token', async () => {
    const password = 'correct-horse-battery-42';
    const user = {
      id: 'user-id',
      email: 'admin@example.com',
      passwordHash: await hashPassword(password),
      isActive: true,
      memberships: [
        {
          id: 'membership-id',
          instituteId: 'institute-id',
          branchId: 'branch-id',
          role: UserRole.INSTITUTE_ADMIN,
        },
      ],
    };
    prisma.user.findUnique.mockResolvedValue(user);

    const tokens = await service.login({
      email: 'ADMIN@example.com',
      password,
    });

    expect(tokens.tokenType).toBe('Bearer');
    expect(tokens.expiresIn).toBe(15 * 60);
    expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    const savedToken = prisma.refreshToken.create.mock.calls[0][0].data;
    expect(savedToken.userId).toBe(user.id);
    expect(savedToken.tokenHash).not.toBe(tokens.refreshToken);
    expect(savedToken.tokenHash).toHaveLength(64);
    await expect(
      service.verifyAccessToken(tokens.accessToken),
    ).resolves.toMatchObject({
      userId: user.id,
      instituteId: 'institute-id',
      branchId: 'branch-id',
      role: UserRole.INSTITUTE_ADMIN,
    });
  });

  it('uses the earliest institute membership when an account has multiple memberships', async () => {
    const password = 'correct-horse-battery-42';
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'admin@example.com',
      passwordHash: await hashPassword(password),
      isActive: true,
      memberships: [
        {
          id: 'first-membership',
          instituteId: 'first-institute',
          branchId: null,
          role: UserRole.INSTITUTE_ADMIN,
        },
        {
          id: 'second-membership',
          instituteId: 'second-institute',
          branchId: null,
          role: UserRole.TEACHER,
        },
      ],
    });

    const tokens = await service.login({
      email: 'admin@example.com',
      password,
    });

    await expect(
      service.verifyAccessToken(tokens.accessToken),
    ).resolves.toMatchObject({
      membershipId: 'first-membership',
      instituteId: 'first-institute',
      role: UserRole.INSTITUTE_ADMIN,
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          memberships: {
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          },
        },
      }),
    );
    expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it('uses the selected portal membership when signing in', async () => {
    const password = 'correct-horse-battery-42';
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'account@example.com',
      passwordHash: await hashPassword(password),
      isActive: true,
      memberships: [
        {
          id: 'parent-membership',
          instituteId: 'institute-id',
          branchId: null,
          role: UserRole.PARENT,
        },
        {
          id: 'student-membership',
          instituteId: 'institute-id',
          branchId: null,
          role: UserRole.STUDENT,
        },
      ],
    });

    const tokens = await service.login({
      email: 'account@example.com',
      password,
      portal: LoginPortal.STUDENT,
    });

    await expect(
      service.verifyAccessToken(tokens.accessToken),
    ).resolves.toMatchObject({
      membershipId: 'student-membership',
      role: UserRole.STUDENT,
    });
  });

  it('rotates a refresh token and revokes the prior token atomically', async () => {
    const password = 'correct-horse-battery-42';
    const membership = {
      id: 'membership-id',
      userId: 'user-id',
      instituteId: 'institute-id',
      branchId: null,
      role: UserRole.INSTITUTE_ADMIN,
    };
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-id',
      email: 'admin@example.com',
      passwordHash: await hashPassword(password),
      isActive: true,
      memberships: [
        {
          ...membership,
        },
      ],
    });
    transaction.membership.findFirst.mockResolvedValue(membership);

    const initialTokens = await service.login({
      email: 'admin@example.com',
      password,
    });
    transaction.refreshToken.findUnique.mockResolvedValue({
      id: 'stored-refresh-token',
      userId: 'user-id',
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    transaction.refreshToken.updateMany.mockResolvedValue({ count: 1 });

    const rotatedTokens = await service.refresh(initialTokens.refreshToken);

    expect(rotatedTokens.refreshToken).not.toBe(initialTokens.refreshToken);
    expect(transaction.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'stored-refresh-token',
          revokedAt: null,
        }),
      }),
    );
    expect(transaction.refreshToken.create).toHaveBeenCalledTimes(1);
  });
});
