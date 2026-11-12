import type { AuthIdentity } from '../auth/auth.types.js';
import { AskAiTutorDto } from './dto/ask-ai-tutor.dto.js';
import { GenerateAiQuestionsDto } from './dto/generate-ai-questions.dto.js';
import { AiLearningService } from './ai-learning.service.js';
export declare class InstituteAiLearningController {
    private readonly ai;
    constructor(ai: AiLearningService);
    generateQuestions(dto: GenerateAiQuestionsDto, actor: AuthIdentity): Promise<{
        questions: {
            type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE";
            prompt: string;
            marks: number;
            options: {
                text: string;
                isCorrect: boolean;
            }[];
        }[];
    }>;
}
export declare class StudentAiLearningController {
    private readonly ai;
    constructor(ai: AiLearningService);
    analyzePerformance(actor: AuthIdentity): Promise<{
        assessmentCount: number;
        summary: string;
        strengths: string[];
        focusAreas: string[];
    }>;
    askTutor(dto: AskAiTutorDto, actor: AuthIdentity): Promise<{
        answer: string;
        followUpQuestions: string[];
    }>;
}
