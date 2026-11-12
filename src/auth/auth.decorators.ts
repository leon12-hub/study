import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { AuthIdentity } from './auth.types.js';

export const IS_PUBLIC_KEY = 'highstudy:is-public';
export const ROLES_KEY = 'highstudy:roles';

export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthIdentity => {
    const request = context.switchToHttp().getRequest<{ user: AuthIdentity }>();
    return request.user;
  },
);
