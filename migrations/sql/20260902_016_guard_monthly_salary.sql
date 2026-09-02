ALTER TABLE `legal_guards`
  ADD COLUMN `monthlySalary` DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER `phone`;
