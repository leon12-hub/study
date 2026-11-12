import {
  IsIn,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class GenerateAiQuestionsDto {
  @IsString()
  @MinLength(1)
  subjectId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  topic!: string;

  @IsInt()
  @Min(1)
  @Max(10)
  count!: number;

  @IsIn(['EASY', 'MEDIUM', 'HARD'])
  difficulty!: 'EASY' | 'MEDIUM' | 'HARD';

  @IsIn(['SINGLE_CHOICE', 'MULTIPLE_CHOICE'])
  questionType!: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
}
