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
        },
      });

      if (!settings) {
        throw new BadRequestException('settings_not_configured');
      }

      const minWithdrawal = this.getDecimalNumber(settings.min_withdrawal);
      const maxWithdrawal = this.getDecimalNumber(settings.max_withdrawal);

      if (amount < minWithdrawal) {
        throw new BadRequestException('amount_below_min_withdrawal');
      }
      if (amount > maxWithdrawal) {
        throw new BadRequestException('amount_above_max_withdrawal');
      }

      const lastDeposit = await tx.deposit.findFirst({
        where: {
          user_id: user.id,
          status: 'PAID',
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      if (!lastDeposit) {
        throw new BadRequestException('no_deposit_for_withdrawal');
      }

      const baseRolloverRequired = this.getDecimalNumber(lastDeposit.amount);

      const rawMultiplier = user.rollover_active
        ? this.getDecimalNumber(
            user.rollover_multiplier as unknown as Prisma.Decimal,
          )
        : 1;

      const effectiveMultiplier =
        rawMultiplier && rawMultiplier > 0 ? rawMultiplier : 1;

      const rolloverRequired = baseRolloverRequired * effectiveMultiplier;

      const rolloverAgg = await (tx as any).gameTransaction.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          user_id: user.id,
          action: 'bet',
          created_at: {
            gte: lastDeposit.created_at,
          },
        },
      });

      const rolloverVolume = rolloverAgg?._sum?.amount
        ? this.getDecimalNumber(rolloverAgg._sum.amount as Prisma.Decimal)
        : 0;

      if (rolloverVolume < rolloverRequired) {
        throw new BadRequestException('rollover_not_completed');
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
          user_document: dto.user_document,
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

    const histories =
      await this.prisma.affiliateHistory.findMany({
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
        row.cpa_level && row.cpa_level > 0
          ? row.cpa_level
          : row.revshare_level;
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
          typeof sum === 'number'
            ? sum
            : sum
              ? Number(sum.toString())
              : 0;
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
          typeof sum === 'number'
            ? sum
            : sum
              ? Number(sum.toString())
              : 0;
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

    const minDepositForCpa = this.getDecimalNumber(
      user.min_deposit_for_cpa as Prisma.Decimal,
    );

    const chestSummaries = chests.map((chest) => {
      const needReferral = chest.need_referral;
      const chestNeedDeposit = this.getDecimalNumber(
        chest.need_deposit as Prisma.Decimal,
      );
      const chestNeedBet = this.getDecimalNumber(
        chest.need_bet as Prisma.Decimal,
      );

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
          const value = this.getDecimalNumber(
            chest.need_deposit as Prisma.Decimal,
          );
          return Math.min(min, value);
        }, Number.POSITIVE_INFINITY)
      : 0;

    const minimalBetThreshold = chestSummaries.length
      ? chestSummaries.reduce((min, chest) => {
          const value = this.getDecimalNumber(
            chest.need_bet as Prisma.Decimal,
          );
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
          typeof sum === 'number'
            ? sum
            : sum
              ? Number(sum.toString())
              : 0;
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
          typeof sum === 'number'
            ? sum
            : sum
              ? Number(sum.toString())
              : 0;
        betMap.set(row.user_id, value);
      }

      const minDepositForCpa = this.getDecimalNumber(
        user.min_deposit_for_cpa as Prisma.Decimal,
      );
      const chestNeedDeposit = this.getDecimalNumber(
        chest.need_deposit as Prisma.Decimal,
      );
      const chestNeedBet = this.getDecimalNumber(
        chest.need_bet as Prisma.Decimal,
      );

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
          status: false,
        },
        select: {
          id: true,
          chest_id: true,
          amount: true,
          status: true,
          created_at: true,
        },
      });

      return withdrawal;
    });
  }
}
