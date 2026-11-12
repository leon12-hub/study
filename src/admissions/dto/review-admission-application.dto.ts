import { AdmissionStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewAdmissionApplicationDto {
  @IsEnum(AdmissionStatus)
  status!: AdmissionStatus;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(1000)
  reviewNotes?: string;
}
