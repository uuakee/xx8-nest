import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameLaunchDto } from './dto/game-launch.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService) {}

  private async getUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        pid: true,
        balance: true,
        status: true,
        banned: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('user_not_found');
    }
    if (!user.status || user.banned) {
      throw new UnauthorizedException('user_inactive');
    }
    return user;
  }

  private async getGameForLaunch(
    identifier: string,
  ): Promise<{
    id: number;
    name: string;
    game_code: string;
    game_id: string | null;
    distribution: string;
    is_active: boolean;
  }> {
    const game = await this.prisma.game.findFirst({
      where: {
        is_active: true,
        OR: [
          { game_id: identifier },
          { game_code: identifier },
        ],
      },
      select: {
        id: true,
        name: true,
        game_code: true,
        game_id: true,
        distribution: true,
        is_active: true,
      },
    });
    if (!game) {
      throw new NotFoundException('game_not_found');
    }
    if (!game.distribution) {
      throw new BadRequestException('game_without_distribution');
    }
    return game as {
      id: number;
      name: string;
      game_code: string;
      game_id: string | null;
      distribution: string;
      is_active: boolean;
    };
  }

  async launchGameForUser(
    userId: number,
    dto: GameLaunchDto,
    apiBaseUrl: string | undefined,
  ) {
    const game = await this.getGameForLaunch(dto.game_id);

    if (game.distribution === 'poker-games') {
      return this.launchPokerGame(userId, game, apiBaseUrl);
    }

    throw new BadRequestException('unsupported_distribution');
  }

  async handlePokerWebhook(body: any) {
    const action = body?.action;
    if (!action || typeof action !== 'string') {
      throw new BadRequestException('invalid_action');
    }
    if (action === 'balance') {
      return this.handlePokerBalance(body);
    }
    if (action === 'bet') {
      return this.handlePokerBet(body);
    }
    if (action === 'win') {
      return this.handlePokerWin(body);
    }
    if (action === 'refund') {
      return this.handlePokerRefund(body);
    }
    if (action === 'rollback') {
      return this.handlePokerRollback(body);
    }
    throw new BadRequestException('unsupported_action');
  }

  private getDecimalNumber(value: number | Prisma.Decimal) {
    return typeof value === 'number'
      ? value
      : Number((value as Prisma.Decimal).toString());
  }

  private async getUserByPlayerId(playerId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        balance: true,
      },
    });
    if (!user) {
      throw new NotFoundException('user_not_found');
    }
    return user;
  }

  private async handlePokerBalance(body: any) {
    const playerIdNumber = Number(body?.player_id);
    if (!Number.isFinite(playerIdNumber)) {
      throw new BadRequestException('invalid_player_id');
    }
    const user = await this.getUserByPlayerId(playerIdNumber);
    const balanceNumber = this.getDecimalNumber(user.balance);
    await (this.prisma as any).gameTransaction.create({
      data: {
        user_id: user.id,
        action: 'balance',
        provider: 'poker-games',
        player_id: playerIdNumber,
        session_id: body?.session_id ?? null,
        provider_transaction_id: null,
        game_uuid: null,
        round_id: null,
        amount: null,
        currency: body?.currency ?? 'BRL',
        raw_request: body,
      },
    });
    return {
      balance: balanceNumber,
    };
  }

  private async handlePokerBet(body: any) {
    const playerIdNumber = Number(body?.player_id);
    const amountNumber = Number(body?.amount);
    const providerTransactionId =
      typeof body?.transaction_id === 'string'
        ? body.transaction_id
        : String(body?.transaction_id ?? '');
    if (!Number.isFinite(playerIdNumber)) {
      throw new BadRequestException('invalid_player_id');
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      throw new BadRequestException('invalid_amount');
    }
    if (!providerTransactionId) {
      throw new BadRequestException('invalid_transaction_id');
    }
    const currency = body?.currency ?? 'BRL';
    const sessionId = body?.session_id ?? null;
    const gameUuid = body?.game_uuid ?? null;
    const roundId = body?.round_id ?? null;

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: playerIdNumber },
        select: {
          id: true,
          balance: true,
        },
      });
      if (!user) {
        throw new NotFoundException('user_not_found');
      }

      const existing = await (tx as any).gameTransaction.findFirst({
        where: {
          provider: 'poker-games',
          action: 'bet',
          provider_transaction_id: providerTransactionId,
        },
      });
      const currentBalance = this.getDecimalNumber(user.balance);

      if (existing && existing.internal_transaction_id) {
        return {
          balance: currentBalance,
          transactionId: existing.internal_transaction_id,
        };
      }

      if (currentBalance < amountNumber) {
        throw new BadRequestException('insufficient_balance');
      }

      const amountDecimal = new Prisma.Decimal(amountNumber);

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { decrement: amountDecimal },
        },
        select: { balance: true },
      });

      const created = await (tx as any).gameTransaction.create({
        data: {
          user_id: user.id,
          action: 'bet',
          provider: 'poker-games',
          player_id: playerIdNumber,
          session_id: sessionId,
          provider_transaction_id: providerTransactionId,
          game_uuid: gameUuid,
          round_id: roundId,
          amount: amountDecimal,
          currency,
          raw_request: body,
        },
      });

      const internalId = `PG-BET-${created.id}`;

      await (tx as any).gameTransaction.update({
        where: { id: created.id },
        data: { internal_transaction_id: internalId },
      });

      const newBalanceNumber = this.getDecimalNumber(updatedUser.balance);

      return {
        balance: newBalanceNumber,
        transactionId: internalId,
      };
    });

    return {
      balance: result.balance,
      transaction_id: result.transactionId,
    };
  }

  private async handlePokerWin(body: any) {
    const playerIdNumber = Number(body?.player_id);
    const amountNumber = Number(body?.amount);
    const providerTransactionId =
      typeof body?.transaction_id === 'string'
        ? body.transaction_id
        : String(body?.transaction_id ?? '');
    if (!Number.isFinite(playerIdNumber)) {
      throw new BadRequestException('invalid_player_id');
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      throw new BadRequestException('invalid_amount');
    }
    if (!providerTransactionId) {
      throw new BadRequestException('invalid_transaction_id');
    }
    const currency = body?.currency ?? 'BRL';
    const sessionId = body?.session_id ?? null;
    const gameUuid = body?.game_uuid ?? null;
    const roundId = body?.round_id ?? null;

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: playerIdNumber },
        select: {
          id: true,
          balance: true,
        },
      });
      if (!user) {
        throw new NotFoundException('user_not_found');
      }

      const existing = await (tx as any).gameTransaction.findFirst({
        where: {
          provider: 'poker-games',
          action: 'win',
          provider_transaction_id: providerTransactionId,
        },
      });
      const currentBalance = this.getDecimalNumber(user.balance);

      if (existing && existing.internal_transaction_id) {
        return {
          balance: currentBalance,
          transactionId: existing.internal_transaction_id,
        };
      }

      const amountDecimal = new Prisma.Decimal(amountNumber);

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: amountDecimal },
        },
        select: { balance: true },
      });

      const created = await (tx as any).gameTransaction.create({
        data: {
          user_id: user.id,
          action: 'win',
          provider: 'poker-games',
          player_id: playerIdNumber,
          session_id: sessionId,
          provider_transaction_id: providerTransactionId,
          game_uuid: gameUuid,
          round_id: roundId,
          amount: amountDecimal,
          currency,
          raw_request: body,
        },
      });

      const internalId = `PG-WIN-${created.id}`;

      await (tx as any).gameTransaction.update({
        where: { id: created.id },
        data: { internal_transaction_id: internalId },
      });

      const newBalanceNumber = this.getDecimalNumber(updatedUser.balance);

      return {
        balance: newBalanceNumber,
        transactionId: internalId,
      };
    });

    return {
      balance: result.balance,
      transaction_id: result.transactionId,
    };
  }

  private async handlePokerRefund(body: any) {
    const playerIdNumber = Number(body?.player_id);
    const amountNumber = Number(body?.amount);
    const providerTransactionId =
      typeof body?.transaction_id === 'string'
        ? body.transaction_id
        : String(body?.transaction_id ?? '');
    const betProviderTransactionId =
      typeof body?.bet_transaction_id === 'string'
        ? body.bet_transaction_id
        : String(body?.bet_transaction_id ?? '');

    if (!Number.isFinite(playerIdNumber)) {
      throw new BadRequestException('invalid_player_id');
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      throw new BadRequestException('invalid_amount');
    }
    if (!providerTransactionId) {
      throw new BadRequestException('invalid_transaction_id');
    }
    if (!betProviderTransactionId) {
      throw new BadRequestException('invalid_bet_transaction_id');
    }

    const currency = body?.currency ?? 'BRL';
    const sessionId = body?.session_id ?? null;
    const gameUuid = body?.game_uuid ?? null;
    const roundId = body?.round_id ?? null;

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: playerIdNumber },
        select: {
          id: true,
          balance: true,
        },
      });
      if (!user) {
        throw new NotFoundException('user_not_found');
      }

      const existing = await (tx as any).gameTransaction.findFirst({
        where: {
          provider: 'poker-games',
          action: 'refund',
          provider_transaction_id: providerTransactionId,
        },
      });
      const currentBalance = this.getDecimalNumber(user.balance);

      if (existing && existing.internal_transaction_id) {
        return {
          balance: currentBalance,
          transactionId: existing.internal_transaction_id,
        };
      }

      const betTx = await (tx as any).gameTransaction.findFirst({
        where: {
          provider: 'poker-games',
          action: 'bet',
          provider_transaction_id: betProviderTransactionId,
        },
      });

      const amountToRefund =
        betTx && betTx.amount
          ? this.getDecimalNumber(betTx.amount)
          : amountNumber;

      const amountDecimal = new Prisma.Decimal(amountToRefund);

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: amountDecimal },
        },
        select: { balance: true },
      });

      const created = await (tx as any).gameTransaction.create({
        data: {
          user_id: user.id,
          action: 'refund',
          provider: 'poker-games',
          player_id: playerIdNumber,
          session_id: sessionId,
          provider_transaction_id: providerTransactionId,
          game_uuid: gameUuid,
          round_id: roundId,
          amount: amountDecimal,
          currency,
          raw_request: body,
        },
      });

      const internalId = `PG-REFUND-${created.id}`;

      await (tx as any).gameTransaction.update({
        where: { id: created.id },
        data: { internal_transaction_id: internalId },
      });

      const newBalanceNumber = this.getDecimalNumber(updatedUser.balance);

      return {
        balance: newBalanceNumber,
        transactionId: internalId,
      };
    });

    return {
      balance: result.balance,
      transaction_id: result.transactionId,
    };
  }

  private async handlePokerRollback(body: any) {
    const playerIdNumber = Number(body?.player_id);
    const providerTransactionId =
      typeof body?.transaction_id === 'string'
        ? body.transaction_id
        : String(body?.transaction_id ?? '');
    if (!Number.isFinite(playerIdNumber)) {
      throw new BadRequestException('invalid_player_id');
    }
    if (!providerTransactionId) {
      throw new BadRequestException('invalid_transaction_id');
    }

    const rollbackItems = Array.isArray(body?.rollback_transactions)
      ? body.rollback_transactions
      : [];

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: playerIdNumber },
        select: {
          id: true,
          balance: true,
        },
      });
      if (!user) {
        throw new NotFoundException('user_not_found');
      }

      const existing = await (tx as any).gameTransaction.findFirst({
        where: {
          provider: 'poker-games',
          action: 'rollback',
          provider_transaction_id: providerTransactionId,
        },
      });
      const currentBalance = this.getDecimalNumber(user.balance);

      if (existing && existing.internal_transaction_id) {
        return {
          balance: currentBalance,
          transactionId: existing.internal_transaction_id,
        };
      }

      let totalDelta = 0;

      for (const item of rollbackItems) {
        const itemTransactionId =
          typeof item?.transaction_id === 'string'
            ? item.transaction_id
            : String(item?.transaction_id ?? '');
        const itemAction =
          typeof item?.action === 'string' ? item.action : '';

        if (!itemTransactionId || !itemAction) {
          continue;
        }

        const txRecord = await (tx as any).gameTransaction.findFirst({
          where: {
            provider: 'poker-games',
            provider_transaction_id: itemTransactionId,
            action: itemAction,
          },
        });

        if (!txRecord || !txRecord.amount) {
          continue;
        }

        const amountValue = this.getDecimalNumber(txRecord.amount);

        if (txRecord.action === 'bet') {
          totalDelta += amountValue;
        } else if (txRecord.action === 'win') {
          totalDelta -= amountValue;
        }
      }

      const amountDecimal = new Prisma.Decimal(totalDelta);

      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: amountDecimal },
        },
        select: { balance: true },
      });

      const created = await (tx as any).gameTransaction.create({
        data: {
          user_id: user.id,
          action: 'rollback',
          provider: 'poker-games',
          player_id: playerIdNumber,
          session_id: body?.session_id ?? null,
          provider_transaction_id: providerTransactionId,
          game_uuid: null,
          round_id: null,
          amount: amountDecimal,
          currency: body?.currency ?? 'BRL',
          raw_request: body,
        },
      });

      const internalId = `PG-ROLLBACK-${created.id}`;

      await (tx as any).gameTransaction.update({
        where: { id: created.id },
        data: { internal_transaction_id: internalId },
      });

      const newBalanceNumber = this.getDecimalNumber(updatedUser.balance);

      return {
        balance: newBalanceNumber,
        transactionId: internalId,
      };
    });

    const rollbackIds = Array.isArray(body?.rollback_transactions)
      ? body.rollback_transactions.map((item: any) => item.transaction_id)
      : [];

    return {
      balance: result.balance,
      transaction_id: result.transactionId,
      rollback_transactions: rollbackIds,
    };
  }

  private async launchPokerGame(
    userId: number,
    game: {
      id: number;
      name: string;
      game_code: string;
      game_id: string | null;
      distribution: string;
    },
    apiBaseUrl: string | undefined,
  ) {
    const config = await this.prisma.pokerProvider.findFirst({
      where: { active: true },
    });
    if (!config) {
      throw new NotFoundException('poker_provider_not_configured');
    }

    const user = await this.getUser(userId);

    const baseUrl = (apiBaseUrl ?? config.base_url).replace(/\/+$/, '');

    const credentials = `${config.agent_token}:${config.agent_secret}`;
    const encodedCredentials = Buffer.from(credentials, 'utf8').toString('base64');
    const authUrl = `${baseUrl}/auth/authentication`;

    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${encodedCredentials}`,
      },
    });

    if (!authResponse.ok) {
      throw new BadRequestException('poker_auth_failed');
    }

    const authData = (await authResponse.json()) as {
      access_token?: string;
    };

    if (!authData.access_token) {
      throw new BadRequestException('poker_auth_invalid_response');
    }

    const accessToken = authData.access_token;
    const providerGameId = game.game_id ?? game.game_code;

    const userBalance =
      typeof user.balance === 'number'
        ? user.balance
        : Number((user.balance as unknown as Prisma.Decimal).toString());

    const url = `${baseUrl}/games/game_launch`;
    const searchParams = new URLSearchParams({
      agent_token: config.agent_token,
      agent_code: config.agent_code,
      user_id: String(user.id),
      provider_code: 'PGSOFT',
      game_id: providerGameId,
      user_balance: userBalance.toString(),
      currency: 'BRL',
      lang: 'pt',
      type: 'SLOT',
    });

    const launchResponse = await fetch(`${url}?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!launchResponse.ok) {
      throw new BadRequestException('poker_launch_failed');
    }

    const launchData = (await launchResponse.json()) as {
      game_url?: string;
      session_id?: string;
    };

    if (!launchData.game_url) {
      throw new BadRequestException('poker_launch_invalid_response');
    }

    return {
      provider: 'poker-games',
      game_id: game.id,
      game_code: game.game_code,
      game_url: launchData.game_url,
      session_id: launchData.session_id ?? null,
    };
  }
}
