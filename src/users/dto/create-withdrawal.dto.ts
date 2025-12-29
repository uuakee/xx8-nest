import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateWithdrawalDto {
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsOptional()
  @IsString()
  keypix?: string;

  @IsOptional()
  @IsString()
  keytype?: string;
}

