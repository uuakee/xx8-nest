import { IsBoolean, IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateDepositPromoEventDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

