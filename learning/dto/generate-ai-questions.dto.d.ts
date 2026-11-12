export declare class GenerateAiQuestionsDto {
    subjectId: string;
    topic: string;
    count: number;
    difficulty: 'EASY' | 'MEDIUM' | 'HARD';
    questionType: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
}
