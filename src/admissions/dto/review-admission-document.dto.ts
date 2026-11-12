import { AdmissionDocumentStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewAdmissionDocumentDto {
  @IsEnum(AdmissionDocumentStatus)
  status!: AdmissionDocumentStatus;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  verificationNotes?: string;
}
