import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SyscomService {
  constructor(private readonly prisma: PrismaService) {}

  private shuffleArray<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = result[i];
      result[i] = result[j];
      result[j] = temp;
    }
    return result;
  }

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
        show_in_home: true,
        games: {
          some: {},
        },
      },
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: {
            games: {
              where: { is_active: true },
            },
          },
        },
        games: {
          where: { is_active: true },
          orderBy: { weight: 'desc' },
          select: {
            id: true,
            name: true,
            game_code: true,
            image: true,
            distribution: true,
            currency: true,
            game_type: true,
            show_in_home: true,
            weight: true,
          },
        },
      },
    });

    return categories.map((category) => {
      const hotGames = category.games.filter((game) => game.show_in_home);
      const otherGames = category.games.filter((game) => !game.show_in_home);

      // Jogos já vêm ordenados por weight DESC do banco
      // Separar hot games e outros, mas manter ordem por peso
      const ordered = [
        ...hotGames,
        ...otherGames,
      ].slice(0, 12);

      const games = ordered.map(({ show_in_home, ...rest }) => rest);

      return {
        id: category.id,
        name: category.name,
        image: category.image,
        games_count: category._count.games,
        games,
      };
    });
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
        orderBy: [{ weight: 'desc' }, { created_at: 'desc' }],
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
          weight: true,
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
