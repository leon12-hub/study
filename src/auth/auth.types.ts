import { UserRole } from '@prisma/client';

export interface AuthIdentity {
  userId: string;
  membershipId: string;
  instituteId: string | null;
  branchId: string | null;
  role: UserRole;
}

export interface TokenClaims {
  sub: string;
  membershipId: string;
  instituteId: string | null;
  branchId: string | null;
  role: UserRole;
  tokenUse: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}
