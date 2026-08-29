CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  id VARCHAR(64) NOT NULL,
  userId VARCHAR(255) NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  userAgent TEXT NULL,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_web_push_user (userId),
  UNIQUE INDEX uq_web_push_endpoint (endpoint(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
