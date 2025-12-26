import { IsBoolean, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreatePopupIconDto {
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
  @IsString()
  direction?: string;
}

