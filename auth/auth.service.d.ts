import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import type { AuthIdentity, TokenPair } from './auth.types.js';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    private readonly configService;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService);
    login(dto: LoginDto): Promise<TokenPair>;
    refresh(refreshToken: string): Promise<TokenPair>;
    logout(userId: string, refreshToken: string): Promise<{
        success: true;
    }>;
    verifyAccessToken(token: string): Promise<AuthIdentity>;
    private issueTokens;
    private verifyToken;
    private getSecret;
}
