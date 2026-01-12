import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { PradaPaymentGatewayService } from '../users/prada-payment.gateway';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { UpdatePradaPaymentDto } from './dto/update-prada-payment.dto';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { CreateSubBannerDto } from './dto/create-sub-banner.dto';
import { UpdateSubBannerDto } from './dto/update-sub-banner.dto';
import { CreatePopupBannerDto } from './dto/create-popup-banner.dto';
import { UpdatePopupBannerDto } from './dto/update-popup-banner.dto';
import { CreatePopupIconDto } from './dto/create-popup-icon.dto';
import { UpdatePopupIconDto } from './dto/update-popup-icon.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { UpdatePpProviderDto } from './dto/update-pp-provider.dto';
import { UpdatePgProviderDto } from './dto/update-pg-provider.dto';
import { UpdatePokerProviderDto } from './dto/update-poker-provider.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import {
  AdminListDepositsDto,
  AdminListWithdrawalsDto,
} from './dto/admin-list-deposits.dto';
import { CreateVipLevelDto } from './dto/create-vip-level.dto';
import { UpdateVipLevelDto } from './dto/update-vip-level.dto';
import { AdminListVipHistoriesDto } from './dto/admin-list-vip-histories.dto';
import { AdminListUsersDto } from './dto/admin-list-users.dto';
import { AdminCreateUserDto } from './dto/create-user.dto';
import { AdminUpdateUserDto } from './dto/update-user.dto';
import { CreateChestDto } from './dto/create-chest.dto';
import { UpdateChestDto } from './dto/update-chest.dto';
import { AdminListChestWithdrawalsDto } from './dto/admin-list-chest-withdrawals.dto';
import { CreateReedemCodeDto } from './dto/create-reedem-code.dto';
import { UpdateReedemCodeDto } from './dto/update-reedem-code.dto';
import { AdminListReedemCodeHistoriesDto } from './dto/admin-list-reedem-code-histories.dto';
import { CreateRakebackSettingDto } from './dto/create-rakeback-setting.dto';
import { UpdateRakebackSettingDto } from './dto/update-rakeback-setting.dto';
import { AdminListRakebackHistoriesDto } from './dto/admin-list-rakeback-histories.dto';
import { CreateDepositPromoEventDto } from './dto/create-deposit-promo-event.dto';
import { UpdateDepositPromoEventDto } from './dto/update-deposit-promo-event.dto';
import { CreateDepositPromoTierDto } from './dto/create-deposit-promo-tier.dto';
import { UpdateDepositPromoTierDto } from './dto/update-deposit-promo-tier.dto';
import { AdminListDepositPromoParticipationsDto } from './dto/admin-list-deposit-promo-participations.dto';

@Injectable()
export class LobsterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly pradaGateway: PradaPaymentGatewayService,
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

  async adminCreateUser(dto: AdminCreateUserDto) {
    const phoneExists = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });
    if (phoneExists) {
      throw new BadRequestException('phone_in_use');
    }
    const docExists = await this.prisma.user.findUnique({
      where: { document: dto.document },
    });
    if (docExists) {
      throw new BadRequestException('document_in_use');
    }

    const pid = await this.generatePid();
    const affiliateCode = await this.generateAffiliateCode();
    const passwordHash = await hash(dto.password, 10);

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

      return tx.user.create({
        data: {
          pid,
          phone: dto.phone,
          document: dto.document,
          password: passwordHash,
          affiliate_code: affiliateCode,
          invited_by_user_id: invitedByUserId,
        },
        select: {
          id: true,
          pid: true,
          phone: true,
          document: true,
          status: true,
          banned: true,
          blogger: true,
          vip: true,
          created_at: true,
        },
      });
    });

    return user;
  }

  async adminListUsers(filters: AdminListUsersDto) {
    const rawPage = filters.page ?? 1;
    const rawPageSize = filters.page_size ?? 20;
    const page = Number(rawPage) > 0 ? Number(rawPage) : 1;
    const pageSize = Number(rawPageSize) > 0 ? Number(rawPageSize) : 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = {};

    if (filters.pid) {
      where.pid = filters.pid;
    }
    if (filters.phone) {
      where.phone = filters.phone;
    }
    if (filters.document) {
      where.document = filters.document;
    }
    if (filters.status !== undefined) {
      where.status = filters.status;
    }
    if (filters.banned !== undefined) {
      where.banned = filters.banned;
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
        { pid: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { document: { contains: q, mode: 'insensitive' } },
        { affiliate_code: { contains: q, mode: 'insensitive' } },
      ];
    }

    const allowedOrderFields: (keyof Prisma.UserOrderByWithRelationInput)[] = [
      'created_at',
      'last_login_at',
      'id',
    ];
    const requestedField =
      (filters.order_by as keyof Prisma.UserOrderByWithRelationInput) ??
      'created_at';
    const orderByField = allowedOrderFields.includes(requestedField)
      ? requestedField
      : 'created_at';
    const orderDir = (filters.order_dir ?? 'desc') as Prisma.SortOrder;

    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [orderByField]: orderDir,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          pid: true,
          phone: true,
          document: true,
          vip: true,
          affiliate_code: true,
          balance: true,
          affiliate_balance: true,
          vip_balance: true,
          rollover_active: true,
          rollover_multiplier: true,
          cpa_available: true,
          cpa_level_1: true,
          cpa_level_2: true,
          cpa_level_3: true,
          min_deposit_for_cpa: true,
          revshare_fake: true,
          revshare_level_1: true,
          revshare_level_2: true,
          revshare_level_3: true,
          fake_revshare: true,
          blogger: true,
          banned: true,
          status: true,
          created_at: true,
          last_login_at: true,
        },
      }),
      this.prisma.user.count({ where }),
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

  async adminGetUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        pid: true,
        phone: true,
        document: true,
        balance: true,
        affiliate_balance: true,
        vip_balance: true,
        vip: true,
        affiliate_code: true,
        invited_by_user_id: true,
        rollover_active: true,
        rollover_multiplier: true,
        cpa_available: true,
        min_deposit_for_cpa: true,
        cpa_level_1: true,
        cpa_level_2: true,
        cpa_level_3: true,
        revshare_fake: true,
        revshare_level_1: true,
        revshare_level_2: true,
        revshare_level_3: true,
        fake_revshare: true,
        blogger: true,
        banned: true,
        status: true,
        created_at: true,
        updated_at: true,
        last_login_at: true,
        jump_available: true,
        jump_limit: true,
        jump_invite_count: true,
        vip_histories: {
          orderBy: { created_at: 'desc' },
        },
        vip_bonus_redemptions: {
          orderBy: { created_at: 'desc' },
        },
        deposits: {
          orderBy: { created_at: 'desc' },
        },
        level_promo_progresses: true,
        affiliate_histories: {
          orderBy: { created_at: 'desc' },
        },
        referred_affiliate_histories: {
          orderBy: { created_at: 'desc' },
        },
        chest_withdrawls: {
          orderBy: { created_at: 'desc' },
        },
        inviter: {
          select: {
            id: true,
            pid: true,
            phone: true,
            document: true,
          },
        },
        invitees: {
          select: {
            id: true,
            pid: true,
            phone: true,
            document: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    const vipLevel =
      user.vip && user.vip > 0
        ? await this.prisma.vipLevel.findFirst({
            where: { id_vip: user.vip },
          })
        : null;

    return {
      ...user,
      vip_level: vipLevel,
    };
  }

  async adminUpdateUser(id: number, dto: AdminUpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.phone !== undefined) {
      data.phone = dto.phone;
    }
    if (dto.document !== undefined) {
      data.document = dto.document;
    }
    if (dto.vip !== undefined) {
      data.vip = dto.vip;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.banned !== undefined) {
      data.banned = dto.banned;
    }
    if (dto.blogger !== undefined) {
      data.blogger = dto.blogger;
    }
    if (dto.jump_available !== undefined) {
      data.jump_available = dto.jump_available;
    }
    if (dto.jump_limit !== undefined) {
      data.jump_limit = dto.jump_limit;
    }
    if (dto.jump_invite_count !== undefined) {
      data.jump_invite_count = dto.jump_invite_count;
    }
    if (dto.cpa_available !== undefined) {
      data.cpa_available = dto.cpa_available;
    }
    if (dto.cpa_level_1 !== undefined) {
      data.cpa_level_1 = dto.cpa_level_1;
    }
    if (dto.cpa_level_2 !== undefined) {
      data.cpa_level_2 = dto.cpa_level_2;
    }
    if (dto.cpa_level_3 !== undefined) {
      data.cpa_level_3 = dto.cpa_level_3;
    }
    if (dto.min_deposit_for_cpa !== undefined) {
      data.min_deposit_for_cpa = dto.min_deposit_for_cpa;
    }
    if (dto.revshare_fake !== undefined) {
      data.revshare_fake = dto.revshare_fake;
    }
    if (dto.revshare_level_1 !== undefined) {
      data.revshare_level_1 = dto.revshare_level_1;
    }
    if (dto.revshare_level_2 !== undefined) {
      data.revshare_level_2 = dto.revshare_level_2;
    }
    if (dto.revshare_level_3 !== undefined) {
      data.revshare_level_3 = dto.revshare_level_3;
    }
    if (dto.fake_revshare !== undefined) {
      data.fake_revshare = dto.fake_revshare;
    }
    if (dto.balance !== undefined) {
      data.balance = dto.balance;
    }
    if (dto.affiliate_balance !== undefined) {
      data.affiliate_balance = dto.affiliate_balance;
    }
    if (dto.vip_balance !== undefined) {
      data.vip_balance = dto.vip_balance;
    }
    if (dto.rollover_active !== undefined) {
      data.rollover_active = dto.rollover_active;
    }
    if (dto.rollover_multiplier !== undefined) {
      data.rollover_multiplier = dto.rollover_multiplier;
    }

    if (dto.new_password) {
      data.password = await hash(dto.new_password, 10);
    }
    if (dto.new_withdrawal_password) {
      data.password_withdrawal = dto.new_withdrawal_password;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        pid: true,
        phone: true,
        document: true,
        vip: true,
        affiliate_code: true,
        balance: true,
        affiliate_balance: true,
        vip_balance: true,
        rollover_active: true,
        rollover_multiplier: true,
        cpa_available: true,
        min_deposit_for_cpa: true,
        cpa_level_1: true,
        cpa_level_2: true,
        cpa_level_3: true,
        revshare_fake: true,
        revshare_level_1: true,
        revshare_level_2: true,
        revshare_level_3: true,
        fake_revshare: true,
        blogger: true,
        banned: true,
        status: true,
        created_at: true,
        last_login_at: true,
      },
    });

    return updated;
  }

  async adminDeleteUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('user_not_found');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        status: false,
        banned: true,
      },
    });

    return { deleted: true };
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
        show_in_home: dto.show_in_home ?? true,
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

  async addGamesToCategory(categoryId: number, gameIds: number[]) {
    await this.ensureCategoryExists(categoryId);
    if (!gameIds || gameIds.length === 0) {
      return this.getCategoryById(categoryId);
    }
    await Promise.all(gameIds.map((id) => this.ensureGameExists(id)));
    return this.prisma.category.update({
      where: { id: categoryId },
      data: {
        games: {
          connect: gameIds.map((id) => ({ id })),
        },
      },
      include: { games: true },
    });
  }

  async removeGameFromCategory(categoryId: number, gameId: number) {
    await this.ensureCategoryExists(categoryId);
    await this.ensureGameExists(gameId);
    return this.prisma.category.update({
      where: { id: categoryId },
      data: {
        games: {
          disconnect: { id: gameId },
        },
      },
      include: { games: true },
    });
  }

  async listGames() {
    return this.prisma.game.findMany({
      orderBy: [{ weight: 'desc' }, { created_at: 'desc' }],
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
        weight: dto.weight ?? undefined,
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
    const existing = await this.prisma.game.findUnique({
      where: { id },
      select: {
        is_hot: true,
        categories: {
          select: { id: true },
        },
      },
    });
    if (!existing) {
      throw new NotFoundException('game_not_found');
    }

    const updated = await this.prisma.game.update({
      where: { id },
      data: dto,
    });

    const isHotChanging =
      dto.is_hot !== undefined && dto.is_hot !== existing.is_hot;

    if (isHotChanging) {
      const hotCategory = await this.prisma.category.findFirst({
        where: {
          is_active: true,
          OR: [
            { id: 1 },
            {
              name: {
                contains: 'Quente',
                mode: 'insensitive',
              },
            },
          ],
        },
        orderBy: { id: 'asc' },
      });

      if (hotCategory) {
        const isLinked = existing.categories.some(
          (category) => category.id === hotCategory.id,
        );

        if (dto.is_hot === true && !isLinked) {
          await this.prisma.category.update({
            where: { id: hotCategory.id },
            data: {
              games: {
                connect: { id },
              },
            },
          });
        }

        if (dto.is_hot === false && isLinked) {
          await this.prisma.category.update({
            where: { id: hotCategory.id },
            data: {
              games: {
                disconnect: { id },
              },
            },
          });
        }
      }
    }

    return updated;
  }

  async setGameCategories(gameId: number, categoryIds: number[]) {
    await this.ensureGameExists(gameId);
    if (!categoryIds || categoryIds.length === 0) {
      return this.prisma.game.update({
        where: { id: gameId },
        data: {
          categories: {
            set: [],
          },
        },
        include: { categories: true },
      });
    }
    await Promise.all(categoryIds.map((id) => this.ensureCategoryExists(id)));
    return this.prisma.game.update({
      where: { id: gameId },
      data: {
        categories: {
          set: categoryIds.map((id) => ({ id })),
        },
      },
      include: { categories: true },
    });
  }

  async deleteGame(id: number) {
    await this.ensureGameExists(id);
    await this.prisma.game.delete({ where: { id } });
    return { deleted: true };
  }

  async listBanners() {
    return this.prisma.banner.findMany({
      orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
    });
  }

  async createBanner(dto: CreateBannerDto) {
    return this.prisma.banner.create({
      data: {
        name: dto.name,
        image_url: dto.image_url,
        target_url: dto.target_url,
        is_active: dto.is_active ?? true,
        sort_order: dto.sort_order ?? 0,
      },
    });
  }

  async getBannerById(id: number) {
    const banner = await this.prisma.banner.findUnique({
      where: { id },
    });
    if (!banner) {
      throw new NotFoundException('banner_not_found');
    }
    return banner;
  }

  async updateBanner(id: number, dto: UpdateBannerDto) {
    await this.getBannerById(id);
    return this.prisma.banner.update({
      where: { id },
      data: dto,
    });
  }

  async deleteBanner(id: number) {
    await this.getBannerById(id);
    await this.prisma.banner.delete({ where: { id } });
    return { deleted: true };
  }

  async listSubBanners() {
    return this.prisma.subBanner.findMany({
      orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
    });
  }

  async createSubBanner(dto: CreateSubBannerDto) {
    return this.prisma.subBanner.create({
      data: {
        name: dto.name,
        image_url: dto.image_url,
        target_url: dto.target_url,
        is_active: dto.is_active ?? true,
        sort_order: dto.sort_order ?? 0,
      },
    });
  }

  async getSubBannerById(id: number) {
    const banner = await this.prisma.subBanner.findUnique({
      where: { id },
    });
    if (!banner) {
      throw new NotFoundException('sub_banner_not_found');
    }
    return banner;
  }

  async updateSubBanner(id: number, dto: UpdateSubBannerDto) {
    await this.getSubBannerById(id);
    return this.prisma.subBanner.update({
      where: { id },
      data: dto,
    });
  }

  async deleteSubBanner(id: number) {
    await this.getSubBannerById(id);
    await this.prisma.subBanner.delete({ where: { id } });
    return { deleted: true };
  }

  async listPopupBanners() {
    return this.prisma.popupBanner.findMany({
      orderBy: [{ sort_order: 'asc' }, { created_at: 'desc' }],
    });
  }

  async createPopupBanner(dto: CreatePopupBannerDto) {
    return this.prisma.popupBanner.create({
      data: {
        name: dto.name,
        image_url: dto.image_url,
        target_url: dto.target_url,
        is_active: dto.is_active ?? true,
        sort_order: dto.sort_order ?? 0,
      },
    });
  }

  async getPopupBannerById(id: number) {
    const banner = await this.prisma.popupBanner.findUnique({
      where: { id },
    });
    if (!banner) {
      throw new NotFoundException('popup_banner_not_found');
    }
    return banner;
  }

  async updatePopupBanner(id: number, dto: UpdatePopupBannerDto) {
    await this.getPopupBannerById(id);
    return this.prisma.popupBanner.update({
      where: { id },
      data: dto,
    });
  }

  async deletePopupBanner(id: number) {
    await this.getPopupBannerById(id);
    await this.prisma.popupBanner.delete({ where: { id } });
    return { deleted: true };
  }

  async listPopupIcons() {
    return this.prisma.popupIcon.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async createPopupIcon(dto: CreatePopupIconDto) {
    return this.prisma.popupIcon.create({
      data: {
        name: dto.name,
        image_url: dto.image_url,
        target_url: dto.target_url,
        is_active: dto.is_active ?? true,
        direction: dto.direction ?? 'right',
      },
    });
  }

  async getPopupIconById(id: number) {
    const icon = await this.prisma.popupIcon.findUnique({
      where: { id },
    });
    if (!icon) {
      throw new NotFoundException('popup_icon_not_found');
    }
    return icon;
  }

  async updatePopupIcon(id: number, dto: UpdatePopupIconDto) {
    await this.getPopupIconById(id);
    return this.prisma.popupIcon.update({
      where: { id },
      data: dto,
    });
  }

  async deletePopupIcon(id: number) {
    await this.getPopupIconById(id);
    await this.prisma.popupIcon.delete({ where: { id } });
    return { deleted: true };
  }

  async getSetting() {
    const setting = await this.prisma.setting.findUnique({
      where: { id: 1 },
    });
    if (!setting) {
      throw new NotFoundException('setting_not_found');
    }
    return setting;
  }

  async updateSetting(dto: UpdateSettingDto) {
    return this.prisma.setting.update({
      where: { id: 1 },
      data: { ...dto },
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

  async getGameProvidersConfig() {
    const [ppClone, pgClone, poker] = await this.prisma.$transaction([
      this.prisma.pPCloneProvider.findUnique({ where: { id: 1 } }),
      this.prisma.pGCloneProvider.findUnique({ where: { id: 1 } }),
      this.prisma.pokerProvider.findUnique({ where: { id: 1 } }),
    ]);

    return {
      pp_clone: ppClone ?? { has_config: false },
      pg_clone: pgClone ?? { has_config: false },
      poker: poker ?? { has_config: false },
    };
  }

  async updatePpCloneProvider(dto: UpdatePpProviderDto) {
    return this.prisma.pPCloneProvider.update({
      where: { id: 1 },
      data: { ...dto },
    });
  }

  async updatePgCloneProvider(dto: UpdatePgProviderDto) {
    return this.prisma.pGCloneProvider.update({
      where: { id: 1 },
      data: { ...dto },
    });
  }

  async updatePokerProvider(dto: UpdatePokerProviderDto) {
    return this.prisma.pokerProvider.update({
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

  async listDepositPromoEvents() {
    return this.prisma.depositPromoEvent.findMany({
      orderBy: [
        { is_active: 'desc' },
        { start_date: 'desc' },
        { created_at: 'desc' },
      ],
      include: {
        tiers: {
          orderBy: [{ sort_order: 'asc' }, { deposit_amount: 'asc' }],
        },
      },
    });
  }

  async getDepositPromoEventById(id: number) {
    const event = await this.prisma.depositPromoEvent.findUnique({
      where: { id },
      include: {
        tiers: {
          orderBy: [{ sort_order: 'asc' }, { deposit_amount: 'asc' }],
        },
      },
    });
    if (!event) {
      throw new NotFoundException('deposit_promo_event_not_found');
    }
    return event;
  }

  async createDepositPromoEvent(dto: CreateDepositPromoEventDto) {
    return this.prisma.depositPromoEvent.create({
      data: {
        name: dto.name,
        start_date: new Date(dto.start_date),
        end_date: new Date(dto.end_date),
        is_active: dto.is_active ?? true,
      },
    });
  }

  async updateDepositPromoEvent(id: number, dto: UpdateDepositPromoEventDto) {
    const exists = await this.prisma.depositPromoEvent.findUnique({
      where: { id },
    });
    if (!exists) {
      throw new NotFoundException('deposit_promo_event_not_found');
    }
    return this.prisma.depositPromoEvent.update({
      where: { id },
      data: {
        name: dto.name ?? exists.name,
        start_date: dto.start_date
          ? new Date(dto.start_date)
          : exists.start_date,
        end_date: dto.end_date ? new Date(dto.end_date) : exists.end_date,
        is_active: dto.is_active ?? exists.is_active,
      },
    });
  }

  async deleteDepositPromoEvent(id: number) {
    const exists = await this.prisma.depositPromoEvent.findUnique({
      where: { id },
    });
    if (!exists) {
      throw new NotFoundException('deposit_promo_event_not_found');
    }
    await this.prisma.depositPromoEvent.delete({
      where: { id },
    });
    return { deleted: true };
  }

  async listDepositPromoTiers(eventId?: number) {
    const where: Prisma.DepositPromoTierWhereInput = {};
    if (eventId) {
      where.event_id = eventId;
    }
    return this.prisma.depositPromoTier.findMany({
      where,
      orderBy: [{ sort_order: 'asc' }, { deposit_amount: 'asc' }],
      include: {
        event: true,
      },
    });
  }

  async getDepositPromoTierById(id: number) {
    const tier = await this.prisma.depositPromoTier.findUnique({
      where: { id },
      include: {
        event: true,
      },
    });
    if (!tier) {
      throw new NotFoundException('deposit_promo_tier_not_found');
    }
    return tier;
  }

  async createDepositPromoTier(dto: CreateDepositPromoTierDto) {
    const event = await this.prisma.depositPromoEvent.findUnique({
      where: { id: dto.event_id },
    });
    if (!event) {
      throw new NotFoundException('deposit_promo_event_not_found');
    }
    return this.prisma.depositPromoTier.create({
      data: {
        event_id: dto.event_id,
        name: dto.name,
        deposit_amount: dto.deposit_amount,
        bonus_amount: dto.bonus_amount,
        rollover_amount: dto.rollover_amount,
        is_active: dto.is_active ?? true,
        sort_order: dto.sort_order ?? 0,
      },
    });
  }

  async updateDepositPromoTier(id: number, dto: UpdateDepositPromoTierDto) {
    const tier = await this.prisma.depositPromoTier.findUnique({
      where: { id },
    });
    if (!tier) {
      throw new NotFoundException('deposit_promo_tier_not_found');
    }

    let eventId = tier.event_id;
    if (dto.event_id && dto.event_id !== tier.event_id) {
      const event = await this.prisma.depositPromoEvent.findUnique({
        where: { id: dto.event_id },
      });
      if (!event) {
        throw new NotFoundException('deposit_promo_event_not_found');
      }
      eventId = dto.event_id;
    }

    return this.prisma.depositPromoTier.update({
      where: { id },
      data: {
        event_id: eventId,
        name: dto.name ?? tier.name,
        deposit_amount:
          dto.deposit_amount !== undefined
            ? dto.deposit_amount
            : tier.deposit_amount,
        bonus_amount:
          dto.bonus_amount !== undefined ? dto.bonus_amount : tier.bonus_amount,
        rollover_amount:
          dto.rollover_amount !== undefined
            ? dto.rollover_amount
            : tier.rollover_amount,
        is_active: dto.is_active ?? tier.is_active,
        sort_order: dto.sort_order ?? tier.sort_order,
      },
    });
  }

  async deleteDepositPromoTier(id: number) {
    const tier = await this.prisma.depositPromoTier.findUnique({
      where: { id },
    });
    if (!tier) {
      throw new NotFoundException('deposit_promo_tier_not_found');
    }
    await this.prisma.depositPromoTier.delete({
      where: { id },
    });
    return { deleted: true };
  }

  async adminListDepositPromoParticipations(
    filters: AdminListDepositPromoParticipationsDto,
  ) {
    const rawPage = filters.page ?? 1;
    const rawPageSize = filters.page_size ?? 20;
    const page = Number(rawPage) > 0 ? Number(rawPage) : 1;
    const pageSize = Number(rawPageSize) > 0 ? Number(rawPageSize) : 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.DepositPromoParticipationWhereInput = {};

    if (filters.tier_id) {
      where.tier_id = filters.tier_id;
    }

    if (filters.event_id) {
      where.tier = {
        is: {
          event_id: filters.event_id,
        },
      };
    }

    if (filters.promo_date_from || filters.promo_date_to) {
      const promoDateFilter: Prisma.DateTimeFilter = {};
      if (filters.promo_date_from) {
        promoDateFilter.gte = new Date(filters.promo_date_from);
      }
      if (filters.promo_date_to) {
        promoDateFilter.lte = new Date(filters.promo_date_to);
      }
      where.promo_date = promoDateFilter;
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

    const allowedOrderFields: (keyof Prisma.DepositPromoParticipationOrderByWithRelationInput)[] =
      ['promo_date', 'id'];
    const requestedField =
      (filters.order_by as keyof Prisma.DepositPromoParticipationOrderByWithRelationInput) ??
      'promo_date';
    const orderByField = allowedOrderFields.includes(requestedField)
      ? requestedField
      : 'promo_date';
    const orderDir = (filters.order_dir ?? 'desc') as Prisma.SortOrder;

    const orderBy: Prisma.DepositPromoParticipationOrderByWithRelationInput = {
      [orderByField]: orderDir,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.depositPromoParticipation.findMany({
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
          tier: {
            include: {
              event: true,
            },
          },
          deposit: true,
        },
      }),
      this.prisma.depositPromoParticipation.count({ where }),
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

  async adminListWithdrawals(filters: AdminListWithdrawalsDto) {
    const rawPage = filters.page ?? 1;
    const rawPageSize = filters.page_size ?? 20;
    const page = Number(rawPage) > 0 ? Number(rawPage) : 1;
    const pageSize = Number(rawPageSize) > 0 ? Number(rawPageSize) : 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.WithdrawalWhereInput = {};

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

    const allowedOrderFields: (keyof Prisma.WithdrawalOrderByWithRelationInput)[] =
      ['created_at', 'amount', 'status', 'reference'];
    const requestedField =
      (filters.order_by as keyof Prisma.WithdrawalOrderByWithRelationInput) ??
      'created_at';
    const orderByField = allowedOrderFields.includes(requestedField)
      ? requestedField
      : 'created_at';
    const orderDir = (filters.order_dir ?? 'desc') as Prisma.SortOrder;

    const orderBy: Prisma.WithdrawalOrderByWithRelationInput = {
      [orderByField]: orderDir,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.withdrawal.findMany({
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
      this.prisma.withdrawal.count({ where }),
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

  async adminApproveWithdrawal(id: number) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id },
      select: {
        id: true,
        user_id: true,
        amount: true,
        status: true,
        user_name: true,
        user_document: true,
        user_keypix: true,
      },
    });

    if (!withdrawal) {
      throw new NotFoundException('withdrawal_not_found');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException('withdrawal_not_pending');
    }

    if (
      !withdrawal.user_name ||
      !withdrawal.user_document ||
      !withdrawal.user_keypix
    ) {
      throw new BadRequestException('withdrawal_missing_cashout_data');
    }

    const response = await this.pradaGateway.createCashout({
      name: withdrawal.user_name,
      cpf: withdrawal.user_document,
      keypix: withdrawal.user_keypix,
      amount: withdrawal.amount,
    });

    const idTransaction = (response as any)?.idTransaction ?? null;
    const now = new Date();

    await this.prisma.withdrawal.update({
      where: { id },
      data: {
        status: 'PAID',
        reference: idTransaction,
        paid_at: now,
      },
    });

    return this.prisma.withdrawal.findUnique({ where: { id } });
  }

  async adminRejectWithdrawal(id: number, reason?: string) {
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id },
    });

    if (!withdrawal) {
      throw new NotFoundException('withdrawal_not_found');
    }

    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException('withdrawal_not_pending');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.withdrawal.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reason,
        },
      });

      await tx.user.update({
        where: { id: withdrawal.user_id },
        data: {
          balance: {
            increment: withdrawal.amount,
          },
        },
      });
    });

    return this.prisma.withdrawal.findUnique({ where: { id } });
  }

  async adminListChestWithdrawals(filters: AdminListChestWithdrawalsDto) {
    const rawPage = filters.page ?? 1;
    const rawPageSize = filters.page_size ?? 20;
    const page = Number(rawPage) > 0 ? Number(rawPage) : 1;
    const pageSize = Number(rawPageSize) > 0 ? Number(rawPageSize) : 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ChestWithdrawalWhereInput = {};

    if (filters.status !== undefined) {
      if (filters.status === 'true') {
        where.status = true;
      } else if (filters.status === 'false') {
        where.status = false;
      }
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

    const allowedOrderFields: (keyof Prisma.ChestWithdrawalOrderByWithRelationInput)[] =
      ['created_at', 'amount', 'status', 'id'];
    const requestedField =
      (filters.order_by as keyof Prisma.ChestWithdrawalOrderByWithRelationInput) ??
      'created_at';
    const orderByField = allowedOrderFields.includes(requestedField)
      ? requestedField
      : 'created_at';
    const orderDir = (filters.order_dir ?? 'desc') as Prisma.SortOrder;

    const orderBy: Prisma.ChestWithdrawalOrderByWithRelationInput = {
      [orderByField]: orderDir,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.chestWithdrawal.findMany({
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
          chest: true,
        },
      }),
      this.prisma.chestWithdrawal.count({ where }),
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

  async adminListVipHistories(filters: AdminListVipHistoriesDto) {
    const rawPage = filters.page ?? 1;
    const rawPageSize = filters.page_size ?? 20;
    const page = Number(rawPage) > 0 ? Number(rawPage) : 1;
    const pageSize = Number(rawPageSize) > 0 ? Number(rawPageSize) : 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.VipHistoryWhereInput = {};

    if (filters.kind) {
      where.kind = filters.kind;
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

    const userConditions: Prisma.UserWhereInput = {};

    if (filters.user_pid) {
      userConditions.pid = filters.user_pid;
    }
    if (filters.user_document) {
      userConditions.document = filters.user_document;
    }

    if (Object.keys(userConditions).length > 0) {
      where.user = { is: userConditions };
    }

    if (filters.vip_level) {
      where.vip_level = {
        is: {
          id_vip: filters.vip_level,
        },
      };
    }

    const allowedOrderFields: (keyof Prisma.VipHistoryOrderByWithRelationInput)[] =
      ['created_at', 'bonus', 'goal', 'id'];
    const requestedField =
      (filters.order_by as keyof Prisma.VipHistoryOrderByWithRelationInput) ??
      'created_at';
    const orderByField = allowedOrderFields.includes(requestedField)
      ? requestedField
      : 'created_at';
    const orderDir = (filters.order_dir ?? 'desc') as Prisma.SortOrder;

    const orderBy: Prisma.VipHistoryOrderByWithRelationInput = {
      [orderByField]: orderDir,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.vipHistory.findMany({
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
          vip_level: true,
        },
      }),
      this.prisma.vipHistory.count({ where }),
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

  async listVipLevels() {
    return this.prisma.vipLevel.findMany({
      orderBy: { id_vip: 'asc' },
    });
  }

  async getVipLevelById(id: number) {
    const level = await this.prisma.vipLevel.findUnique({
      where: { id },
    });
    if (!level) {
      throw new NotFoundException('vip_level_not_found');
    }
    return level;
  }

  async createVipLevel(dto: CreateVipLevelDto) {
    return this.prisma.vipLevel.create({
      data: {
        id_vip: dto.id_vip,
        goal: dto.goal,
        bonus: dto.bonus,
        weekly_bonus: dto.weekly_bonus,
        monthly_bonus: dto.monthly_bonus,
      },
    });
  }

  async updateVipLevel(id: number, dto: UpdateVipLevelDto) {
    await this.getVipLevelById(id);
    return this.prisma.vipLevel.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  async deleteVipLevel(id: number) {
    await this.getVipLevelById(id);
    await this.prisma.vipLevel.delete({ where: { id } });
    return { deleted: true };
  }

  async listChests() {
    return this.prisma.chest.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async createChest(dto: CreateChestDto) {
    return this.prisma.chest.create({
      data: {
        need_referral: dto.need_referral,
        need_deposit: dto.need_deposit,
        need_bet: dto.need_bet,
        bonus: dto.bonus,
        is_active: dto.is_active ?? true,
      },
    });
  }

  async updateChest(id: number, dto: UpdateChestDto) {
    const chest = await this.prisma.chest.findUnique({
      where: { id },
    });
    if (!chest) {
      throw new NotFoundException('chest_not_found');
    }
    return this.prisma.chest.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  async deleteChest(id: number) {
    const chest = await this.prisma.chest.findUnique({
      where: { id },
    });
    if (!chest) {
      throw new NotFoundException('chest_not_found');
    }
    await this.prisma.chest.update({
      where: { id },
      data: {
        is_active: false,
      },
    });
    return { deleted: true };
  }

  async listReedemCodes() {
    return this.prisma.reedemCode.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async getReedemCodeById(id: number) {
    const code = await this.prisma.reedemCode.findUnique({
      where: { id },
    });
    if (!code) {
      throw new NotFoundException('redeem_code_not_found');
    }
    return code;
  }

  async createReedemCode(dto: CreateReedemCodeDto) {
    return this.prisma.reedemCode.create({
      data: {
        code: dto.code,
        max_collect: dto.max_collect,
        bonus: dto.bonus ?? 0,
        free_spins: dto.free_spins ?? 0,
        is_active: dto.is_active ?? true,
      },
    });
  }

  async updateReedemCode(id: number, dto: UpdateReedemCodeDto) {
    await this.getReedemCodeById(id);
    return this.prisma.reedemCode.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }

  async deleteReedemCode(id: number) {
    const code = await this.prisma.reedemCode.findUnique({
      where: { id },
    });
    if (!code) {
      throw new NotFoundException('redeem_code_not_found');
    }
    await this.prisma.reedemCode.update({
      where: { id },
      data: {
        is_active: false,
      },
    });
    return { deleted: true };
  }

  async adminListReedemCodeHistories(filters: AdminListReedemCodeHistoriesDto) {
    const rawPage = filters.page ?? 1;
    const rawPageSize = filters.page_size ?? 20;
    const page = Number(rawPage) > 0 ? Number(rawPage) : 1;
    const pageSize = Number(rawPageSize) > 0 ? Number(rawPageSize) : 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ReedemCodeHistoryWhereInput = {};

    if (filters.created_from || filters.created_to) {
      const collectedAtFilter: Prisma.DateTimeFilter = {};
      if (filters.created_from) {
        collectedAtFilter.gte = new Date(filters.created_from);
      }
      if (filters.created_to) {
        collectedAtFilter.lte = new Date(filters.created_to);
      }
      where.collected_at = collectedAtFilter;
    }

    if (filters.code) {
      where.reedem_code = {
        is: {
          code: filters.code,
        },
      };
    }

    const userConditions: Prisma.UserWhereInput = {};

    if (filters.user_pid) {
      userConditions.pid = filters.user_pid;
    }
    if (filters.user_document) {
      userConditions.document = filters.user_document;
    }

    if (Object.keys(userConditions).length > 0) {
      where.user = { is: userConditions };
    }

    const allowedOrderFields: (keyof Prisma.ReedemCodeHistoryOrderByWithRelationInput)[] =
      ['collected_at', 'id'];
    const requestedField =
      (filters.order_by as keyof Prisma.ReedemCodeHistoryOrderByWithRelationInput) ??
      'collected_at';
    const orderByField = allowedOrderFields.includes(requestedField)
      ? requestedField
      : 'collected_at';
    const orderDir = (filters.order_dir ?? 'desc') as Prisma.SortOrder;

    const orderBy: Prisma.ReedemCodeHistoryOrderByWithRelationInput = {
      [orderByField]: orderDir,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.reedemCodeHistory.findMany({
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
          reedem_code: true,
        },
      }),
      this.prisma.reedemCodeHistory.count({ where }),
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

  async listRakebackSettings() {
    return this.prisma.rakebackSetting.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async getRakebackSettingById(id: number) {
    const setting = await this.prisma.rakebackSetting.findUnique({
      where: { id },
    });
    if (!setting) {
      throw new NotFoundException('rakeback_setting_not_found');
    }
    return setting;
  }

  async createRakebackSetting(dto: CreateRakebackSettingDto) {
    return this.prisma.rakebackSetting.create({
      data: {
        name: dto.name,
        min_volume: new Prisma.Decimal(dto.min_volume),
        percentage: new Prisma.Decimal(dto.percentage),
        is_active: dto.is_active ?? true,
      },
    });
  }

  async updateRakebackSetting(id: number, dto: UpdateRakebackSettingDto) {
    await this.getRakebackSettingById(id);

    const data: Prisma.RakebackSettingUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name;
    }
    if (dto.min_volume !== undefined) {
      data.min_volume = new Prisma.Decimal(dto.min_volume);
    }
    if (dto.percentage !== undefined) {
      data.percentage = new Prisma.Decimal(dto.percentage);
    }
    if (dto.is_active !== undefined) {
      data.is_active = dto.is_active;
    }

    return this.prisma.rakebackSetting.update({
      where: { id },
      data,
    });
  }

  async deleteRakebackSetting(id: number) {
    await this.getRakebackSettingById(id);
    await this.prisma.rakebackSetting.delete({
      where: { id },
    });
    return { deleted: true };
  }

  async adminListRakebackHistories(filters: AdminListRakebackHistoriesDto) {
    const rawPage = filters.page ?? 1;
    const rawPageSize = filters.page_size ?? 20;
    const page = Number(rawPage) > 0 ? Number(rawPage) : 1;
    const pageSize = Number(rawPageSize) > 0 ? Number(rawPageSize) : 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.RakebackHistoryWhereInput = {};

    if (filters.setting_id) {
      where.setting_id = filters.setting_id;
    }

    if (filters.redeemed !== undefined) {
      const isRedeemed =
        filters.redeemed === 'true' || filters.redeemed === '1';
      where.redeemed = isRedeemed;
    }

    if (filters.created_from || filters.created_to) {
      const createdFilter: Prisma.DateTimeFilter = {};
      if (filters.created_from) {
        createdFilter.gte = new Date(filters.created_from);
      }
      if (filters.created_to) {
        createdFilter.lte = new Date(filters.created_to);
      }
      where.created_at = createdFilter;
    }

    const userConditions: Prisma.UserWhereInput = {};

    if (filters.user_pid) {
      userConditions.pid = filters.user_pid;
    }
    if (filters.user_document) {
      userConditions.document = filters.user_document;
    }

    if (Object.keys(userConditions).length > 0) {
      where.user = { is: userConditions };
    }

    const allowedOrderFields: (keyof Prisma.RakebackHistoryOrderByWithRelationInput)[] =
      ['created_at', 'amount', 'redeemed', 'id'];
    const requestedField =
      (filters.order_by as keyof Prisma.RakebackHistoryOrderByWithRelationInput) ??
      'created_at';
    const orderByField = allowedOrderFields.includes(requestedField)
      ? requestedField
      : 'created_at';
    const orderDir = (filters.order_dir ?? 'desc') as Prisma.SortOrder;

    const orderBy: Prisma.RakebackHistoryOrderByWithRelationInput = {
      [orderByField]: orderDir,
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.rakebackHistory.findMany({
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
          setting: true,
        },
      }),
      this.prisma.rakebackHistory.count({ where }),
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

  @Cron('59 23 * * *')
  async runDailyRakebackJob() {
    const now = new Date();
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const settings = await this.prisma.rakebackSetting.findMany({
      where: {
        is_active: true,
      },
      orderBy: {
        min_volume: 'asc',
      },
    });

    if (!settings.length) {
      return {
        processed_users: 0,
        created_histories: 0,
      };
    }

    const grouped = await (this.prisma as any).gameTransaction.groupBy({
      by: ['user_id'],
      _sum: {
        amount: true,
      },
      where: {
        action: 'bet',
        created_at: {
          gte: from,
          lte: now,
        },
      },
    });

    if (!grouped.length) {
      return {
        processed_users: 0,
        created_histories: 0,
      };
    }

    let createdHistories = 0;

    for (const row of grouped) {
      const sum = row._sum.amount;
      const volume =
        typeof sum === 'number' ? sum : sum ? Number(sum.toString()) : 0;

      if (!Number.isFinite(volume) || volume <= 0) {
        continue;
      }

      let selectedSetting: (typeof settings)[number] | null = null;
      for (const setting of settings) {
        const minVolumeNumber = Number(setting.min_volume.toString());
        if (volume >= minVolumeNumber) {
          selectedSetting = setting;
        } else {
          break;
        }
      }

      if (!selectedSetting) {
        continue;
      }

      const percentageNumber = Number(selectedSetting.percentage.toString());
      if (!Number.isFinite(percentageNumber) || percentageNumber <= 0) {
        continue;
      }

      const rakebackAmount = (volume * percentageNumber) / 100;
      if (!Number.isFinite(rakebackAmount) || rakebackAmount <= 0) {
        continue;
      }

      const alreadyExists = await this.prisma.rakebackHistory.findFirst({
        where: {
          user_id: row.user_id,
          setting_id: selectedSetting.id,
          created_at: {
            gte: from,
            lte: now,
          },
        },
      });

      if (alreadyExists) {
        continue;
      }

      const amountDecimal = new Prisma.Decimal(rakebackAmount);

      await this.prisma.rakebackHistory.create({
        data: {
          user_id: row.user_id,
          setting_id: selectedSetting.id,
          amount: amountDecimal,
        },
      });

      createdHistories += 1;
    }

    return {
      processed_users: grouped.length,
      created_histories: createdHistories,
    };
  }

  async runVipWeeklyBonusJob() {
    const now = new Date();
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const users = await this.prisma.user.findMany({
      where: {
        vip: { gt: 0 },
        status: true,
        banned: false,
      },
      select: {
        id: true,
        vip: true,
      },
    });

    if (!users.length) {
      return {
        processed_users: 0,
        created_histories: 0,
      };
    }

    const levels = await this.prisma.vipLevel.findMany();

    const levelsByIdVip = new Map<number, (typeof levels)[number]>();
    for (const level of levels) {
      levelsByIdVip.set(level.id_vip, level);
    }

    let createdHistories = 0;

    for (const user of users) {
      const currentVip = user.vip ?? 0;
      const level = levelsByIdVip.get(currentVip);
      if (!level) {
        continue;
      }

      const weeklyBonusDecimal = level.weekly_bonus;
      const weeklyBonusNumber = Number(weeklyBonusDecimal.toString());
      if (!Number.isFinite(weeklyBonusNumber) || weeklyBonusNumber <= 0) {
        continue;
      }

      const alreadyReceived = await this.prisma.vipHistory.findFirst({
        where: {
          user_id: user.id,
          vip_level_id: level.id,
          kind: 'weekly',
          created_at: {
            gte: from,
          },
        },
      });

      if (alreadyReceived) {
        continue;
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.vipHistory.create({
          data: {
            user_id: user.id,
            vip_level_id: level.id,
            goal: level.goal,
            bonus: weeklyBonusDecimal,
            kind: 'weekly',
          },
        });

        await tx.user.update({
          where: { id: user.id },
          data: {
            vip_balance: {
              increment: weeklyBonusDecimal,
            },
          },
        });
      });

      createdHistories += 1;
    }

    return {
      processed_users: users.length,
      created_histories: createdHistories,
    };
  }

  async runVipMonthlyBonusJob() {
    const now = new Date();
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const users = await this.prisma.user.findMany({
      where: {
        vip: { gt: 0 },
        status: true,
        banned: false,
      },
      select: {
        id: true,
        vip: true,
      },
    });

    if (!users.length) {
      return {
        processed_users: 0,
        created_histories: 0,
      };
    }

    const levels = await this.prisma.vipLevel.findMany();

    const levelsByIdVip = new Map<number, (typeof levels)[number]>();
    for (const level of levels) {
      levelsByIdVip.set(level.id_vip, level);
    }

    let createdHistories = 0;

    for (const user of users) {
      const currentVip = user.vip ?? 0;
      const level = levelsByIdVip.get(currentVip);
      if (!level) {
        continue;
      }

      const monthlyBonusDecimal = level.monthly_bonus;
      const monthlyBonusNumber = Number(monthlyBonusDecimal.toString());
      if (!Number.isFinite(monthlyBonusNumber) || monthlyBonusNumber <= 0) {
        continue;
      }

      const alreadyReceived = await this.prisma.vipHistory.findFirst({
        where: {
          user_id: user.id,
          vip_level_id: level.id,
          kind: 'monthly',
          created_at: {
            gte: from,
          },
        },
      });

      if (alreadyReceived) {
        continue;
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.vipHistory.create({
          data: {
            user_id: user.id,
            vip_level_id: level.id,
            goal: level.goal,
            bonus: monthlyBonusDecimal,
            kind: 'monthly',
          },
        });

        await tx.user.update({
          where: { id: user.id },
          data: {
            vip_balance: {
              increment: monthlyBonusDecimal,
            },
          },
        });
      });

      createdHistories += 1;
    }

    return {
      processed_users: users.length,
      created_histories: createdHistories,
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

  async getDashboard() {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOf7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOf30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Deposits stats
    const [depositsToday, deposits7d, deposits30d] = await Promise.all([
      this.prisma.deposit.aggregate({
        where: {
          status: 'PAID',
          created_at: { gte: startOfToday },
        },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.deposit.aggregate({
        where: {
          status: 'PAID',
          created_at: { gte: startOf7Days },
        },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.deposit.aggregate({
        where: {
          status: 'PAID',
          created_at: { gte: startOf30Days },
        },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    // Withdrawals stats
    const [withdrawalsToday, withdrawals7d, withdrawals30d] = await Promise.all(
      [
        this.prisma.withdrawal.aggregate({
          where: {
            status: 'PAID',
            created_at: { gte: startOfToday },
          },
          _count: true,
          _sum: { amount: true },
        }),
        this.prisma.withdrawal.aggregate({
          where: {
            status: 'PAID',
            created_at: { gte: startOf7Days },
          },
          _count: true,
          _sum: { amount: true },
        }),
        this.prisma.withdrawal.aggregate({
          where: {
            status: 'PAID',
            created_at: { gte: startOf30Days },
          },
          _count: true,
          _sum: { amount: true },
        }),
      ],
    );

    // Users stats
    const [usersToday, users7d, users30d, totalUsers] = await Promise.all([
      this.prisma.user.count({
        where: { created_at: { gte: startOfToday } },
      }),
      this.prisma.user.count({
        where: { created_at: { gte: startOf7Days } },
      }),
      this.prisma.user.count({
        where: { created_at: { gte: startOf30Days } },
      }),
      this.prisma.user.count(),
    ]);

    // Games stats
    const [totalGames, activeGames, hotGames, gamesViews] = await Promise.all([
      this.prisma.game.count(),
      this.prisma.game.count({ where: { is_active: true } }),
      this.prisma.game.count({ where: { is_hot: true, is_active: true } }),
      this.prisma.game.aggregate({ _sum: { views: true } }),
    ]);

    // VIP stats
    const [
      totalVipUsers,
      vipBonusesToday,
      vipBonuses7d,
      vipBonuses30d,
      vipUsersByLevel,
    ] = await Promise.all([
      this.prisma.user.count({ where: { vip: { gt: 0 } } }),
      this.prisma.vipHistory.aggregate({
        where: { created_at: { gte: startOfToday } },
        _count: true,
        _sum: { bonus: true },
      }),
      this.prisma.vipHistory.aggregate({
        where: { created_at: { gte: startOf7Days } },
        _count: true,
        _sum: { bonus: true },
      }),
      this.prisma.vipHistory.aggregate({
        where: { created_at: { gte: startOf30Days } },
        _count: true,
        _sum: { bonus: true },
      }),
      this.prisma.user.groupBy({
        by: ['vip'],
        where: { vip: { gt: 0 } },
        _count: true,
      }),
    ]);

    // Rakeback stats
    const [
      rakebackTotal,
      rakebackPending,
      rakebackRedeemed,
      rakebackToday,
      rakeback7d,
      rakeback30d,
    ] = await Promise.all([
      this.prisma.rakebackHistory.aggregate({
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.rakebackHistory.aggregate({
        where: { redeemed: false },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.rakebackHistory.aggregate({
        where: { redeemed: true },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.rakebackHistory.aggregate({
        where: { created_at: { gte: startOfToday } },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.rakebackHistory.aggregate({
        where: { created_at: { gte: startOf7Days } },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.rakebackHistory.aggregate({
        where: { created_at: { gte: startOf30Days } },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    return {
      deposits: {
        today: {
          count: depositsToday._count,
          amount: depositsToday._sum.amount ?? 0,
        },
        last_7_days: {
          count: deposits7d._count,
          amount: deposits7d._sum.amount ?? 0,
        },
        last_30_days: {
          count: deposits30d._count,
          amount: deposits30d._sum.amount ?? 0,
        },
      },
      withdrawals: {
        today: {
          count: withdrawalsToday._count,
          amount: withdrawalsToday._sum.amount ?? 0,
        },
        last_7_days: {
          count: withdrawals7d._count,
          amount: withdrawals7d._sum.amount ?? 0,
        },
        last_30_days: {
          count: withdrawals30d._count,
          amount: withdrawals30d._sum.amount ?? 0,
        },
      },
      users: {
        total: totalUsers,
        today: usersToday,
        last_7_days: users7d,
        last_30_days: users30d,
      },
      games: {
        total: totalGames,
        active: activeGames,
        hot: hotGames,
        total_views: gamesViews._sum.views ?? 0,
      },
      vip: {
        total_vip_users: totalVipUsers,
        users_by_level: vipUsersByLevel.map((item) => ({
          level: item.vip,
          count: item._count,
        })),
        bonuses: {
          today: {
            count: vipBonusesToday._count,
            amount: vipBonusesToday._sum.bonus ?? 0,
          },
          last_7_days: {
            count: vipBonuses7d._count,
            amount: vipBonuses7d._sum.bonus ?? 0,
          },
          last_30_days: {
            count: vipBonuses30d._count,
            amount: vipBonuses30d._sum.bonus ?? 0,
          },
        },
      },
      rakeback: {
        total: {
          count: rakebackTotal._count,
          amount: rakebackTotal._sum.amount ?? 0,
        },
        pending: {
          count: rakebackPending._count,
          amount: rakebackPending._sum.amount ?? 0,
        },
        redeemed: {
          count: rakebackRedeemed._count,
          amount: rakebackRedeemed._sum.amount ?? 0,
        },
        today: {
          count: rakebackToday._count,
          amount: rakebackToday._sum.amount ?? 0,
        },
        last_7_days: {
          count: rakeback7d._count,
          amount: rakeback7d._sum.amount ?? 0,
        },
        last_30_days: {
          count: rakeback30d._count,
          amount: rakeback30d._sum.amount ?? 0,
        },
      },
      generated_at: now.toISOString(),
    };
  }
}
