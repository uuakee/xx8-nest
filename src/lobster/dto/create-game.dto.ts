import { IsBoolean, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateGameDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  @MinLength(1)
  game_code!: string;

  @IsUrl()
  image!: string;

  @IsString()
  @MinLength(1)
  provider!: string;

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
