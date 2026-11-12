import { Body, Controller, Get, Post } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/auth.decorators.js';
import type { AuthIdentity } from '../auth/auth.types.js';
import { AskAiTutorDto } from './dto/ask-ai-tutor.dto.js';
import { GenerateAiQuestionsDto } from './dto/generate-ai-questions.dto.js';
import { AiLearningService } from './ai-learning.service.js';

@Controller('institutes/me/ai')
@Roles(UserRole.INSTITUTE_ADMIN, UserRole.BRANCH_ADMIN, UserRole.TEACHER)
export class InstituteAiLearningController {
  constructor(private readonly ai: AiLearningService) {}

  @Post('questions')
  generateQuestions(
    @Body() dto: GenerateAiQuestionsDto,
    @CurrentUser() actor: AuthIdentity,
  ) {
    return this.ai.generateQuestions(dto, actor);
  }
}

@Controller('students/me/ai')
@Roles(UserRole.STUDENT)
export class StudentAiLearningController {
  constructor(private readonly ai: AiLearningService) {}

  @Get('performance')
  analyzePerformance(@CurrentUser() actor: AuthIdentity) {
    return this.ai.analyzeStudentPerformance(actor);
  }

  @Post('tutor')
  askTutor(@Body() dto: AskAiTutorDto, @CurrentUser() actor: AuthIdentity) {
    return this.ai.answerTutorQuestion(dto, actor);
  }
}
