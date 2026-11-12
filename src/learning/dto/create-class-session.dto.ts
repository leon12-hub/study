import { AttendanceStatus, ClassMode } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';

export class CreateClassSessionDto {
  @IsString()
  @MinLength(1)
  batchId!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  subjectId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  teacherMembershipId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  classroomId?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsEnum(ClassMode)
  mode!: ClassMode;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_tld: true })
  @MaxLength(2048)
  joinUrl?: string;
}

export class AttendanceRecordDto {
  @IsString()
  @MinLength(1)
  studentId!: string;

  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;
}

export class MarkAttendanceDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => AttendanceRecordDto)
  records!: AttendanceRecordDto[];
}

export class SessionListQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class VerifyPasskeyRegistrationDto {
  @IsObject()
  response!: RegistrationResponseJSON;
}

export class VerifyPasskeyAuthenticationDto {
  @IsObject()
  response!: AuthenticationResponseJSON;
}
