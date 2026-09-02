CREATE TABLE IF NOT EXISTS monthly_work_report_deliveries (
  id VARCHAR(255) NOT NULL PRIMARY KEY,
  reportMonth VARCHAR(7) NOT NULL,
  recipientId VARCHAR(255) NOT NULL,
  recipientEmail VARCHAR(255) NULL,
  reportType VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  sentAt DATETIME NULL,
  errorMessage TEXT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  UNIQUE KEY uq_monthly_report_delivery (reportMonth, recipientId, reportType),
  KEY idx_monthly_report_month (reportMonth)
);
