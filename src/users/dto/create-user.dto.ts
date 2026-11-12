import { Transform } from 'class-transformer';
import { UserRole } from '@prisma/client';
import {
  ArrayMinSize,
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateUserDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsString()
  @MinLength(1)
  instituteId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  branchId?: string;

  @ValidateIf((dto: CreateUserDto) => dto.role === UserRole.STUDENT)
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  admissionNumber?: string;

  @ValidateIf((dto: CreateUserDto) => dto.role === UserRole.STUDENT)
  @IsOptional()
  @IsString()
  @MinLength(1)
  batchId?: string;

  @ValidateIf((dto: CreateUserDto) => dto.role === UserRole.PARENT)
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ArrayUnique()
  @IsString({ each: true })
  studentIds?: string[];

  @ValidateIf((dto: CreateUserDto) => dto.role === UserRole.PARENT)
  @IsOptional()
  @IsString()
  @MaxLength(40)
  relationship?: string;
}
