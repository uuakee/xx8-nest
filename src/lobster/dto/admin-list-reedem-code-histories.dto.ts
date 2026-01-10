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

export class AdminListReedemCodeHistoriesDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  user_pid?: string;

  @IsOptional()
  @IsString()
  user_document?: string;

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
  @IsIn(['collected_at', 'id'])
  order_by?: 'collected_at' | 'id';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order_dir?: 'asc' | 'desc';
}
