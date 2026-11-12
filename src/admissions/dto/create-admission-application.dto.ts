import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAdmissionApplicationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  instituteId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  branchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  courseId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  batchId?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}
