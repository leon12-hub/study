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
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, } from 'class-validator';
export class CreateClassroomDto {
    branchId;
    name;
    capacity;
}
__decorate([
    IsString(),
    MinLength(1),
    __metadata("design:type", String)
], CreateClassroomDto.prototype, "branchId", void 0);
__decorate([
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    IsString(),
    MinLength(2),
    MaxLength(100),
    __metadata("design:type", String)
], CreateClassroomDto.prototype, "name", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    Min(1),
    Max(5000),
    __metadata("design:type", Number)
], CreateClassroomDto.prototype, "capacity", void 0);
export class UpdateClassroomDto {
    name;
    capacity;
}
__decorate([
    IsOptional(),
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    IsString(),
    MinLength(2),
    MaxLength(100),
    __metadata("design:type", String)
], UpdateClassroomDto.prototype, "name", void 0);
__decorate([
    IsOptional(),
    IsInt(),
    Min(1),
    Max(5000),
    __metadata("design:type", Object)
], UpdateClassroomDto.prototype, "capacity", void 0);
//# sourceMappingURL=create-classroom.dto.js.map