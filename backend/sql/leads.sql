USE surfsync_studio;

CREATE TABLE IF NOT EXISTS lead_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(40) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS company_lead_integrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  source_id INT NOT NULL,
  is_enabled TINYINT(1) NOT NULL DEFAULT 0,
  config JSON NULL,
  webhook_key VARCHAR(64) NULL,
  last_synced_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_company_source (company_id, source_id),
  INDEX idx_cli_company (company_id),
  INDEX idx_cli_source (source_id)
);

CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  lead_code VARCHAR(40) NOT NULL,
  external_id VARCHAR(120) NULL,
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(40) NULL,
  email VARCHAR(180) NULL,
  lead_company VARCHAR(180) NULL,
  source_id INT NULL,
  source_name VARCHAR(120) NULL,
  campaign VARCHAR(180) NULL,
  lead_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_to INT NULL,
  tags JSON NULL,
  status ENUM('new', 'contacted', 'qualified', 'won', 'lost') NOT NULL DEFAULT 'new',
  notes TEXT NULL,
  raw_payload JSON NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_company_lead_code (company_id, lead_code),
  UNIQUE KEY uq_leads_company_external (company_id, external_id),
  INDEX idx_leads_company (company_id),
  INDEX idx_leads_source (source_id),
  INDEX idx_leads_assigned (assigned_to),
  INDEX idx_leads_status (status),
  INDEX idx_leads_date (lead_date)
);

-- Keep only the 7 active channels
UPDATE lead_sources SET is_active = 0;

INSERT INTO lead_sources (name, slug, description, sort_order, is_active) VALUES
('Facebook Ads', 'facebook-ads', 'Capture leads from Facebook Lead Ads via webhook', 1, 1),
('Google Ads', 'google-ads', 'Capture leads from Google Ads lead forms via webhook', 2, 1),
('WhatsApp', 'whatsapp', 'Capture leads from WhatsApp Business messages/webhooks', 3, 1),
('Calling', 'calling', 'Capture leads from inbound or missed phone calls', 4, 1),
('Excel Uploads', 'excel-upload', 'Bulk import leads from Excel or CSV files', 5, 1),
('Website Form', 'website-form', 'Capture leads from website enquiry forms', 6, 1),
('Landing Pages', 'landing-pages', 'Capture leads from campaign landing page forms', 7, 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  sort_order = VALUES(sort_order),
  is_active = 1;

-- Ensure old unused sources stay inactive
UPDATE lead_sources
SET is_active = 0
WHERE slug NOT IN (
  'facebook-ads',
  'google-ads',
  'whatsapp',
  'calling',
  'excel-upload',
  'website-form',
  'landing-pages'
);
