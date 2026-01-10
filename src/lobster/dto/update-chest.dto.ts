import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateChestDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  need_referral?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  need_deposit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  need_bet?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonus?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
