CREATE DATABASE IF NOT EXISTS surfsync_studio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE surfsync_studio;

CREATE TABLE IF NOT EXISTS subscription_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  price_monthly DECIMAL(12,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_salespersons INT NOT NULL DEFAULT 5,
  max_leads INT NOT NULL DEFAULT 1000,
  whatsapp_messages INT NOT NULL DEFAULT 1000,
  call_minutes INT NOT NULL DEFAULT 500,
  features JSON,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(180) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  email VARCHAR(180) NOT NULL,
  phone VARCHAR(30),
  industry VARCHAR(100),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100) DEFAULT 'India',
  status ENUM('active', 'trial', 'suspended', 'cancelled') NOT NULL DEFAULT 'trial',
  plan_id INT NULL,
  billing_cycle ENUM('monthly', 'yearly') DEFAULT 'monthly',
  subscription_start DATE NULL,
  subscription_end DATE NULL,
  trial_extended_days INT NOT NULL DEFAULT 0,
  admin_user_id INT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_companies_plan (plan_id),
  INDEX idx_companies_status (status)
);

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('superadmin', 'company_admin', 'salesperson') NOT NULL DEFAULT 'salesperson',
  company_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_company (company_id),
  INDEX idx_users_role (role)
);

CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  plan_id INT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  billing_cycle ENUM('monthly', 'yearly') NOT NULL DEFAULT 'monthly',
  due_date DATE NULL,
  status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(50) DEFAULT 'manual',
  invoice_number VARCHAR(60) UNIQUE,
  paid_at DATETIME NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payments_company (company_id),
  INDEX idx_payments_status (status)
);

CREATE TABLE IF NOT EXISTS company_activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  action VARCHAR(120) NOT NULL,
  details TEXT,
  performed_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_activity_company (company_id)
);
