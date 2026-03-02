-- Migration: create automation_log table
CREATE TABLE IF NOT EXISTS automation_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_user INT NOT NULL,
  id_fatura INT,
  mp_payment_id VARCHAR(100),
  status ENUM('success','error') NOT NULL,
  erro TEXT,
  whatsapp_enviado TINYINT(1) DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_log_id_user ON automation_log(id_user);