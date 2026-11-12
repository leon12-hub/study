var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { QuestionType } from '@prisma/client';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateNested, } from 'class-validator';
export class CreateExamOptionDto {
    text;
    isCorrect;
}
__decorate([
    IsString(),
    MinLength(1),
    MaxLength(500),
    __metadata("design:type", String)
], CreateExamOptionDto.prototype, "text", void 0);
__decorate([
    IsBoolean(),
    __metadata("design:type", Boolean)
], CreateExamOptionDto.prototype, "isCorrect", void 0);
export class CreateExamQuestionDto {
    type;
    prompt;
    marks;
    options;
}
__decorate([
    IsEnum(QuestionType),
    __metadata("design:type", String)
], CreateExamQuestionDto.prototype, "type", void 0);
__decorate([
    IsString(),
    MinLength(2),
    MaxLength(4000),
    __metadata("design:type", String)
], CreateExamQuestionDto.prototype, "prompt", void 0);
__decorate([
    IsOptional(),
    IsNumber({ maxDecimalPlaces: 2 }),
    Min(0.01),
    Max(1000),
    __metadata("design:type", Number)
], CreateExamQuestionDto.prototype, "marks", void 0);
__decorate([
    IsArray(),
    ArrayMinSize(2),
    ArrayMaxSize(8),
    ValidateNested({ each: true }),
    Type(() => CreateExamOptionDto),
    __metadata("design:type", Array)
], CreateExamQuestionDto.prototype, "options", void 0);
export class CreateExamDto {
    subjectId;
    title;
    durationMinutes;
    startsAt;
    endsAt;
    negativeMarking;
    questions;
}
__decorate([
    IsString(),
    MinLength(1),
    __metadata("design:type", String)
], CreateExamDto.prototype, "subjectId", void 0);
__decorate([
    IsString(),
    MinLength(2),
    MaxLength(160),
    __metadata("design:type", String)
], CreateExamDto.prototype, "title", void 0);
__decorate([
    IsInt(),
    Min(1),
    Max(240),
    __metadata("design:type", Number)
], CreateExamDto.prototype, "durationMinutes", void 0);
__decorate([
    IsOptional(),
    IsDateString(),
    __metadata("design:type", String)
], CreateExamDto.prototype, "startsAt", void 0);
__decorate([
    IsOptional(),
    IsDateString(),
    __metadata("design:type", String)
], CreateExamDto.prototype, "endsAt", void 0);
__decorate([
    IsOptional(),
    IsNumber({ maxDecimalPlaces: 2 }),
    Min(0),
    Max(100),
    __metadata("design:type", Number)
], CreateExamDto.prototype, "negativeMarking", void 0);
__decorate([
    IsArray(),
    ArrayMinSize(1),
    ArrayMaxSize(100),
    ValidateNested({ each: true }),
    Type(() => CreateExamQuestionDto),
    __metadata("design:type", Array)
], CreateExamDto.prototype, "questions", void 0);
export class SubmitExamAnswerDto {
    questionId;
    selectedOptionIds;
}
__decorate([
    IsString(),
    MinLength(1),
    __metadata("design:type", String)
], SubmitExamAnswerDto.prototype, "questionId", void 0);
__decorate([
    IsArray(),
    ArrayMaxSize(8),
    IsString({ each: true }),
    __metadata("design:type", Array)
], SubmitExamAnswerDto.prototype, "selectedOptionIds", void 0);
export class SubmitExamDto {
    answers;
}
__decorate([
    IsArray(),
    ArrayMaxSize(100),
    ValidateNested({ each: true }),
    Type(() => SubmitExamAnswerDto),
    __metadata("design:type", Array)
], SubmitExamDto.prototype, "answers", void 0);
//# sourceMappingURL=create-exam.dto.js.map