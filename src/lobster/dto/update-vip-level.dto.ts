import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateVipLevelDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id_vip?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  goal?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bonus?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weekly_bonus?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthly_bonus?: number;
}

