import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LobsterService } from './lobster.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { UpdatePradaPaymentDto } from './dto/update-prada-payment.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Controller('lobster')
export class LobsterController {
  constructor(private readonly lobsterService: LobsterService) {}

  @Post('login')
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.lobsterService.adminLogin(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('categories')
  listCategories() {
    return this.lobsterService.listCategories();
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.lobsterService.createCategory(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('categories/:id')
  getCategoryById(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.getCategoryById(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('categories/:id')
  updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.lobsterService.updateCategory(id, dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('categories/:id/games/:gameId')
  addGameToCategory(
    @Param('id', ParseIntPipe) categoryId: number,
    @Param('gameId', ParseIntPipe) gameId: number,
  ) {
    return this.lobsterService.addGameToCategory(categoryId, gameId);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('games')
  listGames() {
    return this.lobsterService.listGames();
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('games')
  createGame(@Body() dto: CreateGameDto) {
    return this.lobsterService.createGame(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('games/:id')
  getGameById(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.getGameById(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('games/:id')
  updateGame(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGameDto,
  ) {
    return this.lobsterService.updateGame(id, dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('prada-payment')
  getPradaPayment() {
    return this.lobsterService.getPradaPayment();
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('prada-payment')
  updatePradaPayment(@Body() dto: UpdatePradaPaymentDto) {
    return this.lobsterService.updatePradaPayment(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('messages')
  listMessages() {
    return this.lobsterService.listMessages();
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('messages')
  createMessage(@Body() dto: CreateMessageDto) {
    return this.lobsterService.createMessage(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('messages/:id')
  updateMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.lobsterService.updateMessage(id, dto);
  }
}
