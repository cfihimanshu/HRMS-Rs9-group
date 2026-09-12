CREATE TABLE IF NOT EXISTS `legal_networks` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `legal_networks_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @network_column_sql = (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE `branch_masters` ADD COLUMN `network` VARCHAR(255) NULL',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'branch_masters' AND COLUMN_NAME = 'network'
);
PREPARE network_column_statement FROM @network_column_sql;
EXECUTE network_column_statement;
DEALLOCATE PREPARE network_column_statement;
