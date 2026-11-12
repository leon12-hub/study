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
import { IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength, } from 'class-validator';
export class UpdateInstituteDto {
    name;
    logoUrl;
    primaryColor;
}
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.trim() : value),
    IsString(),
    MinLength(2),
    MaxLength(120),
    __metadata("design:type", String)
], UpdateInstituteDto.prototype, "name", void 0);
__decorate([
    IsOptional(),
    IsUrl({ protocols: ['https'], require_tld: true }),
    MaxLength(2048),
    __metadata("design:type", String)
], UpdateInstituteDto.prototype, "logoUrl", void 0);
__decorate([
    IsOptional(),
    IsString(),
    Matches(/^#[0-9a-fA-F]{6}$/),
    __metadata("design:type", String)
], UpdateInstituteDto.prototype, "primaryColor", void 0);
//# sourceMappingURL=update-institute.dto.js.map