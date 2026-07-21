-- ========================================================
-- LEGAL RECOVERY & SECURITY MASTER - SAFE LIVE DB MIGRATION
-- Database Name: hrms_new
-- ========================================================

USE `hrms_new`;

-- 1. Ensure 'legal_guards' Table & Columns Exist
CREATE TABLE IF NOT EXISTS `legal_guards` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(50) DEFAULT NULL,
  `photoUrl` LONGTEXT DEFAULT NULL,
  `status` VARCHAR(50) DEFAULT 'Active',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Modify photoUrl to LONGTEXT so high-res base64/URL photos don't truncate
ALTER TABLE `legal_guards` MODIFY COLUMN `photoUrl` LONGTEXT DEFAULT NULL;


-- 2. Ensure 'legal_securities' Table Exists
CREATE TABLE IF NOT EXISTS `legal_securities` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `company` VARCHAR(255) NOT NULL,
  `billNo` VARCHAR(100) DEFAULT NULL,
  `billDate` DATE DEFAULT NULL,
  `billAmount` DECIMAL(12, 2) DEFAULT 0.00,
  `nbfcId` VARCHAR(50) DEFAULT NULL,
  `nbfcName` VARCHAR(255) DEFAULT NULL,
  `branchId` VARCHAR(50) DEFAULT NULL,
  `branchName` VARCHAR(255) DEFAULT NULL,
  `location` VARCHAR(255) DEFAULT NULL,
  `siteType` VARCHAR(100) DEFAULT NULL,
  `offerRef` VARCHAR(255) DEFAULT NULL,
  `coverageHours` INT DEFAULT 24,
  `shiftHours` INT DEFAULT 8,
  `guardsPerShift` INT DEFAULT 1,
  `totalDailyGuards` INT DEFAULT 3,
  `shiftRate` DECIMAL(12, 2) DEFAULT 0.00,
  `allowancePerShift` DECIMAL(12, 2) DEFAULT 0.00,
  `durationDays` INT DEFAULT 1,
  `totalGuardCost` DECIMAL(12, 2) DEFAULT 0.00,
  `totalAllowanceCost` DECIMAL(12, 2) DEFAULT 0.00,
  `guardName` VARCHAR(255) DEFAULT NULL,
  `guardPhone` VARCHAR(50) DEFAULT NULL,
  `guardDetailsJson` LONGTEXT DEFAULT NULL,
  `guardPhotoUrl` LONGTEXT DEFAULT NULL,
  `billInvoiceUrl` LONGTEXT DEFAULT NULL,
  `paymentMethod` VARCHAR(100) DEFAULT NULL,
  `paymentDays` VARCHAR(50) DEFAULT NULL,
  `paymentStatus` VARCHAR(50) DEFAULT 'Due',
  `source` VARCHAR(100) DEFAULT NULL,
  `receivedAmount` DECIMAL(12, 2) DEFAULT 0.00,
  `receivedDate` DATE DEFAULT NULL,
  `remarks` TEXT DEFAULT NULL,
  `createdBy` VARCHAR(100) DEFAULT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 3. Safely Add Missing Columns to 'legal_securities' (Solves Unknown column 'siteType' error)
ALTER TABLE `legal_securities` ADD COLUMN `siteType` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `legal_securities` ADD COLUMN `offerRef` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `legal_securities` ADD COLUMN `coverageHours` INT DEFAULT 24;
ALTER TABLE `legal_securities` ADD COLUMN `shiftHours` INT DEFAULT 8;
ALTER TABLE `legal_securities` ADD COLUMN `guardsPerShift` INT DEFAULT 1;
ALTER TABLE `legal_securities` ADD COLUMN `totalDailyGuards` INT DEFAULT 3;
ALTER TABLE `legal_securities` ADD COLUMN `shiftRate` DECIMAL(12,2) DEFAULT 0.00;
ALTER TABLE `legal_securities` ADD COLUMN `allowancePerShift` DECIMAL(12,2) DEFAULT 0.00;
ALTER TABLE `legal_securities` ADD COLUMN `durationDays` INT DEFAULT 1;
ALTER TABLE `legal_securities` ADD COLUMN `totalGuardCost` DECIMAL(12,2) DEFAULT 0.00;
ALTER TABLE `legal_securities` ADD COLUMN `totalAllowanceCost` DECIMAL(12,2) DEFAULT 0.00;
ALTER TABLE `legal_securities` ADD COLUMN `guardName` VARCHAR(255) DEFAULT NULL;
ALTER TABLE `legal_securities` ADD COLUMN `guardPhone` VARCHAR(50) DEFAULT NULL;
ALTER TABLE `legal_securities` ADD COLUMN `guardDetailsJson` LONGTEXT DEFAULT NULL;
ALTER TABLE `legal_securities` ADD COLUMN `guardPhotoUrl` LONGTEXT DEFAULT NULL;
ALTER TABLE `legal_securities` ADD COLUMN `billInvoiceUrl` LONGTEXT DEFAULT NULL;

-- 4. If Columns Already Exist, Modify Them to LONGTEXT
ALTER TABLE `legal_securities` MODIFY COLUMN `guardDetailsJson` LONGTEXT DEFAULT NULL;
ALTER TABLE `legal_securities` MODIFY COLUMN `guardPhotoUrl` LONGTEXT DEFAULT NULL;


-- 5. Ensure 'legal_companies' Master Table Exists
CREATE TABLE IF NOT EXISTS `legal_companies` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `companyName` VARCHAR(255) NOT NULL UNIQUE,
  `status` VARCHAR(50) DEFAULT 'Active',
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================
-- END OF MIGRATION SCRIPT
-- ========================================================
