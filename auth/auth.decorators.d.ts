export declare const IS_PUBLIC_KEY = "highstudy:is-public";
export declare const ROLES_KEY = "highstudy:roles";
export declare const Public: () => import("@nestjs/common").CustomDecorator<string>;
export declare const Roles: (...roles: string[]) => import("@nestjs/common").CustomDecorator<string>;
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
