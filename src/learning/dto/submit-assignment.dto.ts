import { IsString, MaxLength, MinLength } from 'class-validator';

export class SubmitAssignmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10_000)
  answerText!: string;
}
