CREATE TABLE IF NOT EXISTS `security_projects` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `nbfcId` VARCHAR(255) NULL,
  `nbfcName` VARCHAR(255) NOT NULL,
  `siteName` VARCHAR(255) NOT NULL,
  `siteStartedDate` DATE NOT NULL,
  `guardId` INT NULL,
  `guardName` VARCHAR(255) NOT NULL,
  `contactNumber` VARCHAR(255) NULL,
  `status` VARCHAR(255) NOT NULL DEFAULT 'Ongoing',
  `createdBy` VARCHAR(255) NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_security_project_nbfc` (`nbfcId`),
  KEY `idx_security_project_status` (`status`),
  KEY `idx_security_project_start_date` (`siteStartedDate`)
);
