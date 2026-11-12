import type { AuthIdentity } from '../auth/auth.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AiProvider } from './ai-provider.js';
import type { AskAiTutorDto } from './dto/ask-ai-tutor.dto.js';
import type { GenerateAiQuestionsDto } from './dto/generate-ai-questions.dto.js';
type GeneratedOption = {
    text: string;
    isCorrect: boolean;
};
type GeneratedQuestion = {
    type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
    prompt: string;
    marks: number;
    options: GeneratedOption[];
};
export declare class AiLearningService {
    private readonly prisma;
    private readonly provider;
    constructor(prisma: PrismaService, provider: AiProvider);
    generateQuestions(dto: GenerateAiQuestionsDto, actor: AuthIdentity): Promise<{
        questions: GeneratedQuestion[];
    }>;
    analyzeStudentPerformance(actor: AuthIdentity): Promise<{
        assessmentCount: number;
        summary: string;
        strengths: string[];
        focusAreas: string[];
    }>;
    answerTutorQuestion(dto: AskAiTutorDto, actor: AuthIdentity): Promise<{
        answer: string;
        followUpQuestions: string[];
    }>;
    private generateJson;
    private validateGeneratedQuestions;
    private validatePerformanceAnalysis;
    private validateTutorAnswer;
    private requireRole;
    private requireInstitute;
    private getBranchScope;
}
export {};
