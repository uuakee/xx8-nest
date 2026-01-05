import { IsBoolean, IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDepositPromoEventDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsDateString()
  start_date!: string;

  @IsDateString()
  end_date!: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

