import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  vip?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  status?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  banned?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  blogger?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  jump_available?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  jump_limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  jump_invite_count?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  cpa_available?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cpa_level_1?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cpa_level_2?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cpa_level_3?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  min_deposit_for_cpa?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  balance?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  affiliate_balance?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  vip_balance?: number;

  @IsOptional()
  @IsString()
  @MinLength(6)
  new_password?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  new_withdrawal_password?: string;
}
