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
}
