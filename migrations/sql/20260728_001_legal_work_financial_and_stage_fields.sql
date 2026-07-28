ALTER TABLE `legal_work_logs`
  MODIFY COLUMN `employeeId` TEXT NULL,
  MODIFY COLUMN `employeeName` TEXT NULL,
  MODIFY COLUMN `workLocation` TEXT NULL,
  MODIFY COLUMN `customLocation` TEXT NULL,
  MODIFY COLUMN `typeOfWork` TEXT NULL,
  MODIFY COLUMN `bankName` TEXT NULL,
  MODIFY COLUMN `branchName` TEXT NULL,
  MODIFY COLUMN `businessDevOption` TEXT NULL,
  MODIFY COLUMN `businessDevSubOption` TEXT NULL,
  MODIFY COLUMN `noOfCount` TEXT NULL,
  MODIFY COLUMN `allocationDate` TEXT NULL,
  MODIFY COLUMN `broughtBy` TEXT NULL,
  ADD COLUMN `followUpDetails` TEXT NULL,
  ADD COLUMN `stageAmount` DECIMAL(12,2) NULL,
  ADD COLUMN `financialDetails` TEXT NULL,
  ADD COLUMN `preparedBy` TEXT NULL,
  ADD COLUMN `printedBy` TEXT NULL,
  ADD COLUMN `dispatchedBy` TEXT NULL,
  ADD COLUMN `billDate` TEXT NULL,
  ADD COLUMN `billAmount` TEXT NULL,
  ADD COLUMN `billNo` TEXT NULL,
  ADD COLUMN `personName` TEXT NULL,
  ADD COLUMN `uploadedFileName` TEXT NULL;

ALTER TABLE `legal_work_history`
  ADD COLUMN `amount` DECIMAL(15,2) NULL DEFAULT 0;
