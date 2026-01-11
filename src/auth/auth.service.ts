import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/create-auth.dto';
import { LoginDto } from './dto/login.dto';
import { hash, compare } from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private async generatePid(): Promise<string> {
    const len = 8;
    let pid = '';
    let exists: unknown;
    do {
      pid = '';
      for (let i = 0; i < len; i++) {
        pid += Math.floor(Math.random() * 10).toString();
      }
      exists = await this.prisma.user.findUnique({ where: { pid } });
    } while (exists);
    return pid;
  }

  private async generateAffiliateCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    let exists: unknown;
    do {
      code = '';
      for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      exists = await this.prisma.user.findFirst({
        where: { affiliate_code: code },
      });
    } while (exists);
    return code;
  }

  private computeExpiresInFromToken(token: string): number | null {
    const decoded: unknown = this.jwt.decode(token);
    if (!decoded || typeof decoded !== 'object') {
      return null;
    }
    const exp = (decoded as { exp?: unknown }).exp;
    if (typeof exp !== 'number') {
      return null;
    }
    const nowSec = Math.floor(Date.now() / 1000);
    return Math.max(0, exp - nowSec);
  }

  private parseExpiresToSeconds(input: string | number | undefined) {
    if (typeof input === 'number') return input;
    const v = input || '3600';
    if (/^\d+$/.test(v)) return parseInt(v, 10);
    const map: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    const match = /^(\d+)([smhd])$/.exec(v);
    if (!match) return 3600;
    return parseInt(match[1], 10) * map[match[2]];
  }

  async register(dto: RegisterDto) {
    const phoneExists = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (phoneExists) throw new BadRequestException('phone_in_use');

    // Buscar configuração do sistema
    const settings = await this.prisma.setting.findUnique({
      where: { id: 1 },
      select: { need_document: true },
    });

    // Validar documento baseado na configuração
    if (settings?.need_document) {
      if (!dto.document) {
        throw new BadRequestException('document_required');
      }
      const docExists = await this.prisma.user.findUnique({
        where: { document: dto.document },
      });
      if (docExists) throw new BadRequestException('document_in_use');
    } else if (dto.document) {
      // Se documento foi fornecido mesmo não sendo obrigatório, validar unicidade
      const docExists = await this.prisma.user.findUnique({
        where: { document: dto.document },
      });
      if (docExists) throw new BadRequestException('document_in_use');
    }

    const pid: string = await this.generatePid();
    const affiliateCode: string = await this.generateAffiliateCode();
    const passwordHash: string = await hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      let invitedByUserId: number | null = null;

      if (dto.inviterAffiliateCode) {
        const inviter = await tx.user.findFirst({
          where: { affiliate_code: dto.inviterAffiliateCode },
          select: {
            id: true,
            jump_available: true,
            jump_limit: true,
            jump_invite_count: true,
          },
        });

        if (inviter) {
          if (!inviter.jump_available) {
            invitedByUserId = inviter.id;
          } else {
            const limit = inviter.jump_limit ?? 0;
            const count = inviter.jump_invite_count ?? 0;

            if (limit <= 0) {
              invitedByUserId = inviter.id;
            } else if (count >= limit) {
              await tx.user.update({
                where: { id: inviter.id },
                data: {
                  jump_invite_count: 0,
                },
              });
            } else {
              invitedByUserId = inviter.id;
              await tx.user.update({
                where: { id: inviter.id },
                data: {
                  jump_invite_count: count + 1,
                },
              });
            }
          }
        }
      }

      const defaultAffiliate = await tx.defaultAffiliateBonus.findUnique({
        where: { id: 1 },
      });

      return tx.user.create({
        data: {
          pid,
          phone: dto.phone,
          document: dto.document || null,
          password: passwordHash,
          affiliate_code: affiliateCode,
          invited_by_user_id: invitedByUserId,
          min_deposit_for_cpa: defaultAffiliate?.min_deposit_for_cpa,
          cpa_level_1: defaultAffiliate?.cpa_level_1,
          cpa_level_2: defaultAffiliate?.cpa_level_2,
          cpa_level_3: defaultAffiliate?.cpa_level_3,
          revshare_fake: defaultAffiliate?.revshare_fake,
          revshare_level_1: defaultAffiliate?.revshare_level_1,
          revshare_level_2: defaultAffiliate?.revshare_level_2,
          revshare_level_3: defaultAffiliate?.revshare_level_3,
          fake_revshare: defaultAffiliate?.fake_revshare,
        },
      });
    });

    const payload = { sub: user.id, pid: user.pid };
    const expiresInRaw = this.config.get<string | number>('JWT_EXPIRES_IN');
    const expiresIn = this.parseExpiresToSeconds(expiresInRaw);
    const token = await this.jwt.signAsync(payload, { expiresIn });
    const ttl = this.computeExpiresInFromToken(token);

    return { access_token: token, expires_in: ttl };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (!user) throw new UnauthorizedException('invalid_credentials');
    const ok: boolean = await compare(dto.password, user.password);
    if (!ok) throw new UnauthorizedException('invalid_credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const payload = { sub: user.id, pid: user.pid };
    const expiresInRaw = this.config.get<string | number>('JWT_EXPIRES_IN');
    const expiresIn = this.parseExpiresToSeconds(expiresInRaw);
    const token = await this.jwt.signAsync(payload, { expiresIn });
    const ttl = this.computeExpiresInFromToken(token);

    return { access_token: token, expires_in: ttl };
  }

  async me(user: { sub: number; pid: string }) {
    const u = await this.prisma.user.findUnique({ where: { id: user.sub } });
    if (!u) throw new UnauthorizedException('invalid_token');
    return {
      id: u.id,
      pid: u.pid,
      phone: u.phone,
      document: u.document,
      vip: u.vip,
      blogger: u.blogger,
      banned: u.banned,
      status: u.status,
      created_at: u.created_at,
      last_login_at: u.last_login_at,
      affiliate_code: u.affiliate_code,
      invited_by_user_id: u.invited_by_user_id ?? null,
    };
  }
}
