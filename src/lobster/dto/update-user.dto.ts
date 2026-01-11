import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  phone?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/, {
    message: 'document_must_be_11_digits',
  })
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
  revshare_fake?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  revshare_level_1?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  revshare_level_2?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  revshare_level_3?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  fake_revshare?: boolean;

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

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  rollover_active?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rollover_multiplier?: number;
}
