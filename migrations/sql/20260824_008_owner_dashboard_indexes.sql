-- Read-performance indexes used by Owner Command Centre aggregations.
-- Kept as composite indexes matching dashboard date/status/company filters.

CREATE INDEX `idx_tasklogs_date_status` ON `tasklogs` (`date`, `status`);
CREATE INDEX `idx_tasklogs_employee_date_status` ON `tasklogs` (`employee`, `date`, `status`);
CREATE INDEX `idx_tasklogs_scheduled_status` ON `tasklogs` (`scheduledAt`, `status`);
CREATE INDEX `idx_tasklogs_deadline_status` ON `tasklogs` (`deadlineAt`, `status`);
CREATE INDEX `idx_tasklogs_created_at` ON `tasklogs` (`createdAt`);

CREATE INDEX `idx_asset_inventory_company_status` ON `asset_inventory` (`companyId`, `status`);
CREATE INDEX `idx_asset_inventory_created_at` ON `asset_inventory` (`createdAt`);

CREATE INDEX `idx_vehicles_company_status` ON `vehicles` (`companyId`, `status`);
CREATE INDEX `idx_vehicles_created_at` ON `vehicles` (`createdAt`);

CREATE INDEX `idx_document_register_status_updated` ON `document_register` (`status`, `updatedAt`);
CREATE INDEX `idx_document_register_created_at` ON `document_register` (`createdAt`);
