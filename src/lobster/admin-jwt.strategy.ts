import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: { sub: number; email: string; role?: string }) {
    if (!payload?.sub || !payload?.email) {
      throw new UnauthorizedException('invalid_token');
    }
    const admin = await this.prisma.administrator.findUnique({
      where: { id: payload.sub },
    });
    if (!admin || !admin.status || admin.email !== payload.email) {
      throw new UnauthorizedException('invalid_token');
    }
    return { id: admin.id, email: admin.email, name: admin.name };
  }
}

