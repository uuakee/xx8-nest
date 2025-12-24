import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  IsISO8601,
} from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsUrl()
  icon_url!: string;

  @IsUrl()
  image_url!: string;

  @IsUrl()
  target_url!: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsInt()
  sort_order?: number;

  @IsOptional()
  @IsISO8601()
  starts_at?: string;

  @IsOptional()
  @IsISO8601()
  ends_at?: string;
}

