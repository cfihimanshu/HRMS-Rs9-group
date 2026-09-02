ALTER TABLE legal_securities
  ADD COLUMN workflowStage VARCHAR(255) NULL DEFAULT 'bank_visit',
  ADD COLUMN workflowJson LONGTEXT NULL;
