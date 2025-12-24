import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdatePradaPaymentDto {
  @IsOptional()
  @IsUrl()
  base_url?: string;

  @IsOptional()
  @IsString()
  client_id?: string;

  @IsOptional()
  @IsString()
  client_secret?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

