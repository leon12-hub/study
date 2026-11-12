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
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, } from 'class-validator';
export class CreateBatchDto {
    branchId;
    courseId;
    teacherMembershipId;
    name;
    capacity;
}
__decorate([
    IsString(),
    MinLength(1),
    __metadata("design:type", String)
], CreateBatchDto.prototype, "branchId", void 0);
__decorate([
    IsString(),
    MinLength(1),
    __metadata("design:type", String)
], CreateBatchDto.prototype, "courseId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MinLength(1),
    __metadata("design:type", String)
], CreateBatchDto.prototype, "teacherMembershipId", void 0);
__decorate([
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    IsString(),
    MinLength(2),
    MaxLength(100),
    __metadata("design:type", String)
], CreateBatchDto.prototype, "name", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    Min(1),
    Max(5000),
    __metadata("design:type", Number)
], CreateBatchDto.prototype, "capacity", void 0);
export class UpdateBatchDto {
    name;
    branchId;
    courseId;
    teacherMembershipId;
    capacity;
    isActive;
}
__decorate([
    IsOptional(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    IsString(),
    MinLength(2),
    MaxLength(100),
    __metadata("design:type", String)
], UpdateBatchDto.prototype, "name", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MinLength(1),
    __metadata("design:type", String)
], UpdateBatchDto.prototype, "branchId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MinLength(1),
    __metadata("design:type", String)
], UpdateBatchDto.prototype, "courseId", void 0);
__decorate([
    IsOptional(),
    IsString(),
    MinLength(1),
    __metadata("design:type", Object)
], UpdateBatchDto.prototype, "teacherMembershipId", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    Min(1),
    Max(5000),
    __metadata("design:type", Object)
], UpdateBatchDto.prototype, "capacity", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], UpdateBatchDto.prototype, "isActive", void 0);
//# sourceMappingURL=create-batch.dto.js.map