import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { SyscomService } from './syscom.service';

@Controller('syscom')
export class SyscomController {
  constructor(private readonly syscomService: SyscomService) {}

  @Get('categories')
  listCategories() {
    return this.syscomService.listCategories();
  }

  @Get('categories-with-games')
  listCategoriesWithGames() {
    return this.syscomService.listCategoriesWithGames();
  }

  @Get('categories/:id/games')
  listCategoryGames(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page?: string,
    @Query('page_size') pageSize?: string,
  ) {
    const p = Number(page);
    const ps = Number(pageSize);
    const pageNum = Number.isFinite(p) && p > 0 ? p : 1;
    const pageSizeNum = Number.isFinite(ps) && ps > 0 ? ps : 20;
    return this.syscomService.listCategoryGames(id, pageNum, pageSizeNum);
  }

  @Get('messages')
  listMessages() {
    return this.syscomService.listMessages();
  }

  @Get('promotions')
  listPromotions() {
    return this.syscomService.listPromotions();
  }

  @Get('banners')
  listBanners() {
    return this.syscomService.listBanners();
  }

  @Get('sub-banners')
  listSubBanners() {
    return this.syscomService.listSubBanners();
  }

  @Get('popup-banners')
  listPopupBanners() {
    return this.syscomService.listPopupBanners();
  }

  @Get('popup-icons')
  listPopupIcons() {
    return this.syscomService.listPopupIcons();
  }

  @Get('settings')
  getSettings() {
    return this.syscomService.getSettings();
  }

  @Get('vip-levels')
  listVipLevels() {
    return this.syscomService.listVipLevels();
  }
}
