const pool = require('../config/db');
const { logActivity } = require('./pipeline');

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Domain resolution order (mixed strategy):
 * 1. explicit domain on the payload (form dropdown / API)
 * 2. source rule, 3. campaign rule, 4. keyword rule (lowest priority number wins)
 * 5. company default domain
 */
async function classifyDomain({ companyId, payload = {}, sourceSlug = null, sourceName = null, campaign = null, text = '' }) {
  const [domains] = await pool.query('SELECT * FROM domains WHERE company_id = ? AND is_active = 1', [companyId]);
  if (!domains.length) return null;

  const explicit = payload.domain || payload.domain_slug || payload.product_type || null;
  if (explicit) {
    const wanted = slugify(explicit);
    const hit = domains.find((d) => d.slug === wanted || slugify(d.name) === wanted);
    if (hit) return { domain: hit, reason: 'explicit' };
  }

  const [rules] = await pool.query(
    'SELECT * FROM domain_rules WHERE company_id = ? ORDER BY priority ASC, id ASC',
    [companyId]
  );
  const byId = new Map(domains.map((d) => [d.id, d]));
  const haystacks = {
    source: [sourceSlug, sourceName].filter(Boolean).map((s) => s.toLowerCase()),
    campaign: [String(campaign || '').toLowerCase()],
    keyword: [`${text || ''} ${campaign || ''}`.toLowerCase()],
  };

  for (const matchType of ['source', 'campaign', 'keyword']) {
    for (const rule of rules.filter((r) => r.match_type === matchType)) {
      const domain = byId.get(rule.domain_id);
      if (!domain) continue;
      const needle = rule.pattern.toLowerCase();
      const matched =
        matchType === 'source'
          ? haystacks.source.some((s) => s === needle)
          : haystacks[matchType].some((h) => h.includes(needle));
      if (matched) return { domain, reason: `${matchType}:${rule.pattern}` };
    }
  }

  const fallback = domains.find((d) => d.is_default);
  return fallback ? { domain: fallback, reason: 'default' } : null;
}

/** Eligible salesperson in the domain with the fewest open leads; ties go to whoever was assigned longest ago. */
async function pickAssignee(companyId, domainId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.name, ud.last_assigned_at,
            (SELECT COUNT(*) FROM leads l
               LEFT JOIN pipeline_stages ps ON ps.id = l.stage_id
              WHERE l.company_id = u.company_id AND l.assigned_to = u.id
                AND COALESCE(ps.kind, 'open') = 'open') AS open_leads
     FROM user_domains ud
     JOIN users u ON u.id = ud.user_id
     WHERE ud.domain_id = ? AND ud.company_id = ? AND u.company_id = ?
       AND u.is_active = 1 AND u.role = 'salesperson'
     ORDER BY open_leads ASC, ud.last_assigned_at IS NOT NULL, ud.last_assigned_at ASC, u.id ASC
     LIMIT 1`,
    [domainId, companyId, companyId]
  );
  return rows[0] || null;
}

/** Classify + assign a freshly created lead. Never throws; failures are logged to the timeline. */
async function autoAssignLead(lead, { payload = {}, sourceSlug = null } = {}) {
  try {
    const companyId = lead.company_id;
    const result = await classifyDomain({
      companyId,
      payload,
      sourceSlug,
      sourceName: lead.source_name,
      campaign: lead.campaign,
      text: [lead.notes, lead.lead_company, lead.name].filter(Boolean).join(' '),
    });

    if (!result) {
      await logActivity({
        companyId,
        leadId: lead.id,
        type: 'unassigned',
        summary: 'No domain matched — lead is in the unassigned queue',
      });
      return { assigned: false, reason: 'no_domain' };
    }

    const { domain, reason } = result;
    await pool.query('UPDATE leads SET domain_id = ? WHERE id = ?', [domain.id, lead.id]);

    if (lead.assigned_to) {
      await logActivity({
        companyId,
        leadId: lead.id,
        type: 'domain',
        summary: `Domain: ${domain.name} (${reason}); kept manual assignee`,
      });
      return { assigned: true, domain, user_id: lead.assigned_to, kept: true };
    }

    const assignee = await pickAssignee(companyId, domain.id);
    if (!assignee) {
      await logActivity({
        companyId,
        leadId: lead.id,
        type: 'unassigned',
        summary: `Domain: ${domain.name} — no eligible salesperson, moved to unassigned queue`,
        meta: { domain_id: domain.id, alert_manager: true },
      });
      return { assigned: false, reason: 'no_assignee', domain };
    }

    await pool.query('UPDATE leads SET assigned_to = ? WHERE id = ?', [assignee.id, lead.id]);
    await pool.query(
      'UPDATE user_domains SET last_assigned_at = CURRENT_TIMESTAMP WHERE user_id = ? AND domain_id = ?',
      [assignee.id, domain.id]
    );
    await logActivity({
      companyId,
      leadId: lead.id,
      type: 'assigned',
      summary: `Assigned to ${assignee.name} (domain ${domain.name}, ${reason})`,
      meta: { domain_id: domain.id, user_id: assignee.id, reason, open_leads: Number(assignee.open_leads) },
    });
    return { assigned: true, domain, user_id: assignee.id, user_name: assignee.name };
  } catch (err) {
    console.error('autoAssignLead failed:', err.message);
    return { assigned: false, reason: 'error' };
  }
}

module.exports = { slugify, classifyDomain, pickAssignee, autoAssignLead };
