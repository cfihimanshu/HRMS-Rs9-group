ALTER TABLE `security_projects`
  ADD COLUMN `sourceSecurityId` INT NULL AFTER `id`,
  ADD KEY `idx_security_project_source` (`sourceSecurityId`);
