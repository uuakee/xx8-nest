import { IsInt, IsNumber, Min } from 'class-validator';

export class CreateVipLevelDto {
  @IsInt()
  @Min(1)
  id_vip!: number;

  @IsNumber()
  @Min(0)
  goal!: number;

  @IsNumber()
  @Min(0)
  bonus!: number;

  @IsNumber()
  @Min(0)
  weekly_bonus!: number;

  @IsNumber()
  @Min(0)
  monthly_bonus!: number;
}

