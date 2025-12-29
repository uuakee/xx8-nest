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

  private async getGameForLaunch(identifier: string): Promise<{
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
        OR: [{ game_id: identifier }, { game_code: identifier }],
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
      this.logger.warn(
        `getGameForLaunch: game_not_found identifier=${identifier}`,
      );
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

    if (game.distribution === 'pp-clone') {
      this.logger.log(
        `launchGameForUser: routing to PpClone userId=${userId} gameId=${game.id}`,
      );
      return this.launchPpCloneGame(userId, game, apiBaseUrl);
    }

    if (game.distribution === 'pg-clone') {
      this.logger.log(
        `launchGameForUser: routing to PgClone userId=${userId} gameId=${game.id}`,
      );
      return this.launchPgCloneGame(userId, game, apiBaseUrl);
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
      return this.pokerError('INVALID_ACTION', 'Unsupported or missing action');
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
    return this.pokerError('INVALID_ACTION', 'Unsupported action');
  }

  async handleCloneWebhook(body: any) {
    const method = body?.method;
    const agentCode = body?.agent_code;
    const agentSecret = body?.agent_secret ?? body?.agent_token;
    const hasSecret =
      typeof agentSecret === 'string' && agentSecret.trim().length > 0;

    const hasAgentSecretField =
      typeof body?.agent_secret === 'string' &&
      body.agent_secret.trim().length > 0;
    const hasAgentTokenField =
      typeof body?.agent_token === 'string' &&
      body.agent_token.trim().length > 0;

    const safeBody: any = { ...body };
    if (safeBody.agent_secret) {
      safeBody.agent_secret = '***';
    }
    if (safeBody.agent_token) {
      safeBody.agent_token = '***';
    }

    this.logger.log(
      `handleCloneWebhook: received method=${method} agent_code=${agentCode} user_code=${body?.user_code} has_agent_secret_field=${hasAgentSecretField} has_agent_token_field=${hasAgentTokenField} body=${JSON.stringify(
        safeBody,
      )}`,
    );

    if (!agentCode || typeof agentCode !== 'string') {
      return { status: 0, message: 'invalid_agent' };
    }

    const [ppConfig, pgConfig] = await this.prisma.$transaction([
      this.prisma.pPCloneProvider.findFirst({ where: { active: true } }),
      this.prisma.pGCloneProvider.findFirst({ where: { active: true } }),
    ]);

    let provider: 'pp-clone' | 'pg-clone' | null = null;

    if (ppConfig && ppConfig.agent_code === agentCode) {
      provider = 'pp-clone';
    } else if (
      pgConfig &&
      pgConfig.agent_code === agentCode &&
      (!hasSecret || pgConfig.agent_secret === agentSecret)
    ) {
      provider = 'pg-clone';
    }

    if (!provider) {
      this.logger.warn(
        `handleCloneWebhook: unknown_agent agent_code=${agentCode}`,
      );
      return { status: 0, message: 'unknown_agent' };
    }

    if (!method || typeof method !== 'string') {
      return { status: 0, message: 'invalid_method' };
    }

    if (method === 'user_balance') {
      return this.handleCloneUserBalance(body);
    }

    if (provider === 'pp-clone') {
      if (method === 'transaction') {
        return this.handleCloneTransaction(body, provider);
      }
      this.logger.warn(
        `handleCloneWebhook: unsupported_method_pp_clone=${method}`,
      );
      return { status: 0, message: 'unsupported_method' };
    }

    if (provider === 'pg-clone') {
      if (method === 'money_callback' || method === 'transaction') {
        return this.handleCloneTransaction(body, provider);
      }
      if (method === 'game_callback') {
        return { status: 1 };
      }
      this.logger.warn(
        `handleCloneWebhook: unsupported_method_pg_clone=${method}`,
      );
      return { status: 0, message: 'unsupported_method' };
    }

    this.logger.warn(
      `handleCloneWebhook: unsupported_provider provider=${provider} method=${method}`,
    );
    return { status: 0, message: 'unsupported_provider' };
  }

  private getDecimalNumber(value: number | Prisma.Decimal) {
    return typeof value === 'number' ? value : Number(value.toString());
  }

  private pokerError(code: string, description: string) {
    return {
      error_code: code,
      error_description: description,
    };
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
      this.logger.warn(
        `getUserByPlayerId: user_not_found player_id=${playerId}`,
      );
      throw new NotFoundException('user_not_found');
    }
    this.logger.log(
      `getUserByPlayerId: ok userId=${user.id} balance=${this.getDecimalNumber(user.balance)}`,
    );
    return user;
  }

  private async handleCloneUserBalance(body: any) {
    const userCode = body?.user_code;

    const userId = Number(userCode);
    if (!Number.isFinite(userId) || userId <= 0) {
      this.logger.warn(
        `handleCloneUserBalance: invalid_user_code user_code=${userCode}`,
      );
      return { status: 0, user_balance: 0 };
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          balance: true,
          affiliate_balance: true,
          vip_balance: true,
        },
      });

      if (!user) {
        this.logger.warn(
          `handleCloneUserBalance: user_not_found user_code=${userCode}`,
        );
        return { status: 0, user_balance: 0 };
      }

      const mainBalance = this.getDecimalNumber(user.balance);
      const affiliateBalance = this.getDecimalNumber(
        user.affiliate_balance ?? 0,
      );
      const vipBalance = this.getDecimalNumber(user.vip_balance ?? 0);
      const totalBalance = mainBalance + affiliateBalance + vipBalance;

      if (totalBalance <= 0) {
        this.logger.log(
          `handleCloneUserBalance: insufficient_funds userId=${user.id} totalBalance=${totalBalance}`,
        );
        return {
          status: 0,
          user_balance: 0,
          msg: 'INSUFFICIENT_USER_FUNDS',
        };
      }

      this.logger.log(
        `handleCloneUserBalance: ok userId=${user.id} balance=${totalBalance}`,
      );

      return {
        status: 1,
        user_balance: totalBalance,
      };
    } catch (err) {
      this.logger.error(
        `handleCloneUserBalance: internal_error user_code=${userCode} err=${(err as Error).message}`,
      );
      return { status: 0, user_balance: 0 };
    }
  }

  private async handleCloneTransaction(
    body: any,
    provider: 'pp-clone' | 'pg-clone',
  ) {
    const userCode = body?.user_code;
    const userId = Number(userCode);

    if (!Number.isFinite(userId) || userId <= 0) {
      this.logger.warn(
        `handleCloneTransaction: invalid_user_code user_code=${userCode}`,
      );
      return { status: 0, user_balance: 0 };
    }

    const gameType = body?.game_type;
    const section =
      gameType === 'live' ? body?.live ?? {} : body?.slot ?? {};

    const txnIdRaw = section?.txn_id;
    const gameCodeRaw = section?.game_code;
    const betMoneyRaw = section?.bet_money;
    const winMoneyRaw = section?.win_money;

    const txnId =
      typeof txnIdRaw === 'string' && txnIdRaw
        ? txnIdRaw
        : String(txnIdRaw ?? '');
    const gameCode =
      typeof gameCodeRaw === 'string' && gameCodeRaw
        ? gameCodeRaw
        : String(gameCodeRaw ?? '');

    const betMoney =
      typeof betMoneyRaw === 'number'
        ? betMoneyRaw
        : Number(betMoneyRaw ?? 0) || 0;
    const winMoney =
      typeof winMoneyRaw === 'number'
        ? winMoneyRaw
        : Number(winMoneyRaw ?? 0) || 0;

    if (!txnId) {
      this.logger.warn('handleCloneTransaction: missing_txn_id');
      return { status: 0, user_balance: 0 };
    }

    let finalBalance = 0;

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          balance: true,
        },
      });

      if (!user) {
        this.logger.warn(
          `handleCloneTransaction: user_not_found user_code=${userCode}`,
        );
        throw new Error('user_not_found');
      }

      const betTxId = `${txnId}-BET`;
      const winTxId = `${txnId}-WIN`;

      if (betMoney > 0) {
        const existingBet = await (tx as any).gameTransaction.findFirst({
          where: {
            provider,
            action: 'bet',
            provider_transaction_id: betTxId,
          },
        });

        if (!existingBet) {
          const betDecimal = new Prisma.Decimal(betMoney);
          await tx.user.update({
            where: { id: user.id },
            data: {
              balance: {
                decrement: betDecimal,
              },
            },
          });

          await (tx as any).gameTransaction.create({
            data: {
              user_id: user.id,
              action: 'bet',
              provider,
              provider_transaction_id: betTxId,
              game_uuid: gameCode || null,
              amount: betDecimal,
              currency: 'BRL',
              raw_request: body,
            },
          });
        }
      }

      if (winMoney > 0) {
        const existingWin = await (tx as any).gameTransaction.findFirst({
          where: {
            provider,
            action: 'win',
            provider_transaction_id: winTxId,
          },
        });

        if (!existingWin) {
          const winDecimal = new Prisma.Decimal(winMoney);
          await tx.user.update({
            where: { id: user.id },
            data: {
              balance: {
                increment: winDecimal,
              },
            },
          });

          await (tx as any).gameTransaction.create({
            data: {
              user_id: user.id,
              action: 'win',
              provider,
              provider_transaction_id: winTxId,
              game_uuid: gameCode || null,
              amount: winDecimal,
              currency: 'BRL',
              raw_request: body,
            },
          });
        }
      }

      const updated = await tx.user.findUnique({
        where: { id: user.id },
        select: {
          balance: true,
        },
      });

      finalBalance = updated
        ? this.getDecimalNumber(updated.balance)
        : this.getDecimalNumber(user.balance);
    });

    this.logger.log(
      `handleCloneTransaction: ok userId=${userId} provider=${provider} txn_id=${txnId} bet=${betMoney} win=${winMoney} balance=${finalBalance}`,
    );

    return {
      status: 1,
      user_balance: finalBalance,
    };
  }

  private async handlePokerBalance(body: any) {
    const playerIdNumber = Number(body?.player_id);
    if (!Number.isFinite(playerIdNumber)) {
      this.logger.warn(
        `handlePokerBalance: invalid_player_id value=${body?.player_id}`,
      );
      return this.pokerError('INVALID_PLAYER', 'Invalid player id');
    }
    this.logger.log(`getUserByPlayerId: player_id=${playerIdNumber}`);
    const user = await this.prisma.user.findUnique({
      where: { id: playerIdNumber },
      select: {
        id: true,
        balance: true,
      },
    });
    if (!user) {
      this.logger.warn(
        `getUserByPlayerId: user_not_found player_id=${playerIdNumber}`,
      );
      return this.pokerError('INVALID_PLAYER', 'Player not found');
    }
    this.logger.log(
      `getUserByPlayerId: ok userId=${user.id} balance=${this.getDecimalNumber(user.balance)}`,
    );
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
      return this.pokerError('INVALID_PLAYER', 'Invalid player id');
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      this.logger.warn(
        `handlePokerBet: invalid_amount player_id=${playerIdNumber} amount=${body?.amount}`,
      );
      return this.pokerError('INVALID_TRANSACTION', 'Invalid bet amount');
    }
    if (!providerTransactionId) {
      this.logger.warn(
        `handlePokerBet: invalid_transaction_id player_id=${playerIdNumber}`,
      );
      return this.pokerError('INVALID_TRANSACTION', 'Invalid transaction id');
    }
    const currency = body?.currency ?? 'BRL';
    const sessionId = body?.session_id ?? null;
    const gameUuid = body?.game_uuid ?? null;
    const roundId = body?.round_id ?? null;

    let errorCode: string | null = null;
    let errorDescription: string | null = null;

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
        errorCode = 'INVALID_PLAYER';
        errorDescription = 'Player not found';
        return null;
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
        errorCode = 'INSUFFICIENT_FUNDS';
        errorDescription = 'Not enough money to continue playing';
        return null;
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

    if (errorCode) {
      return this.pokerError(
        errorCode,
        errorDescription ?? 'Internal server error',
      );
    }

    if (!result) {
      this.logger.error('handlePokerBet: internal_error_null_result');
      return this.pokerError('INTERNAL_ERROR', 'Internal server error');
    }

    await this.checkAndApplyVipUpgrade(playerIdNumber);

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
      return this.pokerError('INVALID_PLAYER', 'Invalid player id');
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      this.logger.warn(
        `handlePokerWin: invalid_amount player_id=${playerIdNumber} amount=${body?.amount}`,
      );
      return this.pokerError('INVALID_TRANSACTION', 'Invalid win amount');
    }
    if (!providerTransactionId) {
      this.logger.warn(
        `handlePokerWin: invalid_transaction_id player_id=${playerIdNumber}`,
      );
      return this.pokerError('INVALID_TRANSACTION', 'Invalid transaction id');
    }
    const currency = body?.currency ?? 'BRL';
    const sessionId = body?.session_id ?? null;
    const gameUuid = body?.game_uuid ?? null;
    const roundId = body?.round_id ?? null;

    let errorCode: string | null = null;
    let errorDescription: string | null = null;

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
        errorCode = 'INVALID_PLAYER';
        errorDescription = 'Player not found';
        return null;
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

    if (errorCode) {
      return this.pokerError(
        errorCode,
        errorDescription ?? 'Internal server error',
      );
    }

    if (!result) {
      this.logger.error('handlePokerWin: internal_error_null_result');
      return this.pokerError('INTERNAL_ERROR', 'Internal server error');
    }

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
      return this.pokerError('INVALID_PLAYER', 'Invalid player id');
    }
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      this.logger.warn(
        `handlePokerRefund: invalid_amount player_id=${playerIdNumber} amount=${body?.amount}`,
      );
      return this.pokerError('INVALID_TRANSACTION', 'Invalid refund amount');
    }
    if (!providerTransactionId) {
      this.logger.warn(
        `handlePokerRefund: invalid_transaction_id player_id=${playerIdNumber}`,
      );
      return this.pokerError('INVALID_TRANSACTION', 'Invalid transaction id');
    }
    if (!betProviderTransactionId) {
      this.logger.warn(
        `handlePokerRefund: invalid_bet_transaction_id player_id=${playerIdNumber}`,
      );
      return this.pokerError(
        'INVALID_TRANSACTION',
        'Invalid bet transaction id',
      );
    }

    const currency = body?.currency ?? 'BRL';
    const sessionId = body?.session_id ?? null;
    const gameUuid = body?.game_uuid ?? null;
    const roundId = body?.round_id ?? null;

    let errorCode: string | null = null;
    let errorDescription: string | null = null;

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
        errorCode = 'INVALID_PLAYER';
        errorDescription = 'Player not found';
        return null;
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

    if (errorCode) {
      return this.pokerError(
        errorCode,
        errorDescription ?? 'Internal server error',
      );
    }

    if (!result) {
      this.logger.error('handlePokerRefund: internal_error_null_result');
      return this.pokerError('INTERNAL_ERROR', 'Internal server error');
    }

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
      return this.pokerError('INVALID_PLAYER', 'Invalid player id');
    }
    if (!providerTransactionId) {
      this.logger.warn(
        `handlePokerRollback: invalid_transaction_id player_id=${playerIdNumber}`,
      );
      return this.pokerError('INVALID_TRANSACTION', 'Invalid transaction id');
    }

    const rollbackItems = Array.isArray(body?.rollback_transactions)
      ? body.rollback_transactions
      : [];

    let errorCode: string | null = null;
    let errorDescription: string | null = null;

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
        errorCode = 'INVALID_PLAYER';
        errorDescription = 'Player not found';
        return null;
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
        const itemAction = typeof item?.action === 'string' ? item.action : '';

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

    if (errorCode) {
      return this.pokerError(
        errorCode,
        errorDescription ?? 'Internal server error',
      );
    }

    if (!result) {
      this.logger.error('handlePokerRollback: internal_error_null_result');
      return this.pokerError('INTERNAL_ERROR', 'Internal server error');
    }

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
    const encodedCredentials = Buffer.from(credentials, 'utf8').toString(
      'base64',
    );
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
    this.logger.log(
      `launchPokerGame: calling game_launch url=${url} providerGameId=${providerGameId} userId=${user.id} params=${searchParams.toString()}`,
    );

    const launchResponse = await fetch(`${url}?${searchParams.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const rawLaunchBody = await launchResponse.text();

    if (!launchResponse.ok) {
      this.logger.error(
        `launchPokerGame: poker_launch_failed status=${launchResponse.status} body=${rawLaunchBody}`,
      );
      throw new BadRequestException('poker_launch_failed');
    }

    const launchData = JSON.parse(rawLaunchBody) as {
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

  private async launchPpCloneGame(
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
      `launchPpCloneGame: userId=${userId} gameId=${game.id} code=${game.game_code}`,
    );

    const config = await this.prisma.pPCloneProvider.findFirst({
      where: { active: true },
    });

    if (!config) {
      this.logger.error('launchPpCloneGame: pp_clone_provider_not_configured');
      throw new NotFoundException('pp_clone_provider_not_configured');
    }

    const user = await this.getUser(userId);

    const baseUrl = (apiBaseUrl ?? config.base_url).replace(/\/+$/, '');

    const providerGameCode = game.game_id || game.game_code;

    if (!providerGameCode) {
      this.logger.error(
        `launchPpCloneGame: pp_clone_game_without_provider_code gameId=${game.id}`,
      );
      throw new BadRequestException('pp_clone_game_without_provider_code');
    }

    const userBalanceNumber = this.getDecimalNumber(user.balance);

    const payload = {
      method: 'game_launch',
      agent_code: config.agent_code,
      agent_token: config.agent_secret,
      user_code: String(user.id),
      provider_code: 'PGSOFT',
      game_code: providerGameCode,
      lang: 'pt',
      user_balance: userBalanceNumber,
    };

    const url = `${baseUrl.replace(/\/+$/, '')}`;

    this.logger.log(
      `launchPpCloneGame: calling game_launch url=${url} userId=${user.id} game_code=${providerGameCode} payload=${JSON.stringify(
        payload,
      )}`,
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rawBody = await response.text();

    if (!response.ok) {
      this.logger.error(
        `launchPpCloneGame: pp_clone_launch_failed status=${response.status} body=${rawBody}`,
      );
      throw new BadRequestException('pp_clone_launch_failed');
    }

    let data: any;
    try {
      data = JSON.parse(rawBody);
    } catch {
      this.logger.error(
        `launchPpCloneGame: pp_clone_launch_invalid_json body=${rawBody}`,
      );
      throw new BadRequestException('pp_clone_launch_invalid_response');
    }

    const launchUrl =
      data.launch_url ||
      data.launchUrl ||
      data.game_url ||
      data.url ||
      data.play_url;

    if (!launchUrl || typeof launchUrl !== 'string') {
      this.logger.error(
        `launchPpCloneGame: pp_clone_launch_missing_url body=${rawBody}`,
      );
      throw new BadRequestException('pp_clone_launch_missing_url');
    }

    this.logger.log(
      `launchPpCloneGame: success userId=${user.id} gameId=${game.id}`,
    );

    return {
      url: launchUrl,
    };
  }

  private async launchPgCloneGame(
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
      `launchPgCloneGame: userId=${userId} gameId=${game.id} code=${game.game_code}`,
    );

    const config = await this.prisma.pGCloneProvider.findFirst({
      where: { active: true },
    });

    if (!config) {
      this.logger.error('launchPgCloneGame: pg_clone_provider_not_configured');
      throw new NotFoundException('pg_clone_provider_not_configured');
    }

    const user = await this.getUser(userId);

    const baseUrl = (apiBaseUrl ?? config.base_url).replace(/\/+$/, '');

    const providerGameCode = game.game_id || game.game_code;

    if (!providerGameCode) {
      this.logger.error(
        `launchPgCloneGame: pg_clone_game_without_provider_code gameId=${game.id}`,
      );
      throw new BadRequestException('pg_clone_game_without_provider_code');
    }

    const userBalanceNumber = this.getDecimalNumber(user.balance);

    const payload = {
      method: 'game_launch',
      agent_code: config.agent_code,
      agent_token: config.agent_token,
      agentToken: config.agent_token,
      secretKey: config.agent_secret,
      user_code: String(user.id),
      provider_code: 'PGSOFT',
      game_code: providerGameCode,
      user_balance: userBalanceNumber,
    };

    const url = `${baseUrl.replace(/\/+$/, '')}/game_launch`;

    this.logger.log(
      `launchPgCloneGame: calling game_launch url=${url} userId=${user.id} game_code=${providerGameCode} payload=${JSON.stringify(
        payload,
      )}`,
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rawBody = await response.text();

    if (!response.ok) {
      this.logger.error(
        `launchPgCloneGame: pg_clone_launch_failed status=${response.status} body=${rawBody}`,
      );
      throw new BadRequestException('pg_clone_launch_failed');
    }

    let data: any;
    try {
      data = JSON.parse(rawBody);
    } catch {
      this.logger.error(
        `launchPgCloneGame: pg_clone_launch_invalid_json body=${rawBody}`,
      );
      throw new BadRequestException('pg_clone_launch_invalid_response');
    }

    if (
      data &&
      ((typeof data.status === 'number' && data.status !== 1) ||
        (typeof data.status === 'string' &&
          data.status.toLowerCase() !== '1' &&
          data.status.toLowerCase() !== 'success') ||
        data.status === 'error')
    ) {
      this.logger.error(
        `launchPgCloneGame: pg_clone_launch_error status_field=${data.status} message=${data.message ?? data.msg ?? ''} body=${rawBody}`,
      );
      throw new BadRequestException('pg_clone_launch_error');
    }

    const launchUrl =
      data.launchUrl ||
      data.launch_url ||
      data.game_url ||
      data.url ||
      data.play_url;

    if (!launchUrl || typeof launchUrl !== 'string') {
      this.logger.error(
        `launchPgCloneGame: pg_clone_launch_missing_url body=${rawBody}`,
      );
      throw new BadRequestException('pg_clone_launch_missing_url');
    }

    this.logger.log(
      `launchPgCloneGame: success userId=${user.id} gameId=${game.id}`,
    );

    return {
      url: launchUrl,
    };
  }

  private async checkAndApplyVipUpgrade(userId: number) {
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          vip: true,
          vip_balance: true,
          status: true,
          banned: true,
        },
      });

      if (!user || !user.status || user.banned) {
        return;
      }

      const levels = await tx.vipLevel.findMany({
        orderBy: { id_vip: 'asc' },
      });

      if (!levels.length) {
        return;
      }

      const agg = await (tx as any).gameTransaction.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          user_id: user.id,
          action: 'bet',
        },
      });

      const totalVolume =
        agg && agg._sum && agg._sum.amount
          ? this.getDecimalNumber(agg._sum.amount as Prisma.Decimal)
          : 0;

      const currentVip = user.vip ?? 0;
      let targetVip = currentVip;

      const levelsByIdVip = new Map<number, (typeof levels)[number]>();
      for (const level of levels) {
        levelsByIdVip.set(level.id_vip, level);
        const goalNumber = this.getDecimalNumber(level.goal);
        if (totalVolume >= goalNumber && level.id_vip > targetVip) {
          targetVip = level.id_vip;
        }
      }

      if (targetVip <= currentVip) {
        return;
      }

      let totalBonus = new Prisma.Decimal(0);

      for (let nextVip = currentVip + 1; nextVip <= targetVip; nextVip++) {
        const level = levelsByIdVip.get(nextVip);
        if (!level) {
          continue;
        }
        const bonusDecimal = level.bonus;
        totalBonus = totalBonus.add(bonusDecimal);
        await tx.vipHistory.create({
          data: {
            user_id: user.id,
            vip_level_id: level.id,
            goal: level.goal,
            bonus: bonusDecimal,
            kind: 'upgrade',
          },
        });
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          vip: targetVip,
          vip_balance: { increment: totalBonus },
        },
      });
    });
  }
}
