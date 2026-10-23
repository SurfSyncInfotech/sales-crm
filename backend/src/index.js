require('dotenv').config();
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

async function start() {
  try {
    const ran = await migrate({ seed: true, silent: false });
    console.log(`DB ready (${ran.join(', ') || 'no sql files'}).`);
    const { ensureFacebookSchema } = require('./migrate_facebook');
    const { ensureCrmSchema } = require('./migrate_crm');
    await ensureFacebookSchema({ silent: true });
    await ensureCrmSchema({ silent: true });
  } catch (err) {
    console.error('Auto SQL migrate failed:', err.message);
    process.exit(1);
  }

  const app = express();
  const PORT = process.env.PORT || 5000;

  app.use(cors());
  app.use(express.json({ limit: '8mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, product: 'SurfSync Studio' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/companies', companyRoutes);
  app.use('/api/company/leads', companyLeadsRoutes);
  app.use('/api/company/crm', crmRoutes);
  app.use('/api/company/whatsapp', companyWhatsappRoutes);
  app.use('/api/company', companyPortalRoutes);
  app.use('/api/public/leads', publicLeadsRoutes);
  app.use('/api/plans', planRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/dashboard', dashboardRoutes);

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  });

  app.listen(PORT, () => {
    console.log(`SurfSync Studio API running on http://localhost:${PORT}`);
  });
}

start();
