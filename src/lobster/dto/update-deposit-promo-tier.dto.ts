import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  MinLength,
  IsString,
} from 'class-validator';

export class UpdateDepositPromoTierDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  event_id?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deposit_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonus_amount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rollover_amount?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsInt()
  sort_order?: number;
}
