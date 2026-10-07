ALTER TABLE legal_recovery_bills
  ADD COLUMN settlementAmount DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN settlementReason TEXT NULL,
  ADD COLUMN settledByName VARCHAR(255) NULL,
  ADD COLUMN settledAt DATETIME NULL;
