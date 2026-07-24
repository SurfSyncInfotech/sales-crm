USE surfsync_studio;

CREATE TABLE IF NOT EXISTS facebook_connect_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_token VARCHAR(64) NOT NULL UNIQUE,
  company_id INT NOT NULL,
  user_id INT NULL,
  pages_json JSON NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_fcs_company (company_id),
  INDEX idx_fcs_expires (expires_at)
);
