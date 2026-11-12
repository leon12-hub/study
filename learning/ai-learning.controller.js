var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import { AskAiTutorDto } from './dto/ask-ai-tutor.dto.js';
import { GenerateAiQuestionsDto } from './dto/generate-ai-questions.dto.js';
import { AiLearningService } from './ai-learning.service.js';
let InstituteAiLearningController = class InstituteAiLearningController {
    ai;
    constructor(ai) {
        this.ai = ai;
    }
    generateQuestions(dto, actor) {
        return this.ai.generateQuestions(dto, actor);
    }
};
__decorate([
    Post('questions'),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [GenerateAiQuestionsDto, Object]),
    __metadata("design:returntype", void 0)
], InstituteAiLearningController.prototype, "generateQuestions", null);
InstituteAiLearningController = __decorate([
    Controller('institutes/me/ai'),
    Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER),
    __metadata("design:paramtypes", [AiLearningService])
], InstituteAiLearningController);
export { InstituteAiLearningController };
let StudentAiLearningController = class StudentAiLearningController {
    ai;
    constructor(ai) {
        this.ai = ai;
    }
    analyzePerformance(actor) {
        return this.ai.analyzeStudentPerformance(actor);
    }
    askTutor(dto, actor) {
        return this.ai.answerTutorQuestion(dto, actor);
    }
};
__decorate([
    Get('performance'),
    __param(0, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], StudentAiLearningController.prototype, "analyzePerformance", null);
__decorate([
    Post('tutor'),
    __param(0, Body()),
    __param(1, CurrentUser()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AskAiTutorDto, Object]),
    __metadata("design:returntype", void 0)
], StudentAiLearningController.prototype, "askTutor", null);
StudentAiLearningController = __decorate([
    Controller('students/me/ai'),
    Roles(UserRole.STUDENT),
    __metadata("design:paramtypes", [AiLearningService])
], StudentAiLearningController);
export { StudentAiLearningController };
//# sourceMappingURL=ai-learning.controller.js.map