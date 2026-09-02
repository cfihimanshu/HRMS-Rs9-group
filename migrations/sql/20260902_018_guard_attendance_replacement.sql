ALTER TABLE `security_guard_attendance`
  ADD COLUMN `replacementGuardId` INT NULL AFTER `guardPhone`,
  ADD COLUMN `replacementGuardName` VARCHAR(255) NULL AFTER `replacementGuardId`;
