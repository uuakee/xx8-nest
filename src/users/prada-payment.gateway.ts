import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'node:url';
import { generateValidCPF } from '../utils/cpf.util';

@Injectable()
export class PradaPaymentGatewayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private getDecimalNumber(value: number | Prisma.Decimal | null | undefined) {
    if (value === null || value === undefined) {
      return 0;
    }
    return typeof value === 'number' ? value : Number(value.toString());
  }

  private async postJson(urlStr: string, payload: unknown): Promise<unknown> {
    const url = new URL(urlStr);
    const data = JSON.stringify(payload);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options: https.RequestOptions = {
      method: 'POST',
      hostname: url.hostname,
      path: url.pathname + url.search,
      port: url.port || (isHttps ? 443 : 80),
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    return new Promise((resolve, reject) => {
      const req = client.request(options, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          if (!text) {
            resolve({});
            return;
          }
          try {
            const json = JSON.parse(text);
            resolve(json);
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(data);
      req.end();
    });
  }

  private generateRequestNumber(): string {
    const now = Date.now().toString(10);
    const rand = Math.floor(Math.random() * 1_000_000)
      .toString(10)
      .padStart(6, '0');
    return now + rand;
  }

  async createDeposit(userId: number, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('invalid_amount');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, pid: true, phone: true, document: true },
    });
    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    const config = await this.prisma.pradaPayment.findFirst({
      where: { active: true },
    });
    if (!config) {
      throw new NotFoundException('prada_payment_not_configured');
    }

    const requestNumber = this.generateRequestNumber();

    const apiUrl = this.config.get<string>('API_URL') ?? '';
    const apiUrlTrimmed = apiUrl.replace(/\/+$/, '');
    const postback = apiUrlTrimmed
      ? `${apiUrlTrimmed}/webhook/pradapayment`
      : 'https://example.com/webhook/pradapayment';

    const apiKey = config.api_key;

    // Se usuário não tem documento, gerar CPF válido
    const document = user.document || generateValidCPF();

    const payload = {
      requestNumber,
      amount,
      'api-key': apiKey,
      postback,
      client: {
        name: `User ${user.pid}`,
        document,
        email: `user${user.id}@example.com`,
        userPhone: user.phone,
      },
    };

    const baseUrlTrimmed = config.base_url.replace(/\/+$/, '');
    const url = `${baseUrlTrimmed}/v1/gateway/`;

    let response: any;
    try {
      response = await this.postJson(url, payload);
    } catch {
      throw new BadRequestException('prada_payment_gateway_error');
    }

    const { status, paymentCode, idTransaction } = response ?? {};
    if (!status || !paymentCode || !idTransaction) {
      throw new BadRequestException('invalid_gateway_response');
    }

    await this.prisma.deposit.create({
      data: {
        user_id: user.id,
        amount,
        status: 'PENDING',
        request_number: requestNumber,
        reference: idTransaction,
      },
    });

    return {
      status,
      paymentCode,
    };
  }

  async createCashout(payload: {
    name: string;
    cpf: string;
    keypix: string;
    amount: number | Prisma.Decimal;
  }) {
    const config = await this.prisma.pradaPayment.findFirst({
      where: { active: true },
    });
    if (!config) {
      throw new NotFoundException('prada_payment_not_configured');
    }

    const apiUrl = this.config.get<string>('API_URL') ?? '';
    const apiUrlTrimmed = apiUrl.replace(/\/+$/, '');
    const postback = apiUrlTrimmed
      ? `${apiUrlTrimmed}/webhook/pradapayment-cashout`
      : 'https://example.com/webhook/pradapayment-cashout';

    const apiKey = config.api_key;

    const baseUrlTrimmed = config.base_url.replace(/\/+$/, '');
    const url = `${baseUrlTrimmed}/c1/cashout/`;

    const amountNumber = this.getDecimalNumber(payload.amount);
    const nonce = this.generateRequestNumber();

    const body = {
      'api-key': apiKey,
      name: payload.name,
      cpf: payload.cpf,
      keypix: payload.keypix,
      amount: amountNumber,
      postback,
      nonce,
    };

    let response: any;
    try {
      response = await this.postJson(url, body);
    } catch {
      throw new BadRequestException('prada_payment_gateway_error');
    }

    // log de depuração para inspecionar a resposta da PradaPay no cashout

    console.log('PradaPay cashout response:', JSON.stringify(response));

    const { status, idTransaction } = response ?? {};
    if (!status || !idTransaction) {
      throw new BadRequestException('invalid_gateway_response');
    }

    if (status !== 'pago') {
      throw new BadRequestException('withdrawal_not_paid');
    }

    return response;
  }

  async handleWebhook(body: {
    amount?: number;
    idTransaction?: string;
    paymentMethod?: string;
    status?: string;
  }) {
    const idTransaction = body?.idTransaction;
    const status = body?.status;
    if (!idTransaction || !status) {
      return { processed: false };
    }

    if (status !== 'paid') {
      return { processed: false };
    }

    const deposit = await this.prisma.deposit.findFirst({
      where: { reference: idTransaction },
    });
    if (!deposit) {
      return { processed: false };
    }

    if (deposit.status === 'PAID') {
      return { processed: true };
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.deposit.update({
        where: { id: deposit.id },
        data: {
          status: 'PAID',
          paid_at: now,
        },
      });

      const user = await tx.user.findUnique({
        where: { id: deposit.user_id },
        select: {
          id: true,
          invited_by_user_id: true,
        },
      });

      if (user) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            balance: { increment: deposit.amount },
          },
        });

        // Create rollover requirement for deposit
        const settings = await tx.setting.findUnique({ where: { id: 1 } });
        const userRollover = await tx.user.findUnique({
          where: { id: deposit.user_id },
          select: { rollover_active: true, rollover_multiplier: true },
        });

        const needsRollover =
          userRollover?.rollover_active ||
          settings?.default_rollover_active ||
          false;

        if (needsRollover) {
          const multiplier = userRollover?.rollover_active
            ? this.getDecimalNumber(
                userRollover.rollover_multiplier as Prisma.Decimal,
              )
            : this.getDecimalNumber(
                settings?.default_rollover_multiplier as Prisma.Decimal,
              ) || 2;

          const amountRequired = this.getDecimalNumber(deposit.amount) * multiplier;

          await (tx as any).rolloverRequirement.create({
            data: {
              user_id: deposit.user_id,
              source_type: 'deposit',
              source_id: deposit.id,
              amount_required: new Prisma.Decimal(amountRequired),
              multiplier: new Prisma.Decimal(multiplier),
              status: 'ACTIVE',
            },
          });
        }

        const rootInviterId = user.invited_by_user_id;
        if (rootInviterId) {
          const existingCpa = await tx.affiliateHistory.findFirst({
            where: {
              user_id: user.id,
              type: 'cpa',
            },
          });

          if (!existingCpa) {
            const depositAmountNumber = this.getDecimalNumber(deposit.amount);

            let currentAffiliateId: number | null | undefined = rootInviterId;
            let level = 1;

            while (currentAffiliateId && level <= 3) {
              const affiliate = await tx.user.findUnique({
                where: { id: currentAffiliateId },
                select: {
                  id: true,
                  cpa_available: true,
                  min_deposit_for_cpa: true,
                  cpa_level_1: true,
                  cpa_level_2: true,
                  cpa_level_3: true,
                  affiliate_balance: true,
                  invited_by_user_id: true,
                },
              });

              if (!affiliate) {
                break;
              }

              if (affiliate.cpa_available) {
                const minDeposit = this.getDecimalNumber(
                  affiliate.min_deposit_for_cpa as Prisma.Decimal,
                );

                if (depositAmountNumber >= minDeposit) {
                  let levelAmountDecimal: Prisma.Decimal | null = null;
                  if (level === 1) {
                    levelAmountDecimal =
                      affiliate.cpa_level_1 as Prisma.Decimal;
                  } else if (level === 2) {
                    levelAmountDecimal =
                      affiliate.cpa_level_2 as Prisma.Decimal;
                  } else if (level === 3) {
                    levelAmountDecimal =
                      affiliate.cpa_level_3 as Prisma.Decimal;
                  }

                  const levelAmountNumber =
                    this.getDecimalNumber(levelAmountDecimal);

                  if (levelAmountNumber > 0 && levelAmountDecimal) {
                    await tx.affiliateHistory.create({
                      data: {
                        user_id: user.id,
                        affiliate_user_id: affiliate.id,
                        amount: levelAmountDecimal,
                        cpa_level: level,
                        revshare_level: 0,
                        type: 'cpa',
                      },
                    });

                    await tx.user.update({
                      where: { id: affiliate.id },
                      data: {
                        affiliate_balance: {
                          increment: levelAmountDecimal,
                        },
                      },
                    });
                  }
                }
              }

              currentAffiliateId = (affiliate as User).invited_by_user_id;
              level += 1;
            }
          }
        }

        // Process deposit bonus promotion
        const activeEvent = await tx.depositPromoEvent.findFirst({
          where: {
            is_active: true,
            start_date: { lte: now },
            end_date: { gte: now },
          },
          include: {
            tiers: {
              where: { is_active: true },
              orderBy: { deposit_amount: 'desc' },
            },
          },
        });

        if (activeEvent && activeEvent.tiers.length > 0) {
          const depositAmountNumber = this.getDecimalNumber(deposit.amount);

          const matchingTier = activeEvent.tiers.find(
            (tier) =>
              depositAmountNumber >= this.getDecimalNumber(tier.deposit_amount),
          );

          if (matchingTier) {
            const bonusAmountNumber = this.getDecimalNumber(
              matchingTier.bonus_amount,
            );

            if (bonusAmountNumber > 0) {
              const participation = await tx.depositPromoParticipation.create({
                data: {
                  user_id: deposit.user_id,
                  tier_id: matchingTier.id,
                  deposit_id: deposit.id,
                  promo_date: now,
                },
              });

              await tx.user.update({
                where: { id: deposit.user_id },
                data: {
                  balance: { increment: matchingTier.bonus_amount },
                },
              });

              const rolloverAmountNumber = this.getDecimalNumber(
                matchingTier.rollover_amount,
              );

              if (rolloverAmountNumber > 0) {
                const bonusMultiplier =
                  rolloverAmountNumber / bonusAmountNumber;

                await (tx as any).rolloverRequirement.create({
                  data: {
                    user_id: deposit.user_id,
                    source_type: 'deposit_bonus',
                    source_id: participation.id,
                    amount_required: matchingTier.rollover_amount,
                    multiplier: new Prisma.Decimal(bonusMultiplier),
                    status: 'ACTIVE',
                  },
                });
              }
            }
          }
        }
      }
    });

    return { processed: true };
  }
}
