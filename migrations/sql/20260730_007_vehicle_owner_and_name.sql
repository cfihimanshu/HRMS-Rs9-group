ALTER TABLE `vehicles`
  ADD COLUMN `ownerName` VARCHAR(255) NULL AFTER `companyName`,
  ADD COLUMN `vehicleName` VARCHAR(255) NULL AFTER `ownerName`;

UPDATE `vehicles`
   SET `ownerName` = COALESCE(NULLIF(`companyName`, ''), 'Not Specified'),
       `vehicleName` = TRIM(CONCAT(COALESCE(`make`, ''), ' ', COALESCE(`model`, '')))
 WHERE `ownerName` IS NULL OR `vehicleName` IS NULL;

ALTER TABLE `vehicles`
  MODIFY COLUMN `ownerName` VARCHAR(255) NOT NULL,
  MODIFY COLUMN `vehicleName` VARCHAR(255) NOT NULL;
