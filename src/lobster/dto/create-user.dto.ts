import { IsOptional, IsString, MinLength } from 'class-validator';

export class AdminCreateUserDto {
  @IsString()
  @MinLength(1)
  phone!: string;

  @IsString()
  @MinLength(1)
  document!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  inviterAffiliateCode?: string;
}
