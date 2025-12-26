import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { compare } from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { UpdatePradaPaymentDto } from './dto/update-prada-payment.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { AdminListDepositsDto } from './dto/admin-list-deposits.dto';

@Injectable()
export class LobsterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async adminLogin(dto: AdminLoginDto) {
    const admin = await this.prisma.administrator.findUnique({
      where: { email: dto.email },
    });
    if (!admin || !admin.status) {
      throw new UnauthorizedException('invalid_credentials');
    }
    const ok = await compare(dto.password, admin.password);
    if (!ok) {
      throw new UnauthorizedException('invalid_credentials');
    }
    const payload = {
      sub: admin.id,
      email: admin.email,
      role: 'admin' as const,
    };
    const token = await this.jwt.signAsync(payload);
    return {
      access_token: token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        status: admin.status,
      },
    };
  }

  async listCategories() {
    return this.prisma.category.findMany({
      orderBy: { created_at: 'desc' },
      include: { games: true },
    });
  }

  async createCategory(dto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: {
        name: dto.name,
        image: dto.image,
        is_active: dto.is_active ?? true,
      },
    });
  }

  async getCategoryById(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { games: true },
    });
    if (!category) {
      throw new NotFoundException('category_not_found');
    }
    return category;
  }

  async updateCategory(id: number, dto: UpdateCategoryDto) {
    await this.ensureCategoryExists(id);
    return this.prisma.category.update({
      where: { id },
      data: dto,
    });
  }

  async addGameToCategory(categoryId: number, gameId: number) {
    await this.ensureCategoryExists(categoryId);
    await this.ensureGameExists(gameId);
    return this.prisma.category.update({
      where: { id: categoryId },
      data: {
        games: {
          connect: { id: gameId },
        },
      },
      include: { games: true },
    });
  }

  async listGames() {
    return this.prisma.game.findMany({
      orderBy: { created_at: 'desc' },
      include: { categories: true },
    });
  }

  async createGame(dto: CreateGameDto) {
    return this.prisma.game.create({
      data: {
        name: dto.name,
        game_code: dto.game_code,
        game_id: dto.game_id ?? null,
        image: dto.image ?? null,
        description: dto.description ?? null,
        game_type: dto.game_type ?? null,
        currency: dto.currency ?? undefined,
        rtp: dto.rtp ?? null,
        status: dto.status ?? undefined,
        distribution: dto.distribution ?? null,
        is_hot: dto.is_hot ?? undefined,
        is_active: dto.is_active ?? undefined,
        show_in_home: dto.show_in_home ?? undefined,
      },
    });
  }

  async getGameById(id: number) {
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: { categories: true },
    });
    if (!game) {
      throw new NotFoundException('game_not_found');
    }
    return game;
  }

  async updateGame(id: number, dto: UpdateGameDto) {
    await this.ensureGameExists(id);
    return this.prisma.game.update({
      where: { id },
      data: dto,
    });
  }

  async getPradaPayment() {
    const config = await this.prisma.pradaPayment.findUnique({
      where: { id: 1 },
    });
    if (!config) {
      throw new NotFoundException('prada_payment_not_found');
    }
    return config;
  }

  async updatePradaPayment(dto: UpdatePradaPaymentDto) {
    return this.prisma.pradaPayment.update({
      where: { id: 1 },
      data: { ...dto },
    });
  }

  async listMessages() {
    return this.prisma.mensage.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async createMessage(dto: CreateMessageDto) {
    return this.prisma.mensage.create({
      data: {
        title: dto.title,
        content: dto.content,
        is_active: dto.is_active ?? true,
      },
    });
  }

  async updateMessage(id: number, dto: UpdateMessageDto) {
    const exists = await this.prisma.mensage.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('message_not_found');
    }
    return this.prisma.mensage.update({
      where: { id },
      data: dto,
    });
  }

  async listPromotions() {
    return this.prisma.promotion.findMany({
      orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
    });
  }

  async getPromotionById(id: number) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
    });
    if (!promotion) {
      throw new NotFoundException('promotion_not_found');
    }
    return promotion;
  }

  async createPromotion(dto: CreatePromotionDto) {
    return this.prisma.promotion.create({
      data: {
        name: dto.name,
        icon_url: dto.icon_url,
        image_url: dto.image_url,
        target_url: dto.target_url,
        is_active: dto.is_active ?? true,
        sort_order: dto.sort_order ?? 0,
        starts_at: dto.starts_at ? new Date(dto.starts_at) : null,
        ends_at: dto.ends_at ? new Date(dto.ends_at) : null,
      },
    });
  }

  async updatePromotion(id: number, dto: UpdatePromotionDto) {
    const exists = await this.prisma.promotion.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('promotion_not_found');
    }
    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...dto,
        starts_at: dto.starts_at ? new Date(dto.starts_at) : dto.starts_at,
        ends_at: dto.ends_at ? new Date(dto.ends_at) : dto.ends_at,
      },
    });
  }

  async deletePromotion(id: number) {
    const exists = await this.prisma.promotion.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('promotion_not_found');
    }
    await this.prisma.promotion.delete({ where: { id } });
    return { deleted: true };
  }

  async adminListDeposits(filters: AdminListDepositsDto) {
    const rawPage = filters.page ?? 1;
    const rawPageSize = filters.page_size ?? 20;
    const page = Number(rawPage) > 0 ? Number(rawPage) : 1;
    const pageSize = Number(rawPageSize) > 0 ? Number(rawPageSize) : 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.DepositWhereInput = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.created_from || filters.created_to) {
      const createdAtFilter: Prisma.DateTimeFilter = {};
      if (filters.created_from) {
        createdAtFilter.gte = new Date(filters.created_from);
      }
      if (filters.created_to) {
        createdAtFilter.lte = new Date(filters.created_to);
      }
      where.created_at = createdAtFilter;
    }

    if (filters.search) {
      const q = filters.search;
      where.OR = [
        { reference: { contains: q, mode: 'insensitive' } },
        { request_number: { contains: q, mode: 'insensitive' } },
      ];
    }

    const userConditions: Prisma.UserWhereInput = {};

    if (filters.user_pid) {
      userConditions.pid = filters.user_pid;
    }
    if (filters.user_phone) {
      userConditions.phone = filters.user_phone;
    }
    if (filters.user_document) {
      userConditions.document = filters.user_document;
    }

    if (Object.keys(userConditions).length > 0) {
      where.user = { is: userConditions };
    }

    const allowedOrderFields: (keyof Prisma.DepositOrderByWithRelationInput)[] =
      ['created_at', 'amount', 'status', 'reference'];
    const requestedField =
      (filters.order_by as keyof Prisma.DepositOrderByWithRelationInput) ??
      'created_at';
    const orderByField = allowedOrderFields.includes(requestedField)
      ? requestedField
      : 'created_at';
    const orderDir = (filters.order_dir ?? 'desc') as Prisma.SortOrder;

    const orderBy: Prisma.DepositOrderByWithRelationInput = {
      [orderByField]: orderDir,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.deposit.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        include: {
          user: {
            select: {
              id: true,
              pid: true,
              phone: true,
              document: true,
            },
          },
        },
      }),
      this.prisma.deposit.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        page_size: pageSize,
        total,
        total_pages: Math.ceil(total / pageSize),
      },
    };
  }

  private async ensureCategoryExists(id: number) {
    const exists = await this.prisma.category.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('category_not_found');
    }
  }

  private async ensureGameExists(id: number) {
    const exists = await this.prisma.game.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('game_not_found');
    }
  }
}
