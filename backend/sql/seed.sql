USE surfsync_studio;

-- Superadmin password: Admin@123 (bcrypt hash)
INSERT INTO users (name, email, password_hash, role, is_active)
VALUES (
  'SurfSync Superadmin',
  'admin@surfsync.studio',
  '$2b$10$L8cilZnqi/8E/etc91UriO.XOKGjDwhk.4mptGk9dT5LlE07V8mRS',
  'superadmin',
  1
)
ON DUPLICATE KEY UPDATE email = email;

INSERT INTO subscription_plans (name, slug, description, price_monthly, price_yearly, max_salespersons, max_leads, whatsapp_messages, call_minutes, features, is_active)
VALUES
(
  'Starter',
  'starter',
  'For small teams getting started with AI sales',
  2999.00,
  29990.00,
  5,
  2000,
  3000,
  500,
  JSON_ARRAY('WhatsApp AI bot', 'Click to call', 'Call recordings', 'Basic reports'),
  1
),
(
  'Growth',
  'growth',
  'Scale outreach with smarter handoffs and analytics',
  7999.00,
  79990.00,
  20,
  15000,
  15000,
  3000,
  JSON_ARRAY('Everything in Starter', 'AI call reports', 'Lead temperature', 'Smart handoff', 'Duplicate shield'),
  1
),
(
  'Enterprise',
  'enterprise',
  'Full platform power for large sales orgs',
  19999.00,
  199990.00,
  100,
  100000,
  100000,
  20000,
  JSON_ARRAY('Everything in Growth', 'Live call copilot', 'White-label', 'Priority support', 'Custom integrations'),
  1
)
ON DUPLICATE KEY UPDATE name = VALUES(name);
