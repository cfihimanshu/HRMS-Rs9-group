ALTER TABLE `eodreports`
  ADD COLUMN `sodReportId` INT NULL AFTER `employee`,
  ADD INDEX `eodreports_sod_report_id` (`sodReportId`);

-- Attach historical EODs to the most recent SOD that had actually started.
-- This makes an after-midnight EOD belong to the prior day's work shift.
UPDATE `eodreports` AS `e`
SET `e`.`sodReportId` = (
  SELECT `s`.`id`
  FROM `sodreports` AS `s`
  WHERE `s`.`employee` = `e`.`employee`
    AND `s`.`createdAt` <= `e`.`createdAt`
  ORDER BY `s`.`createdAt` DESC
  LIMIT 1
)
WHERE `e`.`sodReportId` IS NULL;

UPDATE `eodreports` AS `e`
INNER JOIN `sodreports` AS `s` ON `s`.`id` = `e`.`sodReportId`
SET `e`.`date` = `s`.`date`
WHERE `e`.`date` IS NULL OR DATE(`e`.`date`) <> DATE(`s`.`date`);
