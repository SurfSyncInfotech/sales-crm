// Demo data only. Replace with API calls in useWorkflowStore.js when the backend endpoints exist.

export const STAGES = [
  { id: 'new', name: 'New' },
  { id: 'contacted', name: 'Contacted' },
  { id: 'qualified', name: 'Qualified' },
  { id: 'proposal', name: 'Quotation' },
  { id: 'negotiation', name: 'Negotiation' },
  { id: 'won', name: 'Won' },
];

export const DOMAINS = [
  { id: 'services', name: 'SurfSync Services', keywords: ['website', 'seo', 'ads', 'branding', 'app'] },
  { id: 'products', name: 'Products', keywords: ['crm', 'software', 'license', 'subscription'] },
];

export const TEAM = [
  { id: 1, name: 'Aarav Mehta', domains: ['services'], open: 14, capacity: 20 },
  { id: 2, name: 'Neha Kapoor', domains: ['services'], open: 9, capacity: 20 },
  { id: 3, name: 'Rohan Iyer', domains: ['products'], open: 11, capacity: 15 },
  { id: 4, name: 'Priya Nair', domains: ['products', 'services'], open: 6, capacity: 15 },
];

const hoursAgo = (h) => new Date(Date.now() - h * 3600e3).toISOString();
const hoursAhead = (h) => new Date(Date.now() + h * 3600e3).toISOString();

export const LEADS = [
  { id: 101, name: 'Sanjay Verma', phone: '+91 98200 11001', source: 'Facebook Ads', domain: 'services', stage: 'new', temp: 'warm', owner: 1, value: 45000, note: 'Needs a business website', at: hoursAgo(1) },
  { id: 102, name: 'Mitali Shah', phone: '+91 98200 11002', source: 'Website Form', domain: 'products', stage: 'new', temp: 'cold', owner: 3, value: 120000, note: 'CRM enquiry for 10 users', at: hoursAgo(4) },
  { id: 103, name: 'Karan Bhatia', phone: '+91 98200 11003', source: 'Google Ads', domain: 'services', stage: 'contacted', temp: 'warm', owner: 2, value: 80000, note: 'SEO + Google Ads package', at: hoursAgo(20) },
  { id: 104, name: 'Divya Rao', phone: '+91 98200 11004', source: 'WhatsApp', domain: 'products', stage: 'contacted', temp: 'hot', owner: 3, value: 150000, note: 'Asked for pricing on WhatsApp', at: hoursAgo(26) },
  { id: 105, name: 'Imran Qureshi', phone: '+91 98200 11005', source: 'Landing Pages', domain: 'services', stage: 'qualified', temp: 'hot', owner: 1, value: 220000, note: 'Branding + website rebuild', at: hoursAgo(50) },
  { id: 106, name: 'Tanvi Joshi', phone: '+91 98200 11006', source: 'Facebook Ads', domain: 'products', stage: 'qualified', temp: 'warm', owner: 4, value: 95000, note: 'Wants a demo next week', at: hoursAgo(72) },
  { id: 107, name: 'Harsh Patel', phone: '+91 98200 11007', source: 'Calling', domain: 'services', stage: 'proposal', temp: 'hot', owner: 2, value: 175000, note: 'Quotation requested', at: hoursAgo(96) },
  { id: 108, name: 'Sneha Menon', phone: '+91 98200 11008', source: 'Website Form', domain: 'products', stage: 'proposal', temp: 'hot', owner: 3, value: 260000, note: 'Quote sent, awaiting reply', at: hoursAgo(120) },
  { id: 109, name: 'Vikram Singh', phone: '+91 98200 11009', source: 'Excel Uploads', domain: 'services', stage: 'negotiation', temp: 'hot', owner: 1, value: 310000, note: 'Negotiating discount', at: hoursAgo(150) },
  { id: 110, name: 'Anjali Desai', phone: '+91 98200 11010', source: 'Google Ads', domain: 'products', stage: 'won', temp: 'hot', owner: 4, value: 180000, note: 'Signed, onboarding', at: hoursAgo(200) },
];

export const TASKS = [
  { id: 1, leadId: 101, title: 'First contact call', type: 'call', owner: 1, due: hoursAgo(2), done: false },
  { id: 2, leadId: 104, title: 'Send pricing and book demo', type: 'whatsapp', owner: 3, due: hoursAhead(1), done: false },
  { id: 3, leadId: 103, title: 'Follow up on SEO package', type: 'call', owner: 2, due: hoursAhead(5), done: false },
  { id: 4, leadId: 108, title: 'Quotation follow-up', type: 'whatsapp', owner: 3, due: hoursAgo(5), done: false },
  { id: 5, leadId: 106, title: 'Confirm demo slot', type: 'meeting', owner: 4, due: hoursAhead(26), done: false },
  { id: 6, leadId: 105, title: 'Prepare scope for branding', type: 'task', owner: 1, due: hoursAhead(30), done: false },
  { id: 7, leadId: 102, title: 'Intro message reply check', type: 'whatsapp', owner: 3, due: hoursAhead(3), done: false },
  { id: 8, leadId: 109, title: 'Discount approval call', type: 'call', owner: 1, due: hoursAgo(30), done: true },
];

export const QUOTES = [
  { id: 'Q-1042', leadId: 107, amount: 175000, status: 'requested', requestedBy: 2, at: hoursAgo(3), expiry: null },
  { id: 'Q-1041', leadId: 105, amount: 220000, status: 'preparing', requestedBy: 1, at: hoursAgo(14), expiry: null },
  { id: 'Q-1040', leadId: 108, amount: 260000, status: 'sent', requestedBy: 3, at: hoursAgo(120), expiry: hoursAhead(240) },
  { id: 'Q-1039', leadId: 110, amount: 180000, status: 'accepted', requestedBy: 4, at: hoursAgo(260), expiry: hoursAgo(20) },
];

export const ACTIVITY = {
  104: [
    { id: 1, kind: 'capture', text: 'Lead captured from WhatsApp', at: hoursAgo(27) },
    { id: 2, kind: 'assign', text: 'Auto-assigned to Rohan Iyer (Products)', at: hoursAgo(27) },
    { id: 3, kind: 'send', text: 'Welcome template sent', at: hoursAgo(27) },
    { id: 4, kind: 'reply', text: 'Customer replied: "What is the pricing?"', at: hoursAgo(26) },
    { id: 5, kind: 'temp', text: 'Marked Hot because they asked about pricing', at: hoursAgo(26) },
  ],
};

export const JOURNEY = [
  { id: 'capture', title: 'Lead captured', text: 'From ads, WhatsApp, forms, calls or uploads. Duplicates are checked by phone.', tag: 'Auto' },
  { id: 'assign', title: 'Domain assigned', text: 'Service or product is detected, then round-robin picks the right salesperson.', tag: 'Auto' },
  { id: 'welcome', title: 'WhatsApp welcome', text: 'An approved template goes out, only if the lead has not opted out.', tag: 'Auto' },
  { id: 'qualify', title: 'Hot / Warm / Cold', text: 'Replies and signals score the lead, with the reasons visible.', tag: 'Auto' },
  { id: 'followup', title: 'Follow-up reminders', text: 'Tasks fall due on a schedule; overdue ones escalate to the manager.', tag: 'Auto' },
  { id: 'quote', title: 'Quotation request', text: 'Interested leads send a request to the manager, who prepares and approves it.', tag: 'Manager' },
  { id: 'nudge', title: 'Quote follow-up', text: 'After the quote is sent, nudges go out until the customer replies.', tag: 'Auto' },
  { id: 'close', title: 'Won / Lost', text: 'The outcome is recorded with a reason and the final value.', tag: 'Salesperson' },
];
