import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import type { AuthIdentity, TokenPair } from './auth.types.js';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): Promise<TokenPair>;
    refresh(dto: RefreshTokenDto): Promise<TokenPair>;
    logout(user: AuthIdentity, dto: RefreshTokenDto): Promise<{
        success: true;
    }>;
    getCurrentUser(user: AuthIdentity): AuthIdentity;
}
