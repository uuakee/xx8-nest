import { IsIn, IsNumber, IsPositive, IsString } from 'class-validator';

export class RedeemVipBonusDto {
  @IsString()
  @IsIn(['upgrade', 'weekly', 'monthly'])
  bonusType!: 'upgrade' | 'weekly' | 'monthly';

  @IsNumber()
  @IsPositive()
  amount!: number;
}
