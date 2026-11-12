var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, Length, Max, MaxLength, Matches, Min, MinLength, } from 'class-validator';
export class CreateFeeDto {
    studentId;
    title;
    amount;
    currency;
    dueAt;
}
__decorate([
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    IsString(),
    MinLength(2),
    MaxLength(191),
    __metadata("design:type", String)
], CreateFeeDto.prototype, "studentId", void 0);
__decorate([
    Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)),
    IsString(),
    MinLength(2),
    MaxLength(160),
    __metadata("design:type", String)
], CreateFeeDto.prototype, "title", void 0);
__decorate([
    Type(() => Number),
    IsNumber({ maxDecimalPlaces: 2 }),
    Min(0.01),
    Max(9_999_999_999.99),
    __metadata("design:type", Number)
], CreateFeeDto.prototype, "amount", void 0);
__decorate([
    IsOptional(),
    Transform(({ value }) => typeof value === 'string' ? value.trim().toUpperCase() : value),
    IsString(),
    Length(3, 3),
    Matches(/^[A-Z]{3}$/),
    __metadata("design:type", String)
], CreateFeeDto.prototype, "currency", void 0);
__decorate([
    IsDateString(),
    __metadata("design:type", String)
], CreateFeeDto.prototype, "dueAt", void 0);
//# sourceMappingURL=create-fee.dto.js.map