import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { PradaPaymentGatewayService } from './prada-payment.gateway';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, PradaPaymentGatewayService],
  exports: [PradaPaymentGatewayService],
})
export class UsersModule {}
