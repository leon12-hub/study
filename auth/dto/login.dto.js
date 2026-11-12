var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength, } from 'class-validator';
export var LoginPortal;
(function (LoginPortal) {
    LoginPortal["ADMIN"] = "ADMIN";
    LoginPortal["TEACHER"] = "TEACHER";
    LoginPortal["STUDENT"] = "STUDENT";
    LoginPortal["PARENT"] = "PARENT";
})(LoginPortal || (LoginPortal = {}));
export class LoginDto {
    email;
    password;
    portal;
}
__decorate([
    Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value),
    IsEmail(),
    MaxLength(254),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    IsString(),
    MinLength(8),
    MaxLength(128),
    __metadata("design:type", String)
], LoginDto.prototype, "password", void 0);
__decorate([
    IsOptional(),
    IsEnum(LoginPortal),
    __metadata("design:type", String)
], LoginDto.prototype, "portal", void 0);
//# sourceMappingURL=login.dto.js.map