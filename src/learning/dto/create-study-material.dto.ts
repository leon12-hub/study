import { MaterialKind } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateStudyMaterialDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsEnum(MaterialKind)
  kind!: MaterialKind;

  @IsUrl({ protocols: ['https'], require_tld: true })
  @MaxLength(2048)
  fileUrl!: string;

  @IsOptional()
  @IsBoolean()
  downloadable?: boolean;
}
