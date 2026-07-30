CREATE TABLE `vehicles` (
  `id` VARCHAR(255) NOT NULL, `registrationNumber` VARCHAR(255) NOT NULL,
  `companyId` VARCHAR(255) NULL, `companyName` VARCHAR(255) NOT NULL,
  `vehicleType` VARCHAR(255) NOT NULL, `make` VARCHAR(255) NOT NULL, `model` VARCHAR(255) NOT NULL,
  `variant` VARCHAR(255) NULL, `manufacturingYear` INT NULL, `color` VARCHAR(255) NULL,
  `fuelType` VARCHAR(255) NULL, `chassisNumber` VARCHAR(255) NULL, `engineNumber` VARCHAR(255) NULL,
  `purchaseDate` DATE NULL, `purchaseValue` DECIMAL(14,2) NULL, `odometer` INT NULL,
  `ownershipType` VARCHAR(255) NOT NULL DEFAULT 'Company Owned',
  `status` VARCHAR(255) NOT NULL DEFAULT 'Available',
  `currentAssigneeId` VARCHAR(255) NULL, `currentAssigneeName` VARCHAR(255) NULL,
  `currentAssigneeType` ENUM('Employee','External') NULL, `assignedAt` DATETIME NULL,
  `location` VARCHAR(255) NULL, `photoUrl` TEXT NULL, `remarks` TEXT NULL,
  `createdById` VARCHAR(255) NOT NULL, `createdByName` VARCHAR(255) NOT NULL,
  `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`), UNIQUE KEY `uq_vehicle_registration` (`registrationNumber`),
  KEY `idx_vehicle_company` (`companyId`), KEY `idx_vehicle_status` (`status`),
  KEY `idx_vehicle_assignee` (`currentAssigneeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vehicle_documents` (
  `id` VARCHAR(255) NOT NULL, `vehicleId` VARCHAR(255) NOT NULL,
  `documentType` VARCHAR(255) NOT NULL, `documentNumber` VARCHAR(255) NULL,
  `issueDate` DATE NULL, `expiryDate` DATE NULL, `fileUrl` TEXT NOT NULL,
  `remarks` TEXT NULL, `uploadedById` VARCHAR(255) NOT NULL, `uploadedByName` VARCHAR(255) NOT NULL,
  `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`), KEY `idx_vehicle_document_vehicle` (`vehicleId`),
  KEY `idx_vehicle_document_type` (`documentType`), KEY `idx_vehicle_document_expiry` (`expiryDate`),
  CONSTRAINT `fk_vehicle_document_vehicle` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `vehicle_assignments` (
  `id` VARCHAR(255) NOT NULL, `vehicleId` VARCHAR(255) NOT NULL,
  `action` ENUM('ASSIGNED','TRANSFERRED','RETURNED') NOT NULL,
  `fromPersonId` VARCHAR(255) NULL, `fromPersonName` VARCHAR(255) NULL,
  `toPersonId` VARCHAR(255) NULL, `toPersonName` VARCHAR(255) NULL,
  `assigneeType` ENUM('Employee','External') NULL, `assignedAt` DATETIME NOT NULL,
  `returnedAt` DATETIME NULL, `purpose` TEXT NULL, `odometer` INT NULL,
  `handoverProofUrl` TEXT NULL, `remarks` TEXT NULL,
  `performedById` VARCHAR(255) NOT NULL, `performedByName` VARCHAR(255) NOT NULL,
  `createdAt` DATETIME NOT NULL, `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`), KEY `idx_vehicle_assignment_vehicle` (`vehicleId`),
  KEY `idx_vehicle_assignment_person` (`toPersonId`), KEY `idx_vehicle_assignment_date` (`assignedAt`),
  CONSTRAINT `fk_vehicle_assignment_vehicle` FOREIGN KEY (`vehicleId`) REFERENCES `vehicles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
