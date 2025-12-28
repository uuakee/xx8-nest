import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdatePpProviderDto {
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
  @IsBoolean()
  active?: boolean;
}
