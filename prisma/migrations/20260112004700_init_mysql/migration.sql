-- CreateTable
CREATE TABLE `administrators` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `token_recover` VARCHAR(191) NULL,
    `otp_code` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NOT NULL DEFAULT 'https://imgcdn.stablediffusionweb.com/2024/5/8/852aa9d2-d1f0-4353-b8f0-cd4f45e8c862.jpg',

    UNIQUE INDEX `administrators_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `affiliate_histories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `affiliate_user_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `cpa_level` INTEGER NOT NULL DEFAULT 0,
    `revshare_level` INTEGER NOT NULL DEFAULT 0,
    `type` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `affiliate_histories_affiliate_user_id_idx`(`affiliate_user_id`),
    INDEX `affiliate_histories_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `banners` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `image_url` VARCHAR(191) NOT NULL,
    `target_url` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `image` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `show_in_home` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chest_withdrawls` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `chest_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `status` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `chest_withdrawls_chest_id_idx`(`chest_id`),
    INDEX `chest_withdrawls_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `need_referral` INTEGER NOT NULL DEFAULT 0,
    `need_deposit` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `need_bet` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `bonus` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `default_affiliate_bonuses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cpa_level_1` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `cpa_level_2` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `cpa_level_3` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `revshare_fake` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `revshare_level_1` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `revshare_level_2` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `revshare_level_3` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `min_deposit_for_cpa` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `fake_revshare` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deposit_promo_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deposit_promo_participations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `tier_id` INTEGER NOT NULL,
    `deposit_id` INTEGER NOT NULL,
    `promo_date` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `deposit_promo_participations_deposit_id_idx`(`deposit_id`),
    INDEX `deposit_promo_participations_tier_id_idx`(`tier_id`),
    INDEX `deposit_promo_participations_user_id_promo_date_idx`(`user_id`, `promo_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deposit_promo_tiers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `event_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `deposit_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `bonus_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `rollover_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `deposit_promo_tiers_event_id_idx`(`event_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deposits` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `request_number` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `paid_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `deposits_user_id_created_at_status_reference_idx`(`user_id`, `created_at`, `status`, `reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `game_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `player_id` INTEGER NOT NULL,
    `session_id` VARCHAR(191) NULL,
    `provider_transaction_id` VARCHAR(191) NULL,
    `internal_transaction_id` VARCHAR(191) NULL,
    `game_uuid` VARCHAR(191) NULL,
    `round_id` VARCHAR(191) NULL,
    `amount` DECIMAL(10, 2) NULL,
    `currency` VARCHAR(191) NULL DEFAULT 'BRL',
    `raw_request` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `game_transactions_player_id_created_at_idx`(`player_id`, `created_at`),
    INDEX `game_transactions_provider_transaction_id_idx`(`provider_transaction_id`),
    INDEX `game_transactions_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `games` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `game_code` VARCHAR(191) NOT NULL,
    `game_id` VARCHAR(191) NULL,
    `image` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `game_type` ENUM('SLOTS', 'FISHING', 'CASINO') NULL,
    `currency` VARCHAR(191) NULL DEFAULT 'BRL',
    `rtp` DECIMAL(5, 2) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `distribution` VARCHAR(191) NULL,
    `is_hot` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `show_in_home` BOOLEAN NOT NULL DEFAULT true,
    `views` INTEGER NOT NULL DEFAULT 0,
    `weight` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `level_promo_bonuses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tier_id` INTEGER NOT NULL,
    `day_index` INTEGER NOT NULL,
    `bonus_value` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    INDEX `level_promo_bonuses_tier_id_day_index_idx`(`tier_id`, `day_index`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `level_promo_progresses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `current_day` INTEGER NOT NULL DEFAULT 0,
    `last_checkin_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `level_promo_progresses_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `level_promo_tiers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `min_volume` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pg_clone_providers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `base_url` VARCHAR(191) NOT NULL DEFAULT 'https://api.apipokergames.site/api/v1/',
    `agent_code` VARCHAR(191) NOT NULL,
    `agent_secret` VARCHAR(191) NOT NULL,
    `agent_token` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `poker_providers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `base_url` VARCHAR(191) NOT NULL DEFAULT 'https://pokersgamessistemas.com/api/v1/',
    `agent_code` VARCHAR(191) NOT NULL,
    `agent_secret` VARCHAR(191) NOT NULL,
    `agent_token` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `popup_banners` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `image_url` VARCHAR(191) NOT NULL,
    `target_url` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `popup_icons` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `image_url` VARCHAR(191) NOT NULL,
    `target_url` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `direction` VARCHAR(191) NOT NULL DEFAULT 'right',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pp_clone_providers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `base_url` VARCHAR(191) NOT NULL DEFAULT 'https://api.pragmaticslots.fun/',
    `agent_code` VARCHAR(191) NOT NULL,
    `agent_secret` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `prada_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `base_url` VARCHAR(191) NOT NULL DEFAULT 'https://api.pradapay.com',
    `api_key` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `promotions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `icon_url` VARCHAR(191) NOT NULL,
    `image_url` VARCHAR(191) NOT NULL,
    `target_url` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `starts_at` DATETIME(3) NULL,
    `ends_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rakeback_histories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `setting_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `redeemed` BOOLEAN NOT NULL DEFAULT false,
    `redeemed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `rakeback_histories_setting_id_idx`(`setting_id`),
    INDEX `rakeback_histories_user_id_created_at_idx`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rakeback_settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `min_volume` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `percentage` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reedem_code_histories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reedem_code_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `collected_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `bonus` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `free_spins` INTEGER NULL DEFAULT 0,

    INDEX `reedem_code_histories_reedem_code_id_user_id_idx`(`reedem_code_id`, `user_id`),
    INDEX `reedem_code_histories_user_id_fkey`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reedem_codes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `max_collect` INTEGER NOT NULL DEFAULT 0,
    `collected_count` INTEGER NOT NULL DEFAULT 0,
    `bonus` DECIMAL(10, 2) NULL DEFAULT 0.00,
    `free_spins` INTEGER NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `reedem_codes_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sys_name` VARCHAR(191) NOT NULL,
    `sys_favicon` VARCHAR(191) NOT NULL,
    `sys_logo` VARCHAR(191) NOT NULL,
    `sys_description` VARCHAR(191) NULL,
    `sys_marquee` VARCHAR(191) NULL,
    `sys_support_telegram` VARCHAR(191) NULL,
    `sys_support_whatsapp` VARCHAR(191) NULL,
    `sys_support_email` VARCHAR(191) NULL,
    `min_deposit` DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
    `max_deposit` DECIMAL(10, 2) NOT NULL DEFAULT 5000.00,
    `min_withdrawal` DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
    `max_withdrawal` DECIMAL(10, 2) NOT NULL DEFAULT 5000.00,
    `auto_withdrawal` BOOLEAN NOT NULL DEFAULT true,
    `auto_withdrawal_limit` DECIMAL(10, 2) NOT NULL DEFAULT 5000.00,
    `need_document` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sub_banners` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `image_url` VARCHAR(191) NOT NULL,
    `target_url` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pid` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `document` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `balance` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `affiliate_balance` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `vip_balance` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `vip` INTEGER NOT NULL DEFAULT 0,
    `affiliate_code` VARCHAR(191) NULL,
    `invited_by_user_id` INTEGER NULL,
    `password_withdrawal` VARCHAR(191) NULL,
    `rollover_active` BOOLEAN NOT NULL DEFAULT false,
    `rollover_multiplier` DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
    `blogger` BOOLEAN NOT NULL DEFAULT false,
    `banned` BOOLEAN NOT NULL DEFAULT false,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `last_login_at` DATETIME(3) NULL,
    `banned_at` DATETIME(3) NULL,
    `jump_available` BOOLEAN NOT NULL DEFAULT false,
    `jump_limit` INTEGER NOT NULL DEFAULT 2,
    `jump_invite_count` INTEGER NOT NULL DEFAULT 0,
    `cpa_available` BOOLEAN NOT NULL DEFAULT false,
    `min_deposit_for_cpa` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `cpa_level_1` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `cpa_level_2` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `cpa_level_3` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `revshare_fake` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `revshare_level_1` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `revshare_level_2` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `revshare_level_3` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `fake_revshare` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `users_pid_key`(`pid`),
    UNIQUE INDEX `users_phone_key`(`phone`),
    UNIQUE INDEX `users_document_key`(`document`),
    UNIQUE INDEX `users_affiliate_code_key`(`affiliate_code`),
    INDEX `users_affiliate_code_idx`(`affiliate_code`),
    INDEX `users_created_at_idx`(`created_at`),
    INDEX `users_invited_by_user_id_idx`(`invited_by_user_id`),
    INDEX `users_last_login_at_idx`(`last_login_at`),
    INDEX `users_status_banned_idx`(`status`, `banned`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vip_bonus_redemptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `bonus_type` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `vip_bonus_redemptions_user_id_bonus_type_created_at_idx`(`user_id`, `bonus_type`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vip_histories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `vip_level_id` INTEGER NOT NULL,
    `goal` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `bonus` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `kind` VARCHAR(191) NOT NULL DEFAULT 'upgrade',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `vip_histories_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `vip_histories_vip_level_id_idx`(`vip_level_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vip_levels` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `id_vip` INTEGER NOT NULL DEFAULT 0,
    `goal` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `bonus` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `weekly_bonus` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `monthly_bonus` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    INDEX `vip_levels_id_vip_idx`(`id_vip`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `withdrawals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `request_number` VARCHAR(191) NULL,
    `user_name` VARCHAR(191) NULL,
    `user_document` VARCHAR(191) NULL,
    `user_keypix` VARCHAR(191) NULL,
    `user_keytype` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NULL,
    `reference` VARCHAR(191) NULL,
    `paid_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `withdrawals_user_id_created_at_status_reference_idx`(`user_id`, `created_at`, `status`, `reference`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CategoryToGame` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_CategoryToGame_AB_unique`(`A`, `B`),
    INDEX `_CategoryToGame_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `affiliate_histories` ADD CONSTRAINT `affiliate_histories_affiliate_user_id_fkey` FOREIGN KEY (`affiliate_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `affiliate_histories` ADD CONSTRAINT `affiliate_histories_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chest_withdrawls` ADD CONSTRAINT `chest_withdrawls_chest_id_fkey` FOREIGN KEY (`chest_id`) REFERENCES `chests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chest_withdrawls` ADD CONSTRAINT `chest_withdrawls_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deposit_promo_participations` ADD CONSTRAINT `deposit_promo_participations_deposit_id_fkey` FOREIGN KEY (`deposit_id`) REFERENCES `deposits`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deposit_promo_participations` ADD CONSTRAINT `deposit_promo_participations_tier_id_fkey` FOREIGN KEY (`tier_id`) REFERENCES `deposit_promo_tiers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deposit_promo_participations` ADD CONSTRAINT `deposit_promo_participations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deposit_promo_tiers` ADD CONSTRAINT `deposit_promo_tiers_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `deposit_promo_events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deposits` ADD CONSTRAINT `deposits_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `game_transactions` ADD CONSTRAINT `game_transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `level_promo_bonuses` ADD CONSTRAINT `level_promo_bonuses_tier_id_fkey` FOREIGN KEY (`tier_id`) REFERENCES `level_promo_tiers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `level_promo_progresses` ADD CONSTRAINT `level_promo_progresses_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rakeback_histories` ADD CONSTRAINT `rakeback_histories_setting_id_fkey` FOREIGN KEY (`setting_id`) REFERENCES `rakeback_settings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rakeback_histories` ADD CONSTRAINT `rakeback_histories_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reedem_code_histories` ADD CONSTRAINT `reedem_code_histories_reedem_code_id_fkey` FOREIGN KEY (`reedem_code_id`) REFERENCES `reedem_codes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reedem_code_histories` ADD CONSTRAINT `reedem_code_histories_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_invited_by_user_id_fkey` FOREIGN KEY (`invited_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vip_bonus_redemptions` ADD CONSTRAINT `vip_bonus_redemptions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vip_histories` ADD CONSTRAINT `vip_histories_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vip_histories` ADD CONSTRAINT `vip_histories_vip_level_id_fkey` FOREIGN KEY (`vip_level_id`) REFERENCES `vip_levels`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `withdrawals` ADD CONSTRAINT `withdrawals_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CategoryToGame` ADD CONSTRAINT `_CategoryToGame_A_fkey` FOREIGN KEY (`A`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CategoryToGame` ADD CONSTRAINT `_CategoryToGame_B_fkey` FOREIGN KEY (`B`) REFERENCES `games`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
