-- CreateTable
CREATE TABLE `services` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('LIVE', 'HIDDEN', 'DRAFT') NOT NULL DEFAULT 'DRAFT',
    `cardLine` VARCHAR(191) NULL,
    `intro` TEXT NULL,
    `includesLine` VARCHAR(191) NULL,
    `ctaWord` VARCHAR(191) NULL,
    `fromPackageId` INTEGER NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `services_slug_key`(`slug`),
    UNIQUE INDEX `services_fromPackageId_key`(`fromPackageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `packages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `serviceId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `priceCents` INTEGER NOT NULL,
    `durationMinutes` INTEGER NOT NULL,
    `photoCount` INTEGER NULL,
    `outfits` INTEGER NULL,
    `maxPeople` INTEGER NULL,
    `sessionCount` INTEGER NOT NULL DEFAULT 1,
    `customDescription` VARCHAR(191) NULL,
    `isFeatured` BOOLEAN NOT NULL DEFAULT false,
    `hidden` BOOLEAN NOT NULL DEFAULT false,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `packages_serviceId_name_key`(`serviceId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `extras` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `priceCents` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `position` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `extras_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `extra_services` (
    `extraId` INTEGER NOT NULL,
    `serviceId` INTEGER NOT NULL,

    INDEX `extra_services_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`extraId`, `serviceId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `displayName` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `phoneE164` VARCHAR(191) NULL,
    `instagram` VARCHAR(191) NULL,
    `heardFrom` ENUM('INSTAGRAM', 'FRIEND', 'GOOGLE', 'TIKTOK', 'RETURNING_CLIENT', 'OTHER') NULL,
    `privateNotes` TEXT NULL,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
    `emailBouncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `clients_email_key`(`email`),
    UNIQUE INDEX `clients_phoneE164_key`(`phoneE164`),
    INDEX `clients_displayName_idx`(`displayName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'CLIENT') NOT NULL DEFAULT 'CLIENT',
    `clientId` INTEGER NULL,
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    `invitedAt` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_clientId_key`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `password_reset_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `password_reset_tokens_tokenHash_key`(`tokenHash`),
    INDEX `password_reset_tokens_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(191) NOT NULL,
    `clientId` INTEGER NOT NULL,
    `source` ENUM('WEBSITE', 'MANUAL') NOT NULL DEFAULT 'WEBSITE',
    `status` ENUM('REQUEST', 'AWAITING_DEPOSIT', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'REQUEST',
    `serviceId` INTEGER NOT NULL,
    `packageId` INTEGER NULL,
    `serviceNameSnapshot` VARCHAR(191) NOT NULL,
    `packageNameSnapshot` VARCHAR(191) NULL,
    `packagePriceCents` INTEGER NOT NULL,
    `durationMinutes` INTEGER NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `locationKind` ENUM('PRESET', 'CAMPUS', 'STUDIO', 'OTHER') NOT NULL,
    `locationName` VARCHAR(191) NOT NULL,
    `locationAddress` VARCHAR(191) NULL,
    `travelFeeCents` INTEGER NOT NULL DEFAULT 0,
    `adjustmentCents` INTEGER NOT NULL DEFAULT 0,
    `totalCents` INTEGER NOT NULL,
    `depositCents` INTEGER NOT NULL,
    `contactFirstName` VARCHAR(191) NULL,
    `contactLastName` VARCHAR(191) NULL,
    `contactEmail` VARCHAR(191) NULL,
    `contactPhone` VARCHAR(191) NULL,
    `clientMatchedBy` ENUM('NEW', 'EMAIL', 'PHONE', 'BOTH', 'CONFLICT') NOT NULL DEFAULT 'NEW',
    `matchReviewedAt` DATETIME(3) NULL,
    `partySize` ENUM('JUST_ME', 'TWO', 'THREE_TO_FIVE', 'SIX_TO_EIGHT') NULL,
    `schoolAndColors` VARCHAR(191) NULL,
    `clientNotes` TEXT NULL,
    `privateNotes` TEXT NULL,
    `inspo` TEXT NULL,
    `photosNeededBy` DATE NULL,
    `sharePermission` ENUM('YES', 'PARTIAL', 'NO') NULL,
    `doNotPostNotes` TEXT NULL,
    `minorConsentAt` DATETIME(3) NULL,
    `policyAcceptedAt` DATETIME(3) NULL,
    `confirmedAt` DATETIME(3) NULL,
    `depositDueAt` DATETIME(3) NULL,
    `declinedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `cancelReason` ENUM('CLIENT_REQUEST', 'WEATHER', 'PHOTOGRAPHER_UNAVAILABLE', 'NO_DEPOSIT', 'NO_SHOW') NULL,
    `depositRefunded` BOOLEAN NULL,
    `expiredAt` DATETIME(3) NULL,
    `rescheduleCount` INTEGER NOT NULL DEFAULT 0,
    `thanksSentAt` DATETIME(3) NULL,
    `reviewStatus` ENUM('NONE', 'REQUESTED', 'RECEIVED') NOT NULL DEFAULT 'NONE',
    `reviewRequestedAt` DATETIME(3) NULL,
    `reviewReceivedAt` DATETIME(3) NULL,
    `archivedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bookings_code_key`(`code`),
    INDEX `bookings_clientId_idx`(`clientId`),
    INDEX `bookings_status_startsAt_idx`(`status`, `startsAt`),
    INDEX `bookings_startsAt_idx`(`startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `booking_extras` (
    `bookingId` INTEGER NOT NULL,
    `extraId` INTEGER NOT NULL,
    `nameSnapshot` VARCHAR(191) NOT NULL,
    `priceCentsSnapshot` INTEGER NOT NULL,

    PRIMARY KEY (`bookingId`, `extraId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bookingId` INTEGER NOT NULL,
    `kind` ENUM('DEPOSIT', 'BALANCE', 'REFUND') NOT NULL,
    `method` ENUM('ZELLE', 'CASH_APP', 'CASH') NOT NULL,
    `amountCents` INTEGER NOT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `note` VARCHAR(191) NULL,
    `recordedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `payments_bookingId_idx`(`bookingId`),
    INDEX `payments_receivedAt_idx`(`receivedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rebook_reminders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `clientId` INTEGER NOT NULL,
    `bookingId` INTEGER NULL,
    `kind` ENUM('SIX_MONTHS_FAMILY', 'ONE_YEAR_ANNIVERSARY_BIRTHDAY', 'NEXT_SPRING_GRADUATION', 'NEWBORN', 'CUSTOM') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `dueOn` DATE NOT NULL,
    `doneAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `rebook_reminders_clientId_idx`(`clientId`),
    INDEX `rebook_reminders_dueOn_idx`(`dueOn`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `galleries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `clientId` INTEGER NOT NULL,
    `bookingId` INTEGER NULL,
    `status` ENUM('DRAFT', 'DELIVERED') NOT NULL DEFAULT 'DRAFT',
    `deliveredAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NULL,
    `expiryReminderSentAt` DATETIME(3) NULL,
    `photosDeletedAt` DATETIME(3) NULL,
    `coverPhotoId` INTEGER NULL,
    `coverLayout` ENUM('FULL', 'SPLIT', 'MINIMAL') NOT NULL DEFAULT 'FULL',
    `downloadMode` ENUM('HIGH_AND_WEB', 'WEB_ONLY', 'OFF') NOT NULL DEFAULT 'HIGH_AND_WEB',
    `pinRequired` BOOLEAN NOT NULL DEFAULT true,
    `downloadPinEnc` VARCHAR(191) NULL,
    `privacy` ENUM('CLIENT_LOGIN', 'PASSWORD', 'PUBLIC_LINK') NOT NULL DEFAULT 'CLIENT_LOGIN',
    `accessPasswordEnc` VARCHAR(191) NULL,
    `favoritesEnabled` BOOLEAN NOT NULL DEFAULT true,
    `favoritesLimit` INTEGER NULL,
    `watermark` BOOLEAN NOT NULL DEFAULT false,
    `socialSharing` BOOLEAN NOT NULL DEFAULT false,
    `deliverySubject` VARCHAR(191) NULL,
    `deliveryMessage` TEXT NULL,
    `deliveredToEmail` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `galleries_slug_key`(`slug`),
    UNIQUE INDEX `galleries_bookingId_key`(`bookingId`),
    UNIQUE INDEX `galleries_coverPhotoId_key`(`coverPhotoId`),
    INDEX `galleries_clientId_idx`(`clientId`),
    INDEX `galleries_status_expiresAt_idx`(`status`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `gallery_sets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `galleryId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `gallery_sets_galleryId_name_key`(`galleryId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `photos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `galleryId` INTEGER NOT NULL,
    `setId` INTEGER NULL,
    `originalFilename` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `width` INTEGER NULL,
    `height` INTEGER NULL,
    `originalPath` VARCHAR(191) NOT NULL,
    `webPath` VARCHAR(191) NOT NULL,
    `thumbnailPath` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `hidden` BOOLEAN NOT NULL DEFAULT false,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `photos_galleryId_setId_position_idx`(`galleryId`, `setId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favorites` (
    `clientId` INTEGER NOT NULL,
    `photoId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `favorites_photoId_idx`(`photoId`),
    PRIMARY KEY (`clientId`, `photoId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activity_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `actorType` ENUM('ADMIN', 'CLIENT', 'SYSTEM') NOT NULL,
    `actorId` INTEGER NULL,
    `clientId` INTEGER NULL,
    `bookingId` INTEGER NULL,
    `galleryId` INTEGER NULL,
    `message` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `activity_events_clientId_createdAt_idx`(`clientId`, `createdAt`),
    INDEX `activity_events_bookingId_createdAt_idx`(`bookingId`, `createdAt`),
    INDEX `activity_events_galleryId_type_createdAt_idx`(`galleryId`, `type`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `studio_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `depositPercent` INTEGER NOT NULL DEFAULT 50,
    `cancelNoticeHours` INTEGER NOT NULL DEFAULT 48,
    `lateGraceMinutes` INTEGER NOT NULL DEFAULT 30,
    `maxReschedules` INTEGER NOT NULL DEFAULT 1,
    `outfitChangeCents` INTEGER NOT NULL DEFAULT 1500,
    `depositDueHours` INTEGER NOT NULL DEFAULT 48,
    `replyWithinHours` INTEGER NOT NULL DEFAULT 24,
    `galleryDeliveryDays` INTEGER NOT NULL DEFAULT 14,
    `galleryExpiryDays` INTEGER NOT NULL DEFAULT 90,
    `expiryReminderHours` INTEGER NOT NULL DEFAULT 48,
    `depositReminderHours` INTEGER NOT NULL DEFAULT 12,
    `prepReminderHours` INTEGER NOT NULL DEFAULT 48,
    `reviewUrl` VARCHAR(191) NULL,
    `galleryExtendDays` INTEGER NOT NULL DEFAULT 30,
    `freeTravelMiles` INTEGER NOT NULL DEFAULT 25,
    `travelFeePerMileCents` INTEGER NOT NULL DEFAULT 100,
    `zelleHandle` VARCHAR(191) NULL,
    `cashAppHandle` VARCHAR(191) NULL,
    `defaultDownloadMode` ENUM('HIGH_AND_WEB', 'WEB_ONLY', 'OFF') NOT NULL DEFAULT 'HIGH_AND_WEB',
    `defaultPinRequired` BOOLEAN NOT NULL DEFAULT true,
    `defaultPrivacy` ENUM('CLIENT_LOGIN', 'PASSWORD', 'PUBLIC_LINK') NOT NULL DEFAULT 'CLIENT_LOGIN',
    `defaultFavoritesLimit` INTEGER NULL DEFAULT 20,
    `defaultWatermark` BOOLEAN NOT NULL DEFAULT false,
    `defaultSocialSharing` BOOLEAN NOT NULL DEFAULT false,
    `bookingPolicyText` TEXT NULL,
    `bookingPolicyVersion` INTEGER NOT NULL DEFAULT 1,
    `storageAlertLevel` ENUM('OK', 'LOW', 'CRITICAL', 'FULL') NOT NULL DEFAULT 'OK',
    `storageAlertSentAt` DATETIME(3) NULL,
    `mailStorageAlertLevel` ENUM('OK', 'LOW', 'CRITICAL', 'FULL') NOT NULL DEFAULT 'OK',
    `mailStorageAlertSentAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `availability_slots` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `weekday` INTEGER NOT NULL,
    `startTime` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `availability_slots_weekday_startTime_key`(`weekday`, `startTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `blocked_dates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `reason` VARCHAR(191) NULL,

    UNIQUE INDEX `blocked_dates_date_key`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_outbox` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `templateVersionId` INTEGER NULL,
    `toEmail` VARCHAR(191) NOT NULL,
    `toName` VARCHAR(191) NULL,
    `locale` VARCHAR(191) NOT NULL DEFAULT 'en',
    `data` JSON NOT NULL,
    `secretsEnc` TEXT NULL,
    `subject` VARCHAR(191) NULL,
    `dedupeKey` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELLED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `skipReason` VARCHAR(191) NULL,
    `isTest` BOOLEAN NOT NULL DEFAULT false,
    `sendAfter` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastError` TEXT NULL,
    `messageId` VARCHAR(191) NULL,
    `emlPath` VARCHAR(191) NULL,
    `sizeBytes` INTEGER NULL,
    `bouncedAt` DATETIME(3) NULL,
    `clientId` INTEGER NULL,
    `bookingId` INTEGER NULL,
    `galleryId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sentAt` DATETIME(3) NULL,

    UNIQUE INDEX `email_outbox_dedupeKey_key`(`dedupeKey`),
    UNIQUE INDEX `email_outbox_messageId_key`(`messageId`),
    INDEX `email_outbox_status_sendAfter_nextAttemptAt_idx`(`status`, `sendAfter`, `nextAttemptAt`),
    INDEX `email_outbox_clientId_createdAt_idx`(`clientId`, `createdAt`),
    INDEX `email_outbox_bookingId_idx`(`bookingId`),
    INDEX `email_outbox_galleryId_idx`(`galleryId`),
    INDEX `email_outbox_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(191) NOT NULL,
    `locale` VARCHAR(191) NOT NULL,
    `draftSubject` VARCHAR(191) NULL,
    `draftMjml` MEDIUMTEXT NULL,
    `draftProject` JSON NULL,
    `draftUpdatedAt` DATETIME(3) NULL,
    `publishedVersionId` INTEGER NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `email_templates_publishedVersionId_key`(`publishedVersionId`),
    UNIQUE INDEX `email_templates_key_locale_key`(`key`, `locale`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_template_versions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `templateId` INTEGER NOT NULL,
    `version` INTEGER NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `mjml` MEDIUMTEXT NOT NULL,
    `project` JSON NULL,
    `html` MEDIUMTEXT NOT NULL,
    `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `publishedById` INTEGER NULL,

    UNIQUE INDEX `email_template_versions_templateId_version_key`(`templateId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_inbound` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `folder` VARCHAR(191) NOT NULL DEFAULT 'INBOX',
    `uidValidity` BIGINT NOT NULL,
    `uid` INTEGER NOT NULL,
    `messageId` VARCHAR(191) NULL,
    `inReplyTo` VARCHAR(191) NULL,
    `fromEmail` VARCHAR(191) NOT NULL,
    `fromName` VARCHAR(191) NULL,
    `toEmail` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NULL,
    `snippet` VARCHAR(191) NULL,
    `receivedAt` DATETIME(3) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `emlPath` VARCHAR(191) NULL,
    `attachments` JSON NULL,
    `isBounce` BOOLEAN NOT NULL DEFAULT false,
    `bounceOutboxId` INTEGER NULL,
    `readAt` DATETIME(3) NULL,
    `clientId` INTEGER NULL,
    `deletedOnServerAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `email_inbound_receivedAt_idx`(`receivedAt`),
    INDEX `email_inbound_clientId_receivedAt_idx`(`clientId`, `receivedAt`),
    UNIQUE INDEX `email_inbound_folder_uidValidity_uid_key`(`folder`, `uidValidity`, `uid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_fromPackageId_fkey` FOREIGN KEY (`fromPackageId`) REFERENCES `packages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `packages` ADD CONSTRAINT `packages_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `extra_services` ADD CONSTRAINT `extra_services_extraId_fkey` FOREIGN KEY (`extraId`) REFERENCES `extras`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `extra_services` ADD CONSTRAINT `extra_services_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `packages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_extras` ADD CONSTRAINT `booking_extras_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `booking_extras` ADD CONSTRAINT `booking_extras_extraId_fkey` FOREIGN KEY (`extraId`) REFERENCES `extras`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rebook_reminders` ADD CONSTRAINT `rebook_reminders_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rebook_reminders` ADD CONSTRAINT `rebook_reminders_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `galleries` ADD CONSTRAINT `galleries_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `galleries` ADD CONSTRAINT `galleries_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `galleries` ADD CONSTRAINT `galleries_coverPhotoId_fkey` FOREIGN KEY (`coverPhotoId`) REFERENCES `photos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `gallery_sets` ADD CONSTRAINT `gallery_sets_galleryId_fkey` FOREIGN KEY (`galleryId`) REFERENCES `galleries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photos` ADD CONSTRAINT `photos_galleryId_fkey` FOREIGN KEY (`galleryId`) REFERENCES `galleries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photos` ADD CONSTRAINT `photos_setId_fkey` FOREIGN KEY (`setId`) REFERENCES `gallery_sets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_photoId_fkey` FOREIGN KEY (`photoId`) REFERENCES `photos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_events` ADD CONSTRAINT `activity_events_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_events` ADD CONSTRAINT `activity_events_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `activity_events` ADD CONSTRAINT `activity_events_galleryId_fkey` FOREIGN KEY (`galleryId`) REFERENCES `galleries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_outbox` ADD CONSTRAINT `email_outbox_templateVersionId_fkey` FOREIGN KEY (`templateVersionId`) REFERENCES `email_template_versions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_outbox` ADD CONSTRAINT `email_outbox_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_outbox` ADD CONSTRAINT `email_outbox_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_outbox` ADD CONSTRAINT `email_outbox_galleryId_fkey` FOREIGN KEY (`galleryId`) REFERENCES `galleries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_templates` ADD CONSTRAINT `email_templates_publishedVersionId_fkey` FOREIGN KEY (`publishedVersionId`) REFERENCES `email_template_versions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_template_versions` ADD CONSTRAINT `email_template_versions_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `email_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_inbound` ADD CONSTRAINT `email_inbound_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
