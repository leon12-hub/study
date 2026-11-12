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
import { IsDateString, IsEmail, IsOptional, IsString, MaxLength, MinLength, } from 'class-validator';
export class CreateAdmissionApplicationDto {
    fullName;
    email;
    phone;
    instituteId;
    branchId;
    courseId;
    batchId;
    dateOfBirth;
}
__decorate([
    IsString(),
    MinLength(2),
    MaxLength(120),
    __metadata("design:type", String)
], CreateAdmissionApplicationDto.prototype, "fullName", void 0);
__decorate([
    Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value),
    IsEmail(),
    MaxLength(254),
    __metadata("design:type", String)
], CreateAdmissionApplicationDto.prototype, "email", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(32),
    __metadata("design:type", String)
], CreateAdmissionApplicationDto.prototype, "phone", void 0);
__decorate([
    IsString(),
    MinLength(1),
    MaxLength(100),
    __metadata("design:type", String)
], CreateAdmissionApplicationDto.prototype, "instituteId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(100),
    __metadata("design:type", String)
], CreateAdmissionApplicationDto.prototype, "branchId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(100),
    __metadata("design:type", String)
], CreateAdmissionApplicationDto.prototype, "courseId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MaxLength(100),
    __metadata("design:type", String)
], CreateAdmissionApplicationDto.prototype, "batchId", void 0);
__decorate([
    IsOptional(),
    IsDateString(),
    __metadata("design:type", String)
], CreateAdmissionApplicationDto.prototype, "dateOfBirth", void 0);
//# sourceMappingURL=create-admission-application.dto.js.map