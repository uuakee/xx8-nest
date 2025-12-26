import { IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSettingDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  sys_name?: string;

  @IsOptional()
  @IsString()
  sys_favicon?: string;

  @IsOptional()
  @IsString()
  sys_logo?: string;

  @IsOptional()
  @IsString()
  sys_description?: string;

  @IsOptional()
  @IsString()
  sys_marquee?: string;

  @IsOptional()
  @IsString()
  sys_support_telegram?: string;

  @IsOptional()
  @IsString()
  sys_support_whatsapp?: string;

  @IsOptional()
  @IsString()
  sys_support_email?: string;

  @IsOptional()
  @IsNumber()
  min_deposit?: number;

  @IsOptional()
  @IsNumber()
  max_deposit?: number;

  @IsOptional()
  @IsNumber()
  min_withdrawal?: number;

  @IsOptional()
  @IsNumber()
  max_withdrawal?: number;
}

