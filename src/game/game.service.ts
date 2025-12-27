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
