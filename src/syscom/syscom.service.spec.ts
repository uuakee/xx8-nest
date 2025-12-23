import { Test, TestingModule } from '@nestjs/testing';
import { SyscomService } from './syscom.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SyscomService', () => {
  let service: SyscomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SyscomService, PrismaService],
    }).compile();

    service = module.get<SyscomService>(SyscomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
