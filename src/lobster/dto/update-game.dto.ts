import { IsBoolean, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class UpdateGameDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  game_code?: string;

  @IsOptional()
  @IsUrl()
  image?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  provider?: string;

  @IsOptional()
  @IsBoolean()
  is_hot?: boolean;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsBoolean()
  show_in_home?: boolean;
}
