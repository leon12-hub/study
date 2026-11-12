import { createParamDecorator, SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'highstudy:is-public';
export const ROLES_KEY = 'highstudy:roles';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
export const Roles = (...roles) => SetMetadata(ROLES_KEY, roles);
export const CurrentUser = createParamDecorator((_data, context) => {
    const request = context.switchToHttp().getRequest();
    return request.user;
});
//# sourceMappingURL=auth.decorators.js.map