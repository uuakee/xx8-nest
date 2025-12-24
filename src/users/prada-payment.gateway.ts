import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as http from 'http';
import * as https from 'https';
import { URL } from 'node:url';

@Injectable()
export class PradaPaymentGatewayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

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

    const payload = {
      requestNumber,
      amount,
      'api-key': apiKey,
      postback,
      client: {
        name: `User ${user.pid}`,
        document: user.document,
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
      await tx.user.update({
        where: { id: deposit.user_id },
        data: {
          balance: { increment: deposit.amount },
        },
      });
    });

    return { processed: true };
  }
}
