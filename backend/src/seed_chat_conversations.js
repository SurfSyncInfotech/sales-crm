const pool = require('./config/db');

async function seedChatConversations() {
  const companyId = 1;

  // 1. Ensure contacts exist in leads
  const contacts = [
    {
      name: 'mohammad ikram',
      phone: '919314433278',
      email: 'mohammad.ikram@example.com',
      messages: [
        { direction: 'in', body: 'Hello, I saw your WhatsApp API marketing services.', timeOffsetMin: 45, type: 'text' },
        { direction: 'out', body: 'Hi Mohammad! Thank you for contacting SurfSync Infotech. We provide high-throughput Meta Cloud WhatsApp Business APIs, bulk campaigns, and verified green tick onboarding.', timeOffsetMin: 35, type: 'text' },
        { direction: 'in', body: 'Can you share details and portfolio for e-commerce integration?', timeOffsetMin: 20, type: 'text' },
        {
          direction: 'out',
          body: 'Here is our platform architecture and overview brochure:',
          mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60',
          type: 'image',
          caption: 'SurfSync WhatsApp Cloud API Architecture & High-Throughput Engine',
          timeOffsetMin: 15
        },
        { direction: 'in', body: 'Hi..', timeOffsetMin: 2, type: 'text' }
      ]
    },
    {
      name: 'Aman Gautam',
      phone: '919461914671',
      email: 'aman.gautam@example.com',
      messages: [
        { direction: 'in', body: 'Interested in WhatsApp CRM broadcast tool.', timeOffsetMin: 60, type: 'text' },
        { direction: 'out', body: 'Hello Aman, welcome! We offer unlimited contact imports, automated follow-ups, and 80 msgs/sec throughput.', timeOffsetMin: 50, type: 'text' },
        {
          direction: 'out',
          body: 'Check out our sample campaign creative report:',
          mediaUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=60',
          type: 'image',
          caption: 'Campaign Performance & Real-time Analytics Dashboard',
          timeOffsetMin: 40
        },
        { direction: 'in', body: 'Further..', timeOffsetMin: 10, type: 'text' }
      ]
    },
    {
      name: '💖',
      phone: '919354487311',
      email: 'applicant.heart@example.com',
      messages: [
        { direction: 'in', body: 'Hello HR Team, are you hiring for tech & sales roles?', timeOffsetMin: 90, type: 'text' },
        { direction: 'out', body: 'Hi! Yes, we have openings for Fullstack Engineers and Enterprise Sales Managers at SurfSync Infotech.', timeOffsetMin: 70, type: 'text' },
        {
          direction: 'out',
          body: 'Please review our open roles brochure:',
          mediaUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=60',
          type: 'image',
          caption: 'SurfSync Careers 2026 - Open Opportunities',
          timeOffsetMin: 60
        },
        { direction: 'in', body: 'Jobs & Internships..', timeOffsetMin: 30, type: 'text' }
      ]
    }
  ];

  let idx = 0;
  for (const c of contacts) {
    idx++;
    let leadId;
    const [existing] = await pool.query('SELECT id FROM leads WHERE company_id = ? AND phone = ? LIMIT 1', [companyId, c.phone]);
    if (existing.length > 0) {
      leadId = existing[0].id;
    } else {
      const leadCode = `LEAD-WAPP-${Date.now().toString().slice(-6)}-${idx}`;
      const [ins] = await pool.query(
        'INSERT INTO leads (company_id, lead_code, name, phone, email, status, source_name) VALUES (?, ?, ?, ?, ?, "qualified", "WhatsApp")',
        [companyId, leadCode, c.name, c.phone, c.email]
      );
      leadId = ins.insertId;
    }

    // Insert messages if not already present
    const [existingMsgs] = await pool.query('SELECT COUNT(*) as cnt FROM whatsapp_messages WHERE company_id = ? AND phone = ?', [companyId, c.phone]);
    if (existingMsgs[0].cnt === 0) {
      for (const m of c.messages) {
        const msgTime = new Date(Date.now() - m.timeOffsetMin * 60 * 1000);
        await pool.query(
          `INSERT INTO whatsapp_messages 
            (company_id, lead_id, direction, purpose, phone, msg_type, body, payload, status, created_at)
           VALUES (?, ?, ?, 'chat', ?, ?, ?, ?, ?, ?)`,
          [
            companyId,
            leadId,
            m.direction,
            c.phone,
            m.type || 'text',
            m.body,
            m.mediaUrl ? JSON.stringify({ url: m.mediaUrl, caption: m.caption }) : null,
            m.direction === 'out' ? 'read' : 'received',
            msgTime
          ]
        );
      }
      console.log(`Seeded messages for ${c.name} (${c.phone})`);
    } else {
      console.log(`Messages already exist for ${c.name}`);
    }
  }

  process.exit(0);
}

seedChatConversations().catch(err => {
  console.error(err);
  process.exit(1);
});
