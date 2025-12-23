import { Test, TestingModule } from '@nestjs/testing';
import { SyscomController } from './syscom.controller';
import { SyscomService } from './syscom.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SyscomController', () => {
  let controller: SyscomController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SyscomController],
      providers: [SyscomService, PrismaService],
    }).compile();

    controller = module.get<SyscomController>(SyscomController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
