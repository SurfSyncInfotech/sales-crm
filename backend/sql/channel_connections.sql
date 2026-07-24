USE surfsync_studio;

CREATE TABLE IF NOT EXISTS company_channel_connections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  channel VARCHAR(40) NOT NULL,
  external_account_id VARCHAR(120) NOT NULL,
  external_account_name VARCHAR(180) NULL,
  access_token TEXT NULL,
  refresh_token TEXT NULL,
  token_expires_at DATETIME NULL,
  meta_json JSON NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  connected_by INT NULL,
  connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_company_channel_account (company_id, channel, external_account_id),
  INDEX idx_ccc_company (company_id),
  INDEX idx_ccc_channel_account (channel, external_account_id)
);
