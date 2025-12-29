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

export class AdminListDepositsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  user_pid?: string;

  @IsOptional()
  @IsString()
  user_phone?: string;

  @IsOptional()
  @IsString()
  user_document?: string;

  @IsOptional()
  @IsString()
  status?: string;

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
  @IsIn(['created_at', 'amount'])
  order_by?: 'created_at' | 'amount';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order_dir?: 'asc' | 'desc';
}

export class AdminListWithdrawalsDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  user_pid?: string;

  @IsOptional()
  @IsString()
  user_phone?: string;

  @IsOptional()
  @IsString()
  user_document?: string;

  @IsOptional()
  @IsString()
  status?: string;

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
  @IsIn(['created_at', 'amount'])
  order_by?: 'created_at' | 'amount';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order_dir?: 'asc' | 'desc';
}
