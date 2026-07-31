USE surfsync_studio;

CREATE TABLE IF NOT EXISTS company_form_urls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  source_id INT NOT NULL,
  url VARCHAR(255) NOT NULL,
  webhook_key VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (source_id) REFERENCES lead_sources(id) ON DELETE CASCADE,
  INDEX idx_cfu_company_source (company_id, source_id),
  INDEX idx_cfu_webhook_key (webhook_key)
);
