import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GameService } from './game.service';
import { GameLaunchDto } from './dto/game-launch.dto';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  private static readonly defaultUserShape: { sub: number; pid: string } = {
    sub: 0,
    pid: '',
  };

  @UseGuards(AuthGuard('jwt'))
  @Post('launch')
  launch(
    @Req() req: { user?: { sub: number; pid: string } },
    @Body() dto: GameLaunchDto,
  ) {
    const u = req.user ?? GameController.defaultUserShape;
    return this.gameService.launchGameForUser(u.sub, dto, undefined);
  }
}
