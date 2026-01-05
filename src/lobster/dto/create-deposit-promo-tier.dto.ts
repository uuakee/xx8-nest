import { IsBoolean, IsInt, IsNumber, IsOptional, Min, MinLength, IsString } from 'class-validator';

export class CreateDepositPromoTierDto {
  @IsInt()
  @Min(1)
  event_id!: number;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsNumber()
  @Min(0)
  deposit_amount!: number;

  @IsNumber()
  @Min(0)
  bonus_amount!: number;

  @IsNumber()
  @Min(0)
  rollover_amount!: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsInt()
  sort_order?: number;
}

