import { Module } from '@nestjs/common';
import { SyscomController } from './syscom.controller';
import { SyscomService } from './syscom.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [SyscomController],
  providers: [SyscomService, PrismaService],
})
export class SyscomModule {}
