import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdatePgProviderDto {
  @IsOptional()
  @IsUrl()
  base_url?: string;

  @IsOptional()
  @IsString()
  agent_code?: string;

  @IsOptional()
  @IsString()
  agent_secret?: string;

  @IsOptional()
  @IsString()
  agent_token?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

