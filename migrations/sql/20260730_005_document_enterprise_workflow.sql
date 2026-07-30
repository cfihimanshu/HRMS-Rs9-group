ALTER TABLE `document_register`
  MODIFY COLUMN `status` ENUM('In Custody','Pending Acceptance','Handed Over','Returned','Archived','Missing','Damaged','Under Investigation','Destroyed','Confidential Hold') NOT NULL DEFAULT 'In Custody',
  ADD COLUMN `visibility` ENUM('Internal','Department Only','Management','Confidential','Highly Confidential') NOT NULL DEFAULT 'Internal' AFTER `remarks`,
  ADD COLUMN `owningDepartment` VARCHAR(255) NULL AFTER `visibility`,
  ADD COLUMN `linkedEntityType` VARCHAR(255) NULL AFTER `owningDepartment`,
  ADD COLUMN `linkedEntityId` VARCHAR(255) NULL AFTER `linkedEntityType`,
  ADD COLUMN `physicalLocation` VARCHAR(255) NULL AFTER `linkedEntityId`,
  ADD COLUMN `expiryDate` DATE NULL AFTER `physicalLocation`,
  ADD COLUMN `pendingHolderId` VARCHAR(255) NULL AFTER `expiryDate`,
  ADD COLUMN `pendingHolderName` VARCHAR(255) NULL AFTER `pendingHolderId`,
  ADD COLUMN `pendingHolderDepartment` VARCHAR(255) NULL AFTER `pendingHolderName`,
  ADD COLUMN `pendingMovementId` VARCHAR(255) NULL AFTER `pendingHolderDepartment`,
  ADD COLUMN `version` INT NOT NULL DEFAULT 1 AFTER `pendingMovementId`,
  ADD KEY `idx_document_register_expiry` (`expiryDate`),
  ADD KEY `idx_document_register_pending_holder` (`pendingHolderId`);

ALTER TABLE `document_movements`
  MODIFY COLUMN `action` ENUM('RECEIVED','HANDOVER_REQUESTED','HANDOVER','HANDOVER_REJECTED','RETURNED','ARCHIVED','REOPENED','CORRECTED','INCIDENT') NOT NULL,
  ADD COLUMN `acceptanceStatus` ENUM('NOT_REQUIRED','PENDING','ACCEPTED','REJECTED') NOT NULL DEFAULT 'NOT_REQUIRED' AFTER `performedByName`,
  ADD COLUMN `respondedAt` DATETIME NULL AFTER `acceptanceStatus`,
  ADD COLUMN `responseRemarks` TEXT NULL AFTER `respondedAt`,
  ADD COLUMN `changeDetails` TEXT NULL AFTER `responseRemarks`;
