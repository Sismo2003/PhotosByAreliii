-- AlterTable
ALTER TABLE `clients` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `clients_deletedAt_idx` ON `clients`(`deletedAt`);
