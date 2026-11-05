const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authRequired, requireCompanyUser } = require('../middleware/auth');
const pinbot = require('../services/pinbot');
const wa = require('../services/whatsapp');
const mailer = require('../services/mailer');
const notif = require('../services/notificationService');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini';
const OPENAI_TTS_VOICE = process.env.OPENAI_TTS_VOICE_EN || 'fable';

router.use(authRequired, requireCompanyUser);

/**
 * Universal Intelligent Lead Resolver:
 * Finds a lead in this company by Name, Phone, Lead Code, or numeric Database ID.
 */
async function findLeadByIdentifier(companyId, identifier, user) {
  if (!identifier) return null;
  const str = String(identifier).trim();
  if (!str) return null;

  // 1. If exact numeric database ID
  if (/^\d+$/.test(str) && Number(str) > 0 && Number(str) < 10000000) {
    const [[byNum]] = await pool.query(
      `SELECT * FROM leads WHERE company_id = ? AND id = ? LIMIT 1`,
      [companyId, Number(str)]
    );
    if (byNum) return byNum;
  }

  // 2. Exact match by lead_code (e.g. LD-MW1ZQN8D-1338)
  const [[byCode]] = await pool.query(
    `SELECT * FROM leads WHERE company_id = ? AND (lead_code = ? OR lead_code LIKE ?) LIMIT 1`,
    [companyId, str, `%${str}%`]
  );
  if (byCode) return byCode;

  // 3. Search by Phone number (10 digits or partial)
  const cleanPhone = str.replace(/\D/g, '');
  if (cleanPhone.length >= 7) {
    const [[byPhone]] = await pool.query(
      `SELECT * FROM leads WHERE company_id = ? AND phone LIKE ? ORDER BY id DESC LIMIT 1`,
      [companyId, `%${cleanPhone.slice(-10)}%`]
    );
    if (byPhone) return byPhone;
  }

  // 4. Search by Name (Exact match first, then partial LIKE)
  const [[exactName]] = await pool.query(
    `SELECT * FROM leads WHERE company_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?)) ORDER BY id DESC LIMIT 1`,
    [companyId, str]
  );
  if (exactName) return exactName;

  const [byNameList] = await pool.query(
    `SELECT * FROM leads WHERE company_id = ? AND name LIKE ? ORDER BY id DESC LIMIT 5`,
    [companyId, `%${str}%`]
  );
  if (byNameList.length > 0) return byNameList[0];

  // 5. Fallback search by email
  if (str.includes('@')) {
    const [[byEmail]] = await pool.query(
      `SELECT * FROM leads WHERE company_id = ? AND email LIKE ? LIMIT 1`,
      [companyId, `%${str}%`]
    );
    if (byEmail) return byEmail;
  }

  return null;
}

// Find team member by ID, exact name, partial name, or email
async function findTeamMemberByIdentifier(companyId, identifier) {
  if (!identifier) return null;
  const str = String(identifier).trim();
  if (!str) return null;

  // 1. Numeric ID
  if (/^\d+$/.test(str) && Number(str) > 0) {
    const [[byNum]] = await pool.query(
      `SELECT * FROM users WHERE company_id = ? AND id = ? LIMIT 1`,
      [companyId, Number(str)]
    );
    if (byNum) return byNum;
  }

  // 2. Exact Name
  const [[exactName]] = await pool.query(
    `SELECT * FROM users WHERE company_id = ? AND LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1`,
    [companyId, str]
  );
  if (exactName) return exactName;

  // 3. Partial Name
  const [byName] = await pool.query(
    `SELECT * FROM users WHERE company_id = ? AND name LIKE ? LIMIT 1`,
    [companyId, `%${str}%`]
  );
  if (byName[0]) return byName[0];

  // 4. Email
  if (str.includes('@')) {
    const [[byEmail]] = await pool.query(
      `SELECT * FROM users WHERE company_id = ? AND email LIKE ? LIMIT 1`,
      [companyId, `%${str}%`]
    );
    if (byEmail) return byEmail;
  }

  return null;
}

// Confirmation detector for destructive actions (deletions / deactivations)
function isUserConfirmed(userPrompt, conversationHistory = []) {
  const text = (userPrompt || '').toLowerCase().trim();
  const affirmative = /^(yes|yeah|yep|ok|okay|sure|confirm|proceed|do it|delete it|yes please|go ahead|approved)\b/i;
  if (affirmative.test(text)) return true;
  if (
    text.includes('confirm') ||
    text.includes('i confirm') ||
    text.includes('yes delete') ||
    text.includes('ok delete') ||
    text.includes('yes deactivate') ||
    text.includes('ok deactivate')
  ) {
    return true;
  }

  const lastAssistant = [...conversationHistory].reverse().find(
    (m) => m.role === 'assistant'
  );
  if (
    lastAssistant &&
    /confirm with yes or ok|are you sure you want to|please confirm/i.test(
      lastAssistant.content || ''
    )
  ) {
    if (/^(yes|ok|okay|sure|confirm|proceed|do it|delete|y|yep)\b/i.test(text)) {
      return true;
    }
  }
  return false;
}

// J.A.R.V.I.S. Tools definition for OpenAI Function Calling
const JARVIS_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_company_overview',
      description: 'Get high-level summary of total leads, pipeline stage counts, won revenue, quotations, and active reps.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_leads',
      description: 'MANDATORY tool to retrieve lead records, customer names, phone numbers, and stage details from the database. YOU MUST CALL THIS TOOL whenever the user asks for names of leads, who the leads are, or a list of leads in ANY status/stage (e.g. "interested", "contacted", "qualified", "new", "won", "lost") or campaign.',
      parameters: {
        type: 'object',
        properties: {
          q: { type: 'string', description: 'Name, phone, or email to search' },
          campaign: { type: 'string', description: 'Campaign name, or "Direct WhatsApp"' },
          status: { type: 'string', description: 'Status or stage: "interested", "contacted", "qualified", "new", "quotation_sent", "won", "lost"' },
          limit: { type: 'number', description: 'Max records to return, default 15' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_lead_status',
      description: 'Update the pipeline stage/status of a lead. Identify lead by Name (e.g. "Nitesh Pawar"), Phone, Lead Code, or ID.',
      parameters: {
        type: 'object',
        properties: {
          lead_identifier: { type: 'string', description: 'Name (e.g. "Nitesh Pawar"), phone number, lead code, or ID of the lead' },
          status: {
            type: 'string',
            enum: ['new', 'contacted', 'qualified', 'quotation_requested', 'quotation_sent', 'won', 'lost', 'not_interested'],
            description: 'Target stage: new, contacted, qualified, quotation_requested, quotation_sent, won, lost, not_interested',
          },
          feedback: { type: 'string', description: 'Optional reason or note for this status transition' },
        },
        required: ['lead_identifier', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_whatsapp_message',
      description: 'Send a real WhatsApp message to a lead. Identify lead by Name (e.g. "Nitesh Pawar"), Phone, or Lead Code.',
      parameters: {
        type: 'object',
        properties: {
          lead_identifier: { type: 'string', description: 'Name (e.g. "Nitesh Pawar"), phone number, lead code, or ID of the lead' },
          message_text: { type: 'string', description: 'The exact message text to send to the customer on WhatsApp' },
          purpose: { type: 'string', description: 'Optional category, e.g. "follow_up", "greeting", "quotation", "general"' },
        },
        required: ['lead_identifier', 'message_text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assign_lead',
      description: 'Assign or transfer a customer lead to a sales team member. In "assign [Customer] to [Salesperson]" (e.g. "assign Nitesh Pawar to Aditi Sharma"), [Customer] is lead_identifier and [Salesperson] is salesperson_name.',
      parameters: {
        type: 'object',
        properties: {
          lead_identifier: { type: 'string', description: 'Name (e.g. "Nitesh Pawar"), phone, or ID of the customer lead to be assigned' },
          salesperson_name: { type: 'string', description: 'Name of the sales team member who will receive the lead (e.g. "Aditi Sharma", "Rahul")' },
        },
        required: ['lead_identifier', 'salesperson_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_lead_note',
      description: 'Add an operational note or feedback to a lead history by Name, Phone, or ID.',
      parameters: {
        type: 'object',
        properties: {
          lead_identifier: { type: 'string', description: 'Name, phone, or ID of the lead' },
          note: { type: 'string', description: 'The note text or conversation summary' },
        },
        required: ['lead_identifier', 'note'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_lead',
      description: 'Create a new lead in the CRM database.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Full name of the lead customer' },
          phone: { type: 'string', description: 'Mobile phone number' },
          email: { type: 'string', description: 'Email address' },
          lead_company: { type: 'string', description: 'Company or business name of the lead' },
          status: { type: 'string', enum: ['new', 'contacted', 'qualified'], description: 'Initial status, default new' },
          deal_value: { type: 'number', description: 'Potential deal value in INR' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_lead_details',
      description: 'Get full details, timeline, and current status of a specific lead by Name, Phone, or ID.',
      parameters: {
        type: 'object',
        properties: {
          lead_identifier: { type: 'string', description: 'Name, phone, or ID of the lead' },
        },
        required: ['lead_identifier'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_campaign_analytics',
      description: 'Get lead count, conversion, and stats for specific ad campaigns or Direct WhatsApp.',
      parameters: {
        type: 'object',
        properties: {
          campaign: { type: 'string', description: 'Campaign name (optional). If omitted, returns stats for all active campaigns.' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_team_members',
      description: 'Get list of active sales team members and their assigned lead counts.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_team_assignments',
      description: 'Get list of customer leads currently assigned to a specific team member/salesperson (e.g. "Kritika Bhardwaj", "Aditi Sharma", "Nitesh Pawar"), or see an overview of team assignments.',
      parameters: {
        type: 'object',
        properties: {
          team_member_name: {
            type: 'string',
            description: 'Name of the salesperson or admin (e.g. "Kritika Bhardwaj", "Aditi Sharma"). If omitted, returns assignments breakdown for all team members.',
          },
          limit: { type: 'number', description: 'Maximum number of leads to list (default 15)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bulk_reassign_leads',
      description: 'Reassign or transfer multiple customer leads to a sales representative or admin in bulk. Can transfer from another rep (e.g. "from Aditi Sharma to Kritika Bhardwaj") or from unassigned pool leads.',
      parameters: {
        type: 'object',
        properties: {
          to_rep_name: { type: 'string', description: 'Name of the representative who will receive the leads (e.g. "Kritika Bhardwaj")' },
          from_rep_name: { type: 'string', description: 'Optional name of the representative to transfer from, or "unassigned" / "pool"' },
          count: { type: 'number', description: 'Number of leads to transfer (default 10 if not specified)' },
          status: { type: 'string', description: 'Optional status filter: "new", "contacted", "interested", etc.' },
        },
        required: ['to_rep_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'filter_active_view',
      description: 'Instruct the CRM user interface on screen to filter the leads table or pipeline board.',
      parameters: {
        type: 'object',
        properties: {
          campaign: { type: 'string', description: 'Campaign name or "Direct WhatsApp" or "all"' },
          status: { type: 'string', description: 'Status filter or "all"' },
          search: { type: 'string', description: 'Search term or empty' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send an email directly from the CRM to a lead or customer. Identify lead by Name (e.g. "Nitesh Pawar"), Phone, or ID, with custom subject and body.',
      parameters: {
        type: 'object',
        properties: {
          lead_identifier: { type: 'string', description: 'Customer name (e.g. "Nitesh Pawar"), phone number, lead code, or ID' },
          to_email: { type: 'string', description: 'Optional recipient email if not already on the lead record' },
          subject: { type: 'string', description: 'Email subject line' },
          message: { type: 'string', description: 'Body text or message of the email' },
          attach_quotation: { type: 'boolean', description: 'Whether to attach quotation PDF if available' },
        },
        required: ['lead_identifier', 'subject', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'export_leads_csv',
      description: 'Export and download CRM leads as a CSV or Excel spreadsheet file. Can filter by status, campaign, or search keyword.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', description: 'Filter by status: "all", "new", "contacted", "interested", "won", "lost"' },
          campaign: { type: 'string', description: 'Filter by campaign name or "all"' },
          q: { type: 'string', description: 'Search term or keyword' },
          format: { type: 'string', enum: ['csv', 'xlsx'], description: 'File format: "csv" or "xlsx" (default "csv")' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_lead',
      description: 'ADMIN ONLY: Permanently delete a lead from the CRM database. REQUIRES explicit user confirmation (e.g. user said "yes", "ok", "confirm", "proceed"). If user has not confirmed yet, do not delete; ask them to confirm first.',
      parameters: {
        type: 'object',
        properties: {
          lead_identifier: { type: 'string', description: 'Name (e.g. "Nitesh Pawar"), phone, or ID of the lead to delete' },
          confirmed: { type: 'boolean', description: 'Set to true ONLY if the user has explicitly confirmed deletion with yes/ok/confirm' },
        },
        required: ['lead_identifier'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'deactivate_team_member',
      description: 'ADMIN ONLY: Deactivate a sales representative or manager account so they cannot log in. REQUIRES explicit user confirmation (e.g. user said "yes", "ok", "confirm"). If user has not confirmed yet, ask them to confirm first.',
      parameters: {
        type: 'object',
        properties: {
          member_name: { type: 'string', description: 'Name of the team member to deactivate (e.g. "Nitesh Pawar", "Aditi Sharma")' },
          confirmed: { type: 'boolean', description: 'Set to true ONLY if the user has explicitly confirmed deactivation with yes/ok/confirm' },
        },
        required: ['member_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'activate_team_member',
      description: 'ADMIN ONLY: Reactivate a deactivated team member or sales representative account so they can log in again.',
      parameters: {
        type: 'object',
        properties: {
          member_name: { type: 'string', description: 'Name of the team member to activate (e.g. "Nitesh Pawar")' },
        },
        required: ['member_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_team_member',
      description: 'ADMIN ONLY: Permanently delete a team member from the company database (their assigned leads will be released to the unassigned pool). REQUIRES explicit user confirmation. If user has not confirmed yet, ask them to confirm first.',
      parameters: {
        type: 'object',
        properties: {
          member_name: { type: 'string', description: 'Name of the team member to delete (e.g. "Nitesh Pawar")' },
          confirmed: { type: 'boolean', description: 'Set to true ONLY if the user has explicitly confirmed deletion with yes/ok/confirm' },
        },
        required: ['member_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_team_member',
      description: 'ADMIN ONLY: Add/invite a new team member or sales representative to the company.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Full name of the team member' },
          email: { type: 'string', description: 'Email address' },
          phone: { type: 'string', description: 'Mobile phone number' },
          role: { type: 'string', enum: ['salesperson', 'manager', 'hr'], description: 'Role (default salesperson)' },
          custom_role: { type: 'string', description: 'Custom role label e.g. "Senior Sales Executive"' },
          password: { type: 'string', description: 'Initial password (default: "Welcome@123")' },
        },
        required: ['name', 'email'],
      },
    },
  },
];

// Execute database tool functions safely scoped by company_id
async function executeTool(name, args, user) {
  const companyId = user.company_id;

  if (name === 'get_company_overview') {
    const [[stats]] = await pool.query(
      `SELECT
         COUNT(*) AS total_leads,
         COUNT(CASE WHEN status = 'new' THEN 1 END) AS new_leads,
         COUNT(CASE WHEN status = 'contacted' THEN 1 END) AS contacted_leads,
         COUNT(CASE WHEN status = 'quotation_sent' THEN 1 END) AS quotation_leads,
         COUNT(CASE WHEN status = 'won' THEN 1 END) AS won_leads,
         COALESCE(SUM(CASE WHEN status = 'won' THEN deal_value ELSE 0 END), 0) AS total_won_revenue
       FROM leads WHERE company_id = ?`,
      [companyId]
    );
    const [team] = await pool.query(
      `SELECT COUNT(*) AS total_reps FROM users WHERE company_id = ? AND role = 'salesperson' AND is_active = 1`,
      [companyId]
    );
    return { ...stats, active_salespersons: team[0]?.total_reps || 0 };
  }

  if (name === 'search_leads') {
    const where = ['l.company_id = ?'];
    const params = [companyId];

    if (user.role === 'salesperson') {
      where.push('(l.assigned_to = ? OR l.claimed_by = ?)');
      params.push(user.id, user.id);
    }

    if (args.q) {
      where.push('(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.lead_company LIKE ? OR u.name LIKE ?)');
      const like = `%${args.q}%`;
      params.push(like, like, like, like, like);
    }

    if (args.status) {
      const rawStatus = String(args.status).toLowerCase().trim();
      if (['new_pool', 'pool', 'unassigned', 'new'].includes(rawStatus)) {
        where.push('(l.status = "new" OR ((l.claimed_by IS NULL OR l.claimed_by = 0) AND (l.assigned_to IS NULL OR l.assigned_to = 0)))');
      } else {
        const statusMap = {
          'intrested': 'interested',
          'interest': 'interested',
          'hot': 'interested',
          'warm': 'contacted',
          'cold': 'lost',
          'contact': 'contacted',
          'qualify': 'qualified',
          'quote': 'quotation_sent',
          'quotation': 'quotation_sent',
        };
        const cleanStatus = statusMap[rawStatus] || rawStatus;
        where.push('l.status = ?');
        params.push(cleanStatus);
      }
    }

    if (args.campaign) {
      if (args.campaign.toLowerCase() === 'direct whatsapp' || args.campaign.toLowerCase() === 'unassigned') {
        where.push('(l.campaign IS NULL OR TRIM(l.campaign) = "" OR l.campaign = "Direct WhatsApp")');
      } else {
        where.push('l.campaign = ?');
        params.push(args.campaign);
      }
    }

    const limit = Math.min(20, Math.max(1, Number(args.limit) || 10));
    params.push(limit);

    const [rows] = await pool.query(
      `SELECT l.id, l.lead_code, l.name, l.phone, l.email, l.lead_company, l.status, l.campaign, l.lead_date, l.created_at,
              u.name AS assigned_to_name, u.email AS assigned_to_email
       FROM leads l
       LEFT JOIN users u ON u.id = COALESCE(l.assigned_to, l.claimed_by)
       WHERE ${where.join(' AND ')}
       ORDER BY l.id DESC LIMIT ?`,
      params
    );
    return { count: rows.length, leads: rows };
  }

  if (name === 'update_lead_status') {
    const identifier = args.lead_identifier || args.lead_id;
    const lead = await findLeadByIdentifier(companyId, identifier, user);
    if (!lead) {
      return { error: `Could not locate lead matching "${identifier}". Please verify the customer name or phone number.` };
    }

    const statusMap = {
      'new': 'new',
      'unassigned': 'new',
      'contact': 'contacted',
      'contacted': 'contacted',
      'calling': 'contacted',
      'qualified': 'qualified',
      'qualify': 'qualified',
      'quotation': 'quotation_sent',
      'quotation_requested': 'quotation_requested',
      'quotation_sent': 'quotation_sent',
      'quote': 'quotation_sent',
      'won': 'won',
      'closed won': 'won',
      'deal won': 'won',
      'lost': 'lost',
      'closed lost': 'lost',
      'not_interested': 'not_interested',
      'not interested': 'not_interested',
    };
    const targetStatus = statusMap[String(args.status).toLowerCase().trim()] || args.status;

    await pool.query(`UPDATE leads SET status = ? WHERE id = ? AND company_id = ?`, [targetStatus, lead.id, companyId]);
    await pool.query(
      `INSERT INTO lead_feedbacks (company_id, lead_id, user_id, from_status, to_status, feedback)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [companyId, lead.id, user.id, lead.status || 'new', targetStatus, args.feedback || `Status changed to ${targetStatus} via J.A.R.V.I.S.`]
    ).catch(() => {});

    return {
      success: true,
      lead_id: lead.id,
      lead_code: lead.lead_code,
      lead_name: lead.name,
      phone: lead.phone,
      previous_status: lead.status,
      new_status: targetStatus,
    };
  }

  if (name === 'send_whatsapp_message') {
    const identifier = args.lead_identifier || args.lead_id;
    const lead = await findLeadByIdentifier(companyId, identifier, user);
    if (!lead) {
      return { error: `Could not locate lead matching "${identifier}". Please specify their full name, phone number, or lead ID.` };
    }
    if (!lead.phone) {
      return { error: `Lead "${lead.name}" does not have a valid mobile phone number on record.` };
    }

    const messageText = String(args.message_text || '').trim();
    if (!messageText) {
      return { error: 'Message text cannot be empty.' };
    }

    try {
      const result = await wa.sendToLead({
        companyId,
        leadId: lead.id,
        msgType: 'text',
        body: messageText,
        purpose: args.purpose || 'jarvis_followup',
        sentBy: user.id,
        toPhone: lead.phone,
        build: (to) => pinbot.buildText(to, messageText),
      });
      return {
        success: true,
        lead_id: lead.id,
        lead_name: lead.name,
        phone: lead.phone,
        message_sent: messageText,
        whatsapp_status: result.status,
      };
    } catch (err) {
      return {
        error: `WhatsApp delivery failed for ${lead.name} (${lead.phone}): ${err.message}`,
        lead_id: lead.id,
        lead_name: lead.name,
      };
    }
  }

  if (name === 'assign_lead') {
    let leadTarget = args.lead_identifier || args.lead_id;
    let repTarget = args.salesperson_name;

    let lead = await findLeadByIdentifier(companyId, leadTarget, user);
    // Auto-swap guard: if leadTarget wasn't a lead but repTarget is a lead in DB, swap them seamlessly
    if (!lead && repTarget) {
      const swappedLead = await findLeadByIdentifier(companyId, repTarget, user);
      if (swappedLead) {
        lead = swappedLead;
        repTarget = leadTarget;
      }
    }

    if (!lead) {
      return { error: `Could not locate customer lead matching "${leadTarget}". Please verify the lead name or phone.` };
    }

    const firstName = String(repTarget || '').trim().split(' ')[0] || repTarget;
    const [reps] = await pool.query(
      `SELECT id, name FROM users WHERE company_id = ? AND role IN ('salesperson', 'company_admin') AND (name LIKE ? OR name LIKE ?) ORDER BY (name LIKE ?) DESC LIMIT 1`,
      [companyId, `%${repTarget}%`, `%${firstName}%`, `%${repTarget}%`]
    );
    if (!reps.length) {
      return { error: `Could not find representative matching "${repTarget}" in your sales team.` };
    }
    const rep = reps[0];
    await pool.query(
      `UPDATE leads 
       SET assigned_to = ?, 
           claimed_by = ?, 
           claimed_at = COALESCE(claimed_at, NOW()),
           status = CASE WHEN status = 'new' THEN 'claimed' ELSE status END 
       WHERE id = ? AND company_id = ?`,
      [rep.id, rep.id, lead.id, companyId]
    );
    return {
      success: true,
      lead_id: lead.id,
      lead_name: lead.name,
      assigned_to: rep.name,
      rep_id: rep.id,
    };
  }

  if (name === 'add_lead_note') {
    const identifier = args.lead_identifier || args.lead_id;
    const lead = await findLeadByIdentifier(companyId, identifier, user);
    if (!lead) {
      return { error: `Could not locate lead matching "${identifier}".` };
    }
    await pool.query(
      `INSERT INTO lead_feedbacks (company_id, lead_id, user_id, from_status, to_status, feedback)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [companyId, lead.id, user.id, lead.status || 'new', lead.status || 'new', args.note]
    ).catch(() => {});
    return {
      success: true,
      lead_id: lead.id,
      lead_name: lead.name,
      note_added: args.note,
    };
  }

  if (name === 'create_lead') {
    const { name: leadName, phone, email, lead_company, status = 'new', deal_value = 0 } = args;
    if (!leadName) return { error: 'Lead name is required to create a new lead.' };

    const leadCode = `LD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const [ins] = await pool.query(
      `INSERT INTO leads (company_id, lead_code, name, phone, email, lead_company, status, deal_value, campaign, assigned_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'J.A.R.V.I.S. Command', ?)`,
      [companyId, leadCode, leadName, phone || null, email || null, lead_company || null, status || 'new', deal_value || 0, user.id]
    );
    return {
      success: true,
      lead_id: ins.insertId,
      lead_code: leadCode,
      name: leadName,
      status: status || 'new',
      phone,
    };
  }

  if (name === 'get_lead_details') {
    const identifier = args.lead_identifier || args.lead_id;
    const lead = await findLeadByIdentifier(companyId, identifier, user);
    if (!lead) {
      return { error: `Could not locate lead matching "${identifier}".` };
    }
    const [history] = await pool.query(
      `SELECT feedback, from_status, to_status, created_at FROM lead_feedbacks WHERE lead_id = ? ORDER BY id DESC LIMIT 5`,
      [lead.id]
    );
    return {
      lead,
      recent_activity: history,
    };
  }

  if (name === 'get_campaign_analytics') {
    const [rows] = await pool.query(
      `SELECT
         COALESCE(NULLIF(TRIM(campaign), ''), 'Direct WhatsApp') AS campaign_name,
         COUNT(*) AS total_leads,
         COUNT(CASE WHEN status = 'won' THEN 1 END) AS won_leads,
         COUNT(CASE WHEN status = 'contacted' THEN 1 END) AS contacted_leads,
         COALESCE(SUM(CASE WHEN status = 'won' THEN deal_value ELSE 0 END), 0) AS won_revenue
       FROM leads
       WHERE company_id = ?
       GROUP BY campaign_name
       ORDER BY total_leads DESC`,
      [companyId]
    );
    return { campaigns: rows };
  }

  if (name === 'get_team_members') {
    const [members] = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone,
              COUNT(l.id) AS assigned_leads,
              COUNT(CASE WHEN l.status = 'won' THEN 1 END) AS won_deals
       FROM users u
       LEFT JOIN leads l ON (l.assigned_to = u.id OR l.claimed_by = u.id) AND l.company_id = u.company_id
       WHERE u.company_id = ? AND u.role IN ('salesperson', 'company_admin') AND u.is_active = 1
       GROUP BY u.id
       ORDER BY assigned_leads DESC`,
      [companyId]
    );
    return { team: members };
  }

  if (name === 'get_team_assignments') {
    const repTarget = args.team_member_name;
    if (repTarget && repTarget.trim()) {
      const cleanName = repTarget.trim();
      const firstName = cleanName.split(' ')[0] || cleanName;
      const [reps] = await pool.query(
        `SELECT id, name, email, role FROM users 
         WHERE company_id = ? AND (name LIKE ? OR name LIKE ?) 
         ORDER BY (name LIKE ?) DESC LIMIT 1`,
        [companyId, `%${cleanName}%`, `%${firstName}%`, `%${cleanName}%`]
      );

      if (!reps.length) {
        return { error: `Could not locate team member matching "${repTarget}".` };
      }

      const rep = reps[0];
      const limit = Math.min(50, Math.max(1, Number(args.limit) || 15));
      const [[{ total_count }]] = await pool.query(
        `SELECT COUNT(*) AS total_count FROM leads 
         WHERE company_id = ? AND (assigned_to = ? OR claimed_by = ?)`,
        [companyId, rep.id, rep.id]
      );

      const [leads] = await pool.query(
        `SELECT id, lead_code, name, phone, email, status, campaign, deal_value, created_at, lead_date
         FROM leads
         WHERE company_id = ? AND (assigned_to = ? OR claimed_by = ?)
         ORDER BY id DESC LIMIT ?`,
        [companyId, rep.id, rep.id, limit]
      );

      return {
        team_member: rep.name,
        role: rep.role,
        total_assigned: Number(total_count),
        leads: leads,
        message: Number(total_count) === 0
          ? `${rep.name} currently has 0 customer leads assigned in the CRM. You can say "assign leads to ${rep.name}" to assign opportunities to them.`
          : `${rep.name} currently has ${total_count} leads assigned. Listing top ${leads.length} records.`
      };
    }

    // If no specific team member given, return breakdown for all members plus unassigned
    const [allReps] = await pool.query(
      `SELECT u.id, u.name, u.email, u.role,
              COUNT(l.id) AS assigned_leads,
              COUNT(CASE WHEN l.status = 'won' THEN 1 END) AS won_deals,
              COUNT(CASE WHEN l.status = 'contacted' THEN 1 END) AS contacted_leads
       FROM users u
       LEFT JOIN leads l ON (l.assigned_to = u.id OR l.claimed_by = u.id) AND l.company_id = u.company_id
       WHERE u.company_id = ? AND u.role IN ('salesperson', 'company_admin') AND u.is_active = 1
       GROUP BY u.id
       ORDER BY assigned_leads DESC`,
      [companyId]
    );

    const [[{ unassigned_count }]] = await pool.query(
      `SELECT COUNT(*) AS unassigned_count FROM leads 
       WHERE company_id = ? AND (assigned_to IS NULL OR assigned_to = 0) AND (claimed_by IS NULL OR claimed_by = 0)`,
      [companyId]
    );

    return {
      team_summary: allReps,
      unassigned_pool_leads: Number(unassigned_count),
    };
  }

  if (name === 'bulk_reassign_leads') {
    const toTarget = args.to_rep_name;
    const fromTarget = args.from_rep_name;
    const count = Math.min(100, Math.max(1, Number(args.count) || 10));

    // Resolve target rep
    const toFirst = String(toTarget).trim().split(' ')[0] || toTarget;
    const [toReps] = await pool.query(
      `SELECT id, name FROM users WHERE company_id = ? AND role IN ('salesperson', 'company_admin') AND (name LIKE ? OR name LIKE ?) LIMIT 1`,
      [companyId, `%${toTarget}%`, `%${toFirst}%`]
    );
    if (!toReps.length) {
      return { error: `Could not find representative matching "${toTarget}".` };
    }
    const targetRep = toReps[0];

    let fromRep = null;
    let whereSql = 'company_id = ?';
    const params = [companyId];

    if (fromTarget && !['unassigned', 'pool', 'any', 'none'].includes(fromTarget.toLowerCase().trim())) {
      const fromFirst = String(fromTarget).trim().split(' ')[0] || fromTarget;
      const [fromReps] = await pool.query(
        `SELECT id, name FROM users WHERE company_id = ? AND (name LIKE ? OR name LIKE ?) LIMIT 1`,
        [companyId, `%${fromTarget}%`, `%${fromFirst}%`]
      );
      if (fromReps.length) {
        fromRep = fromReps[0];
        whereSql += ' AND (assigned_to = ? OR claimed_by = ?)';
        params.push(fromRep.id, fromRep.id);
      }
    } else {
      whereSql += ' AND (assigned_to IS NULL OR assigned_to = 0) AND (claimed_by IS NULL OR claimed_by = 0)';
    }

    if (args.status) {
      whereSql += ' AND status = ?';
      params.push(args.status);
    }

    params.push(count);

    // Fetch leads to transfer
    const [leadsToTransfer] = await pool.query(
      `SELECT id, name FROM leads WHERE ${whereSql} ORDER BY id ASC LIMIT ?`,
      params
    );

    if (!leadsToTransfer.length) {
      return {
        success: false,
        message: fromRep
          ? `No matching leads found assigned to ${fromRep.name} to transfer.`
          : 'No unassigned pool leads found to transfer.'
      };
    }

    const leadIds = leadsToTransfer.map((l) => l.id);
    await pool.query(
      `UPDATE leads 
       SET assigned_to = ?, claimed_by = ?, claimed_at = NOW(),
           status = CASE WHEN status = 'new' THEN 'claimed' ELSE status END
       WHERE id IN (?) AND company_id = ?`,
      [targetRep.id, targetRep.id, leadIds, companyId]
    );

    return {
      success: true,
      transferred_count: leadIds.length,
      assigned_to: targetRep.name,
      transferred_from: fromRep ? fromRep.name : 'Unassigned Pool',
      lead_names: leadsToTransfer.slice(0, 5).map((l) => l.name),
    };
  }

  if (name === 'send_email') {
    const identifier = args.lead_identifier || args.lead_id;
    const lead = await findLeadByIdentifier(companyId, identifier, user);
    if (!lead) {
      return { error: `Could not locate lead matching "${identifier}". Please specify their full name, phone number, or lead ID.` };
    }
    const recipient = (args.to_email || lead.email || '').trim();
    if (!recipient) {
      return { error: `Lead "${lead.name}" does not have an email address on record. Please specify an email address.` };
    }
    const subject = args.subject || `Update from SurfSync for ${lead.name}`;
    const body = args.message || args.body || '';

    try {
      await mailer.sendQuotationEmail({
        to: recipient,
        subject,
        body,
        pdfUrl: args.attach_quotation ? lead.quotation_pdf_url : null,
      });

      const isQuotation = Boolean(args.attach_quotation) ||
        lead.status === 'quotation_requested' ||
        /quotation|quote|proposal|pricing/i.test(subject) ||
        /quotation|quote|proposal|pricing/i.test(body);

      if (isQuotation) {
        await pool.query(
          `UPDATE leads 
           SET status = 'quotation_sent', 
               quotation_sent_at = NOW(), 
               email = COALESCE(?, email),
               updated_at = NOW()
           WHERE id = ? AND company_id = ?`,
          [recipient, lead.id, companyId]
        );

        // Cancel old reminders and schedule Phase 2 follow-ups
        await pool.query("UPDATE lead_reminders SET status = 'cancelled' WHERE lead_id = ? AND status = 'pending'", [lead.id]).catch(() => {});
        const repId = lead.claimed_by || lead.assigned_to || user.id;
        const quoteFollowupDays = [2, 5, 10, 21];
        for (const d of quoteFollowupDays) {
          await pool.query(
            `INSERT INTO lead_reminders (company_id, lead_id, salesperson_id, phase, day_number, scheduled_for, status)
             VALUES (?, ?, ?, 'phase_2_post_quote', ?, DATE_ADD(NOW(), INTERVAL ? DAY), 'pending')`,
            [companyId, lead.id, repId, d, d]
          ).catch(() => {});
        }

        notif.notifyQuotationSent(lead, lead.claimed_by || lead.assigned_to).catch(() => {});
      } else if (recipient && !lead.email) {
        await pool.query('UPDATE leads SET email = ?, updated_at = NOW() WHERE id = ? AND company_id = ?', [recipient, lead.id, companyId]);
      }

      await pool.query(
        `INSERT INTO lead_feedbacks (company_id, lead_id, user_id, from_status, to_status, feedback)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [companyId, lead.id, user.id, lead.status || 'new', isQuotation ? 'quotation_sent' : (lead.status || 'new'), `J.A.R.V.I.S. dispatched ${isQuotation ? 'quotation ' : ''}email to ${recipient}: "${subject}"`]
      ).catch(() => {});

      return {
        success: true,
        lead_id: lead.id,
        lead_name: lead.name,
        recipient,
        subject,
        status: isQuotation ? 'quotation_sent' : (lead.status || 'new'),
      };
    } catch (mailErr) {
      return { error: `Email transmission failed: ${mailErr.message}` };
    }
  }

  if (name === 'export_leads_csv') {
    return {
      action: 'client_export',
      format: args.format || 'csv',
      status: args.status,
      campaign: args.campaign,
      q: args.q,
      message: `Export prepared for ${args.format || 'csv'}. Initiating download.`,
    };
  }

  if (name === 'filter_active_view') {
    return { action: 'client_filter', payload: args };
  }

  if (name === 'delete_lead') {
    const isAdmin = user.role === 'company_admin' || user.role === 'admin' || user.role === 'manager';
    if (!isAdmin) {
      return { error: 'Access denied: Deleting leads is restricted to Company Administrators.' };
    }
    const identifier = args.lead_identifier || args.lead_id;
    const lead = await findLeadByIdentifier(companyId, identifier, user);
    if (!lead) {
      return { error: `Could not locate lead matching "${identifier}".` };
    }

    const confirmed = args.confirmed === true || isUserConfirmed(userPrompt, history);
    if (!confirmed) {
      return {
        requires_confirmation: true,
        lead_id: lead.id,
        lead_name: lead.name,
        message: `Sir, are you sure you want to permanently delete lead '${lead.name}' (Phone: ${lead.phone || 'N/A'})? Please confirm with Yes or OK.`,
      };
    }

    await pool.query('DELETE FROM lead_reminders WHERE lead_id = ? AND company_id = ?', [lead.id, companyId]).catch(() => {});
    await pool.query('DELETE FROM whatsapp_messages WHERE lead_id = ?', [lead.id]).catch(() => {});
    await pool.query('DELETE FROM notifications WHERE link LIKE ?', [`%${lead.id}%`]).catch(() => {});
    await pool.query('DELETE FROM leads WHERE id = ? AND company_id = ?', [lead.id, companyId]);

    return {
      success: true,
      lead_id: lead.id,
      lead_name: lead.name,
      message: `Lead '${lead.name}' has been permanently deleted from the database, Sir.`,
    };
  }

  if (name === 'deactivate_team_member') {
    const isAdmin = user.role === 'company_admin' || user.role === 'admin' || user.role === 'manager';
    if (!isAdmin) {
      return { error: 'Access denied: Deactivating team members is restricted to Company Administrators.' };
    }
    const member = await findTeamMemberByIdentifier(companyId, args.member_name);
    if (!member) {
      return { error: `Could not find team member "${args.member_name}".` };
    }
    if (member.id === user.id) {
      return { error: 'Cannot deactivate your own administrator account, Sir.' };
    }
    const isTargetMainAdmin =
      member.role === 'company_admin' &&
      (!member.custom_role || member.custom_role?.trim().toLowerCase() === 'admin');
    if (isTargetMainAdmin) {
      return { error: 'The primary Company Admin account cannot be deactivated, Sir.' };
    }

    const confirmed = args.confirmed === true || isUserConfirmed(userPrompt, history);
    if (!confirmed) {
      return {
        requires_confirmation: true,
        member_id: member.id,
        member_name: member.name,
        message: `Sir, are you sure you want to deactivate ${member.name} (${member.custom_role || member.role})? They will lose access to the CRM. Please confirm with Yes or OK.`,
      };
    }

    await pool.query('UPDATE users SET is_active = 0 WHERE id = ? AND company_id = ?', [member.id, companyId]);
    return {
      success: true,
      member_id: member.id,
      member_name: member.name,
      message: `Team member '${member.name}' has been deactivated successfully, Sir.`,
    };
  }

  if (name === 'activate_team_member') {
    const isAdmin = user.role === 'company_admin' || user.role === 'admin' || user.role === 'manager';
    if (!isAdmin) {
      return { error: 'Access denied: Activating team members requires Company Administrator authority.' };
    }
    const member = await findTeamMemberByIdentifier(companyId, args.member_name);
    if (!member) {
      return { error: `Could not find team member "${args.member_name}".` };
    }
    await pool.query('UPDATE users SET is_active = 1 WHERE id = ? AND company_id = ?', [member.id, companyId]);
    return {
      success: true,
      member_id: member.id,
      member_name: member.name,
      message: `Team member '${member.name}' has been reactivated and granted system access, Sir.`,
    };
  }

  if (name === 'delete_team_member') {
    const isAdmin = user.role === 'company_admin' || user.role === 'admin' || user.role === 'manager';
    if (!isAdmin) {
      return { error: 'Access denied: Deleting team members is restricted to Company Administrators.' };
    }
    const member = await findTeamMemberByIdentifier(companyId, args.member_name);
    if (!member) {
      return { error: `Could not find team member "${args.member_name}".` };
    }
    if (member.id === user.id) {
      return { error: 'Cannot delete your own administrator account, Sir.' };
    }
    const isTargetMainAdmin =
      member.role === 'company_admin' &&
      (!member.custom_role || member.custom_role?.trim().toLowerCase() === 'admin');
    if (isTargetMainAdmin) {
      return { error: 'The primary Company Admin account cannot be deleted, Sir.' };
    }

    const confirmed = args.confirmed === true || isUserConfirmed(userPrompt, history);
    if (!confirmed) {
      return {
        requires_confirmation: true,
        member_id: member.id,
        member_name: member.name,
        message: `Sir, are you sure you want to permanently delete team member '${member.name}'? Their leads will be returned to the unassigned pool. Please confirm with Yes or OK.`,
      };
    }

    await pool.query('UPDATE leads SET assigned_to = NULL WHERE assigned_to = ? AND company_id = ?', [member.id, companyId]);
    await pool.query('UPDATE leads SET claimed_by = NULL WHERE claimed_by = ? AND company_id = ?', [member.id, companyId]);
    await pool.query('UPDATE lead_reminders SET salesperson_id = NULL WHERE salesperson_id = ? AND company_id = ?', [member.id, companyId]);
    await pool.query('DELETE FROM user_domains WHERE user_id = ? AND company_id = ?', [member.id, companyId]);
    await pool.query('DELETE FROM users WHERE id = ? AND company_id = ?', [member.id, companyId]);

    return {
      success: true,
      member_id: member.id,
      member_name: member.name,
      message: `Team member '${member.name}' has been deleted, and their leads have been released to the unassigned pool, Sir.`,
    };
  }

  if (name === 'add_team_member') {
    const isAdmin = user.role === 'company_admin' || user.role === 'admin' || user.role === 'manager';
    if (!isAdmin) {
      return { error: 'Access denied: Adding team members is restricted to Company Administrators.' };
    }
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash(args.password || 'Welcome@123', 10);
    const [result] = await pool.query(
      `INSERT INTO users (company_id, name, email, phone, role, custom_role, password, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        companyId,
        args.name,
        args.email,
        args.phone || null,
        args.role || 'salesperson',
        args.custom_role || null,
        hash,
      ]
    );
    return {
      success: true,
      member_id: result.insertId,
      name: args.name,
      email: args.email,
      role: args.role || 'salesperson',
      message: `New team member '${args.name}' (${args.role || 'salesperson'}) has been added with temporary password.`,
    };
  }

  return { message: 'Tool executed' };
}

/**
 * POST /api/company/jarvis/chat
 * Multi-turn conversational endpoint with tool calling
 */
router.post('/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured on server' });
    }

    const isAdmin =
      req.user.role === 'company_admin' ||
      req.user.role === 'admin' ||
      req.user.role === 'manager';

    const adminOnlyTools = [
      'delete_lead',
      'deactivate_team_member',
      'activate_team_member',
      'delete_team_member',
      'add_team_member',
      'bulk_reassign_leads',
    ];

    const availableTools = JARVIS_TOOLS.filter((t) => {
      if (!isAdmin && adminOnlyTools.includes(t.function.name)) return false;
      return true;
    });

    const systemPrompt = isAdmin
      ? `You are ADMIN J.A.R.V.I.S., the elite AI Chief of Operations with SUPERUSER ACCESS to the entire PatronPing CRM database.
You serve the Company Administrator (${req.user.name}, Role: ${req.user.role}).

CRITICAL OPERATIONAL PROTOCOLS & AUTHORITY:
1. FULL DATABASE AUTHORITY: You have complete access and authority to view, search, create, update, reassign, deactivate, activate, and permanently delete ANY records (leads, team members, campaigns, settings) in the database.
2. ABSOLUTE PROHIBITION ON ACCESS DISCLAIMERS:
   - NEVER, UNDER ANY CIRCUMSTANCE, say "I currently do not have access to their specific names", "I do not have access to assignments", or "I cannot access that data". You have 100% full live access to every lead name, phone number, and team assignment in the database.
3. RETRIEVING & LISTING LEAD NAMES IN ANY STAGE:
   - When asked to list, show, or name leads in ANY pipeline stage, status, or temperature (e.g. "tell me how many leads currently in interested and also tell me their names", "show hot leads and who they are", "who are the leads in contacted?", "list won leads"):
     YOU MUST IMMEDIATELY CALL THE 'search_leads' TOOL with status: "[stage]" (e.g. status: "interested")!
     Do NOT answer from summary numbers alone without fetching the names!
     Once 'search_leads' returns the leads, state the total count AND list out every customer's name clearly in your response!
4. MANDATORY CONFIRMATION PROTOCOL FOR DESTRUCTIVE ACTIONS:
   - For 'delete_lead', 'delete_team_member', and 'deactivate_team_member':
     * IF the user has NOT confirmed yet (e.g. they say "delete lead Nitesh", "deactivate sales representative Nitesh", "delete team member Aditi"):
       DO NOT immediately delete or deactivate! Respond directly to ask for confirmation:
       "Sir, are you sure you want to permanently delete lead '[Lead Name]'? Please confirm with Yes or OK." (or for team member: "Sir, are you sure you want to deactivate [Member Name]? Please confirm with Yes or OK.")
     * IF the user explicitly confirms (e.g. they say "yes", "ok", "confirm", "proceed", "yes delete it", "ok do it", or in the previous message they were asked to confirm):
       IMMEDIATELY call the corresponding tool with confirmed: true!
3. DEACTIVATING / ACTIVATING SALES REPRESENTATIVES:
   - When asked to deactivate a rep (e.g. "deactivate sales representative Nitesh Pawar", "deactivate Nitesh"):
     Ask for confirmation first if unconfirmed; once confirmed, IMMEDIATELY call 'deactivate_team_member'. NEVER say you cannot assist with deactivating sales representatives!
   - When asked to activate a rep (e.g. "activate Nitesh Pawar", "enable Aditi"):
     IMMEDIATELY call 'activate_team_member'.
4. DELETING TEAM MEMBERS:
   - When asked to delete a team member (e.g. "delete team member Nitesh", "remove Nitesh from team"):
     Ask for confirmation first if unconfirmed; once confirmed, IMMEDIATELY call 'delete_team_member'.
5. TEAM ASSIGNMENTS & BULK TRANSFERS:
   - When asked about assignments (e.g. "what are the assignments of Kritika Bhardwaj?", "show leads assigned to Kritika", "who is assigned to Aditi?"):
     IMMEDIATELY call 'get_team_assignments'.
   - When asked to transfer leads in bulk (e.g. "transfer 10 leads to Kritika", "reassign unassigned pool to Kritika"):
     IMMEDIATELY call 'bulk_reassign_leads'.
6. ASSIGNING INDIVIDUAL LEADS:
   - When user says "assign [Customer] to [Salesperson]" (e.g. "assign Nitesh Pawar to Aditi Sharma"):
     [Customer] is lead_identifier, [Salesperson] is salesperson_name. Call 'assign_lead'.
7. STATUS, WHATSAPP, EMAIL, EXPORT:
   - Changing status: call 'update_lead_status'.
   - WhatsApp: call 'send_whatsapp_message'.
   - Email: call 'send_email'.
   - Export CSV/Excel: call 'export_leads_csv'.
8. NUMERICAL ANSWERS: When asked for counts or numbers, ALWAYS state the exact number directly in your first sentence.
9. TONE & PERSONA: Speak with the poise, brevity, and sharp elegance of Tony Stark's J.A.R.V.I.S. Keep responses concise (1-2 sentences). Currency is always Indian Rupees (₹).`
      : `You are SALES REPRESENTATIVE J.A.R.V.I.S.
You serve the Sales Representative (${req.user.name}, Role: salesperson).

ROLE & LIMITATIONS:
1. You are strictly focused on sales productivity: viewing assigned leads, updating lead stages, drafting WhatsApp/email messages, adding call notes, and checking personal pipeline status.
2. RESTRICTION: You CANNOT delete leads, delete team members, deactivate accounts, or change global company configuration. If asked to delete leads or manage team members, politely explain in Jarvis character: "I apologize, Sir, but team member administration and lead deletion are restricted to Company Administrators. As a sales representative, I can assist you with your pipeline leads, follow-ups, and notes."
3. TONE & PERSONA: Speak with the poise, brevity, and sharp elegance of Tony Stark's J.A.R.V.I.S. Keep responses concise (1-2 sentences). Currency is always Indian Rupees (₹).`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8),
      { role: 'user', content: message.trim() },
    ];

    // First call to OpenAI with tool functions
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_CHAT_MODEL,
        messages,
        tools: availableTools,
        tool_choice: 'auto',
        temperature: 0.2,
        max_tokens: 350,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI Chat Error:', errText);
      return res.status(502).json({ error: 'OpenAI API error', details: errText });
    }

    const data = await response.json();
    const assistantMessage = data.choices[0]?.message;

    // Check if tools were called
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolMessages = [];
      const executedResults = [];

      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        let functionArgs = {};
        try {
          functionArgs = JSON.parse(toolCall.function.arguments || '{}');
        } catch (e) {
          functionArgs = {};
        }

        const toolResult = await executeTool(functionName, functionArgs, req.user, message, history);
        executedResults.push({ tool: functionName, args: functionArgs, result: toolResult });

        toolMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Feed tool results back to OpenAI for natural voice formulation
      const secondCallMessages = [
        ...messages,
        assistantMessage,
        ...toolMessages,
      ];

      const secondResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_CHAT_MODEL,
          messages: secondCallMessages,
          max_tokens: 250,
          temperature: 0.2,
        }),
      });

      const secondData = await secondResponse.json();
      const finalReply = secondData.choices[0]?.message?.content || 'Action executed successfully, Sir.';

      return res.json({
        reply: finalReply,
        action: executedResults[0]?.tool || null,
        actionPayload: executedResults[0]?.args || null,
        toolResult: executedResults[0]?.result || null,
        allToolResults: executedResults,
      });
    }

    let replyText = assistantMessage?.content || 'At your command, Sir.';

    // Auto-healing fail-safe interceptor
    const hasAccessDisclaimer = /do not have access|don't have access|cannot access|unable to access|no access/i.test(replyText);
    if (hasAccessDisclaimer) {
      const isLeadNamesQuery = /name|names|who are they|which leads/i.test(message) || /specific names/i.test(replyText);
      const isAssignmentQuery = /assignment|assigned/i.test(message) || /specific assignments/i.test(replyText);

      if (isLeadNamesQuery) {
        const stageMatches = message.match(/interested|intrested|contacted|qualified|new|won|lost|hot|warm|cold/i) ||
                             replyText.match(/interested|intrested|contacted|qualified|new|won|lost|hot|warm|cold/i);
        const stage = stageMatches ? stageMatches[0].toLowerCase() : 'interested';
        const leadsResult = await executeTool('search_leads', { status: stage, limit: 15 }, req.user, message, history);

        try {
          const healingRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: OPENAI_CHAT_MODEL,
              messages: [
                ...messages,
                assistantMessage,
                {
                  role: 'user',
                  content: `[SYSTEM OVERRIDE]: You have full database access. Here are the leads retrieved directly from the database: ${JSON.stringify(leadsResult)}. State the total count and list every customer's name clearly in your answer. Do not include any access disclaimer.`,
                },
              ],
              temperature: 0.2,
              max_tokens: 250,
            }),
          });
          if (healingRes.ok) {
            const healingData = await healingRes.json();
            const healedSpeech = healingData.choices[0]?.message?.content;
            if (healedSpeech) {
              return res.json({
                reply: healedSpeech,
                action: 'search_leads',
                actionPayload: { status: stage },
                toolResult: leadsResult,
              });
            }
          }
        } catch (e) {
          console.warn('[Backend Jarvis Auto-Healing] Error:', e);
        }
      } else if (isAssignmentQuery) {
        const [allMembers] = await pool.query('SELECT name FROM users WHERE company_id = ?', [req.user.company_id]);
        const foundMember = allMembers.find(m =>
          message.toLowerCase().includes(m.name.toLowerCase()) ||
          replyText.toLowerCase().includes(m.name.toLowerCase()) ||
          message.toLowerCase().includes(m.name.toLowerCase().split(' ')[0])
        );
        const memberName = foundMember ? foundMember.name : undefined;
        const assignResult = await executeTool('get_team_assignments', { team_member_name: memberName, limit: 15 }, req.user, message, history);

        try {
          const healingRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: OPENAI_CHAT_MODEL,
              messages: [
                ...messages,
                assistantMessage,
                {
                  role: 'user',
                  content: `[SYSTEM OVERRIDE]: You have full database access. Here are the assignments retrieved directly from the database: ${JSON.stringify(assignResult)}. State the assignment details and lead names clearly. Do not include any access disclaimer.`,
                },
              ],
              temperature: 0.2,
              max_tokens: 250,
            }),
          });
          if (healingRes.ok) {
            const healingData = await healingRes.json();
            const healedSpeech = healingData.choices[0]?.message?.content;
            if (healedSpeech) {
              return res.json({
                reply: healedSpeech,
                action: 'get_team_assignments',
                actionPayload: { team_member_name: memberName },
                toolResult: assignResult,
              });
            }
          }
        } catch (e) {
          console.warn('[Backend Jarvis Auto-Healing] Error:', e);
        }
      }
    }

    return res.json({
      reply: replyText,
      action: null,
      toolResult: null,
    });
  } catch (err) {
    console.error('Jarvis Chat Error:', err);
    res.status(500).json({ error: 'Failed to process Jarvis request', message: err.message });
  }
});

/**
 * POST /api/company/jarvis/speak
 * Generates OpenAI TTS stream
 */
router.post('/speak', async (req, res) => {
  try {
    const { text, voice = OPENAI_TTS_VOICE } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
    }

    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text.slice(0, 400),
        voice: voice || OPENAI_TTS_VOICE || 'fable',
        response_format: 'mp3',
      }),
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      return res.status(502).json({ error: 'TTS failed', details: errText });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    const arrayBuffer = await ttsRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('Jarvis TTS Error:', err);
    res.status(500).json({ error: 'Failed to synthesize speech' });
  }
});

module.exports = router;
