import { IsNumber, Max, Min } from 'class-validator';

export class GradeAssignmentSubmissionDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999.99)
  marksAwarded!: number;
}
