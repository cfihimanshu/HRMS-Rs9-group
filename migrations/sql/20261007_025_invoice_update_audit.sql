ALTER TABLE legal_recovery_bills
  ADD COLUMN updatedById VARCHAR(255) NULL,
  ADD COLUMN updatedByName VARCHAR(255) NULL,
  ADD COLUMN lastModifiedAt DATETIME NULL;
UPDATE legal_recovery_bills
SET updatedById = collectionUpdatedById,
    updatedByName = collectionUpdatedByName,
    lastModifiedAt = collectionUpdatedAt
WHERE collectionUpdatedAt IS NOT NULL AND collectionUpdatedAt >= updatedAt;
