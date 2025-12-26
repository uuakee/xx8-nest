import { Controller, Get } from '@nestjs/common';
import { SyscomService } from './syscom.service';

@Controller('syscom')
export class SyscomController {
  constructor(private readonly syscomService: SyscomService) {}

  @Get('categories')
  listCategories() {
    return this.syscomService.listCategories();
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
}
