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

export class AdminListDepositPromoParticipationsDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @IsPositive()
  event_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @IsPositive()
  tier_id?: number;

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
  @IsDateString()
  promo_date_from?: string;

  @IsOptional()
  @IsDateString()
  promo_date_to?: string;

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
  @IsIn(['promo_date', 'id'])
  order_by?: 'promo_date' | 'id';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order_dir?: 'asc' | 'desc';
}

