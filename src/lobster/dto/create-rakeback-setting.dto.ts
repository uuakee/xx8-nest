import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRakebackSettingDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsNumber()
  @Min(0)
  min_volume!: number;

  @IsNumber()
  @Min(0)
  percentage!: number;

  @IsNumber()
  @Min(0)
  max_amount!: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
