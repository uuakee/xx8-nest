import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PradaPaymentGatewayService } from './prada-payment.gateway';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pradaGateway: PradaPaymentGatewayService,
  ) {}

  async getBalances(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        pid: true,
        balance: true,
        affiliate_balance: true,
        vip_balance: true,
      },
    });
    if (!user) {
      throw new NotFoundException('user_not_found');
    }
    return {
      id: user.id,
      pid: user.pid,
      balance: user.balance,
      affiliate_balance: user.affiliate_balance,
      vip_balance: user.vip_balance,
    };
  }

  async createDeposit(userId: number, amount: number) {
    return this.pradaGateway.createDeposit(userId, amount);
  }
}
