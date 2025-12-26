import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdatePradaPaymentDto {
  @IsOptional()
  @IsUrl()
  base_url?: string;

  @IsOptional()
  @IsString()
  api_key?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
