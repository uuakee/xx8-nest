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

export class AdminListRakebackHistoriesDto {
  @IsOptional()
  @IsString()
  user_pid?: string;

  @IsOptional()
  @IsString()
  user_document?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  setting_id?: number;

  @IsOptional()
  @IsBooleanString()
  redeemed?: string;

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
  @IsIn(['created_at', 'amount', 'redeemed', 'id'])
  order_by?: 'created_at' | 'amount' | 'redeemed' | 'id';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order_dir?: 'asc' | 'desc';
}

