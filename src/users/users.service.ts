import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PradaPaymentGatewayService } from './prada-payment.gateway';
import { RedeemVipBonusDto } from './dto/redeem-vip-bonus.dto';

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

  async getGameHistory(userId: number, hours: number) {
    const allowedHours = [3, 12, 24, 48, 168];
    const effectiveHours = allowedHours.includes(hours) ? hours : 3;
    const now = new Date();
    const from = new Date(now.getTime() - effectiveHours * 60 * 60 * 1000);

    const transactions = await (this.prisma as any).gameTransaction.findMany({
      where: {
        user_id: userId,
        created_at: { gte: from },
      },
      select: {
        action: true,
        amount: true,
        provider: true,
        game_uuid: true,
      },
    });

    let totalBetsCount = 0;
    let totalBetAmount = 0;
    let totalWinAmount = 0;
    let totalVolume = 0;

    const gamesMap = new Map<
      string,
      {
        provider: string;
        game_uuid: string | null;
        totalBetsCount: number;
        totalVolume: number;
      }
    >();

    for (const tx of transactions) {
      if (!tx.amount) {
        continue;
      }
      const value =
        typeof tx.amount === 'number'
          ? tx.amount
          : Number(tx.amount.toString());

      const key = `${tx.provider}:${tx.game_uuid ?? 'unknown'}`;
      let entry = gamesMap.get(key);
      if (!entry) {
        entry = {
          provider: tx.provider,
          game_uuid: tx.game_uuid ?? null,
          totalBetsCount: 0,
          totalVolume: 0,
        };
        gamesMap.set(key, entry);
      }

      if (tx.action === 'bet') {
        totalBetsCount += 1;
        totalBetAmount += value;
        totalVolume += value;
        entry.totalBetsCount += 1;
        entry.totalVolume += value;
      } else if (tx.action === 'win') {
        totalWinAmount += value;
        totalVolume += value;
        entry.totalVolume += value;
      }
    }

    const totalLost = Math.max(totalBetAmount - totalWinAmount, 0);

    const aggregatedGames = Array.from(gamesMap.values());

    const uuids = Array.from(
      new Set(
        aggregatedGames.map((g) => g.game_uuid).filter((v): v is string => !!v),
      ),
    );

    let gamesMeta = new Map<
      string,
      {
        name: string | null;
        image: string | null;
      }
    >();

    if (uuids.length > 0) {
      const gameRows = await this.prisma.game.findMany({
        where: {
          OR: [{ game_id: { in: uuids } }, { game_code: { in: uuids } }],
        },
        select: {
          name: true,
          image: true,
          game_id: true,
          game_code: true,
        },
      });

      gamesMeta = new Map();

      for (const g of gameRows) {
        if (g.game_id) {
          gamesMeta.set(g.game_id, {
            name: g.name,
            image: g.image ?? null,
          });
        }
        gamesMeta.set(g.game_code, {
          name: g.name,
          image: g.image ?? null,
        });
      }
    }

    const games = aggregatedGames.map((g) => {
      const meta = g.game_uuid ? gamesMeta.get(g.game_uuid) : undefined;
      return {
        game_name: meta?.name ?? null,
        game_image: meta?.image ?? null,
        total_bets_count: g.totalBetsCount,
        total_volume: g.totalVolume,
      };
    });

    return {
      period_hours: effectiveHours,
      total_bets_count: totalBetsCount,
      total_volume: totalVolume,
      total_lost: totalLost,
      games,
    };
  }

  async getVipBonusesSummary(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        vip_balance: true,
      },
    });
    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    const agg = await this.prisma.vipHistory.groupBy({
      by: ['kind'],
      _sum: {
        bonus: true,
      },
      where: {
        user_id: user.id,
      },
    });

    const redemptions = await this.prisma.vipBonusRedemption.groupBy({
      by: ['bonus_type'],
      _sum: {
        amount: true,
      },
      where: {
        user_id: user.id,
      },
    });

    let upgradeTotal = 0;
    let weeklyTotal = 0;
    let monthlyTotal = 0;

    for (const row of agg) {
      const sum = row._sum.bonus;
      const value =
        typeof sum === 'number'
          ? sum
          : sum
          ? Number(sum.toString())
          : 0;
      if (row.kind === 'upgrade') {
        upgradeTotal += value;
      } else if (row.kind === 'weekly') {
        weeklyTotal += value;
      } else if (row.kind === 'monthly') {
        monthlyTotal += value;
      }
    }

    let upgradeRedeemed = 0;
    let weeklyRedeemed = 0;
    let monthlyRedeemed = 0;

    for (const row of redemptions) {
      const sum = row._sum.amount;
      const value =
        typeof sum === 'number'
          ? sum
          : sum
          ? Number(sum.toString())
          : 0;
      if (row.bonus_type === 'upgrade') {
        upgradeRedeemed += value;
      } else if (row.bonus_type === 'weekly') {
        weeklyRedeemed += value;
      } else if (row.bonus_type === 'monthly') {
        monthlyRedeemed += value;
      }
    }

    const upgradeAvailable = Math.max(upgradeTotal - upgradeRedeemed, 0);
    const weeklyAvailable = Math.max(weeklyTotal - weeklyRedeemed, 0);
    const monthlyAvailable = Math.max(monthlyTotal - monthlyRedeemed, 0);

    return {
      vip_balance: user.vip_balance,
      upgrade_total: upgradeTotal,
      weekly_total: weeklyTotal,
      monthly_total: monthlyTotal,
      upgrade_available: upgradeAvailable,
      weekly_available: weeklyAvailable,
      monthly_available: monthlyAvailable,
    };
  }

  async redeemVipBonus(userId: number, dto: RedeemVipBonusDto) {
    const bonusType = dto.bonusType;
    const amount = dto.amount;

    if (amount <= 0) {
      throw new BadRequestException('invalid_amount');
    }

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          balance: true,
          vip_balance: true,
        },
      });

      if (!user) {
        throw new NotFoundException('user_not_found');
      }

      const bonusesAgg = await tx.vipHistory.aggregate({
        _sum: {
          bonus: true,
        },
        where: {
          user_id: user.id,
          kind: bonusType,
        },
      });

      const bonusesSum = bonusesAgg._sum.bonus;
      const totalGranted =
        typeof bonusesSum === 'number'
          ? bonusesSum
          : bonusesSum
          ? Number(bonusesSum.toString())
          : 0;

      if (totalGranted <= 0) {
        throw new BadRequestException('vip_bonus_not_available');
      }

      const redemptionsAgg = await tx.vipBonusRedemption.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          user_id: user.id,
          bonus_type: bonusType,
        },
      });

      const redeemedSum = redemptionsAgg._sum.amount;
      const totalRedeemed =
        typeof redeemedSum === 'number'
          ? redeemedSum
          : redeemedSum
          ? Number(redeemedSum.toString())
          : 0;

      const available = totalGranted - totalRedeemed;

      if (available <= 0) {
        throw new BadRequestException('vip_bonus_not_available');
      }

      if (amount > available) {
        throw new BadRequestException('insufficient_vip_bonus');
      }

      const amountDecimal = new Prisma.Decimal(amount);

      await tx.vipBonusRedemption.create({
        data: {
          user_id: user.id,
          bonus_type: bonusType,
          amount: amountDecimal,
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          vip_balance: {
            decrement: amountDecimal,
          },
          balance: {
            increment: amountDecimal,
          },
        },
        select: {
          balance: true,
          vip_balance: true,
        },
      });

      return {
        bonus_type: bonusType,
        redeemed_amount: amount,
        balance: updatedUser.balance,
        vip_balance: updatedUser.vip_balance,
      };
    });
  }
}
