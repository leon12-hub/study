var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { MaterialKind } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl, MaxLength, MinLength, } from 'class-validator';
export class CreateStudyMaterialDto {
    title;
    kind;
    fileUrl;
    downloadable;
}
__decorate([
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    IsString(),
    MinLength(2),
    MaxLength(160),
    __metadata("design:type", String)
], CreateStudyMaterialDto.prototype, "title", void 0);
__decorate([
    IsEnum(MaterialKind),
    __metadata("design:type", String)
], CreateStudyMaterialDto.prototype, "kind", void 0);
__decorate([
    IsUrl({ protocols: ['https'], require_tld: true }),
    MaxLength(2048),
    __metadata("design:type", String)
], CreateStudyMaterialDto.prototype, "fileUrl", void 0);
__decorate([
    IsOptional(),
    IsBoolean(),
    __metadata("design:type", Boolean)
], CreateStudyMaterialDto.prototype, "downloadable", void 0);
//# sourceMappingURL=create-study-material.dto.js.map