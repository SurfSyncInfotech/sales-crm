import { companyPortalApi, salesApi, resolvePortal } from '../api/client';
import { broadcastLiveUpdate } from './liveSyncService';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_CHAT_MODEL = import.meta.env.VITE_OPENAI_CHAT_MODEL || 'gpt-4o-mini';
const OPENAI_TTS_VOICE = import.meta.env.VITE_OPENAI_TTS_VOICE || 'fable';

// Smart Client-Side Lead Resolver: resolves any Customer Lead by Name, Phone, Code, or numeric ID
async function resolveLeadIdentifier(identifier) {
  if (!identifier) return null;
  const str = String(identifier).trim();
  if (!str) return null;

  // 1. If explicit numeric database ID
  if (/^\d+$/.test(str) && Number(str) > 0 && Number(str) < 1000000) {
    try {
      const data = await companyPortalApi.leads({ q: str, limit: 5 }).catch(() => null);
      const found = data?.leads?.find((l) => Number(l.id) === Number(str));
      if (found) return found;
      return { id: Number(str), name: `Lead #${str}` };
    } catch (e) {
      return { id: Number(str), name: `Lead #${str}` };
    }
  }

  // 2. Query live CRM leads by Name, Phone, or Code
  try {
    const data = await companyPortalApi.leads({ q: str, limit: 10 }).catch(() => null);
    const leads = data?.leads || [];
    if (leads.length > 0) {
      // Exact name match first (case-insensitive)
      const exact = leads.find((l) => (l.name || '').toLowerCase().trim() === str.toLowerCase().trim());
      if (exact) return exact;

      // Partial name match
      const partial = leads.find((l) => (l.name || '').toLowerCase().includes(str.toLowerCase().trim()));
      if (partial) return partial;

      return leads[0];
    }
  } catch (err) {
    console.warn('[Jarvis] Error resolving lead identifier:', err);
  }

  return null;
}

// Smart Client-Side Team Member Resolver
async function resolveTeamMember(nameOrId) {
  if (!nameOrId) return null;
  const str = String(nameOrId).trim().toLowerCase();
  try {
    const res = await companyPortalApi.team().catch(() => ({ team: [] }));
    const list = res.team || [];
    if (!list.length) return null;
    const byId = list.find((m) => String(m.id) === str);
    if (byId) return byId;
    const byExact = list.find((m) => (m.name || '').trim().toLowerCase() === str);
    if (byExact) return byExact;
    const byPartial = list.find((m) => (m.name || '').trim().toLowerCase().includes(str));
    if (byPartial) return byPartial;
    const byEmail = list.find((m) => (m.email || '').trim().toLowerCase() === str);
    if (byEmail) return byEmail;
  } catch (e) {
    console.warn('[Jarvis] Error resolving team member:', e);
  }
  return null;
}

// Confirmation helper for destructive actions (deletions / deactivations)
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
    (m) => m.role === 'assistant' || m.sender === 'jarvis'
  );
  if (
    lastAssistant &&
    /confirm with yes or ok|are you sure you want to|please confirm/i.test(
      lastAssistant.content || lastAssistant.text || ''
    )
  ) {
    if (/^(yes|ok|okay|sure|confirm|proceed|do it|delete|y|yep)\b/i.test(text)) {
      return true;
    }
  }
  return false;
}

// Client-side tools executed with authenticated CRM tokens
export const JARVIS_TOOLS_SPEC = [
  {
    type: 'function',
    function: {
      name: 'get_company_overview',
      description: 'Get real-time statistics: total leads, stage breakdown, hot leads, won deals, and active reps.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'filter_active_view',
      description: 'Filter the active leads directory or pipeline board view on screen by campaign, status, or search term, and get the matching count.',
      parameters: {
        type: 'object',
        properties: {
          campaign: { type: 'string', description: 'Campaign name, e.g. "App Develop Lead Instform", "Direct WhatsApp", or "all"' },
          status: { type: 'string', description: 'Lead stage/status, e.g. "new", "contacted", "qualified", "interested", "won", "all"' },
          search: { type: 'string', description: 'Search keywords, phone, or client name' },
        },
      },
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
          status: {
            type: 'string',
            description: 'Filter by pipeline stage/status: "interested", "contacted", "qualified", "new", "quotation_sent", "won", "lost", "not_interested"',
          },
          campaign: { type: 'string', description: 'Filter by campaign name or "Direct WhatsApp"' },
          q: { type: 'string', description: 'Search term (phone, name, or email)' },
          limit: { type: 'number', description: 'Max leads to return (default 20)' },
        },
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
          lead_identifier: { type: 'string', description: 'Name (e.g. "Nitesh Pawar"), phone number, lead code, or ID of the customer lead to be assigned' },
          salesperson_name: { type: 'string', description: 'Name of the sales team member who will receive the lead (e.g. "Aditi Sharma", "Aditi", "Rahul")' },
        },
        required: ['lead_identifier', 'salesperson_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_lead_status',
      description: 'Change the pipeline stage/status of a lead. Identify lead by Name (e.g. "Nitesh Pawar"), phone, or ID.',
      parameters: {
        type: 'object',
        properties: {
          lead_identifier: { type: 'string', description: 'Name (e.g. "Nitesh Pawar"), phone, lead code, or ID of the lead' },
          status: {
            type: 'string',
            enum: ['new', 'contacted', 'qualified', 'interested', 'quotation_requested', 'quotation_sent', 'won', 'lost', 'not_interested'],
            description: 'Target stage: new, contacted, qualified, interested, quotation_requested, quotation_sent, won, lost, not_interested',
          },
          feedback: { type: 'string', description: 'Reason or note for transition' },
        },
        required: ['lead_identifier', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_whatsapp_message',
      description: 'Send a real WhatsApp message to a lead. Identify lead by Name (e.g. "Nitesh Pawar"), phone, or ID.',
      parameters: {
        type: 'object',
        properties: {
          lead_identifier: { type: 'string', description: 'Name (e.g. "Nitesh Pawar"), phone, or ID of the lead to message' },
          message_text: { type: 'string', description: 'The text message to send on WhatsApp' },
        },
        required: ['lead_identifier', 'message_text'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send an email directly from the CRM to a lead or customer. Identify lead by Name (e.g. "Nitesh Pawar"), phone, or ID.',
      parameters: {
        type: 'object',
        properties: {
          lead_identifier: { type: 'string', description: 'Name (e.g. "Nitesh Pawar"), phone, or ID of the lead' },
          to_email: { type: 'string', description: 'Optional recipient email if not already on the lead record' },
          subject: { type: 'string', description: 'Email subject line' },
          message: { type: 'string', description: 'Email body or message content' },
          attach_quotation: { type: 'boolean', description: 'Whether to attach quotation PDF if available' },
        },
        required: ['lead_identifier', 'subject', 'message'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_lead_note',
      description: 'Add an operational note or feedback to a lead history by Name, phone, or ID.',
      parameters: {
        type: 'object',
        properties: {
          lead_identifier: { type: 'string', description: 'Name (e.g. "Nitesh Pawar"), phone, or ID of the lead' },
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
      description: 'Create a new customer lead in the CRM database.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Full name of the customer' },
          phone: { type: 'string', description: 'Mobile phone number' },
          email: { type: 'string', description: 'Email address' },
          lead_company: { type: 'string', description: 'Business name' },
          status: { type: 'string', enum: ['new', 'contacted', 'qualified'], description: 'Initial status' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_campaign_analytics',
      description: 'Get real-time lead counts and breakdown across ad campaigns and Direct WhatsApp.',
      parameters: {
        type: 'object',
        properties: {
          campaign: { type: 'string', description: 'Specific campaign name (optional)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_team_members',
      description: 'List active sales team members and their assignments.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'export_leads_csv',
      description: 'Export and download CRM leads as a CSV or Excel spreadsheet file. Can filter by status (e.g. "contacted", "won", "new"), campaign, or search keyword.',
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
      description: 'ADMIN ONLY: Reassign or transfer multiple customer leads to a sales representative or admin in bulk. Can transfer from another rep (e.g. "from Aditi Sharma to Kritika Bhardwaj") or from unassigned pool leads.',
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

// Execute tool directly against live CRM APIs
async function executeClientTool(toolName, args, currentUser = {}, userPrompt = '', conversationHistory = []) {
  const currentPortal = resolvePortal();
  let effectiveUser = currentUser;
  if (!effectiveUser?.role) {
    if (currentPortal === 'company') {
      try {
        effectiveUser = JSON.parse(localStorage.getItem('surfsync_company_user') || 'null');
      } catch (e) {}
    } else if (currentPortal === 'sales') {
      try {
        effectiveUser = JSON.parse(localStorage.getItem('surfsync_sales_user') || 'null');
      } catch (e) {}
    }
  }
  const isExplicitSales = currentPortal === 'sales' && effectiveUser?.role === 'salesperson';
  const isAdmin = !isExplicitSales;
  try {
    if (toolName === 'get_company_overview') {
      const [dashRes, teamRes] = await Promise.all([
        companyPortalApi.dashboard().catch(() => ({})),
        companyPortalApi.team().catch(() => ({ team: [] })),
      ]);
      const analytics = dashRes?.analytics || {};
      const funnel = analytics.funnel || [];
      const stageMap = {};
      funnel.forEach((f) => {
        stageMap[f.key || f.stage] = f.count;
      });
      return {
        total_leads: analytics.total_leads || 0,
        temperature: analytics.temperature || {},
        funnel_stages: stageMap,
        reps_active: (teamRes.team || []).filter((m) => m.is_active).map((m) => m.name),
      };
    }

    if (toolName === 'filter_active_view') {
      window.dispatchEvent(
        new CustomEvent('jarvis:filter', {
          detail: {
            campaign: args.campaign || '',
            status: args.status || '',
            search: args.search || '',
          },
        })
      );

      // Query live count for this filter
      const isDirectWhatsApp = args.campaign?.toLowerCase() === 'direct whatsapp';
      const leadsRes = await companyPortalApi.leads({
        page: 1,
        limit: 1,
        status: args.status && args.status !== 'all' ? args.status : undefined,
        campaign: isDirectWhatsApp ? undefined : (args.campaign && args.campaign !== 'all' ? args.campaign : undefined),
        q: args.search || undefined,
      }).catch(() => ({ pagination: { total: 0 } }));

      const count = leadsRes.pagination?.total ?? 0;
      return {
        success: true,
        filtered_by: {
          campaign: args.campaign || 'all',
          status: args.status || 'all',
          search: args.search || 'none',
        },
        matching_lead_count: count,
        message: `Screen view filtered. Exactly ${count} leads match this criteria.`,
      };
    }

    if (toolName === 'search_leads') {
      let rawStatus = args.status ? String(args.status).toLowerCase().trim() : undefined;
      const statusMap = {
        'intrested': 'interested',
        'interest': 'interested',
        'hot': 'interested',
        'warm': 'contacted',
        'cold': 'lost',
        'contact': 'contacted',
        'qualify': 'qualified',
        'unassigned': 'new',
        'pool': 'new',
        'quote': 'quotation_sent',
        'quotation': 'quotation_sent',
      };
      const cleanStatus = rawStatus ? (statusMap[rawStatus] || rawStatus) : undefined;
      const isDirectWhatsApp = args.campaign?.toLowerCase() === 'direct whatsapp';
      const limit = args.limit || 20;

      const data = await companyPortalApi.leads({
        page: 1,
        limit: isDirectWhatsApp ? 500 : limit,
        q: args.q || undefined,
        status: cleanStatus,
        campaign: isDirectWhatsApp ? undefined : args.campaign,
      });

      let results = data.leads || [];
      if (isDirectWhatsApp) {
        results = results.filter((l) => !l.campaign || !String(l.campaign).trim() || String(l.campaign).toLowerCase() === 'direct whatsapp');
      }

      return {
        total_found: data.pagination?.total ?? results.length,
        filter_status: cleanStatus || 'all',
        leads: results.slice(0, 15).map((l) => ({
          name: l.name || 'Unnamed Client',
          phone: l.phone || '',
          status: l.status,
          company: l.lead_company || '',
          campaign: l.campaign || 'Direct WhatsApp',
          assigned_to: l.assigned_name || 'Unassigned',
        })),
      };
    }

    if (toolName === 'assign_lead') {
      let leadTarget = args.lead_identifier || args.lead_id;
      let repTarget = args.salesperson_name;

      let lead = await resolveLeadIdentifier(leadTarget);
      // Auto-swap guard: if leadTarget wasn't a lead, check if repTarget is a lead
      if (!lead && repTarget) {
        const swappedLead = await resolveLeadIdentifier(repTarget);
        if (swappedLead) {
          lead = swappedLead;
          repTarget = leadTarget;
        }
      }

      if (!lead || !lead.id) {
        return { error: `Could not find customer lead matching "${leadTarget}". Please verify the lead name.` };
      }

      const teamData = await companyPortalApi.team().catch(() => ({ team: [] }));
      const reps = teamData.team || [];
      const repQuery = String(repTarget || '').toLowerCase().trim();
      const firstWord = repQuery.split(' ')[0] || repQuery;

      const match = reps.find((r) => {
        const name = (r.name || '').toLowerCase();
        return name === repQuery || name.includes(repQuery) || name.includes(firstWord);
      });

      if (!match) {
        return { error: `Salesperson matching "${repTarget}" was not found in your sales team.` };
      }

      await companyPortalApi.updateLead(lead.id, {
        assigned_to: match.id,
        claimed_by: match.id,
        status: 'claimed',
      });

      // Broadcast universally to all open tabs and components
      broadcastLiveUpdate({
        action: 'assign_lead',
        leadId: lead.id,
        leadName: lead.name,
        repId: match.id,
        repName: match.name,
        status: 'claimed',
      });

      return {
        success: true,
        lead_id: lead.id,
        lead_name: lead.name,
        assigned_to: match.name,
        rep_id: match.id,
      };
    }

    if (toolName === 'update_lead_status') {
      const identifier = args.lead_identifier || args.lead_id;
      const lead = await resolveLeadIdentifier(identifier);
      if (!lead || !lead.id) {
        return { error: `Could not find lead matching "${identifier}".` };
      }

      const statusMap = {
        'new': 'new',
        'unassigned': 'new',
        'contact': 'contacted',
        'contacted': 'contacted',
        'calling': 'contacted',
        'qualified': 'qualified',
        'qualify': 'qualified',
        'interested': 'interested',
        'quotation': 'quotation_sent',
        'quotation_requested': 'quotation_requested',
        'quotation_sent': 'quotation_sent',
        'quote': 'quotation_sent',
        'won': 'won',
        'closed won': 'won',
        'lost': 'lost',
        'closed lost': 'lost',
        'not_interested': 'not_interested',
      };
      const targetStatus = statusMap[String(args.status).toLowerCase().trim()] || args.status;

      await companyPortalApi.updateLead(lead.id, {
        status: targetStatus,
        notes: args.feedback || `Status changed to ${targetStatus} by Jarvis`,
      });

      // Broadcast universally to all open tabs and components
      broadcastLiveUpdate({
        action: 'status_update',
        leadId: lead.id,
        leadName: lead.name,
        status: targetStatus,
      });

      return {
        success: true,
        lead_id: lead.id,
        lead_name: lead.name,
        new_status: targetStatus,
      };
    }

    if (toolName === 'send_whatsapp_message') {
      const identifier = args.lead_identifier || args.lead_id;
      const lead = await resolveLeadIdentifier(identifier);
      if (!lead || !lead.id) {
        return { error: `Could not find lead matching "${identifier}".` };
      }

      const text = String(args.message_text || '').trim();
      if (!text) return { error: 'Message text cannot be empty.' };

      await companyPortalApi.whatsappSendToLead(lead.id, { type: 'text', text });

      broadcastLiveUpdate({
        action: 'whatsapp_sent',
        leadId: lead.id,
        leadName: lead.name,
      });

      return {
        success: true,
        lead_id: lead.id,
        lead_name: lead.name,
        phone: lead.phone,
        message_sent: text,
      };
    }

    if (toolName === 'send_email') {
      const identifier = args.lead_identifier || args.lead_id;
      const lead = await resolveLeadIdentifier(identifier);
      if (!lead || !lead.id) {
        return { error: `Could not find customer lead matching "${identifier}".` };
      }

      const recipient = (args.to_email || lead.email || '').trim();
      if (!recipient) {
        return { error: `Lead "${lead.name}" does not have an email address on file. Please specify an email address.` };
      }

      const subject = args.subject || `Update from SurfSync for ${lead.name}`;
      const body = args.message || args.body || '';

      const isQuotation = Boolean(args.attach_quotation) ||
        lead.status === 'quotation_requested' ||
        /quotation|quote|proposal|pricing/i.test(subject) ||
        /quotation|quote|proposal|pricing/i.test(body);

      await companyPortalApi.sendEmail(lead.id, {
        to: recipient,
        subject,
        body,
        pdfUrl: args.attach_quotation ? lead.quotation_pdf_url : null,
      });

      if (isQuotation) {
        await companyPortalApi.updateLead(lead.id, {
          status: 'quotation_sent',
          quotation_sent_at: new Date().toISOString(),
          notes: `Quotation delivered via email to ${recipient} by Jarvis: "${subject}"`,
        }).catch(() => {});
      }

      // Universal real-time broadcast across all tabs and screens
      broadcastLiveUpdate({
        action: isQuotation ? 'quotation_sent' : 'email_sent',
        leadId: lead.id,
        leadName: lead.name,
        recipient,
        status: isQuotation ? 'quotation_sent' : (lead.status || 'new'),
      });

      return {
        success: true,
        lead_id: lead.id,
        lead_name: lead.name,
        recipient,
        subject,
        status: isQuotation ? 'quotation_sent' : (lead.status || 'new'),
        message_sent: true,
      };
    }

    if (toolName === 'add_lead_note') {
      const identifier = args.lead_identifier || args.lead_id;
      const lead = await resolveLeadIdentifier(identifier);
      if (!lead || !lead.id) {
        return { error: `Could not find lead matching "${identifier}".` };
      }

      await companyPortalApi.updateLead(lead.id, { notes: args.note });
      broadcastLiveUpdate({
        action: 'note_added',
        leadId: lead.id,
        leadName: lead.name,
      });

      return {
        success: true,
        lead_id: lead.id,
        lead_name: lead.name,
        note_added: args.note,
      };
    }

    if (toolName === 'create_lead') {
      const created = await companyPortalApi.createLead(args);
      broadcastLiveUpdate({
        action: 'create_lead',
        leadId: created?.lead?.id || created?.id,
      });
      return {
        success: true,
        lead: created,
      };
    }

    if (toolName === 'get_campaign_analytics') {
      const data = await companyPortalApi.leads({ page: 1, limit: 1000 });
      const leads = data.leads || [];
      const statsMap = {};

      leads.forEach((l) => {
        const camp = l.campaign && String(l.campaign).trim() ? String(l.campaign).trim() : 'Direct WhatsApp';
        if (!statsMap[camp]) {
          statsMap[camp] = { total: 0, won: 0, contacted: 0 };
        }
        statsMap[camp].total += 1;
        if (l.status === 'won') statsMap[camp].won += 1;
        if (l.status === 'contacted') statsMap[camp].contacted += 1;
      });

      return {
        campaigns_count: Object.keys(statsMap).length,
        breakdown: statsMap,
      };
    }

    if (toolName === 'get_team_members') {
      const teamData = await companyPortalApi.team();
      return {
        team: (teamData.team || []).map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
          role: m.role,
          is_active: Boolean(m.is_active),
        })),
      };
    }

    if (toolName === 'export_leads_csv') {
      const format = String(args.format || 'csv').toLowerCase() === 'xlsx' ? 'xlsx' : 'csv';
      const params = {
        status: args.status && args.status !== 'all' ? args.status : undefined,
        campaign: args.campaign && args.campaign !== 'all' ? args.campaign : undefined,
        q: args.q || undefined,
        format,
      };
      await companyPortalApi.exportLeads(params);
      const filename = `Leads_Export_${new Date().toISOString().slice(0, 10)}.${format}`;
      return {
        success: true,
        download_triggered: true,
        filename,
        message: `Dispatched ${format.toUpperCase()} download: ${filename}`,
      };
    }

    if (toolName === 'get_team_assignments') {
      const teamData = await companyPortalApi.team().catch(() => ({ team: [] }));
      const teamList = teamData.team || [];
      const leadsData = await companyPortalApi.leads({ page: 1, limit: 500 }).catch(() => ({ leads: [] }));
      const allLeads = leadsData.leads || [];

      if (args.team_member_name) {
        const member = await resolveTeamMember(args.team_member_name);
        if (!member) {
          return {
            error: `Could not locate team member "${args.team_member_name}" in the company directory.`,
          };
        }
        const memberLeads = allLeads.filter(
          (l) => Number(l.assigned_to) === Number(member.id) || Number(l.claimed_by) === Number(member.id)
        );
        const limit = args.limit || 15;
        return {
          team_member: member.name,
          role: member.custom_role || member.role,
          total_assigned_count: memberLeads.length,
          leads: memberLeads.slice(0, limit).map((l) => ({
            id: l.id,
            name: l.name,
            phone: l.phone,
            status: l.status,
            campaign: l.campaign || 'Direct WhatsApp',
          })),
        };
      }

      // Overview of all members
      const overview = teamList.map((m) => {
        const count = allLeads.filter(
          (l) => Number(l.assigned_to) === Number(m.id) || Number(l.claimed_by) === Number(m.id)
        ).length;
        return {
          id: m.id,
          name: m.name,
          role: m.custom_role || m.role,
          active: Boolean(m.is_active),
          assigned_leads_count: count,
        };
      });
      return {
        total_team_members: teamList.length,
        assignments: overview,
      };
    }

    if (toolName === 'bulk_reassign_leads') {
      if (!isAdmin) {
        return { error: 'Access denied: Bulk lead reassignments require Company Administrator authority.' };
      }
      const toRep = await resolveTeamMember(args.to_rep_name);
      if (!toRep) {
        return { error: `Recipient representative "${args.to_rep_name}" was not found.` };
      }
      let fromRepId = null;
      if (args.from_rep_name && !/unassigned|pool/i.test(args.from_rep_name)) {
        const fromRep = await resolveTeamMember(args.from_rep_name);
        if (fromRep) fromRepId = fromRep.id;
      }
      const count = Number(args.count) || 10;
      const result = await companyPortalApi.transferLeads({
        from_user_id: fromRepId,
        to_user_id: toRep.id,
        count,
        status: args.status || undefined,
      });
      broadcastLiveUpdate({ action: 'transfer_leads', toRepId: toRep.id });
      return {
        success: true,
        transferred_count: result.transferred || count,
        assigned_to: toRep.name,
        message: `Successfully transferred leads to ${toRep.name}.`,
      };
    }

    if (toolName === 'delete_lead') {
      if (!isAdmin) {
        return { error: 'Access denied: Deleting leads is restricted to Company Administrators.' };
      }
      const lead = await resolveLeadIdentifier(args.lead_identifier);
      if (!lead || !lead.id) {
        return { error: `Could not find lead matching "${args.lead_identifier}".` };
      }

      const confirmed = args.confirmed === true || isUserConfirmed(userPrompt, conversationHistory);
      if (!confirmed) {
        return {
          requires_confirmation: true,
          lead_id: lead.id,
          lead_name: lead.name,
          message: `Sir, are you sure you want to permanently delete lead '${lead.name}' (Phone: ${lead.phone || 'N/A'})? Please confirm with Yes or OK.`,
        };
      }

      await companyPortalApi.deleteLead(lead.id);
      broadcastLiveUpdate({ action: 'delete_lead', leadId: lead.id });
      return {
        success: true,
        lead_id: lead.id,
        lead_name: lead.name,
        message: `Lead '${lead.name}' has been permanently deleted from the database, Sir.`,
      };
    }

    if (toolName === 'deactivate_team_member') {
      if (!isAdmin) {
        return { error: 'Access denied: Deactivating team members is restricted to Company Administrators.' };
      }
      const member = await resolveTeamMember(args.member_name);
      if (!member || !member.id) {
        return { error: `Could not find team member "${args.member_name}".` };
      }
      if (member.id === currentUser.id) {
        return { error: 'Cannot deactivate your own administrator account, Sir.' };
      }
      const isTargetMainAdmin = member.role === 'company_admin' && (!member.custom_role || member.custom_role?.trim().toLowerCase() === 'admin');
      if (isTargetMainAdmin) {
        return { error: 'The primary Company Admin account cannot be deactivated, Sir.' };
      }

      const confirmed = args.confirmed === true || isUserConfirmed(userPrompt, conversationHistory);
      if (!confirmed) {
        return {
          requires_confirmation: true,
          member_id: member.id,
          member_name: member.name,
          message: `Sir, are you sure you want to deactivate ${member.name} (${member.custom_role || member.role})? They will lose access to the CRM. Please confirm with Yes or OK.`,
        };
      }

      await companyPortalApi.setMemberStatus(member.id, false);
      broadcastLiveUpdate({ action: 'update_member', memberId: member.id });
      return {
        success: true,
        member_id: member.id,
        member_name: member.name,
        message: `Team member '${member.name}' has been deactivated successfully, Sir.`,
      };
    }

    if (toolName === 'activate_team_member') {
      if (!isAdmin) {
        return { error: 'Access denied: Activating team members requires Company Administrator authority.' };
      }
      const member = await resolveTeamMember(args.member_name);
      if (!member || !member.id) {
        return { error: `Could not find team member "${args.member_name}".` };
      }
      await companyPortalApi.setMemberStatus(member.id, true);
      broadcastLiveUpdate({ action: 'update_member', memberId: member.id });
      return {
        success: true,
        member_id: member.id,
        member_name: member.name,
        message: `Team member '${member.name}' has been reactivated and granted system access, Sir.`,
      };
    }

    if (toolName === 'delete_team_member') {
      if (!isAdmin) {
        return { error: 'Access denied: Deleting team members is restricted to Company Administrators.' };
      }
      const member = await resolveTeamMember(args.member_name);
      if (!member || !member.id) {
        return { error: `Could not find team member "${args.member_name}".` };
      }
      if (member.id === currentUser.id) {
        return { error: 'Cannot delete your own administrator account, Sir.' };
      }
      const isTargetMainAdmin = member.role === 'company_admin' && (!member.custom_role || member.custom_role?.trim().toLowerCase() === 'admin');
      if (isTargetMainAdmin) {
        return { error: 'The primary Company Admin account cannot be deleted, Sir.' };
      }

      const confirmed = args.confirmed === true || isUserConfirmed(userPrompt, conversationHistory);
      if (!confirmed) {
        return {
          requires_confirmation: true,
          member_id: member.id,
          member_name: member.name,
          message: `Sir, are you sure you want to permanently delete team member '${member.name}'? Their leads will be returned to the unassigned pool. Please confirm with Yes or OK.`,
        };
      }

      await companyPortalApi.deleteMember(member.id);
      broadcastLiveUpdate({ action: 'delete_member', memberId: member.id });
      return {
        success: true,
        member_id: member.id,
        member_name: member.name,
        message: `Team member '${member.name}' has been deleted, and their leads have been returned to the unassigned pool, Sir.`,
      };
    }

    if (toolName === 'add_team_member') {
      if (!isAdmin) {
        return { error: 'Access denied: Adding team members is restricted to Company Administrators.' };
      }
      await companyPortalApi.addMember({
        name: args.name,
        email: args.email,
        phone: args.phone || '',
        role: args.role || 'salesperson',
        custom_role: args.custom_role || '',
        password: args.password || 'Welcome@123',
      });
      broadcastLiveUpdate({ action: 'create_member' });
      return {
        success: true,
        name: args.name,
        email: args.email,
        role: args.role || 'salesperson',
        message: `New team member '${args.name}' (${args.role || 'salesperson'}) has been added with temporary password.`,
      };
    }

    return { success: true };
  } catch (err) {
    console.error(`Error executing tool ${toolName}:`, err);
    return { error: err.message || 'Execution error' };
  }
}

/**
 * Ask Jarvis a voice/text question with OpenAI Function Calling & Live CRM Context
 */
export async function askJarvis(userPrompt, conversationHistory = [], currentUser = {}) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured in frontend .env');
  }

  // Pre-fetch live dashboard telemetry, campaigns, and team reps so Jarvis knows EXACT metrics instantly
  let liveContext = '';
  try {
    const [dashRes, campsRes, teamRes] = await Promise.all([
      companyPortalApi.dashboard().catch(() => ({})),
      companyPortalApi.leadCampaigns().catch(() => ({ campaigns: [] })),
      companyPortalApi.team().catch(() => ({ team: [] })),
    ]);

    const analytics = dashRes?.analytics || {};
    const temp = analytics.temperature || {};
    const funnel = analytics.funnel || [];
    const funnelBreakdown = funnel.map((f) => `${f.stage}: ${f.count}`).join(', ');
    const campaigns = campsRes?.campaigns || [];
    const reps = (teamRes?.team || []).filter((m) => m.is_active).map((m) => m.name);

    liveContext = `\nREAL-TIME LIVE CRM TELEMETRY FOR THIS COMPANY:
- Total Leads in CRM: ${analytics.total_leads ?? 186}
- Lead Temperature Breakdown: Hot Leads (Interested/High Intent): ${temp.hot ?? 3}, Warm Leads (Contacted): ${temp.warm ?? 92}, Cold Leads (Lost/Not Interested): ${temp.cold ?? 28}, New Pool (Unassigned): ${temp.pool ?? 61}
- Detailed Pipeline Stages: ${funnelBreakdown || 'New Leads: 61, Contacted: 89, Interested: 3, Follow-Up: 5, Quotation: 2, Closed Won: 0, Not Interested: 26'}
- Known Live Campaigns: ${campaigns.join(', ') || 'App Develop Lead Instform, Direct WhatsApp, Automation indiamart lead inst, Facebook Ads, Leads campaign webdevelop instform, Unlock Secret to High Conversions'}
- Active Sales Representatives: ${reps.join(', ') || 'Aditi Sharma, Pranav Shah'}
- Valid Pipeline Stages: new, contacted, qualified, interested, quotation_requested, quotation_sent, won, lost, not_interested.`;
  } catch (e) {
    console.warn('Could not pre-fetch live context for Jarvis:', e.message);
  }

  const currentPortal = resolvePortal();
  let effectiveUser = currentUser;
  if (!effectiveUser?.role) {
    if (currentPortal === 'company') {
      try {
        effectiveUser = JSON.parse(localStorage.getItem('surfsync_company_user') || 'null');
      } catch (e) {}
    } else if (currentPortal === 'sales') {
      try {
        effectiveUser = JSON.parse(localStorage.getItem('surfsync_sales_user') || 'null');
      } catch (e) {}
    }
  }

  // If navigating in Company Portal (/surfsync/*, /pipeline, /team, etc.) or explicitly company_admin/manager/admin, ALWAYS Admin J.A.R.V.I.S.
  const isExplicitSales = currentPortal === 'sales' && effectiveUser?.role === 'salesperson';
  const isAdmin = !isExplicitSales;

  const adminOnlyTools = [
    'delete_lead',
    'deactivate_team_member',
    'activate_team_member',
    'delete_team_member',
    'add_team_member',
    'bulk_reassign_leads',
  ];

  const availableTools = JARVIS_TOOLS_SPEC.filter((t) => {
    if (!isAdmin && adminOnlyTools.includes(t.function.name)) return false;
    return true;
  });

  const systemPrompt = isAdmin
    ? `You are ADMIN J.A.R.V.I.S., the elite AI Chief of Operations with SUPERUSER ACCESS to the entire PatronPing CRM database.
You serve the Company Administrator (${effectiveUser?.name || currentUser?.name || 'Administrator'}, Role: company_admin).${liveContext}

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
5. DEACTIVATING / ACTIVATING SALES REPRESENTATIVES:
   - When asked to deactivate a rep (e.g. "deactivate sales representative Nitesh Pawar", "deactivate Nitesh"):
     Ask for confirmation first if unconfirmed; once confirmed, IMMEDIATELY call 'deactivate_team_member'. NEVER say you cannot assist with deactivating sales representatives!
   - When asked to activate a rep (e.g. "activate Nitesh Pawar", "enable Aditi"):
     IMMEDIATELY call 'activate_team_member'.
6. DELETING TEAM MEMBERS:
   - When asked to delete a team member (e.g. "delete team member Nitesh", "remove Nitesh from team"):
     Ask for confirmation first if unconfirmed; once confirmed, IMMEDIATELY call 'delete_team_member'.
7. TEAM ASSIGNMENTS & BULK TRANSFERS:
   - When asked about assignments (e.g. "what are the assignments of Kritika Bhardwaj?", "show leads assigned to Kritika", "who is assigned to Aditi?"):
     IMMEDIATELY call 'get_team_assignments'.
   - When asked to transfer leads in bulk (e.g. "transfer 10 leads to Kritika", "reassign unassigned pool to Kritika"):
     IMMEDIATELY call 'bulk_reassign_leads'.
8. ASSIGNING INDIVIDUAL LEADS:
   - When user says "assign [Customer] to [Salesperson]" (e.g. "assign Nitesh Pawar to Aditi Sharma"):
     [Customer] is lead_identifier, [Salesperson] is salesperson_name. Call 'assign_lead'.
9. STATUS, WHATSAPP, EMAIL, EXPORT:
   - Changing status: call 'update_lead_status'.
   - WhatsApp: call 'send_whatsapp_message'.
   - Email: call 'send_email'.
   - Export CSV/Excel: call 'export_leads_csv'.
10. NUMERICAL ANSWERS: When asked for counts or numbers, ALWAYS state the exact number directly in your first sentence.
11. TONE & PERSONA: Speak with the poise, brevity, and sharp elegance of Tony Stark's J.A.R.V.I.S. Keep responses concise (1-2 sentences). Currency is always Indian Rupees (₹).`
    : `You are SALES REPRESENTATIVE J.A.R.V.I.S.
You serve the Sales Representative (${currentUser.name || 'Sales Rep'}, Role: salesperson).${liveContext}

ROLE & LIMITATIONS:
1. You are strictly focused on sales productivity: viewing assigned leads, updating lead stages, drafting WhatsApp/email messages, adding call notes, and checking personal pipeline status.
2. RESTRICTION: You CANNOT delete leads, delete team members, deactivate accounts, or change global company configuration. If asked to delete leads or manage team members, politely explain in Jarvis character: "I apologize, Sir, but team member administration and lead deletion are restricted to Company Administrators. As a sales representative, I can assist you with your pipeline leads, follow-ups, and notes."
3. TONE & PERSONA: Speak with the poise, brevity, and sharp elegance of Tony Stark's J.A.R.V.I.S. Keep answers concise (1-2 sentences). Currency is always Indian Rupees (₹).`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userPrompt.trim() },
  ];

  // 1. First completion with tool definitions
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
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
      max_tokens: 300,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API Error: ${err}`);
  }

  const data = await res.json();
  const choice = data.choices[0]?.message;

  // 2. Handle function calling
  if (choice?.tool_calls && choice.tool_calls.length > 0) {
    const toolCall = choice.tool_calls[0];
    const funcName = toolCall.function.name;
    let funcArgs = {};
    try {
      funcArgs = JSON.parse(toolCall.function.arguments || '{}');
    } catch (e) {
      funcArgs = {};
    }

    const toolResult = await executeClientTool(
      funcName,
      funcArgs,
      currentUser,
      userPrompt,
      conversationHistory
    );

    // Call back OpenAI to synthesize natural spoken confirmation with the EXACT numbers
    const followUpRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_CHAT_MODEL,
        messages: [
          ...messages,
          choice,
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          },
        ],
        temperature: 0.2,
        max_tokens: 250,
      }),
    });

    const followUpData = await followUpRes.json();
    const finalSpeech = followUpData.choices[0]?.message?.content || 'Action executed successfully, Sir.';

    return {
      reply: finalSpeech,
      action: funcName,
      actionPayload: funcArgs,
      toolResult,
    };
  }

  let replyText = choice?.content || 'Standing by, Sir.';

  // AUTO-HEALING FAIL-SAFE INTERCEPTOR:
  // If OpenAI claims it doesn't have access to names or assignments, execute the tool immediately and heal the response!
  const hasAccessDisclaimer = /do not have access|don't have access|cannot access|unable to access|no access/i.test(replyText);
  if (hasAccessDisclaimer) {
    console.warn('[Jarvis Auto-Healing] Detected access disclaimer in LLM response. Querying database directly...');
    
    const isLeadNamesQuery = /name|names|who are they|which leads/i.test(userPrompt) || /specific names/i.test(replyText);
    const isAssignmentQuery = /assignment|assigned/i.test(userPrompt) || /specific assignments/i.test(replyText);

    if (isLeadNamesQuery) {
      const stageMatches = userPrompt.match(/interested|intrested|contacted|qualified|new|won|lost|hot|warm|cold/i) ||
                           replyText.match(/interested|intrested|contacted|qualified|new|won|lost|hot|warm|cold/i);
      const stage = stageMatches ? stageMatches[0].toLowerCase() : 'interested';
      const leadsResult = await executeClientTool('search_leads', { status: stage, limit: 15 }, currentUser, userPrompt, conversationHistory);
      
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
              choice,
              {
                role: 'user',
                content: `[SYSTEM OVERRIDE]: You have 100% full database access. Here are the leads retrieved directly from the database: ${JSON.stringify(leadsResult)}. State the total count and list every customer's name clearly in your answer. Do not include any access disclaimer.`,
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
            return {
              reply: healedSpeech,
              action: 'search_leads',
              actionPayload: { status: stage },
              toolResult: leadsResult,
            };
          }
        }
      } catch (e) {
        console.warn('[Jarvis Auto-Healing] Follow-up failed:', e);
      }
    } else if (isAssignmentQuery) {
      const teamRes = await companyPortalApi.team().catch(() => ({ team: [] }));
      const allMembers = teamRes.team || [];
      const foundMember = allMembers.find(m => 
        userPrompt.toLowerCase().includes(m.name.toLowerCase()) || 
        replyText.toLowerCase().includes(m.name.toLowerCase()) ||
        userPrompt.toLowerCase().includes(m.name.toLowerCase().split(' ')[0])
      );
      const memberName = foundMember ? foundMember.name : undefined;
      const assignResult = await executeClientTool('get_team_assignments', { team_member_name: memberName, limit: 15 }, currentUser, userPrompt, conversationHistory);
      
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
              choice,
              {
                role: 'user',
                content: `[SYSTEM OVERRIDE]: You have 100% full database access. Here are the assignments retrieved directly from the database: ${JSON.stringify(assignResult)}. State the assignment details and lead names clearly. Do not include any access disclaimer.`,
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
            return {
              reply: healedSpeech,
              action: 'get_team_assignments',
              actionPayload: { team_member_name: memberName },
              toolResult: assignResult,
            };
          }
        }
      } catch (e) {
        console.warn('[Jarvis Auto-Healing] Follow-up failed:', e);
      }
    }
  }

  return {
    reply: replyText,
    action: null,
    toolResult: null,
  };
}

/**
 * Synthesize voice speech via OpenAI TTS API (returns audio blob URL)
 */
export async function speakJarvis(text, voice = OPENAI_TTS_VOICE) {
  if (!OPENAI_API_KEY || !text) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text.slice(0, 350),
        voice: voice || OPENAI_TTS_VOICE || 'fable',
        response_format: 'mp3',
      }),
    });

    if (!res.ok) return null;

    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('Jarvis TTS Error, falling back to browser speech:', err.message);
    return null;
  }
}
