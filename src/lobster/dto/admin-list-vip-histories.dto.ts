import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class AdminListVipHistoriesDto {
  @IsOptional()
  @IsString()
  user_pid?: string;

  @IsOptional()
  @IsString()
  user_document?: string;

  @IsOptional()
  @IsString()
  @IsIn(['upgrade', 'weekly', 'monthly'])
  kind?: 'upgrade' | 'weekly' | 'monthly';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  vip_level?: number;

  @IsOptional()
  @IsDateString()
  created_from?: string;

  @IsOptional()
  @IsDateString()
  created_to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Min(1)
  page_size?: number;

  @IsOptional()
  @IsIn(['created_at', 'bonus', 'goal'])
  order_by?: 'created_at' | 'bonus' | 'goal';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order_dir?: 'asc' | 'desc';
}
