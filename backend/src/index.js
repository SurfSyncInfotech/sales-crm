const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { migrate } = require('./setup');

const authRoutes = require('./routes/auth');
const companyRoutes = require('./routes/companies');
const companyPortalRoutes = require('./routes/company');
const companyLeadsRoutes = require('./routes/companyLeads');
const crmRoutes = require('./routes/crm');
const companyWhatsappRoutes = require('./routes/companyWhatsapp');
const publicLeadsRoutes = require('./routes/publicLeads');
const planRoutes = require('./routes/plans');
const paymentRoutes = require('./routes/payments');
const dashboardRoutes = require('./routes/dashboard');
const salesRoutes = require('./routes/sales');
const companyWabaRoutes = require('./routes/companyWaba');
const adminWabaRoutes = require('./routes/adminWaba');
const notificationsRoutes = require('./routes/notifications');
const { ensureWabaSchema } = require('./migrate_waba');

async function start() {
  try {
    const ran = await migrate({ seed: true, silent: false });
    console.log(`DB ready (${ran.join(', ') || 'no sql files'}).`);
    const { ensureFacebookSchema } = require('./migrate_facebook');
    const { ensureCrmSchema } = require('./migrate_crm');
    await ensureFacebookSchema({ silent: true });
    await ensureCrmSchema({ silent: true });
    await ensureWabaSchema({ silent: true });
  } catch (err) {
    console.error('Auto SQL migrate failed:', err.message);
    process.exit(1);
  }

  const app = express();
  const PORT = process.env.PORT || 5000;

  app.use(cors());
  app.use(express.json({ limit: '8mb' }));
  app.use(express.urlencoded({ extended: true }));

  const fs = require('fs');
  const uploadsDir = path.resolve(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));

  app.get(['/api/health', '/health'], (_req, res) => {
    res.json({ ok: true, product: 'SurfSync Studio' });
  });

  // Mount routes with both /api prefix and direct root prefix
  // (Prevents 404 whether Nginx proxy_pass strips /api/ or preserves it, or if client calls with/without /api)
  const mountRoutes = [
    { prefix: '/auth', handler: authRoutes },
    { prefix: '/companies', handler: companyRoutes },
    { prefix: '/company/leads', handler: companyLeadsRoutes },
    { prefix: '/company/crm', handler: crmRoutes },
    { prefix: '/company/whatsapp', handler: companyWhatsappRoutes },
    { prefix: '/company/waba', handler: companyWabaRoutes },
    { prefix: '/admin/waba', handler: adminWabaRoutes },
    { prefix: '/company', handler: companyPortalRoutes },
    { prefix: '/sales', handler: salesRoutes },
    { prefix: '/notifications', handler: notificationsRoutes },
    { prefix: '/public/leads', handler: publicLeadsRoutes },
    { prefix: '/plans', handler: planRoutes },
    { prefix: '/payments', handler: paymentRoutes },
    { prefix: '/dashboard', handler: dashboardRoutes },
  ];

  mountRoutes.forEach(({ prefix, handler }) => {
    app.use(`/api${prefix}`, handler);
    app.use(prefix, handler);
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  });

  app.listen(PORT, () => {
    console.log(`SurfSync Studio API running on http://localhost:${PORT}`);
    const { startReminderWorker } = require('./services/whatsapp_reminder_runner');
    startReminderWorker(30000);
  });
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
