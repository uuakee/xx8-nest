import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateWithdrawalDto {
  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  user_name!: string;

  @IsOptional()
  @IsString()
  user_document?: string;

  @IsOptional()
  @IsString()
  keypix?: string;

  @IsOptional()
  @IsString()
  keytype?: string;
}
