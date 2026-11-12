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
import { UserRole } from '@prisma/client';
import { ArrayMinSize, ArrayMaxSize, ArrayUnique, IsArray, IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength, ValidateIf, } from 'class-validator';
export class CreateUserDto {
    email;
    fullName;
    password;
    role;
    instituteId;
    branchId;
    admissionNumber;
    batchId;
    studentIds;
    relationship;
}
__decorate([
    Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value),
    IsEmail(),
    MaxLength(254),
    __metadata("design:type", String)
], CreateUserDto.prototype, "email", void 0);
__decorate([
    IsString(),
    MinLength(2),
    MaxLength(120),
    __metadata("design:type", String)
], CreateUserDto.prototype, "fullName", void 0);
__decorate([
    IsString(),
    MinLength(8),
    MaxLength(128),
    __metadata("design:type", String)
], CreateUserDto.prototype, "password", void 0);
__decorate([
    IsEnum(UserRole),
    __metadata("design:type", String)
], CreateUserDto.prototype, "role", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MinLength(1),
    __metadata("design:type", String)
], CreateUserDto.prototype, "instituteId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MinLength(1),
    __metadata("design:type", String)
], CreateUserDto.prototype, "branchId", void 0);
__decorate([
    ValidateIf((dto) => dto.role === UserRole.STUDENT),
    IsString(),
    MinLength(1),
    MaxLength(40),
    __metadata("design:type", String)
], CreateUserDto.prototype, "admissionNumber", void 0);
__decorate([
    ValidateIf((dto) => dto.role === UserRole.STUDENT),
    IsOptional(),
    IsString(),
    MinLength(1),
    __metadata("design:type", String)
], CreateUserDto.prototype, "batchId", void 0);
__decorate([
    ValidateIf((dto) => dto.role === UserRole.PARENT),
    IsOptional(),
    IsArray(),
    ArrayMinSize(1),
    ArrayMaxSize(20),
    ArrayUnique(),
    IsString({ each: true }),
    __metadata("design:type", Array)
], CreateUserDto.prototype, "studentIds", void 0);
__decorate([
    ValidateIf((dto) => dto.role === UserRole.PARENT),
    IsOptional(),
    IsString(),
    MaxLength(40),
    __metadata("design:type", String)
], CreateUserDto.prototype, "relationship", void 0);
//# sourceMappingURL=create-user.dto.js.map