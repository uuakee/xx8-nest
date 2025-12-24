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
}
