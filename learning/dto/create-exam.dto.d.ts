import { QuestionType } from '@prisma/client';
export declare class CreateExamOptionDto {
    text: string;
    isCorrect: boolean;
}
export declare class CreateExamQuestionDto {
    type: QuestionType;
    prompt: string;
    marks?: number;
    options: CreateExamOptionDto[];
}
export declare class CreateExamDto {
    subjectId: string;
    title: string;
    durationMinutes: number;
    startsAt?: string;
    endsAt?: string;
    negativeMarking?: number;
    questions: CreateExamQuestionDto[];
}
export declare class SubmitExamAnswerDto {
    questionId: string;
    selectedOptionIds: string[];
}
export declare class SubmitExamDto {
    answers: SubmitExamAnswerDto[];
}
