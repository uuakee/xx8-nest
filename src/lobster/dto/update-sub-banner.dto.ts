import { IsBoolean, IsInt, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class UpdateSubBannerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsUrl()
  image_url?: string;

  @IsOptional()
  @IsUrl()
  target_url?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsInt()
  sort_order?: number;
}

