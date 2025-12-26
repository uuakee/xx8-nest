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
}
