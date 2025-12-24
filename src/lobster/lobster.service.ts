import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { UpdatePradaPaymentDto } from './dto/update-prada-payment.dto';

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
    const payload = { sub: admin.id, email: admin.email, role: 'admin' as const };
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
        image: dto.image,
        provider: dto.provider,
        is_hot: dto.is_hot ?? false,
        is_active: dto.is_active ?? true,
        show_in_home: dto.show_in_home ?? true,
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
