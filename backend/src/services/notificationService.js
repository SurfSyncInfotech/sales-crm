const pool = require('../config/db');

/**
 * In-memory SSE connections map: userId/role -> Set of response objects
 */
const clients = new Map();

function addClient(key, res) {
  if (!clients.has(key)) {
    clients.set(key, new Set());
  }
  clients.get(key).add(res);
}

function removeClient(key, res) {
  if (clients.has(key)) {
    clients.get(key).delete(res);
    if (clients.get(key).size === 0) {
      clients.delete(key);
    }
  }
}

function broadcastEvent(targetKeys, eventData) {
  const json = JSON.stringify(eventData);
  for (const key of targetKeys) {
    const subs = clients.get(key);
    if (subs) {
      for (const res of subs) {
        try {
          res.write(`data: ${json}\n\n`);
        } catch (e) {
          // ignore closed socket
        }
      }
    }
  }
}

/**
 * Insert notification into DB and stream in real time to connected users
 */
async function createNotification({ companyId, userId = null, role = 'all', title, message, type = 'info', link = null }) {
  if (!companyId || !title || !message) return null;

  try {
    const [result] = await pool.query(
      `INSERT INTO notifications (company_id, user_id, role, title, message, type, link, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
      [companyId, userId, role, title, message, type, link]
    );

    const notif = {
      id: result.insertId,
      company_id: companyId,
      user_id: userId,
      role,
      title,
      message,
      type,
      link,
      is_read: 0,
      created_at: new Date().toISOString(),
    };

    // Target keys for SSE broadcast
    const targetKeys = [];
    if (userId) {
      targetKeys.push(`user_${userId}`);
    } else {
      if (role === 'all' || role === 'company_admin') {
        targetKeys.push(`company_${companyId}_admin`);
      }
      if (role === 'all' || role === 'salesperson') {
        targetKeys.push(`company_${companyId}_sales`);
      }
      targetKeys.push(`company_${companyId}_all`);
    }

    broadcastEvent(targetKeys, { type: 'notification', notification: notif });
    return notif;
  } catch (err) {
    console.error('[NotificationService Error]:', err.message);
    return null;
  }
}

// 1. Notify Salesperson of newly assigned lead
async function notifyLeadAssigned(lead, salesperson) {
  if (!lead || !salesperson) return;
  const leadName = lead.name || 'New Client';
  const phone = lead.phone || '';
  return createNotification({
    companyId: lead.company_id || salesperson.company_id,
    userId: salesperson.id,
    role: 'salesperson',
    title: '👤 New Lead Assigned!',
    message: `${leadName} (${phone}) has been assigned to you. Contact them now!`,
    type: 'lead_assigned',
    link: '/sales/leads',
  });
}

// 2. Notify Sales Team of new unclaimed lead in Open Pool
async function notifyOpenPool(lead) {
  if (!lead) return;
  const leadName = lead.name || 'New Inbound Lead';
  return createNotification({
    companyId: lead.company_id,
    userId: null,
    role: 'salesperson',
    title: '⚡ New Lead in Open Pool!',
    message: `${leadName} is available in the pool. First to claim gets it!`,
    type: 'open_pool',
    link: '/sales/leads',
  });
}

// 3. Notify Company Admin that Salesperson requested quotation
async function notifyQuotationRequested(lead, salesperson, details = {}) {
  if (!lead) return;
  const leadName = lead.name || 'Lead';
  const repName = salesperson?.name || 'Sales Representative';
  const budget = details.estimated_budget ? ` (Est. Budget: ${details.estimated_budget})` : '';

  return createNotification({
    companyId: lead.company_id,
    userId: null,
    role: 'company_admin',
    title: '📝 Quotation Requested',
    message: `${repName} requested an official quote for ${leadName}${budget}.`,
    type: 'quote_requested',
    link: `/company/leads`,
  });
}

// 4. Notify Salesperson that Admin has sent quotation to client
async function notifyQuotationSent(lead, salespersonId) {
  if (!lead) return;
  const leadName = lead.name || 'Lead';
  const targetUserId = salespersonId || lead.assigned_user_id;
  if (!targetUserId) return;

  return createNotification({
    companyId: lead.company_id,
    userId: targetUserId,
    role: 'salesperson',
    title: '🚀 Quotation Sent to Client!',
    message: `Admin sent quotation for ${leadName}. Follow up to negotiate and close!`,
    type: 'quote_sent',
    link: '/sales/pipeline',
  });
}

// 5. Notify Company Admin that Deal is Won
async function notifyDealWon(lead, salesperson, amount = '') {
  if (!lead) return;
  const leadName = lead.name || 'Lead';
  const repName = salesperson?.name || 'Salesperson';
  const amountStr = amount ? ` for ₹${amount}` : '';

  return createNotification({
    companyId: lead.company_id,
    userId: null,
    role: 'company_admin',
    title: '🏆 Deal Closed (Won)!',
    message: `${repName} closed ${leadName}${amountStr}! Outstanding work!`,
    type: 'deal_won',
    link: '/company/leads',
  });
}

// 6. Notify Company Admin that Deal is Lost
async function notifyDealLost(lead, salesperson, reason = '') {
  if (!lead) return;
  const leadName = lead.name || 'Lead';
  const repName = salesperson?.name || 'Salesperson';
  const reasonStr = reason ? ` (Reason: ${reason})` : '';

  return createNotification({
    companyId: lead.company_id,
    userId: null,
    role: 'company_admin',
    title: '⚠️ Deal Marked as Lost',
    message: `${leadName} was marked as Lost by ${repName}${reasonStr}.`,
    type: 'deal_lost',
    link: '/company/leads',
  });
}

// 7. Notify Salesperson of Incoming Customer WhatsApp Reply
async function notifyWhatsAppReply(lead, messageText = '') {
  if (!lead || !lead.assigned_user_id) return;
  const leadName = lead.name || 'Client';
  const preview = messageText ? `: "${messageText.slice(0, 40)}..."` : '';

  return createNotification({
    companyId: lead.company_id,
    userId: lead.assigned_user_id,
    role: 'salesperson',
    title: '💬 Customer WhatsApp Reply',
    message: `${leadName} sent a reply${preview}`,
    type: 'whatsapp_reply',
    link: '/sales/leads',
  });
}

module.exports = {
  addClient,
  removeClient,
  createNotification,
  notifyLeadAssigned,
  notifyOpenPool,
  notifyQuotationRequested,
  notifyQuotationSent,
  notifyDealWon,
  notifyDealLost,
  notifyWhatsAppReply,
};
