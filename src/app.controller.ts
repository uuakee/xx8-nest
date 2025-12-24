import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { PradaPaymentGatewayService } from './users/prada-payment.gateway';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly pradaGateway: PradaPaymentGatewayService,
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
}
