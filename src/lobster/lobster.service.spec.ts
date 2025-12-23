import { Test, TestingModule } from '@nestjs/testing';
import { LobsterService } from './lobster.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('LobsterService', () => {
  let service: LobsterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LobsterService, PrismaService, JwtService],
    }).compile();

    service = module.get<LobsterService>(LobsterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
