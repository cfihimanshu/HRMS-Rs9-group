-- Per-invoice collection outcome, remark and authenticated editor attribution.

SET @collection_column_sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `legal_recovery_bills` ADD COLUMN `collectionStatus` VARCHAR(255) NULL',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'legal_recovery_bills' AND COLUMN_NAME = 'collectionStatus'
);
PREPARE collection_column_statement FROM @collection_column_sql;
EXECUTE collection_column_statement;
DEALLOCATE PREPARE collection_column_statement;

SET @collection_column_sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `legal_recovery_bills` ADD COLUMN `collectionRemark` TEXT NULL',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'legal_recovery_bills' AND COLUMN_NAME = 'collectionRemark'
);
PREPARE collection_column_statement FROM @collection_column_sql;
EXECUTE collection_column_statement;
DEALLOCATE PREPARE collection_column_statement;

SET @collection_column_sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `legal_recovery_bills` ADD COLUMN `collectionUpdatedById` VARCHAR(255) NULL',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'legal_recovery_bills' AND COLUMN_NAME = 'collectionUpdatedById'
);
PREPARE collection_column_statement FROM @collection_column_sql;
EXECUTE collection_column_statement;
DEALLOCATE PREPARE collection_column_statement;

SET @collection_column_sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `legal_recovery_bills` ADD COLUMN `collectionUpdatedByName` VARCHAR(255) NULL',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'legal_recovery_bills' AND COLUMN_NAME = 'collectionUpdatedByName'
);
PREPARE collection_column_statement FROM @collection_column_sql;
EXECUTE collection_column_statement;
DEALLOCATE PREPARE collection_column_statement;

SET @collection_column_sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `legal_recovery_bills` ADD COLUMN `collectionUpdatedAt` DATETIME NULL',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'legal_recovery_bills' AND COLUMN_NAME = 'collectionUpdatedAt'
);
PREPARE collection_column_statement FROM @collection_column_sql;
EXECUTE collection_column_statement;
DEALLOCATE PREPARE collection_column_statement;
