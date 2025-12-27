import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameLaunchDto } from './dto/game-launch.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getUser(userId: number) {
    this.logger.log(`getUser: userId=${userId}`);
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
      this.logger.warn(`getUser: user_not_found id=${userId}`);
      throw new UnauthorizedException('user_not_found');
    }
    if (!user.status || user.banned) {
      this.logger.warn(
        `getUser: user_inactive id=${userId} status=${user.status} banned=${user.banned}`,
      );
      throw new UnauthorizedException('user_inactive');
    }
    this.logger.log(
      `getUser: ok id=${user.id} balance=${this.getDecimalNumber(user.balance)}`,
    );
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
    this.logger.log(`getGameForLaunch: identifier=${identifier}`);
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
      this.logger.warn(`getGameForLaunch: game_not_found identifier=${identifier}`);
      throw new NotFoundException('game_not_found');
    }
    if (!game.distribution) {
      this.logger.warn(
        `getGameForLaunch: game_without_distribution id=${game.id} code=${game.game_code}`,
      );
      throw new BadRequestException('game_without_distribution');
    }
    this.logger.log(
      `getGameForLaunch: ok id=${game.id} code=${game.game_code} distribution=${game.distribution}`,
    );
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
    this.logger.log(
      `launchGameForUser: userId=${userId} identifier=${dto.game_id}`,
    );
    const game = await this.getGameForLaunch(dto.game_id);

    if (game.distribution === 'poker-games') {
      this.logger.log(
        `launchGameForUser: routing to PokerGames userId=${userId} gameId=${game.id}`,
      );
      return this.launchPokerGame(userId, game, apiBaseUrl);
    }

    this.logger.warn(
      `launchGameForUser: unsupported_distribution distribution=${game.distribution} gameId=${game.id}`,
    );
    throw new BadRequestException('unsupported_distribution');
  }

  async handlePokerWebhook(body: any) {
    const action = body?.action;
    this.logger.log(
      `handlePokerWebhook: received action=${action} player_id=${body?.player_id} session_id=${body?.session_id}`,
    );
    if (!action || typeof action !== 'string') {
      this.logger.warn('handlePokerWebhook: invalid_action');
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
    this.logger.warn(`handlePokerWebhook: unsupported_action=${action}`);
    throw new BadRequestException('unsupported_action');
  }

  private getDecimalNumber(value: number | Prisma.Decimal) {
    return typeof value === 'number'
      ? value
      : Number((value as Prisma.Decimal).toString());
  }

  private async getUserByPlayerId(playerId: number) {
    this.logger.log(`getUserByPlayerId: player_id=${playerId}`);
    const user = await this.prisma.user.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        balance: true,
      },
    });
    if (!user) {
      this.logger.warn(`getUserByPlayerId: user_not_found player_id=${playerId}`);
      throw new NotFoundException('user_not_found');
    }
    this.logger.log(
      `getUserByPlayerId: ok userId=${user.id} balance=${this.getDecimalNumber(user.balance)}`,
    );
    return user;
  }

  private async handlePokerBalance(body: any) {
    const playerIdNumber = Number(body?.player_id);
    if (!Number.isFinite(playerIdNumber)) {
      this.logger.warn(
        `handlePokerBalance: invalid_player_id value=${body?.player_id}`,
      );
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
    this.logger.log(
      `handlePokerBalance: ok player_id=${playerIdNumber} userId=${user.id} balance=${balanceNumber}`,
    );
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
      this.logger.warn(
        `handlePokerBet: invalid_player_id value=${body?.player_id}`,
      );
      throw new BadRequestException('invalid_player_id');
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      this.logger.warn(
        `handlePokerBet: invalid_amount player_id=${playerIdNumber} amount=${body?.amount}`,
      );
      throw new BadRequestException('invalid_amount');
    }
    if (!providerTransactionId) {
      this.logger.warn(
        `handlePokerBet: invalid_transaction_id player_id=${playerIdNumber}`,
      );
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
        this.logger.warn(
          `handlePokerBet: user_not_found player_id=${playerIdNumber}`,
        );
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
        this.logger.log(
          `handlePokerBet: duplicate provider_tx=${providerTransactionId} internal_tx=${existing.internal_transaction_id} player_id=${playerIdNumber}`,
        );
        return {
          balance: currentBalance,
          transactionId: existing.internal_transaction_id,
        };
      }

      if (currentBalance < amountNumber) {
        this.logger.warn(
          `handlePokerBet: insufficient_balance player_id=${playerIdNumber} balance=${currentBalance} amount=${amountNumber}`,
        );
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

    this.logger.log(
      `handlePokerBet: ok player_id=${playerIdNumber} amount=${amountNumber} balance=${result.balance} internal_tx=${result.transactionId}`,
    );
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
      this.logger.warn(
        `handlePokerWin: invalid_player_id value=${body?.player_id}`,
      );
      throw new BadRequestException('invalid_player_id');
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      this.logger.warn(
        `handlePokerWin: invalid_amount player_id=${playerIdNumber} amount=${body?.amount}`,
      );
      throw new BadRequestException('invalid_amount');
    }
    if (!providerTransactionId) {
      this.logger.warn(
        `handlePokerWin: invalid_transaction_id player_id=${playerIdNumber}`,
      );
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
        this.logger.warn(
          `handlePokerWin: user_not_found player_id=${playerIdNumber}`,
        );
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
        this.logger.log(
          `handlePokerWin: duplicate provider_tx=${providerTransactionId} internal_tx=${existing.internal_transaction_id} player_id=${playerIdNumber}`,
        );
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

    this.logger.log(
      `handlePokerWin: ok player_id=${playerIdNumber} amount=${amountNumber} balance=${result.balance} internal_tx=${result.transactionId}`,
    );
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
      this.logger.warn(
        `handlePokerRefund: invalid_player_id value=${body?.player_id}`,
      );
      throw new BadRequestException('invalid_player_id');
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      this.logger.warn(
        `handlePokerRefund: invalid_amount player_id=${playerIdNumber} amount=${body?.amount}`,
      );
      throw new BadRequestException('invalid_amount');
    }
    if (!providerTransactionId) {
      this.logger.warn(
        `handlePokerRefund: invalid_transaction_id player_id=${playerIdNumber}`,
      );
      throw new BadRequestException('invalid_transaction_id');
    }
    if (!betProviderTransactionId) {
      this.logger.warn(
        `handlePokerRefund: invalid_bet_transaction_id player_id=${playerIdNumber}`,
      );
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
        this.logger.warn(
          `handlePokerRefund: user_not_found player_id=${playerIdNumber}`,
        );
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
        this.logger.log(
          `handlePokerRefund: duplicate provider_tx=${providerTransactionId} internal_tx=${existing.internal_transaction_id} player_id=${playerIdNumber}`,
        );
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

    this.logger.log(
      `handlePokerRefund: ok player_id=${playerIdNumber} amount=${amountNumber} balance=${result.balance} internal_tx=${result.transactionId}`,
    );
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
      this.logger.warn(
        `handlePokerRollback: invalid_player_id value=${body?.player_id}`,
      );
      throw new BadRequestException('invalid_player_id');
    }
    if (!providerTransactionId) {
      this.logger.warn(
        `handlePokerRollback: invalid_transaction_id player_id=${playerIdNumber}`,
      );
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
        this.logger.warn(
          `handlePokerRollback: user_not_found player_id=${playerIdNumber}`,
        );
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
        this.logger.log(
          `handlePokerRollback: duplicate provider_tx=${providerTransactionId} internal_tx=${existing.internal_transaction_id} player_id=${playerIdNumber}`,
        );
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

    this.logger.log(
      `handlePokerRollback: ok player_id=${playerIdNumber} balance=${result.balance} internal_tx=${result.transactionId} rollback_count=${rollbackIds.length}`,
    );
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
    this.logger.log(
      `launchPokerGame: userId=${userId} gameId=${game.id} code=${game.game_code}`,
    );
    const config = await this.prisma.pokerProvider.findFirst({
      where: { active: true },
    });
    if (!config) {
      this.logger.error('launchPokerGame: poker_provider_not_configured');
      throw new NotFoundException('poker_provider_not_configured');
    }

    const user = await this.getUser(userId);

    const baseUrl = (apiBaseUrl ?? config.base_url).replace(/\/+$/, '');

    const credentials = `${config.agent_token}:${config.agent_secret}`;
    const encodedCredentials = Buffer.from(credentials, 'utf8').toString('base64');
    const authUrl = `${baseUrl}/auth/authentication`;

    this.logger.log(`launchPokerGame: calling auth url=${authUrl}`);
    const authResponse = await fetch(authUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${encodedCredentials}`,
      },
    });

    if (!authResponse.ok) {
      this.logger.error(
        `launchPokerGame: poker_auth_failed status=${authResponse.status}`,
      );
      throw new BadRequestException('poker_auth_failed');
    }

    const authData = (await authResponse.json()) as {
      access_token?: string;
    };

    if (!authData.access_token) {
      this.logger.error('launchPokerGame: poker_auth_invalid_response');
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
      agent_code: config.agent_code,
      game_id: providerGameId,
      type: 'CHARGED',
      currency: 'BRL',
      lang: 'pt',
      user_id: String(user.id),
    });
    this.logger.log(
      `launchPokerGame: calling game_launch url=${url} providerGameId=${providerGameId} userId=${user.id} params=${searchParams.toString()}`,
    );

    const launchResponse = await fetch(`${url}?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!launchResponse.ok) {
      this.logger.error(
        `launchPokerGame: poker_launch_failed status=${launchResponse.status}`,
      );
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
