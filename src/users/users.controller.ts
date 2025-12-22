import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

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
}
