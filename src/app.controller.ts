import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { PradaPaymentGatewayService } from './users/prada-payment.gateway';
import { GameService } from './game/game.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

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

  @Post('gold_api/user_balance')
  goldApiUserBalance(@Body() body: any) {
    return this.gameService.handleCloneWebhook(
      { ...body, method: 'user_balance' },
      'pg-clone',
    );
  }

  @Post('gold_api/game_callback')
  goldApiGameCallback(@Body() body: any) {
    return this.gameService.handleCloneWebhook(
      { ...body, method: 'game_callback' },
      'pg-clone',
    );
  }

  @Post('gold_api/money_callback')
  goldApiMoneyCallback(@Body() body: any) {
    return this.gameService.handleCloneWebhook(
      { ...body, method: 'money_callback' },
      'pg-clone',
    );
  }

  @Post('webhook/ppclone')
  ppCloneWebhook(@Body() body: any) {
    return this.gameService.handleCloneWebhook(body, 'pp-clone');
  }

  @Post('webhook/pgclone')
  async pgCloneWebhook(@Body() body: any) {
    const tsStart = new Date().toISOString();
    this.logger.log(
      `[pgclone] request_received ts=${tsStart} payload=${JSON.stringify(body)}`,
    );
    try {
      const result = await this.gameService.handleCloneWebhook(
        body,
        'pg-clone',
      );
      const tsEnd = new Date().toISOString();
      this.logger.log(
        `[pgclone] request_processed ts=${tsEnd} result=${JSON.stringify(
          result,
        )}`,
      );
      return result;
    } catch (err) {
      const tsError = new Date().toISOString();
      this.logger.error(
        `[pgclone] request_error ts=${tsError} message=${
          (err as Error).message
        }`,
      );
      throw err;
    }
  }
}
