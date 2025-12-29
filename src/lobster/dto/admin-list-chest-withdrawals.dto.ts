import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class AdminListChestWithdrawalsDto {
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
  @IsBooleanString()
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
  @IsIn(['created_at', 'amount', 'status', 'id'])
  order_by?: 'created_at' | 'amount' | 'status' | 'id';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order_dir?: 'asc' | 'desc';
}

