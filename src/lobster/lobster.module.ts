import { Module } from '@nestjs/common';
import { LobsterController } from './lobster.controller';
import { LobsterService } from './lobster.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { AdminJwtStrategy } from './admin-jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [AuthModule, UsersModule],
  controllers: [LobsterController],
  providers: [LobsterService, PrismaService, AdminJwtStrategy],
})
export class LobsterModule {}
