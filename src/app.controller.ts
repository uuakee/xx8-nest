import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { PradaPaymentGatewayService } from './users/prada-payment.gateway';
import { GameService } from './game/game.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly pradaGateway: PradaPaymentGatewayService,
    private readonly gameService: GameService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('webhook/pradapayment')
  async pradaPaymentWebhook(
    @Body()
    body: {
      amount?: number;
      idTransaction?: string;
      paymentMethod?: string;
      status?: string;
    },
  ) {
    return this.pradaGateway.handleWebhook(body);
  }

  @Post('cron/pockersgames')
  pokerWebhook(@Body() body: any) {
    return this.gameService.handlePokerWebhook(body);
  }

  @Post('webhook/ppclone')
  ppCloneWebhook(@Body() body: any) {
    return this.gameService.handleCloneWebhook(body);
  }

  @Post('webhook/pgclone')
  pgCloneWebhook(@Body() body: any) {
    return this.gameService.handleCloneWebhook(body);
  }
}
