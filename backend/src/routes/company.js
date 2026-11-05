const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authRequired, requireCompanyUser } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired, requireCompanyUser);

router.get('/dashboard', async (req, res) => {
  try {
    const companyId = req.user.company_id;

    const [[company]] = await pool.query(
      `SELECT c.*, p.name AS plan_name, p.max_salespersons, p.max_leads, p.whatsapp_messages, p.call_minutes
       FROM companies c
       LEFT JOIN subscription_plans p ON p.id = c.plan_id
       WHERE c.id = ?`,
      [companyId]
    );

    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const [[counts]] = await pool.query(
      `SELECT
         SUM(role = 'company_admin') AS admins,
         SUM(role = 'salesperson') AS salespersons,
         COUNT(*) AS total_users
       FROM users
       WHERE company_id = ? AND is_active = 1`,
      [companyId]
    );

    const [[leadStats]] = await pool.query(
      `SELECT
         COUNT(*) AS total_leads,
         SUM(CASE WHEN (claimed_by IS NULL OR claimed_by = 0) THEN 1 ELSE 0 END) AS pool_leads,
         SUM(CASE WHEN (claimed_by IS NOT NULL AND claimed_by > 0) AND status IN ('interested', 'quotation_requested', 'quotation_sent') THEN 1 ELSE 0 END) AS hot_leads,
         SUM(CASE WHEN status IN ('not_interested', 'lost') THEN 1 ELSE 0 END) AS cold_leads,
         SUM(CASE WHEN (claimed_by IS NOT NULL AND claimed_by > 0) AND status IN ('contacted', 'new', 'followup') THEN 1 ELSE 0 END) AS warm_leads,
         
         SUM(CASE WHEN (claimed_by IS NULL OR claimed_by = 0) THEN 1 ELSE 0 END) AS stage_new_pool,
         SUM(CASE WHEN (claimed_by IS NOT NULL AND claimed_by > 0) AND (status = 'contacted' OR status = 'new') THEN 1 ELSE 0 END) AS stage_contacted,
         SUM(CASE WHEN status = 'interested' THEN 1 ELSE 0 END) AS stage_interested,
         SUM(CASE WHEN status = 'followup' THEN 1 ELSE 0 END) AS stage_followup,
         SUM(CASE WHEN status IN ('quotation_requested', 'quotation_sent') THEN 1 ELSE 0 END) AS stage_quotation,
         SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) AS stage_won,
         SUM(CASE WHEN status IN ('not_interested', 'lost') THEN 1 ELSE 0 END) AS stage_not_interested
       FROM leads
       WHERE company_id = ?`,
      [companyId]
    );

    res.json({
      company,
      counts: {
        admins: Number(counts?.admins || 0),
        salespersons: Number(counts?.salespersons || 0),
        total_users: Number(counts?.total_users || 0),
      },
      analytics: {
        total_leads: Number(leadStats?.total_leads || 0),
        temperature: {
          hot: Number(leadStats?.hot_leads || 0),
          warm: Number(leadStats?.warm_leads || 0),
          cold: Number(leadStats?.cold_leads || 0),
          pool: Number(leadStats?.pool_leads || 0),
        },
        funnel: [
          { stage: 'New Leads', key: 'new_pool', count: Number(leadStats?.stage_new_pool || 0), color: '#2A9CB8' },
          { stage: 'Contacted', key: 'contacted', count: Number(leadStats?.stage_contacted || 0), color: '#0B6BE6' },
          { stage: 'Interested', key: 'interested', count: Number(leadStats?.stage_interested || 0), color: '#EF4444' },
          { stage: 'Follow-Up', key: 'followup', count: Number(leadStats?.stage_followup || 0), color: '#F59E0B' },
          { stage: 'Quotation', key: 'quotation', count: Number(leadStats?.stage_quotation || 0), color: '#8B5CF6' },
          { stage: 'Closed Won', key: 'won', count: Number(leadStats?.stage_won || 0), color: '#16A34A' },
          { stage: 'Not Interested', key: 'not_interested', count: Number(leadStats?.stage_not_interested || 0), color: '#94A3B8' },
        ],
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load company dashboard' });
  }
});

function canManageTeam(user) {
  if (user?.role === 'company_admin') return true;
  let perms = [];
  try {
    perms = typeof user?.permissions === 'string' ? JSON.parse(user.permissions) : (user?.permissions || []);
  } catch (e) {
    perms = [];
  }
  return Array.isArray(perms) && perms.includes('team');
}

router.get('/team', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.agent_phone, u.role, u.custom_role, u.permissions, u.is_active, u.created_at,
              d.name AS domain_name,
              d.id AS domain_id
       FROM users u
       LEFT JOIN user_domains ud ON ud.user_id = u.id AND ud.company_id = u.company_id
       LEFT JOIN domains d ON d.id = ud.domain_id
       WHERE u.company_id = ?
       ORDER BY FIELD(u.role, 'company_admin', 'salesperson'), u.name`,
      [req.user.company_id]
    );
    res.json({ team: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load team' });
  }
});

router.get('/domains', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, slug, is_default FROM domains WHERE company_id = ? AND is_active = 1 ORDER BY name ASC',
      [req.user.company_id]
    );
    res.json({ domains: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load domains' });
  }
});

router.post('/team', async (req, res) => {
  try {
    if (!canManageTeam(req.user)) {
      return res.status(403).json({ message: 'Only company admins or managers with Team permission can add team members' });
    }

    const { name, email, password, domain, phone, agent_phone, role, custom_role, permissions } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const cleanPhone = (phone || agent_phone) ? String(phone || agent_phone).trim() : null;

    let finalRole = 'salesperson';
    let finalCustomRole = custom_role ? String(custom_role).trim() : null;
    let finalPermissions = null;

    if (role === 'sales') {
      finalRole = 'salesperson';
      finalCustomRole = 'Sales Representative';
      finalPermissions = JSON.stringify(['leads', 'pipeline', 'tasks', 'whatsapp']);
    } else {
      finalRole = 'company_admin';
      finalCustomRole = custom_role || (role === 'manager' ? 'Manager' : (role === 'hr' ? 'HR' : 'Team Member'));
      finalPermissions = Array.isArray(permissions) ? JSON.stringify(permissions) : JSON.stringify([]);
    }

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, custom_role, permissions, company_id, agent_phone, login_password, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [name.trim(), email.trim().toLowerCase(), hash, finalRole, finalCustomRole, finalPermissions, req.user.company_id, cleanPhone, password]
    );

    if (domain && String(domain).trim()) {
      const domName = String(domain).trim();
      const domSlug = domName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const [existingDom] = await pool.query(
        'SELECT id FROM domains WHERE company_id = ? AND (name = ? OR slug = ?) LIMIT 1',
        [req.user.company_id, domName, domSlug]
      );
      let targetDomainId;
      if (existingDom[0]) {
        targetDomainId = existingDom[0].id;
      } else {
        const [newDom] = await pool.query(
          'INSERT INTO domains (company_id, name, slug, is_default, is_active) VALUES (?, ?, ?, 0, 1)',
          [req.user.company_id, domName, domSlug]
        );
        targetDomainId = newDom.insertId;
      }

      await pool.query(
        'INSERT IGNORE INTO user_domains (user_id, domain_id, company_id) VALUES (?, ?, ?)',
        [result.insertId, targetDomainId, req.user.company_id]
      );
    }

    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.custom_role, u.permissions, u.agent_phone, u.is_active, u.created_at,
              d.name AS domain_name,
              d.id AS domain_id
       FROM users u
       LEFT JOIN user_domains ud ON ud.user_id = u.id AND ud.company_id = u.company_id
       LEFT JOIN domains d ON d.id = ud.domain_id
       WHERE u.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ member: rows[0] });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Failed to create team member' });
  }
});

router.patch('/team/:id/domain', async (req, res) => {
  try {
    if (!canManageTeam(req.user)) {
      return res.status(403).json({ message: 'Only authorized team managers can update domain' });
    }
    const { domain } = req.body;
    const userId = req.params.id;
    const companyId = req.user.company_id;

    if (!domain || !String(domain).trim()) {
      await pool.query('DELETE FROM user_domains WHERE user_id = ? AND company_id = ?', [userId, companyId]);
      return res.json({ message: 'Domain unassigned' });
    }

    const domName = String(domain).trim();
    const domSlug = domName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const [existingDom] = await pool.query(
      'SELECT id FROM domains WHERE company_id = ? AND (name = ? OR slug = ?) LIMIT 1',
      [companyId, domName, domSlug]
    );
    let targetDomainId;
    if (existingDom[0]) {
      targetDomainId = existingDom[0].id;
    } else {
      const [newDom] = await pool.query(
        'INSERT INTO domains (company_id, name, slug, is_default, is_active) VALUES (?, ?, ?, 0, 1)',
        [companyId, domName, domSlug]
      );
      targetDomainId = newDom.insertId;
    }

    await pool.query('DELETE FROM user_domains WHERE user_id = ? AND company_id = ?', [userId, companyId]);
    await pool.query(
      'INSERT INTO user_domains (user_id, domain_id, company_id) VALUES (?, ?, ?)',
      [userId, targetDomainId, companyId]
    );

    res.json({ message: 'Domain updated successfully', domain_name: domName, domain_id: targetDomainId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update domain' });
  }
});

const handleUpdateTeamMember = async (req, res) => {
  try {
    if (!canManageTeam(req.user)) {
      return res.status(403).json({ message: 'Only authorized team managers can edit team member details' });
    }

    const userId = Number(req.params.id);
    const companyId = req.user.company_id;
    const { name, email, phone, agent_phone, domain, password, role, custom_role, permissions } = req.body || {};

    // Verify member exists and belongs to company
    const [rows] = await pool.query(
      'SELECT id, role FROM users WHERE id = ? AND company_id = ? LIMIT 1',
      [userId, companyId]
    );
    const member = rows[0];
    if (!member) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    // Prepare fields to update
    const updates = [];
    const values = [];

    if (name && String(name).trim()) {
      updates.push('name = ?');
      values.push(String(name).trim());
    }

    if (email && String(email).trim()) {
      const cleanEmail = String(email).trim().toLowerCase();
      // Check for email collision with other users
      const [emailCheck] = await pool.query(
        'SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1',
        [cleanEmail, userId]
      );
      if (emailCheck.length > 0) {
        return res.status(400).json({ message: 'Another user already uses this email address' });
      }
      updates.push('email = ?');
      values.push(cleanEmail);
    }

    if (phone !== undefined || agent_phone !== undefined) {
      const cleanPhone = String(phone || agent_phone || '').trim() || null;
      updates.push('agent_phone = ?');
      values.push(cleanPhone);
    }

    if (role !== undefined) {
      if (role === 'sales') {
        updates.push('role = ?', 'custom_role = ?', 'permissions = ?');
        values.push('salesperson', 'Sales Representative', JSON.stringify(['leads', 'pipeline', 'tasks', 'whatsapp']));
      } else if (role === 'manager') {
        updates.push('role = ?', 'custom_role = ?');
        values.push('company_admin', custom_role || 'Manager');
        if (permissions !== undefined) {
          updates.push('permissions = ?');
          values.push(Array.isArray(permissions) ? JSON.stringify(permissions) : JSON.stringify([]));
        }
      } else {
        updates.push('role = ?', 'custom_role = ?');
        values.push('company_admin', custom_role || (role === 'hr' ? 'HR' : 'Team Member'));
        if (permissions !== undefined) {
          updates.push('permissions = ?');
          values.push(Array.isArray(permissions) ? JSON.stringify(permissions) : JSON.stringify([]));
        }
      }
    } else {
      if (custom_role !== undefined) {
        updates.push('custom_role = ?');
        values.push(custom_role);
      }
      if (permissions !== undefined) {
        updates.push('permissions = ?');
        values.push(Array.isArray(permissions) ? JSON.stringify(permissions) : JSON.stringify([]));
      }
    }

    if (password && String(password).trim().length >= 6) {
      const hash = await bcrypt.hash(String(password).trim(), 10);
      updates.push('password_hash = ?');
      values.push(hash);
      updates.push('login_password = ?');
      values.push(String(password).trim());
    }

    if (updates.length > 0) {
      values.push(userId, companyId);
      await pool.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ? AND company_id = ?`,
        values
      );
    }

    // Update domain if provided
    if (domain !== undefined) {
      if (!domain || !String(domain).trim()) {
        await pool.query('DELETE FROM user_domains WHERE user_id = ? AND company_id = ?', [userId, companyId]);
      } else {
        const domName = String(domain).trim();
        const domSlug = domName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const [existingDom] = await pool.query(
          'SELECT id FROM domains WHERE company_id = ? AND (name = ? OR slug = ?) LIMIT 1',
          [companyId, domName, domSlug]
        );
        let targetDomainId;
        if (existingDom[0]) {
          targetDomainId = existingDom[0].id;
        } else {
          const [newDom] = await pool.query(
            'INSERT INTO domains (company_id, name, slug, is_default, is_active) VALUES (?, ?, ?, 0, 1)',
            [companyId, domName, domSlug]
          );
          targetDomainId = newDom.insertId;
        }
        await pool.query('DELETE FROM user_domains WHERE user_id = ? AND company_id = ?', [userId, companyId]);
        await pool.query(
          'INSERT INTO user_domains (user_id, domain_id, company_id) VALUES (?, ?, ?)',
          [userId, targetDomainId, companyId]
        );
      }
    }

    const [updatedRows] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role, u.custom_role, u.permissions, u.agent_phone, u.is_active, u.created_at,
              d.name AS domain_name,
              d.id AS domain_id
       FROM users u
       LEFT JOIN user_domains ud ON ud.user_id = u.id AND ud.company_id = u.company_id
       LEFT JOIN domains d ON d.id = ud.domain_id
       WHERE u.id = ?`,
      [userId]
    );

    res.json({ message: 'Team member details updated successfully', member: updatedRows[0] });
  } catch (err) {
    console.error('Failed to update team member:', err);
    res.status(500).json({ message: 'Failed to update team member details' });
  }
};

router.patch('/team/:id', handleUpdateTeamMember);
router.put('/team/:id', handleUpdateTeamMember);

router.patch('/team/:id/status', async (req, res) => {
  try {
    if (!canManageTeam(req.user)) {
      return res.status(403).json({ message: 'Only authorized team managers can update team status' });
    }

    const { is_active } = req.body;
    const [rows] = await pool.query(
      `SELECT id, role FROM users WHERE id = ? AND company_id = ? LIMIT 1`,
      [req.params.id, req.user.company_id]
    );

    const member = rows[0];
    if (!member) return res.status(404).json({ message: 'Team member not found' });
    if (member.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    await pool.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, req.params.id]);
    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

router.post('/team/:id/impersonate', async (req, res) => {
  try {
    if (!canManageTeam(req.user)) {
      return res.status(403).json({ message: 'Only authorized team managers can log in as a salesperson' });
    }

    const [rows] = await pool.query(
      'SELECT id, name, email, role, custom_role, permissions, company_id, is_active FROM users WHERE id = ? AND company_id = ? LIMIT 1',
      [req.params.id, req.user.company_id]
    );

    const member = rows[0];
    if (!member) return res.status(404).json({ message: 'Team member not found' });
    if (!member.is_active) return res.status(400).json({ message: 'Team member is deactivated' });

    let permissions = [];
    if (member.permissions) {
      try {
        permissions = typeof member.permissions === 'string' ? JSON.parse(member.permissions) : member.permissions;
      } catch (e) {
        permissions = [];
      }
    }

    const token = jwt.sign(
      { id: member.id, email: member.email, role: member.role, custom_role: member.custom_role, permissions, company_id: member.company_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const [[company]] = await pool.query('SELECT * FROM companies WHERE id = ? LIMIT 1', [member.company_id]);

    res.json({
      token,
      user: {
        id: member.id,
        name: member.name,
        email: member.email,
        role: member.role,
        custom_role: member.custom_role,
        permissions,
        company_id: member.company_id,
        company,
      },
    });
  } catch (err) {
    console.error('Impersonate error:', err);
    res.status(500).json({ message: 'Failed to switch to salesperson' });
  }
});

router.get('/team/:id/leads-summary', async (req, res) => {
  try {
    if (!canManageTeam(req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const companyId = req.user.company_id;
    const memberId = Number(req.params.id);

    const [memberRows] = await pool.query(
      'SELECT id, name, email, role, custom_role, is_active FROM users WHERE id = ? AND company_id = ? LIMIT 1',
      [memberId, companyId]
    );
    const member = memberRows[0];
    if (!member) return res.status(404).json({ message: 'Team member not found' });

    // Count claimed pipeline leads
    const [leadCountRows] = await pool.query(
      'SELECT COUNT(*) AS total FROM leads WHERE company_id = ? AND claimed_by = ?',
      [companyId, memberId]
    );
    const claimedCount = Number(leadCountRows[0]?.total || 0);

    // Count pending reminders
    const [remCountRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM lead_reminders WHERE company_id = ? AND salesperson_id = ? AND status = 'pending'`,
      [companyId, memberId]
    );
    const remindersCount = Number(remCountRows[0]?.total || 0);

    // Eligible active salespersons to receive leads (exclude the source member and MUST be active)
    const [activeReps] = await pool.query(
      `SELECT id, name, email, agent_phone, custom_role, role, is_active
       FROM users
       WHERE company_id = ? AND is_active = 1 AND id != ? AND role = 'salesperson'
       ORDER BY name ASC`,
      [companyId, memberId]
    );

    res.json({
      member,
      claimed_leads_count: claimedCount,
      pending_reminders_count: remindersCount,
      active_reps: activeReps,
    });
  } catch (err) {
    console.error('Leads summary error:', err);
    res.status(500).json({ message: 'Failed to fetch team member leads summary' });
  }
});

router.post('/team/transfer-leads', async (req, res) => {
  let conn;
  try {
    if (!canManageTeam(req.user)) {
      return res.status(403).json({ message: 'Only company admins or managers can transfer leads' });
    }

    const companyId = req.user.company_id;
    const { from_salesperson_id, to_salesperson_id, notes } = req.body || {};

    const fromId = Number(from_salesperson_id);
    const toId = Number(to_salesperson_id);

    if (!fromId || !toId) {
      return res.status(400).json({ message: 'Both source and target salesperson must be selected' });
    }

    if (fromId === toId) {
      return res.status(400).json({ message: 'Source and target salesperson cannot be the same' });
    }

    // Verify source user belongs to company
    const [fromRows] = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ? AND company_id = ? LIMIT 1',
      [fromId, companyId]
    );
    const fromUser = fromRows[0];
    if (!fromUser) {
      return res.status(404).json({ message: 'Source team member not found' });
    }

    // Verify target user belongs to company AND IS ACTIVE
    const [toRows] = await pool.query(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ? AND company_id = ? LIMIT 1',
      [toId, companyId]
    );
    const toUser = toRows[0];
    if (!toUser) {
      return res.status(404).json({ message: 'Target salesperson not found' });
    }

    // Strict validation: target user must be active
    if (!toUser.is_active) {
      return res.status(400).json({
        message: `Cannot transfer leads to "${toUser.name}" because this account is deactivated. Please select an active salesperson.`,
      });
    }

    // Find all claimed / pipeline leads belonging to fromUser
    const [leadsToTransfer] = await pool.query(
      `SELECT id, name, status, stage_id FROM leads 
       WHERE company_id = ? AND claimed_by = ?`,
      [companyId, fromId]
    );

    if (leadsToTransfer.length === 0) {
      return res.status(400).json({
        message: `"${fromUser.name}" currently has 0 claimed pipeline leads to transfer.`,
      });
    }

    // Get count of pending reminders
    const [remRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM lead_reminders 
       WHERE company_id = ? AND salesperson_id = ? AND status = 'pending'`,
      [companyId, fromId]
    );
    const pendingRemindersCount = Number(remRows[0]?.total || 0);

    // Execute atomic transfer in a transaction
    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 1. Update all claimed leads in pipeline
    await conn.query(
      `UPDATE leads 
       SET claimed_by = ?,
           assigned_to = ?,
           is_transferred = 1,
           transferred_from_id = ?,
           transferred_from_name = ?,
           transferred_at = NOW(),
           updated_at = NOW()
       WHERE company_id = ? AND claimed_by = ?`,
      [toId, toId, fromId, fromUser.name, companyId, fromId]
    );

    // 2. Reassign pending reminders to target rep
    if (pendingRemindersCount > 0) {
      await conn.query(
        `UPDATE lead_reminders 
         SET salesperson_id = ?,
             is_transferred = 1,
             updated_at = NOW()
         WHERE company_id = ? AND salesperson_id = ? AND status = 'pending'`,
        [toId, companyId, fromId]
      );
    }

    // 3. Record transfer in lead_transfers audit table
    await conn.query(
      `INSERT INTO lead_transfers (company_id, from_salesperson_id, to_salesperson_id, transferred_by, leads_count, reminders_count, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [companyId, fromId, toId, req.user.id, leadsToTransfer.length, pendingRemindersCount, notes || null]
    );

    // 4. Log activity on each transferred lead
    for (const lead of leadsToTransfer) {
      await conn.query(
        `INSERT INTO lead_activities (company_id, lead_id, type, summary, actor_id)
         VALUES (?, ?, 'lead_transferred', ?, ?)`,
        [
          companyId,
          lead.id,
          `Lead transferred from ${fromUser.name} to ${toUser.name}`,
          req.user.id,
        ]
      );
    }

    await conn.commit();

    res.json({
      success: true,
      message: `Successfully transferred ${leadsToTransfer.length} leads and ${pendingRemindersCount} pending reminders from ${fromUser.name} to ${toUser.name}!`,
      transferred_count: leadsToTransfer.length,
      reminders_count: pendingRemindersCount,
      from_salesperson: fromUser.name,
      to_salesperson: toUser.name,
    });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Transfer leads error:', err);
    res.status(500).json({ message: err.message || 'Failed to transfer leads' });
  } finally {
    if (conn) conn.release();
  }
});

router.delete('/team/:id', async (req, res) => {
  try {
    // Only the primary Company Admin has permission to delete team accounts
    const isMainAdmin =
      req.user?.role === 'company_admin' &&
      (!req.user?.custom_role || req.user?.custom_role?.trim().toLowerCase() === 'admin');

    if (!isMainAdmin) {
      return res.status(403).json({ message: 'Only the Company Admin has permission to delete team members' });
    }

    const memberId = Number(req.params.id);
    const companyId = req.user.company_id;

    if (memberId === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    const [rows] = await pool.query(
      'SELECT id, role, custom_role, name FROM users WHERE id = ? AND company_id = ? LIMIT 1',
      [memberId, companyId]
    );

    const member = rows[0];
    if (!member) {
      return res.status(404).json({ message: 'Team member not found' });
    }

    // Protect primary Company Admin account from being deleted
    const isTargetMainAdmin =
      member.role === 'company_admin' &&
      (!member.custom_role || member.custom_role?.trim().toLowerCase() === 'admin');
    if (isTargetMainAdmin) {
      return res.status(400).json({ message: 'The primary Company Admin account cannot be deleted' });
    }

    // Cleanly unassign any assigned or claimed leads
    await pool.query('UPDATE leads SET assigned_to = NULL WHERE assigned_to = ? AND company_id = ?', [memberId, companyId]);
    await pool.query('UPDATE leads SET claimed_by = NULL WHERE claimed_by = ? AND company_id = ?', [memberId, companyId]);
    await pool.query('UPDATE lead_reminders SET salesperson_id = NULL WHERE salesperson_id = ? AND company_id = ?', [memberId, companyId]);

    // Clean up domain assignments
    await pool.query('DELETE FROM user_domains WHERE user_id = ? AND company_id = ?', [memberId, companyId]);

    // Delete the user (including CEO, Manager, Salesperson, HR, etc.)
    await pool.query('DELETE FROM users WHERE id = ? AND company_id = ?', [memberId, companyId]);

    res.json({ success: true, message: `Team member "${member.name}" deleted successfully` });
  } catch (err) {
    console.error('Delete team member error:', err);
    res.status(500).json({ message: 'Failed to delete team member' });
  }
});

/**
 * GET /api/company/profile
 * Returns company admin's profile
 */
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    const companyId = req.user.company_id;
    const [[userRow]] = await pool.query(
      'SELECT id, name, email, role, company_id FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    const [[compRow]] = await pool.query(
      'SELECT id, name, email, phone FROM companies WHERE id = ? LIMIT 1',
      [companyId]
    );
    res.json({ user: userRow, company: compRow });
  } catch (err) {
    console.error('Fetch profile error:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

/**
 * PUT /api/company/profile
 * Allows admin to update their name, email, and password directly
 */
router.put('/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email, password } = req.body || {};
    
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const [[existing]] = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ? LIMIT 1',
      [email.trim(), userId]
    );
    if (existing) {
      return res.status(400).json({ message: 'Email is already in use by another account' });
    }

    const bcrypt = require('bcryptjs');
    if (password && String(password).trim().length > 0) {
      if (String(password).length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?',
        [name.trim(), email.trim(), hash, userId]
      );
    } else {
      await pool.query(
        'UPDATE users SET name = ?, email = ? WHERE id = ?',
        [name.trim(), email.trim(), userId]
      );
    }

    const [[updatedUser]] = await pool.query(
      'SELECT id, name, email, role, company_id FROM users WHERE id = ?',
      [userId]
    );

    res.json({ success: true, message: 'Profile updated successfully', user: updatedUser });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

/**
 * GET /api/company/feedbacks
 * Company-wide audit trail of all rep feedback and stage transitions
 */
router.get('/feedbacks', async (req, res) => {
  try {
    const companyId = req.user.company_id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const { q, stage, rep_id, lead_id, campaign } = req.query;

    let whereClause = 'WHERE lf.company_id = ?';
    const params = [companyId];

    if (lead_id) {
      whereClause += ' AND lf.lead_id = ?';
      params.push(Number(lead_id));
    }

    if (rep_id && rep_id !== 'all') {
      whereClause += ' AND lf.user_id = ?';
      params.push(Number(rep_id));
    }

    if (stage && stage !== 'all') {
      whereClause += ' AND (lf.to_status = ? OR lf.from_status = ?)';
      params.push(stage, stage);
    }

    if (campaign && campaign !== 'all') {
      if (campaign === 'Direct WhatsApp' || campaign === 'unassigned') {
        whereClause += ' AND (l.campaign IS NULL OR TRIM(l.campaign) = "" OR l.campaign = "Direct WhatsApp")';
      } else {
        whereClause += ' AND l.campaign = ?';
        params.push(campaign);
      }
    }

    if (q && q.trim()) {
      whereClause += ' AND (l.name LIKE ? OR l.phone LIKE ? OR l.lead_company LIKE ? OR lf.feedback LIKE ?)';
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term);
    }

    // 1. Total matching count
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM lead_feedbacks lf
       JOIN leads l ON l.id = lf.lead_id
       ${whereClause}`,
      params
    );
    const total = Number(countRows[0]?.total || 0);

    // 2. Paginated rows
    const [rows] = await pool.query(
      `SELECT 
         lf.id,
         lf.lead_id,
         lf.company_id,
         lf.user_id,
         lf.from_status,
         lf.to_status,
         lf.feedback,
         lf.created_at,
         l.name AS lead_name,
         l.phone AS lead_phone,
         l.email AS lead_email,
         l.lead_company,
         l.campaign,
         l.status AS current_lead_status,
         u.name AS salesperson_name,
         u.email AS salesperson_email
       FROM lead_feedbacks lf
       JOIN leads l ON l.id = lf.lead_id
       LEFT JOIN users u ON u.id = lf.user_id
       ${whereClause}
       ORDER BY lf.created_at DESC, lf.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // 3. Company stats summary
    const [[statsRow]] = await pool.query(
      `SELECT
         COUNT(*) AS total_feedbacks,
         SUM(CASE WHEN DATE(lf.created_at) = CURRENT_DATE() THEN 1 ELSE 0 END) AS today_feedbacks,
         SUM(CASE WHEN lf.to_status = 'won' THEN 1 ELSE 0 END) AS won_feedbacks,
         SUM(CASE WHEN lf.to_status IN ('lost', 'not_interested') THEN 1 ELSE 0 END) AS lost_feedbacks
       FROM lead_feedbacks lf
       WHERE lf.company_id = ?`,
      [companyId]
    );

    // 4. Sales reps list for filter dropdown
    const [reps] = await pool.query(
      `SELECT id, name, email FROM users WHERE company_id = ? AND role = 'salesperson' ORDER BY name ASC`,
      [companyId]
    );

    // 5. Distinct campaigns list for filter dropdown
    const [campRows] = await pool.query(
      `SELECT DISTINCT TRIM(campaign) AS campaign FROM leads WHERE company_id = ? AND campaign IS NOT NULL AND TRIM(campaign) != '' ORDER BY campaign ASC`,
      [companyId]
    );

    res.json({
      feedbacks: rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats: {
        total: Number(statsRow?.total_feedbacks || 0),
        today: Number(statsRow?.today_feedbacks || 0),
        won: Number(statsRow?.won_feedbacks || 0),
        lost: Number(statsRow?.lost_feedbacks || 0),
      },
      reps: reps || [],
      campaigns: campRows.map((c) => c.campaign).filter(Boolean),
    });
  } catch (err) {
    console.error('Company feedbacks error:', err);
    res.status(500).json({ message: 'Failed to fetch company feedbacks' });
  }
});

module.exports = router;
