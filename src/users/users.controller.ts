import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CreateDepositDto } from './dto/create-deposit.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private static readonly defaultUserShape: { sub: number; pid: string } = {
    sub: 0,
    pid: '',
  };

  @UseGuards(AuthGuard('jwt'))
  @Get('getBalances')
  balances(@Req() req: { user?: { sub: number; pid: string } }) {
    const u = req.user ?? UsersController.defaultUserShape;
    return this.usersService.getBalances(u.sub);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('deposit')
  deposit(
    @Req() req: { user?: { sub: number; pid: string } },
    @Body() dto: CreateDepositDto,
  ) {
    const u = req.user ?? UsersController.defaultUserShape;
    return this.usersService.createDeposit(u.sub, dto.amount);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('game-history')
  gameHistory(
    @Req() req: { user?: { sub: number; pid: string } },
    @Query('hours', ParseIntPipe) hours: number,
  ) {
    const u = req.user ?? UsersController.defaultUserShape;
    return this.usersService.getGameHistory(u.sub, hours);
  }
}
