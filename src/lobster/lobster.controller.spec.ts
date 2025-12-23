import { Test, TestingModule } from '@nestjs/testing';
import { LobsterController } from './lobster.controller';
import { LobsterService } from './lobster.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('LobsterController', () => {
  let controller: LobsterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LobsterController],
      providers: [LobsterService, PrismaService, JwtService],
    }).compile();

    controller = module.get<LobsterController>(LobsterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
