/*
  Warnings:

  - You are about to drop the column `cardLine` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `ctaWord` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `fromPackageId` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `includesLine` on the `services` table. All the data in the column will be lost.
  - You are about to drop the column `intro` on the `services` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `services` DROP FOREIGN KEY `services_fromPackageId_fkey`;

-- DropIndex
DROP INDEX `services_fromPackageId_key` ON `services`;

-- AlterTable
ALTER TABLE `extras` ADD COLUMN `minutes` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `services` DROP COLUMN `cardLine`,
    DROP COLUMN `ctaWord`,
    DROP COLUMN `fromPackageId`,
    DROP COLUMN `includesLine`,
    DROP COLUMN `intro`;
