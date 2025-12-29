import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class AdminListUsersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  pid?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  status?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  banned?: boolean;

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
  @IsIn(['created_at', 'last_login_at', 'id'])
  order_by?: 'created_at' | 'last_login_at' | 'id';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order_dir?: 'asc' | 'desc';
}
