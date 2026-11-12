var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { IsIn, IsInt, IsString, Max, MaxLength, Min, MinLength, } from 'class-validator';
export class GenerateAiQuestionsDto {
    subjectId;
    topic;
    count;
    difficulty;
    questionType;
}
__decorate([
    IsString(),
    MinLength(1),
    __metadata("design:type", String)
], GenerateAiQuestionsDto.prototype, "subjectId", void 0);
__decorate([
    IsString(),
    MinLength(2),
    MaxLength(200),
    __metadata("design:type", String)
], GenerateAiQuestionsDto.prototype, "topic", void 0);
__decorate([
    IsInt(),
    Min(1),
    Max(10),
    __metadata("design:type", Number)
], GenerateAiQuestionsDto.prototype, "count", void 0);
__decorate([
    IsIn(['EASY', 'MEDIUM', 'HARD']),
    __metadata("design:type", String)
], GenerateAiQuestionsDto.prototype, "difficulty", void 0);
__decorate([
    IsIn(['SINGLE_CHOICE', 'MULTIPLE_CHOICE']),
    __metadata("design:type", String)
], GenerateAiQuestionsDto.prototype, "questionType", void 0);
//# sourceMappingURL=generate-ai-questions.dto.js.map