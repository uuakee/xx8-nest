import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SyscomService {
  constructor(private readonly prisma: PrismaService) {}

  listCategories() {
    return this.prisma.category.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async listCategoriesWithGames() {
    const categories = await this.prisma.category.findMany({
      where: {
        is_active: true,
        games: {
          some: {},
        },
      },
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: { games: true },
        },
        games: {
          where: { is_active: true },
          take: 12,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            name: true,
            game_code: true,
            image: true,
            distribution: true,
            currency: true,
            game_type: true,
          },
        },
      },
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      image: category.image,
      games_count: category._count.games,
      games: category.games,
    }));
  }

  listMessages() {
    return this.prisma.mensage.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
    });
  }

  listPromotions() {
    return this.prisma.promotion.findMany({
      where: { is_active: true },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
    });
  }

  listBanners() {
    return this.prisma.banner.findMany({
      where: { is_active: true },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
    });
  }

  listSubBanners() {
    return this.prisma.subBanner.findMany({
      where: { is_active: true },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
    });
  }

  listPopupBanners() {
    return this.prisma.popupBanner.findMany({
      where: { is_active: true },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
    });
  }

  listPopupIcons() {
    return this.prisma.popupIcon.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
    });
  }

  getSettings() {
    return this.prisma.setting.findUnique({
      where: { id: 1 },
    });
  }

   listVipLevels() {
    return this.prisma.vipLevel.findMany({
      orderBy: { id_vip: 'asc' },
      select: {
        id_vip: true,
        goal: true,
        bonus: true,
        weekly_bonus: true,
        monthly_bonus: true,
      },
    });
  }

  async listCategoryGames(categoryId: number, page: number, pageSize: number) {
    const skip = (page - 1) * pageSize;

    const where = {
      is_active: true,
      categories: {
        some: {
          id: categoryId,
        },
      },
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.game.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true,
          name: true,
          game_code: true,
          image: true,
          distribution: true,
          currency: true,
          game_type: true,
        },
      }),
      this.prisma.game.count({ where }),
    ]);

    return {
      category_id: categoryId,
      page,
      page_size: pageSize,
      total,
      total_pages: Math.ceil(total / pageSize),
      items,
    };
  }
}
