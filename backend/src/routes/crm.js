const express = require('express');
const pool = require('../config/db');
const { authRequired, requireCompanyUser } = require('../middleware/auth');
const { ensureDefaultStages, logActivity, setLeadStage } = require('../services/pipeline');
const { slugify, autoAssignLead } = require('../services/assignment');

const router = express.Router();
router.use(authRequired, requireCompanyUser);

function adminOnly(req, res, next) {
  if (req.user.role !== 'company_admin') {
    return res.status(403).json({ message: 'Only company admins can do this' });
  }
  next();
}

const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    if (!err.status) console.error(err);
    res.status(err.status || 500).json({ message: err.status ? err.message : 'Request failed' });
  });

async function requireVisibleLead(req, leadId) {
  const [rows] = await pool.query('SELECT id, assigned_to FROM leads WHERE id = ? AND company_id = ? LIMIT 1', [
    leadId,
    req.user.company_id,
  ]);
  const lead = rows[0];
  if (!lead) {
    const err = new Error('Lead not found');
    err.status = 404;
    throw err;
  }
  if (req.user.role === 'salesperson' && lead.assigned_to !== req.user.id) {
    const err = new Error('You can only access leads assigned to you');
    err.status = 403;
    throw err;
  }
  return lead;
}

// ---------- Pipeline stages ----------

router.get('/stages', wrap(async (req, res) => {
  await ensureDefaultStages(req.user.company_id);
  const [stages] = await pool.query(
    'SELECT * FROM pipeline_stages WHERE company_id = ? AND is_active = 1 ORDER BY position, id',
    [req.user.company_id]
  );
  res.json({ stages });
}));

router.post('/stages', adminOnly, wrap(async (req, res) => {
  const { name, kind = 'open', color = null } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ message: 'Stage name is required' });
  if (!['open', 'won', 'lost'].includes(kind)) return res.status(400).json({ message: 'Invalid stage kind' });
  const [[{ next }]] = await pool.query(
    'SELECT COALESCE(MAX(position), 0) + 1 AS next FROM pipeline_stages WHERE company_id = ?',
    [req.user.company_id]
  );
  const [ins] = await pool.query(
    'INSERT INTO pipeline_stages (company_id, name, kind, position, color) VALUES (?, ?, ?, ?, ?)',
    [req.user.company_id, String(name).trim(), kind, next, color]
  );
  const [rows] = await pool.query('SELECT * FROM pipeline_stages WHERE id = ?', [ins.insertId]);
  res.status(201).json({ stage: rows[0] });
}));

router.patch('/stages/:id', adminOnly, wrap(async (req, res) => {
  const { name, color, position, is_active } = req.body || {};
  const [r] = await pool.query(
    `UPDATE pipeline_stages SET name = COALESCE(?, name), color = COALESCE(?, color),
            position = COALESCE(?, position), is_active = COALESCE(?, is_active)
     WHERE id = ? AND company_id = ?`,
    [name ?? null, color ?? null, position ?? null, is_active === undefined ? null : is_active ? 1 : 0, req.params.id, req.user.company_id]
  );
  if (!r.affectedRows) return res.status(404).json({ message: 'Stage not found' });
  const [rows] = await pool.query('SELECT * FROM pipeline_stages WHERE id = ?', [req.params.id]);
  res.json({ stage: rows[0] });
}));

router.post('/leads/:id/stage', wrap(async (req, res) => {
  const lead = await requireVisibleLead(req, Number(req.params.id));
  const stage = await setLeadStage({
    companyId: req.user.company_id,
    leadId: lead.id,
    stageId: Number(req.body?.stage_id),
    actorId: req.user.id,
  });
  res.json({ stage });
}));

router.get('/leads/:id/activities', wrap(async (req, res) => {
  const lead = await requireVisibleLead(req, Number(req.params.id));
  const [activities] = await pool.query(
    `SELECT a.*, u.name AS actor_name FROM lead_activities a
     LEFT JOIN users u ON u.id = a.actor_id
     WHERE a.lead_id = ? AND a.company_id = ? ORDER BY a.created_at DESC, a.id DESC LIMIT 200`,
    [lead.id, req.user.company_id]
  );
  res.json({ activities });
}));

router.post('/leads/:id/notes', wrap(async (req, res) => {
  const lead = await requireVisibleLead(req, Number(req.params.id));
  const text = String(req.body?.note || '').trim();
  if (!text) return res.status(400).json({ message: 'Note is required' });
  await logActivity({ companyId: req.user.company_id, leadId: lead.id, type: 'note', summary: text, actorId: req.user.id });
  res.status(201).json({ ok: true });
}));

// ---------- Domains, salesperson mapping, rules ----------

router.get('/domains', wrap(async (req, res) => {
  const companyId = req.user.company_id;
  const [domains] = await pool.query('SELECT * FROM domains WHERE company_id = ? AND is_active = 1 ORDER BY name', [companyId]);
  const [members] = await pool.query(
    `SELECT ud.domain_id, u.id AS user_id, u.name FROM user_domains ud
     JOIN users u ON u.id = ud.user_id WHERE ud.company_id = ? AND u.is_active = 1`,
    [companyId]
  );
  const [rules] = await pool.query('SELECT * FROM domain_rules WHERE company_id = ? ORDER BY priority, id', [companyId]);
  res.json({
    domains: domains.map((d) => ({
      ...d,
      salespersons: members.filter((m) => m.domain_id === d.id).map(({ user_id, name }) => ({ id: user_id, name })),
      rules: rules.filter((r) => r.domain_id === d.id),
    })),
  });
}));

router.post('/domains', adminOnly, wrap(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Domain name is required' });
  const companyId = req.user.company_id;
  const isDefault = req.body?.is_default ? 1 : 0;
  if (isDefault) await pool.query('UPDATE domains SET is_default = 0 WHERE company_id = ?', [companyId]);
  try {
    const [ins] = await pool.query('INSERT INTO domains (company_id, name, slug, is_default) VALUES (?, ?, ?, ?)', [
      companyId,
      name,
      slugify(name),
      isDefault,
    ]);
    const [rows] = await pool.query('SELECT * FROM domains WHERE id = ?', [ins.insertId]);
    res.status(201).json({ domain: rows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'A domain with this name already exists' });
    throw err;
  }
}));

router.patch('/domains/:id', adminOnly, wrap(async (req, res) => {
  const companyId = req.user.company_id;
  const { name, is_default, is_active } = req.body || {};
  if (is_default) await pool.query('UPDATE domains SET is_default = 0 WHERE company_id = ?', [companyId]);
  const [r] = await pool.query(
    `UPDATE domains SET name = COALESCE(?, name), is_default = COALESCE(?, is_default), is_active = COALESCE(?, is_active)
     WHERE id = ? AND company_id = ?`,
    [
      name ? String(name).trim() : null,
      is_default === undefined ? null : is_default ? 1 : 0,
      is_active === undefined ? null : is_active ? 1 : 0,
      req.params.id,
      companyId,
    ]
  );
  if (!r.affectedRows) return res.status(404).json({ message: 'Domain not found' });
  const [rows] = await pool.query('SELECT * FROM domains WHERE id = ?', [req.params.id]);
  res.json({ domain: rows[0] });
}));

/** Replace the set of salespersons mapped to a domain. Body: { user_ids: [] } */
router.put('/domains/:id/users', adminOnly, wrap(async (req, res) => {
  const companyId = req.user.company_id;
  const domainId = Number(req.params.id);
  const [dom] = await pool.query('SELECT id FROM domains WHERE id = ? AND company_id = ?', [domainId, companyId]);
  if (!dom[0]) return res.status(404).json({ message: 'Domain not found' });

  const wanted = [...new Set((req.body?.user_ids || []).map(Number).filter(Boolean))];
  let valid = [];
  if (wanted.length) {
    const [users] = await pool.query(
      `SELECT id FROM users WHERE company_id = ? AND role = 'salesperson' AND is_active = 1 AND id IN (?)`,
      [companyId, wanted]
    );
    valid = users.map((u) => u.id);
  }
  await pool.query(
    valid.length
      ? 'DELETE FROM user_domains WHERE domain_id = ? AND company_id = ? AND user_id NOT IN (?)'
      : 'DELETE FROM user_domains WHERE domain_id = ? AND company_id = ?',
    valid.length ? [domainId, companyId, valid] : [domainId, companyId]
  );
  for (const userId of valid) {
    await pool.query('INSERT IGNORE INTO user_domains (user_id, domain_id, company_id) VALUES (?, ?, ?)', [
      userId,
      domainId,
      companyId,
    ]);
  }
  res.json({ domain_id: domainId, user_ids: valid });
}));

router.post('/rules', adminOnly, wrap(async (req, res) => {
  const { domain_id, match_type, pattern, priority = 100 } = req.body || {};
  if (!['source', 'campaign', 'keyword'].includes(match_type) || !String(pattern || '').trim()) {
    return res.status(400).json({ message: 'match_type (source|campaign|keyword) and pattern are required' });
  }
  const [dom] = await pool.query('SELECT id FROM domains WHERE id = ? AND company_id = ?', [domain_id, req.user.company_id]);
  if (!dom[0]) return res.status(400).json({ message: 'Domain not found' });
  const [ins] = await pool.query(
    'INSERT INTO domain_rules (company_id, domain_id, match_type, pattern, priority) VALUES (?, ?, ?, ?, ?)',
    [req.user.company_id, domain_id, match_type, String(pattern).trim(), Number(priority) || 100]
  );
  const [rows] = await pool.query('SELECT * FROM domain_rules WHERE id = ?', [ins.insertId]);
  res.status(201).json({ rule: rows[0] });
}));

router.delete('/rules/:id', adminOnly, wrap(async (req, res) => {
  await pool.query('DELETE FROM domain_rules WHERE id = ? AND company_id = ?', [req.params.id, req.user.company_id]);
  res.json({ ok: true });
}));

// ---------- Unassigned queue ----------

router.get('/unassigned', adminOnly, wrap(async (req, res) => {
  const [leads] = await pool.query(
    `SELECT l.id, l.lead_code, l.name, l.phone, l.source_name, l.campaign, l.domain_id, d.name AS domain_name, l.lead_date
     FROM leads l LEFT JOIN domains d ON d.id = l.domain_id
     WHERE l.company_id = ? AND l.assigned_to IS NULL ORDER BY l.lead_date DESC LIMIT 200`,
    [req.user.company_id]
  );
  res.json({ leads });
}));

/** Re-run classification + assignment for all unassigned leads (e.g. after mapping salespersons). */
router.post('/unassigned/reassign', adminOnly, wrap(async (req, res) => {
  const [leads] = await pool.query(
    'SELECT * FROM leads WHERE company_id = ? AND assigned_to IS NULL ORDER BY lead_date ASC LIMIT 500',
    [req.user.company_id]
  );
  let assigned = 0;
  for (const lead of leads) {
    const r = await autoAssignLead(lead);
    if (r.assigned) assigned += 1;
  }
  res.json({ processed: leads.length, assigned });
}));

module.exports = router;
