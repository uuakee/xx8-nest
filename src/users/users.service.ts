import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PradaPaymentGatewayService } from './prada-payment.gateway';
import { RedeemVipBonusDto } from './dto/redeem-vip-bonus.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pradaGateway: PradaPaymentGatewayService,
  ) {}

  private getDecimalNumber(value: number | Prisma.Decimal | null | undefined) {
    if (value === null || value === undefined) {
      return 0;
    }
    return typeof value === 'number' ? value : Number(value.toString());
  }

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

  async requestWithdrawal(userId: number, dto: CreateWithdrawalDto) {
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
          status: true,
          banned: true,
          phone: true,
          document: true,
          rollover_active: true,
          rollover_multiplier: true,
        },
      });

      if (!user || !user.status || user.banned) {
        throw new BadRequestException('user_not_allowed');
      }

      const settings = await tx.setting.findUnique({
        where: { id: 1 },
        select: {
          min_withdrawal: true,
          max_withdrawal: true,
          auto_withdrawal: true,
          auto_withdrawal_limit: true,
          need_document: true,
        },
      });

      if (!settings) {
        throw new BadRequestException('settings_not_configured');
      }

      // Validar se documento é necessário para saque
      if (!user.document) {
        throw new BadRequestException('document_required_for_withdrawal');
      }

      const minWithdrawal = this.getDecimalNumber(settings.min_withdrawal);
      const maxWithdrawal = this.getDecimalNumber(settings.max_withdrawal);

      if (amount < minWithdrawal) {
        throw new BadRequestException('amount_below_min_withdrawal');
      }
      if (amount > maxWithdrawal) {
        throw new BadRequestException('amount_above_max_withdrawal');
      }

      // New rollover validation using rollover_requirements table
      const activeRequirements = await (tx as any).rolloverRequirement.findMany(
        {
          where: {
            user_id: userId,
            status: 'ACTIVE',
          },
          orderBy: { created_at: 'asc' },
        },
      );

      // If user has active rollover requirements, validate them
      if (activeRequirements.length > 0) {
        // Calculate total remaining rollover
        let totalRequired = 0;
        for (const req of activeRequirements) {
          const required = this.getDecimalNumber(req.amount_required);
          const completed = this.getDecimalNumber(req.amount_completed);
          totalRequired += required - completed;
        }

        // Get bet volume since earliest requirement
        const earliestCreated = activeRequirements[0].created_at;
        const betVolumeAgg = await (tx as any).gameTransaction.aggregate({
          _sum: { amount: true },
          where: {
            user_id: userId,
            action: 'bet',
            created_at: { gte: earliestCreated },
          },
        });

        const totalBetVolume = betVolumeAgg?._sum?.amount
          ? this.getDecimalNumber(betVolumeAgg._sum.amount as Prisma.Decimal)
          : 0;

        // Check if rollover is completed
        if (totalBetVolume < totalRequired) {
          throw new BadRequestException('rollover_not_completed');
        }

        // Mark requirements as completed (FIFO)
        let remainingVolume = totalBetVolume;
        for (const req of activeRequirements) {
          const required = this.getDecimalNumber(req.amount_required);
          const completed = this.getDecimalNumber(req.amount_completed);
          const needed = required - completed;

          if (remainingVolume >= needed) {
            // Complete this requirement
            await (tx as any).rolloverRequirement.update({
              where: { id: req.id },
              data: {
                amount_completed: req.amount_required,
                status: 'COMPLETED',
                completed_at: new Date(),
              },
            });
            remainingVolume -= needed;
          } else {
            // Partial completion
            await (tx as any).rolloverRequirement.update({
              where: { id: req.id },
              data: {
                amount_completed: {
                  increment: new Prisma.Decimal(remainingVolume),
                },
              },
            });
            remainingVolume = 0;
            break;
          }
        }
      }

      const balanceNumber = this.getDecimalNumber(user.balance);

      if (amount > balanceNumber) {
        throw new BadRequestException('insufficient_balance');
      }

      const amountDecimal = new Prisma.Decimal(amount);

      const withdrawal = await tx.withdrawal.create({
        data: {
          user_id: user.id,
          amount: amountDecimal,
          status: 'PENDING',
          user_name: dto.user_name,
          user_document: dto.user_document || user.document,
          user_keypix: dto.keypix,
          user_keytype: dto.keytype,
        },
        select: {
          id: true,
          amount: true,
          status: true,
          created_at: true,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          balance: {
            decrement: amountDecimal,
          },
        },
      });

      return {
        id: withdrawal.id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        created_at: withdrawal.created_at,
      };
    });
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
        typeof sum === 'number' ? sum : sum ? Number(sum.toString()) : 0;
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
        typeof sum === 'number' ? sum : sum ? Number(sum.toString()) : 0;
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

  async getVipProgress(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        vip: true,
      },
    });
    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    const levels = await this.prisma.vipLevel.findMany({
      orderBy: { id_vip: 'asc' },
    });

    const agg = await (this.prisma as any).gameTransaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        user_id: user.id,
        action: 'bet',
      },
    });

    const totalVolume = agg?._sum?.amount
      ? this.getDecimalNumber(agg._sum.amount as Prisma.Decimal)
      : 0;

    const currentVip = user.vip ?? 0;

    let nextVipLevel: (typeof levels)[number] | null = null;
    for (const level of levels) {
      if (level.id_vip > currentVip) {
        nextVipLevel = level;
        break;
      }
    }

    const nextVip = nextVipLevel ? nextVipLevel.id_vip : null;
    const nextGoal = nextVipLevel
      ? this.getDecimalNumber(nextVipLevel.goal)
      : null;

    const remainingToNext =
      nextGoal !== null && nextGoal !== undefined
        ? Math.max(nextGoal - totalVolume, 0)
        : null;

    return {
      vip: currentVip,
      total_volume: totalVolume,
      next_vip: nextVip,
      next_vip_goal: nextGoal,
      remaining_to_next: remainingToNext,
    };
  }

  async getRakebackSummary(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        balance: true,
      },
    });
    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    const totals = await this.prisma.rakebackHistory.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        user_id: user.id,
      },
    });

    const redeemedTotals = await this.prisma.rakebackHistory.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        user_id: user.id,
        redeemed: true,
      },
    });

    const pendingTotals = await this.prisma.rakebackHistory.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        user_id: user.id,
        redeemed: false,
      },
    });

    const totalGranted = this.getDecimalNumber(
      totals._sum.amount as Prisma.Decimal,
    );
    const totalRedeemed = this.getDecimalNumber(
      redeemedTotals._sum.amount as Prisma.Decimal,
    );
    const totalPending = this.getDecimalNumber(
      pendingTotals._sum.amount as Prisma.Decimal,
    );

    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    const volumeAgg = await (this.prisma as any).gameTransaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        user_id: user.id,
        action: 'bet',
        created_at: {
          gte: dayStart,
          lte: now,
        },
      },
    });

    const totalVolumeToday = volumeAgg?._sum?.amount
      ? this.getDecimalNumber(volumeAgg._sum.amount as Prisma.Decimal)
      : 0;

    let expectedNextRakeback = 0;

    if (totalVolumeToday > 0) {
      const settings = await this.prisma.rakebackSetting.findMany({
        where: {
          is_active: true,
        },
        orderBy: {
          min_volume: 'asc',
        },
      });

      let selectedSetting: (typeof settings)[number] | null = null;
      for (const setting of settings) {
        const minVolumeNumber = Number(setting.min_volume.toString());
        if (totalVolumeToday >= minVolumeNumber) {
          selectedSetting = setting;
        } else {
          break;
        }
      }

      if (selectedSetting) {
        const percentageNumber = Number(selectedSetting.percentage.toString());
        if (Number.isFinite(percentageNumber) && percentageNumber > 0) {
          expectedNextRakeback = (totalVolumeToday * percentageNumber) / 100;
        }
      }
    }

    const histories = await this.prisma.rakebackHistory.findMany({
      where: {
        user_id: user.id,
      },
      orderBy: {
        created_at: 'desc',
      },
      include: {
        setting: true,
      },
    });

    return {
      balance: user.balance,
      total_granted: totalGranted,
      total_redeemed: totalRedeemed,
      total_pending: totalPending,
      expected_next_rakeback: expectedNextRakeback,
      histories,
    };
  }

  async redeemRakeback(userId: number) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          balance: true,
        },
      });

      if (!user) {
        throw new NotFoundException('user_not_found');
      }

      const pendingHistories = await tx.rakebackHistory.findMany({
        where: {
          user_id: user.id,
          redeemed: false,
        },
        select: {
          id: true,
          amount: true,
        },
      });

      if (!pendingHistories.length) {
        throw new BadRequestException('no_rakeback_available');
      }

      let totalAmount = 0;
      for (const history of pendingHistories) {
        totalAmount += this.getDecimalNumber(history.amount);
      }

      if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
        throw new BadRequestException('no_rakeback_available');
      }

      const amountDecimal = new Prisma.Decimal(totalAmount);

      await tx.rakebackHistory.updateMany({
        where: {
          user_id: user.id,
          redeemed: false,
        },
        data: {
          redeemed: true,
          redeemed_at: new Date(),
        },
      });

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: {
            increment: amountDecimal,
          },
        },
        select: {
          balance: true,
        },
      });

      return {
        redeemed_amount: totalAmount,
        balance: updatedUser.balance,
      };
    });
  }

  async getAffiliateStats(
    userId: number,
    filters?: { from?: string; to?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
      },
    });
    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    const fromDate =
      filters?.from && !Number.isNaN(new Date(filters.from).getTime())
        ? new Date(filters.from)
        : null;
    const toDate =
      filters?.to && !Number.isNaN(new Date(filters.to).getTime())
        ? new Date(filters.to)
        : null;

    const registrationDateFilter: { gte?: Date; lte?: Date } = {};
    if (fromDate) {
      registrationDateFilter.gte = fromDate;
    }
    if (toDate) {
      registrationDateFilter.lte = toDate;
    }

    const level1Users = await this.prisma.user.findMany({
      where: { invited_by_user_id: user.id },
      select: { id: true },
    });
    const level1Ids = level1Users.map((u) => u.id);

    let level2Ids: number[] = [];
    let level3Ids: number[] = [];

    const level2Users =
      level1Ids.length > 0
        ? await this.prisma.user.findMany({
            where: {
              invited_by_user_id: { in: level1Ids },
            },
            select: { id: true },
          })
        : [];
    level2Ids = level2Users.map((u) => u.id);

    const level3Users =
      level2Ids.length > 0
        ? await this.prisma.user.findMany({
            where: {
              invited_by_user_id: { in: level2Ids },
            },
            select: { id: true },
          })
        : [];
    level3Ids = level3Users.map((u) => u.id);

    const directUserIds = level1Ids;
    const indirectUserIds = [...level2Ids, ...level3Ids];

    let directBetsCount = 0;
    let indirectBetsCount = 0;

    const betsDateFilter: { gte?: Date; lte?: Date } = {};
    if (fromDate) {
      betsDateFilter.gte = fromDate;
    }
    if (toDate) {
      betsDateFilter.lte = toDate;
    }

    if (directUserIds.length) {
      directBetsCount = await (this.prisma as any).gameTransaction.count({
        where: {
          user_id: { in: directUserIds },
          action: 'bet',
          ...(fromDate || toDate ? { created_at: betsDateFilter } : {}),
        },
      });
    }

    if (indirectUserIds.length) {
      indirectBetsCount = await (this.prisma as any).gameTransaction.count({
        where: {
          user_id: { in: indirectUserIds },
          action: 'bet',
          ...(fromDate || toDate ? { created_at: betsDateFilter } : {}),
        },
      });
    }

    let directFirstDepositsCount = 0;
    let indirectFirstDepositsCount = 0;
    let directFirstDepositsTotal = 0;
    let indirectFirstDepositsTotal = 0;

    const allReferredUserIds = [...directUserIds, ...indirectUserIds];

    if (allReferredUserIds.length) {
      const depositDateFilter: { gte?: Date; lte?: Date } = {};
      if (fromDate) {
        depositDateFilter.gte = fromDate;
      }
      if (toDate) {
        depositDateFilter.lte = toDate;
      }

      const deposits = await this.prisma.deposit.findMany({
        where: {
          user_id: { in: allReferredUserIds },
          status: 'PAID',
          ...(fromDate || toDate ? { created_at: depositDateFilter } : {}),
        },
        orderBy: {
          created_at: 'asc',
        },
        select: {
          user_id: true,
          amount: true,
        },
      });

      const seenUsers = new Set<number>();

      for (const dep of deposits) {
        if (seenUsers.has(dep.user_id)) {
          continue;
        }
        seenUsers.add(dep.user_id);

        const amountNumber = this.getDecimalNumber(dep.amount);

        if (directUserIds.includes(dep.user_id)) {
          directFirstDepositsCount += 1;
          directFirstDepositsTotal += amountNumber;
        } else if (indirectUserIds.includes(dep.user_id)) {
          indirectFirstDepositsCount += 1;
          indirectFirstDepositsTotal += amountNumber;
        }
      }
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const last7Start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last15Start = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);

    const affiliateHistoryDateFilter: { gte?: Date; lte?: Date } = {};
    if (fromDate) {
      affiliateHistoryDateFilter.gte = fromDate;
    }
    if (toDate) {
      affiliateHistoryDateFilter.lte = toDate;
    }
    if (!fromDate && !toDate) {
      affiliateHistoryDateFilter.gte = last15Start;
    }

    const histories = await this.prisma.affiliateHistory.findMany({
      where: {
        affiliate_user_id: user.id,
        created_at: affiliateHistoryDateFilter,
      },
      select: {
        amount: true,
        cpa_level: true,
        revshare_level: true,
        created_at: true,
      },
    });

    const commission = {
      today: {
        direct: 0,
        indirect: 0,
      },
      yesterday: {
        direct: 0,
        indirect: 0,
      },
      last_7_days: {
        direct: 0,
        indirect: 0,
      },
      last_15_days: {
        direct: 0,
        indirect: 0,
      },
    };

    for (const row of histories) {
      const amountNumber = this.getDecimalNumber(row.amount);
      const level =
        row.cpa_level && row.cpa_level > 0 ? row.cpa_level : row.revshare_level;
      const isDirect = level === 1;
      const isIndirect = level && level > 1;

      if (!isDirect && !isIndirect) {
        continue;
      }

      const createdAt = row.created_at;

      const apply = (bucket: { direct: number; indirect: number }) => {
        if (isDirect) {
          bucket.direct += amountNumber;
        } else if (isIndirect) {
          bucket.indirect += amountNumber;
        }
      };

      if (createdAt >= todayStart) {
        apply(commission.today);
      } else if (createdAt >= yesterdayStart && createdAt < todayStart) {
        apply(commission.yesterday);
      }

      if (createdAt >= last7Start) {
        apply(commission.last_7_days);
      }

      if (createdAt >= last15Start) {
        apply(commission.last_15_days);
      }
    }

    return {
      commission,
      registrations: {
        direct_count: directUserIds.length,
        indirect_count: indirectUserIds.length,
      },
      bets: {
        direct_count: directBetsCount,
        indirect_count: indirectBetsCount,
      },
      first_deposits: {
        direct_count: directFirstDepositsCount,
        indirect_count: indirectFirstDepositsCount,
        direct_total_amount: directFirstDepositsTotal,
        indirect_total_amount: indirectFirstDepositsTotal,
      },
    };
  }

  async getChestSummary(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        min_deposit_for_cpa: true,
      },
    });
    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    const chests = await this.prisma.chest.findMany({
      where: { is_active: true },
      orderBy: { need_referral: 'asc' },
    });

    const invitees = await this.prisma.user.findMany({
      where: { invited_by_user_id: user.id },
      select: { id: true },
    });
    const inviteeIds = invitees.map((u) => u.id);

    const depositMap = new Map<number, number>();
    const betMap = new Map<number, number>();

    if (inviteeIds.length) {
      const depositsAgg = await this.prisma.deposit.groupBy({
        by: ['user_id'],
        where: {
          user_id: { in: inviteeIds },
          status: 'PAID',
        },
        _sum: {
          amount: true,
        },
      });

      for (const row of depositsAgg) {
        const sum = row._sum.amount;
        const value =
          typeof sum === 'number' ? sum : sum ? Number(sum.toString()) : 0;
        depositMap.set(row.user_id, value);
      }

      const betsAgg = await (this.prisma as any).gameTransaction.groupBy({
        by: ['user_id'],
        where: {
          user_id: { in: inviteeIds },
          action: 'bet',
        },
        _sum: {
          amount: true,
        },
      });

      for (const row of betsAgg) {
        const sum = row._sum.amount;
        const value =
          typeof sum === 'number' ? sum : sum ? Number(sum.toString()) : 0;
        betMap.set(row.user_id, value);
      }
    }

    const chestIds = chests.map((c) => c.id);
    const withdrawalsByChestId = new Map<number, number>();
    let withdrawals: any[] = [];

    if (chestIds.length) {
      withdrawals = await this.prisma.chestWithdrawal.findMany({
        where: {
          user_id: user.id,
          chest_id: { in: chestIds },
        },
        orderBy: {
          created_at: 'desc',
        },
        include: {
          chest: true,
        },
      });

      for (const w of withdrawals) {
        const current = withdrawalsByChestId.get(w.chest_id) ?? 0;
        withdrawalsByChestId.set(w.chest_id, current + 1);
      }
    }

    const minDepositForCpa = this.getDecimalNumber(user.min_deposit_for_cpa);

    const chestSummaries = chests.map((chest) => {
      const needReferral = chest.need_referral;
      const chestNeedDeposit = this.getDecimalNumber(chest.need_deposit);
      const chestNeedBet = this.getDecimalNumber(chest.need_bet);

      const effectiveDepositThreshold = Math.max(
        minDepositForCpa,
        chestNeedDeposit,
      );
      const effectiveBetThreshold = chestNeedBet;

      let qualifiedFriends = 0;

      for (const userIdInvitee of inviteeIds) {
        const totalDeposit = depositMap.get(userIdInvitee) ?? 0;
        const totalBet = betMap.get(userIdInvitee) ?? 0;
        if (
          totalDeposit >= effectiveDepositThreshold &&
          totalBet >= effectiveBetThreshold
        ) {
          qualifiedFriends += 1;
        }
      }

      const maxRedeems =
        needReferral > 0 ? Math.floor(qualifiedFriends / needReferral) : 0;
      const redeemedCount = withdrawalsByChestId.get(chest.id) ?? 0;
      const availableToRedeem = Math.max(maxRedeems - redeemedCount, 0);

      return {
        id: chest.id,
        need_referral: chest.need_referral,
        need_deposit: chest.need_deposit,
        need_bet: chest.need_bet,
        bonus: chest.bonus,
        is_active: chest.is_active,
        qualified_friends: qualifiedFriends,
        redeemed_count: redeemedCount,
        available_to_redeem: availableToRedeem,
      };
    });

    const minimalDepositThreshold = chestSummaries.length
      ? chestSummaries.reduce((min, chest) => {
          const value = this.getDecimalNumber(chest.need_deposit);
          return Math.min(min, value);
        }, Number.POSITIVE_INFINITY)
      : 0;

    const minimalBetThreshold = chestSummaries.length
      ? chestSummaries.reduce((min, chest) => {
          const value = this.getDecimalNumber(chest.need_bet);
          return Math.min(min, value);
        }, Number.POSITIVE_INFINITY)
      : 0;

    let totalQualifiedFriends = 0;

    if (minimalDepositThreshold !== 0 || minimalBetThreshold !== 0) {
      const effectiveDepositThreshold = Math.max(
        minDepositForCpa,
        minimalDepositThreshold,
      );
      const effectiveBetThreshold = minimalBetThreshold;

      for (const userIdInvitee of inviteeIds) {
        const totalDeposit = depositMap.get(userIdInvitee) ?? 0;
        const totalBet = betMap.get(userIdInvitee) ?? 0;
        if (
          totalDeposit >= effectiveDepositThreshold &&
          totalBet >= effectiveBetThreshold
        ) {
          totalQualifiedFriends += 1;
        }
      }
    }

    return {
      total_invited_friends: inviteeIds.length,
      total_qualified_friends: totalQualifiedFriends,
      chests: chestSummaries,
      withdrawals,
    };
  }

  async redeemChest(userId: number, chestId: number) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          min_deposit_for_cpa: true,
        },
      });

      if (!user) {
        throw new NotFoundException('user_not_found');
      }

      const chest = await tx.chest.findUnique({
        where: { id: chestId },
      });

      if (!chest || !chest.is_active) {
        throw new BadRequestException('chest_not_available');
      }

      const invitees = await tx.user.findMany({
        where: { invited_by_user_id: user.id },
        select: { id: true },
      });
      const inviteeIds = invitees.map((u) => u.id);

      if (!inviteeIds.length) {
        throw new BadRequestException('no_qualified_friends');
      }

      const depositMap = new Map<number, number>();
      const betMap = new Map<number, number>();

      const depositsAgg = await tx.deposit.groupBy({
        by: ['user_id'],
        where: {
          user_id: { in: inviteeIds },
          status: 'PAID',
        },
        _sum: {
          amount: true,
        },
      });

      for (const row of depositsAgg) {
        const sum = row._sum.amount;
        const value =
          typeof sum === 'number' ? sum : sum ? Number(sum.toString()) : 0;
        depositMap.set(row.user_id, value);
      }

      const betsAgg = await (tx as any).gameTransaction.groupBy({
        by: ['user_id'],
        where: {
          user_id: { in: inviteeIds },
          action: 'bet',
        },
        _sum: {
          amount: true,
        },
      });

      for (const row of betsAgg) {
        const sum = row._sum.amount;
        const value =
          typeof sum === 'number' ? sum : sum ? Number(sum.toString()) : 0;
        betMap.set(row.user_id, value);
      }

      const minDepositForCpa = this.getDecimalNumber(user.min_deposit_for_cpa);
      const chestNeedDeposit = this.getDecimalNumber(chest.need_deposit);
      const chestNeedBet = this.getDecimalNumber(chest.need_bet);

      const effectiveDepositThreshold = Math.max(
        minDepositForCpa,
        chestNeedDeposit,
      );
      const effectiveBetThreshold = chestNeedBet;

      let qualifiedFriends = 0;

      for (const userIdInvitee of inviteeIds) {
        const totalDeposit = depositMap.get(userIdInvitee) ?? 0;
        const totalBet = betMap.get(userIdInvitee) ?? 0;
        if (
          totalDeposit >= effectiveDepositThreshold &&
          totalBet >= effectiveBetThreshold
        ) {
          qualifiedFriends += 1;
        }
      }

      if (chest.need_referral <= 0) {
        throw new BadRequestException('invalid_chest_configuration');
      }

      const maxRedeems = Math.floor(qualifiedFriends / chest.need_referral);

      if (maxRedeems <= 0) {
        throw new BadRequestException('no_chest_available');
      }

      const existingRedeemsCount = await tx.chestWithdrawal.count({
        where: {
          user_id: user.id,
          chest_id: chest.id,
        },
      });

      if (existingRedeemsCount >= maxRedeems) {
        throw new BadRequestException('no_chest_available');
      }

      const withdrawal = await tx.chestWithdrawal.create({
        data: {
          user_id: user.id,
          chest_id: chest.id,
          amount: chest.bonus,
          status: true,
        },
        select: {
          id: true,
          chest_id: true,
          amount: true,
          status: true,
          created_at: true,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          balance: {
            increment: chest.bonus,
          },
        },
      });

      return withdrawal;
    });
  }

  async redeemCode(userId: number, code: string) {
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      throw new BadRequestException('invalid_code');
    }

    const normalizedCode = code.trim();

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
        },
      });

      if (!user) {
        throw new NotFoundException('user_not_found');
      }

      const reedemCode = await tx.reedemCode.findUnique({
        where: { code: normalizedCode },
      });

      if (!reedemCode || !reedemCode.is_active) {
        throw new BadRequestException('redeem_code_not_available');
      }

      if (
        reedemCode.max_collect > 0 &&
        reedemCode.collected_count >= reedemCode.max_collect
      ) {
        throw new BadRequestException('redeem_code_limit_reached');
      }

      const alreadyCollected = await tx.reedemCodeHistory.findFirst({
        where: {
          reedem_code_id: reedemCode.id,
          user_id: user.id,
        },
      });

      if (alreadyCollected) {
        throw new BadRequestException('redeem_code_already_used');
      }

      const updatedCode = await tx.reedemCode.update({
        where: { id: reedemCode.id },
        data: {
          collected_count: {
            increment: 1,
          },
        },
      });

      const bonusAmount = this.getDecimalNumber(reedemCode.bonus);
      const freeSpins = reedemCode.free_spins ?? 0;

      if (bonusAmount > 0) {
        const bonusDecimal = new Prisma.Decimal(bonusAmount);
        await tx.user.update({
          where: { id: user.id },
          data: {
            balance: {
              increment: bonusDecimal,
            },
          },
        });
      }

      const history = await tx.reedemCodeHistory.create({
        data: {
          reedem_code_id: updatedCode.id,
          user_id: user.id,
          bonus: bonusAmount > 0 ? bonusAmount : 0,
          free_spins: freeSpins > 0 ? freeSpins : 0,
        },
        select: {
          id: true,
          reedem_code_id: true,
          user_id: true,
          collected_at: true,
        },
      });

      return history;
    });
  }

  async updateDocument(userId: number, dto: UpdateDocumentDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          document: true,
        },
      });

      if (!user) {
        throw new NotFoundException('user_not_found');
      }

      // Buscar configuração do sistema
      const settings = await tx.setting.findUnique({
        where: { id: 1 },
        select: {
          need_document: true,
        },
      });

      // Se need_document é true e o usuário já tem documento, não permite atualizar
      if (settings?.need_document && user.document) {
        throw new BadRequestException('document_already_registered');
      }

      // Verificar se o documento já está em uso por outro usuário
      const docExists = await tx.user.findFirst({
        where: {
          document: dto.document,
          id: {
            not: userId,
          },
        },
      });

      if (docExists) {
        throw new BadRequestException('document_in_use');
      }

      // Atualizar documento
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          document: dto.document,
        },
        select: {
          id: true,
          pid: true,
          phone: true,
          document: true,
        },
      });

      return {
        id: updatedUser.id,
        pid: updatedUser.pid,
        phone: updatedUser.phone,
        document: updatedUser.document,
        message: 'document_updated_successfully',
      };
    });
  }

  async getUserRolloverStatus(userId: number) {
    const requirements = await (this.prisma as any).rolloverRequirement.findMany(
      {
        where: {
          user_id: userId,
          status: 'ACTIVE',
        },
        orderBy: { created_at: 'asc' },
      },
    );

    if (requirements.length === 0) {
      return {
        has_rollover: false,
        total_required: 0,
        total_completed: 0,
        remaining: 0,
        requirements: [],
      };
    }

    let totalRequired = 0;
    let totalCompleted = 0;

    for (const req of requirements) {
      totalRequired += this.getDecimalNumber(req.amount_required);
      totalCompleted += this.getDecimalNumber(req.amount_completed);
    }

    return {
      has_rollover: true,
      total_required: totalRequired,
      total_completed: totalCompleted,
      remaining: Math.max(0, totalRequired - totalCompleted),
      requirements: requirements.map((req) => ({
        id: req.id,
        source_type: req.source_type,
        amount_required: this.getDecimalNumber(req.amount_required),
        amount_completed: this.getDecimalNumber(req.amount_completed),
        remaining: Math.max(
          0,
          this.getDecimalNumber(req.amount_required) -
            this.getDecimalNumber(req.amount_completed),
        ),
        created_at: req.created_at,
      })),
    };
  }
}
