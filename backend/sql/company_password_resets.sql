CREATE TABLE IF NOT EXISTS company_password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  phone VARCHAR(40) NOT NULL,
  otp VARCHAR(10) NOT NULL,
  expires_at DATETIME NOT NULL,
  is_verified TINYINT(1) DEFAULT 0,
  created_at DATETIME NOT NULL,
  INDEX idx_cpr_user (user_id),
  INDEX idx_cpr_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
