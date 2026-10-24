-- AlterTable
ALTER TABLE `users` ADD COLUMN `name` VARCHAR(191) NULL,
    ADD COLUMN `phone` VARCHAR(191) NULL,
    ADD COLUMN `phoneE164` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_phoneE164_key` ON `users`(`phoneE164`);

