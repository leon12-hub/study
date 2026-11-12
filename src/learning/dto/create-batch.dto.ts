import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBatchDto {
  @IsString()
  @MinLength(1)
  branchId!: string;

  @IsString()
  @MinLength(1)
  courseId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  teacherMembershipId?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  capacity?: number;
}

export class UpdateBatchDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  branchId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  courseId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  teacherMembershipId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5000)
  capacity?: number | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
