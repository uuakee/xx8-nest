import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class CreatePopupBannerDto {
  @IsString()
  @MinLength(1)
  name!: string;

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
}
