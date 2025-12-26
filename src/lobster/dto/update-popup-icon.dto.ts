import { IsBoolean, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class UpdatePopupIconDto {
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
  @IsString()
  direction?: string;
}

