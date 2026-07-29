ALTER TABLE `asset_inventory`
  ADD COLUMN `assignedToUserId` TEXT NULL,
  ADD COLUMN `assignedToName` TEXT NULL,
  ADD COLUMN `assignedAt` DATETIME NULL,
  ADD COLUMN `assignedBy` TEXT NULL;
