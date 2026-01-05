import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LobsterService } from './lobster.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import {
  AddGamesToCategoryDto,
  SetGameCategoriesDto,
  UpdateCategoryDto,
} from './dto/update-category.dto';
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

class AdminRejectWithdrawalDto {
  reason?: string;
}

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
  @Post('categories/:id/games')
  addGamesToCategory(
    @Param('id', ParseIntPipe) categoryId: number,
    @Body() dto: AddGamesToCategoryDto,
  ) {
    return this.lobsterService.addGamesToCategory(categoryId, dto.game_ids);
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
  @Post('games/:id/categories')
  setGameCategories(
    @Param('id', ParseIntPipe) gameId: number,
    @Body() dto: SetGameCategoriesDto,
  ) {
    return this.lobsterService.setGameCategories(gameId, dto.category_ids);
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
  @Get('banners')
  listBanners() {
    return this.lobsterService.listBanners();
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('banners')
  createBanner(@Body() dto: CreateBannerDto) {
    return this.lobsterService.createBanner(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('banners/:id')
  getBannerById(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.getBannerById(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('banners/:id')
  updateBanner(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBannerDto,
  ) {
    return this.lobsterService.updateBanner(id, dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Delete('banners/:id')
  deleteBanner(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.deleteBanner(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('sub-banners')
  listSubBanners() {
    return this.lobsterService.listSubBanners();
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('sub-banners')
  createSubBanner(@Body() dto: CreateSubBannerDto) {
    return this.lobsterService.createSubBanner(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('sub-banners/:id')
  getSubBannerById(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.getSubBannerById(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('sub-banners/:id')
  updateSubBanner(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubBannerDto,
  ) {
    return this.lobsterService.updateSubBanner(id, dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Delete('sub-banners/:id')
  deleteSubBanner(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.deleteSubBanner(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('popup-banners')
  listPopupBanners() {
    return this.lobsterService.listPopupBanners();
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('popup-banners')
  createPopupBanner(@Body() dto: CreatePopupBannerDto) {
    return this.lobsterService.createPopupBanner(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('popup-banners/:id')
  getPopupBannerById(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.getPopupBannerById(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('popup-banners/:id')
  updatePopupBanner(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePopupBannerDto,
  ) {
    return this.lobsterService.updatePopupBanner(id, dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Delete('popup-banners/:id')
  deletePopupBanner(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.deletePopupBanner(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('popup-icons')
  listPopupIcons() {
    return this.lobsterService.listPopupIcons();
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('popup-icons')
  createPopupIcon(@Body() dto: CreatePopupIconDto) {
    return this.lobsterService.createPopupIcon(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('popup-icons/:id')
  getPopupIconById(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.getPopupIconById(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('popup-icons/:id')
  updatePopupIcon(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePopupIconDto,
  ) {
    return this.lobsterService.updatePopupIcon(id, dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Delete('popup-icons/:id')
  deletePopupIcon(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.deletePopupIcon(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('setting')
  getSetting() {
    return this.lobsterService.getSetting();
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('setting')
  updateSetting(@Body() dto: UpdateSettingDto) {
    return this.lobsterService.updateSetting(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('game-providers')
  getGameProvidersConfig() {
    return this.lobsterService.getGameProvidersConfig();
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('game-providers/pp-clone')
  updatePpCloneProvider(@Body() dto: UpdatePpProviderDto) {
    return this.lobsterService.updatePpCloneProvider(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('game-providers/pg-clone')
  updatePgCloneProvider(@Body() dto: UpdatePgProviderDto) {
    return this.lobsterService.updatePgCloneProvider(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('game-providers/poker')
  updatePokerProvider(@Body() dto: UpdatePokerProviderDto) {
    return this.lobsterService.updatePokerProvider(dto);
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

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('promotions')
  listPromotions() {
    return this.lobsterService.listPromotions();
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('promotions/:id')
  getPromotionById(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.getPromotionById(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('promotions')
  createPromotion(@Body() dto: CreatePromotionDto) {
    return this.lobsterService.createPromotion(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('promotions/:id')
  updatePromotion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.lobsterService.updatePromotion(id, dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Delete('promotions/:id')
  deletePromotion(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.deletePromotion(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('chests')
  listChests() {
    return this.lobsterService.listChests();
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('chests')
  createChest(@Body() dto: CreateChestDto) {
    return this.lobsterService.createChest(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('chests/:id')
  updateChest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateChestDto,
  ) {
    return this.lobsterService.updateChest(id, dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Delete('chests/:id')
  deleteChest(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.deleteChest(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('users')
  adminListUsers(@Query() query: AdminListUsersDto) {
    return this.lobsterService.adminListUsers(query);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('users/:id')
  adminGetUserById(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.adminGetUserById(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('users')
  adminCreateUser(@Body() dto: AdminCreateUserDto) {
    return this.lobsterService.adminCreateUser(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('users/:id')
  adminUpdateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminUpdateUserDto,
  ) {
    return this.lobsterService.adminUpdateUser(id, dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Delete('users/:id')
  adminDeleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.adminDeleteUser(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('deposits')
  adminListDeposits(@Query() query: AdminListDepositsDto) {
    return this.lobsterService.adminListDeposits(query);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('withdrawals')
  adminListWithdrawals(@Query() query: AdminListWithdrawalsDto) {
    return this.lobsterService.adminListWithdrawals(query);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('chest-withdrawals')
  adminListChestWithdrawals(@Query() query: AdminListChestWithdrawalsDto) {
    return this.lobsterService.adminListChestWithdrawals(query);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('redeem-codes')
  listReedemCodes() {
    return this.lobsterService.listReedemCodes();
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('redeem-codes/:id')
  getReedemCodeById(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.getReedemCodeById(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('redeem-codes')
  createReedemCode(@Body() dto: CreateReedemCodeDto) {
    return this.lobsterService.createReedemCode(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('redeem-codes/:id')
  updateReedemCode(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReedemCodeDto,
  ) {
    return this.lobsterService.updateReedemCode(id, dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Delete('redeem-codes/:id')
  deleteReedemCode(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.deleteReedemCode(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('redeem-code-histories')
  adminListReedemCodeHistories(
    @Query() query: AdminListReedemCodeHistoriesDto,
  ) {
    return this.lobsterService.adminListReedemCodeHistories(query);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('vip-histories')
  adminListVipHistories(@Query() query: AdminListVipHistoriesDto) {
    return this.lobsterService.adminListVipHistories(query);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('vip-levels')
  listVipLevels() {
    return this.lobsterService.listVipLevels();
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('vip-levels/:id')
  getVipLevelById(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.getVipLevelById(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('vip-levels')
  createVipLevel(@Body() dto: CreateVipLevelDto) {
    return this.lobsterService.createVipLevel(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('vip-levels/:id')
  updateVipLevel(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVipLevelDto,
  ) {
    return this.lobsterService.updateVipLevel(id, dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Delete('vip-levels/:id')
  deleteVipLevel(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.deleteVipLevel(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('vip-bonuses/weekly')
  runVipWeeklyBonusJob() {
    return this.lobsterService.runVipWeeklyBonusJob();
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('vip-bonuses/monthly')
  runVipMonthlyBonusJob() {
    return this.lobsterService.runVipMonthlyBonusJob();
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('rakeback-settings')
  listRakebackSettings() {
    return this.lobsterService.listRakebackSettings();
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('rakeback-settings/:id')
  getRakebackSettingById(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.getRakebackSettingById(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('rakeback-settings')
  createRakebackSetting(@Body() dto: CreateRakebackSettingDto) {
    return this.lobsterService.createRakebackSetting(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('rakeback-settings/:id')
  updateRakebackSetting(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRakebackSettingDto,
  ) {
    return this.lobsterService.updateRakebackSetting(id, dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Delete('rakeback-settings/:id')
  deleteRakebackSetting(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.deleteRakebackSetting(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('rakeback-histories')
  adminListRakebackHistories(
    @Query() query: AdminListRakebackHistoriesDto,
  ) {
    return this.lobsterService.adminListRakebackHistories(query);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('deposit-promo-events')
  listDepositPromoEvents() {
    return this.lobsterService.listDepositPromoEvents();
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('deposit-promo-events/:id')
  getDepositPromoEventById(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.getDepositPromoEventById(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('deposit-promo-events')
  createDepositPromoEvent(@Body() dto: CreateDepositPromoEventDto) {
    return this.lobsterService.createDepositPromoEvent(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('deposit-promo-events/:id')
  updateDepositPromoEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepositPromoEventDto,
  ) {
    return this.lobsterService.updateDepositPromoEvent(id, dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Delete('deposit-promo-events/:id')
  deleteDepositPromoEvent(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.deleteDepositPromoEvent(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('deposit-promo-tiers')
  listDepositPromoTiers(@Query('event_id') eventId?: string) {
    const id = eventId ? Number(eventId) : undefined;
    return this.lobsterService.listDepositPromoTiers(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('deposit-promo-tiers/:id')
  getDepositPromoTierById(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.getDepositPromoTierById(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Post('deposit-promo-tiers')
  createDepositPromoTier(@Body() dto: CreateDepositPromoTierDto) {
    return this.lobsterService.createDepositPromoTier(dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Patch('deposit-promo-tiers/:id')
  updateDepositPromoTier(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDepositPromoTierDto,
  ) {
    return this.lobsterService.updateDepositPromoTier(id, dto);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Delete('deposit-promo-tiers/:id')
  deleteDepositPromoTier(@Param('id', ParseIntPipe) id: number) {
    return this.lobsterService.deleteDepositPromoTier(id);
  }

  @UseGuards(AuthGuard('admin-jwt'))
  @Get('deposit-promo-participations')
  adminListDepositPromoParticipations(
    @Query() query: AdminListDepositPromoParticipationsDto,
  ) {
    return this.lobsterService.adminListDepositPromoParticipations(query);
  }
}
