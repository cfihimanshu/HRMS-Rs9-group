-- Additive inventory assignment lifecycle ledger.
-- No existing asset or employee data is modified.

ALTER TABLE `asset_inventory`
  ADD COLUMN `handoverDate` DATE NULL AFTER `assignedAt`;

CREATE TABLE `asset_assignment_history` (
  `id` VARCHAR(255) NOT NULL,
  `assetId` VARCHAR(255) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `fromUserId` TEXT NULL,
  `fromUserName` TEXT NULL,
  `toUserId` TEXT NULL,
  `toUserName` TEXT NULL,
  `assignedDate` DATETIME NULL,
  `handoverDate` DATETIME NULL,
  `performedBy` TEXT NULL,
  `notes` TEXT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_asset_assignment_history_asset` (`assetId`),
  KEY `idx_asset_assignment_history_created` (`createdAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
