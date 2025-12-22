import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
    super({
      jwtFromRequest,
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }
  validate(payload: { sub: number; pid: string }) {
    return { sub: payload.sub, pid: payload.pid };
  }
}
