import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsUrl()
  image!: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
