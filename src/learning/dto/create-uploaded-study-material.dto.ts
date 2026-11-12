import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUploadedStudyMaterialDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  title!: string;

  @IsIn(['PDF', 'VIDEO'])
  kind!: 'PDF' | 'VIDEO';

  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  downloadable!: boolean;
}
