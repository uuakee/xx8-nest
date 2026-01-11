import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsString()
  @Length(10, 20)
  phone!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{11}$/)
  document?: string;

  @IsString()
  @Length(6, 100)
  password!: string;

  @IsOptional()
  @IsString()
  inviterAffiliateCode?: string;
}
