import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateChestDto {
  @IsInt()
  @Min(1)
  need_referral!: number;

  @IsNumber()
  @Min(0)
  need_deposit!: number;

  @IsNumber()
  @Min(0)
  need_bet!: number;

  @IsNumber()
  @Min(0)
  bonus!: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
