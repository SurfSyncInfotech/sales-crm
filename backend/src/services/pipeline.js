const pool = require('../config/db');

const DEFAULT_STAGES = [
  { name: 'New', kind: 'open', legacy_status: 'new', color: '#64748b' },
  { name: 'Contacted', kind: 'open', legacy_status: 'contacted', color: '#0ea5e9' },
  { name: 'Qualified', kind: 'open', legacy_status: 'qualified', color: '#8b5cf6' },
  { name: 'Interested', kind: 'open', legacy_status: 'qualified', color: '#f59e0b' },
  { name: 'Quotation Sent', kind: 'open', legacy_status: 'qualified', color: '#f97316' },
  { name: 'Won', kind: 'won', legacy_status: 'won', color: '#22c55e' },
  { name: 'Lost', kind: 'lost', legacy_status: 'lost', color: '#ef4444' },
];

async function ensureDefaultStages(companyId) {
  const [[{ c }]] = await pool.query('SELECT COUNT(*) AS c FROM pipeline_stages WHERE company_id = ?', [companyId]);
  if (Number(c) > 0) return;
  for (let i = 0; i < DEFAULT_STAGES.length; i += 1) {
    const s = DEFAULT_STAGES[i];
    await pool.query(
      `INSERT IGNORE INTO pipeline_stages (company_id, name, kind, legacy_status, position, color)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [companyId, s.name, s.kind, s.legacy_status, i + 1, s.color]
    );
  }
}

async function getFirstStageId(companyId) {
  await ensureDefaultStages(companyId);
  const [rows] = await pool.query(
    `SELECT id FROM pipeline_stages WHERE company_id = ? AND is_active = 1 AND kind = 'open'
     ORDER BY position ASC, id ASC LIMIT 1`,
    [companyId]
  );
  return rows[0]?.id || null;
}

async function logActivity({ companyId, leadId, type, summary, meta = null, actorId = null }) {
  try {
    await pool.query(
      `INSERT INTO lead_activities (company_id, lead_id, type, summary, meta, actor_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [companyId, leadId, type, String(summary).slice(0, 255), meta ? JSON.stringify(meta) : null, actorId]
    );
  } catch (err) {
    console.error('logActivity failed:', err.message);
  }
}

/** Move a lead to a stage; keeps the legacy leads.status column in sync. */
async function setLeadStage({ companyId, leadId, stageId, actorId = null }) {
  const [stages] = await pool.query(
    'SELECT * FROM pipeline_stages WHERE id = ? AND company_id = ? AND is_active = 1 LIMIT 1',
    [stageId, companyId]
  );
  const stage = stages[0];
  if (!stage) {
    const err = new Error('Stage not found');
    err.status = 404;
    throw err;
  }
  const [leads] = await pool.query(
    `SELECT l.id, l.stage_id, ps.name AS from_stage
     FROM leads l LEFT JOIN pipeline_stages ps ON ps.id = l.stage_id
     WHERE l.id = ? AND l.company_id = ? LIMIT 1`,
    [leadId, companyId]
  );
  if (!leads[0]) {
    const err = new Error('Lead not found');
    err.status = 404;
    throw err;
  }
  if (leads[0].stage_id === stage.id) return stage;

  await pool.query(
    'UPDATE leads SET stage_id = ?, status = COALESCE(?, status) WHERE id = ? AND company_id = ?',
    [stage.id, stage.legacy_status, leadId, companyId]
  );
  await logActivity({
    companyId,
    leadId,
    type: 'stage_change',
    summary: `Stage: ${leads[0].from_stage || '—'} → ${stage.name}`,
    meta: { from_stage_id: leads[0].stage_id, to_stage_id: stage.id },
    actorId,
  });
  return stage;
}

module.exports = { DEFAULT_STAGES, ensureDefaultStages, getFirstStageId, logActivity, setLeadStage };
