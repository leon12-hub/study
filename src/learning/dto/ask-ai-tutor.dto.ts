import { IsString, MaxLength, MinLength } from 'class-validator';

export class AskAiTutorDto {
  @IsString()
  @MinLength(1)
  courseId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  question!: string;
}
