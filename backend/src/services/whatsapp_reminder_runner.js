const pool = require('../config/db');
const pinbot = require('./pinbot');
const wa = require('./whatsapp');

let runnerInterval = null;

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`;
  return digits;
}

function getTemplateParams(reminder) {
  const clientName = reminder.lead_name || 'Valued Client';
  let updateTopic = 'your project requirements and scope';

  if (reminder.phase === 'phase_2_post_quote') {
    if (reminder.day_number === 2) updateTopic = 'the quotation shared for your review';
    else if (reminder.day_number === 5) updateTopic = 'our quotation and the proposed project milestones';
    else if (reminder.day_number === 10) updateTopic = 'any queries you might have regarding our proposal';
    else if (reminder.day_number === 21) updateTopic = 'the final details to proceed with your project';
    else updateTopic = 'your quotation and next steps';
  } else {
    if (reminder.day_number === 2) updateTopic = 'your recent inquiry and requirement discussion';
    else if (reminder.day_number === 5) updateTopic = 'the details we reviewed for your project';
    else if (reminder.day_number === 10) updateTopic = 'customizing the best solution for your needs';
    else if (reminder.day_number === 21) updateTopic = 'scheduling a quick walkthrough of our proposal';
    else updateTopic = 'your requirement to assist you further';
  }

  return [clientName, updateTopic];
}

function getReminderText(reminder) {
  if (reminder.phase === 'phase_2_post_quote') {
    return `Hi ${reminder.lead_name || 'Client'}, following up on the quotation shared with you. Let us know if you have any questions or are ready to proceed!`;
  }

  if (reminder.day_number === 2) {
    return `Hi ${reminder.lead_name || 'Client'}, thank you for your interest! We're here to assist you with any questions. Would you like to schedule a quick call today?`;
  } else if (reminder.day_number === 5) {
    return `Hello ${reminder.lead_name || 'Client'}, checking in to see if you had a chance to review the details we discussed. We'd love to help you get started!`;
  } else if (reminder.day_number === 10) {
    return `Hi ${reminder.lead_name || 'Client'}, hope your week is going great! Let us know if you need an official quotation or scope discussion for your project.`;
  } else {
    return `Hi ${reminder.lead_name || 'Client'}, we are wrapping up our onboarding queue. Please let us know if your project is still active so we can reserve your slot!`;
  }
}

async function processDueReminders() {
  try {
    // Find all reminders that are past due
    const [dueReminders] = await pool.query(
      `SELECT r.*, l.name AS lead_name, l.phone AS lead_phone, l.email AS lead_email
       FROM lead_reminders r
       JOIN leads l ON l.id = r.lead_id
       WHERE r.status = 'pending' AND r.scheduled_for <= NOW()
       ORDER BY r.scheduled_for ASC
       LIMIT 10`
    );

    if (dueReminders.length === 0) return;

    console.log(`[Auto-Reminder] Found ${dueReminders.length} due reminder(s) to process.`);

    for (const rem of dueReminders) {
      const toPhone = normalizePhone(rem.lead_phone);
      if (!toPhone) {
        console.log(`[Auto-Reminder] Lead #${rem.lead_id} has invalid phone (${rem.lead_phone}), skipping.`);
        await pool.query("UPDATE lead_reminders SET status = 'cancelled', notes = 'Invalid phone number' WHERE id = ?", [rem.id]);
        continue;
      }

      // Get WhatsApp settings for company
      const [settingsRows] = await pool.query(
        'SELECT * FROM company_whatsapp_settings WHERE company_id = ? AND is_active = 1 LIMIT 1',
        [rem.company_id]
      );

      const settings = settingsRows[0] || {
        api_key: process.env.PINBOT_API_KEY,
        phone_number_id: process.env.PINBOT_PHONE_NUMBER_ID,
      };

      if (!settings.api_key || !settings.phone_number_id) {
        console.log(`[Auto-Reminder] Company #${rem.company_id} has no WhatsApp API key configured.`);
        continue;
      }

      const messageBody = getReminderText(rem);

      try {
        console.log(`[Auto-Reminder] Sending WhatsApp message to ${toPhone} for Lead ${rem.lead_name}...`);

        let waRes;
        // If template name is provided, use approved 2-param template, else text
        if (process.env.PINBOT_TEMPLATE_NAME && process.env.WHATSAPP_USE_TEMPLATE === 'true') {
          const templateParams = getTemplateParams(rem);
          const payload = pinbot.buildTemplate(
            toPhone,
            process.env.PINBOT_TEMPLATE_NAME,
            process.env.PINBOT_TEMPLATE_LANG || 'en',
            templateParams
          );
          waRes = await pinbot.sendMessage({ apiKey: settings.api_key, phoneNumberId: settings.phone_number_id, payload });
        } else {
          const payload = pinbot.buildText(toPhone, messageBody);
          waRes = await pinbot.sendMessage({ apiKey: settings.api_key, phoneNumberId: settings.phone_number_id, payload });
        }

        console.log(`[Auto-Reminder] ✓ Sent successfully! WA Message ID:`, waRes?.waMessageId);

        // Update reminder status
        await pool.query(
          "UPDATE lead_reminders SET status = 'sent', sent_at = NOW(), notes = ? WHERE id = ?",
          [`Sent via SmartPing (MsgID: ${waRes?.waMessageId || 'OK'})`, rem.id]
        );

        // Log into whatsapp_messages table
        try {
          await pool.query(
            `INSERT INTO whatsapp_messages 
               (company_id, lead_id, direction, purpose, phone, msg_type, body, status, wa_message_id, sent_by)
             VALUES 
               (?, ?, 'out', 'reminder', ?, 'text', ?, 'sent', ?, ?)`,
            [
              rem.company_id,
              rem.lead_id,
              toPhone,
              messageBody,
              waRes?.waMessageId || null,
              rem.salesperson_id || null,
            ]
          );
        } catch (msgLogErr) {
          console.error('[Auto-Reminder] msgLogErr:', msgLogErr.message);
        }
      } catch (sendErr) {
        console.error(`[Auto-Reminder] Failed to send to ${toPhone}:`, sendErr.message);
        await pool.query(
          "UPDATE lead_reminders SET notes = ? WHERE id = ?",
          [`Error: ${sendErr.message}`, rem.id]
        );
      }
    }
  } catch (err) {
    console.error('[Auto-Reminder] Worker cycle error:', err.message);
  }
}

function startReminderWorker(intervalMs = 30000) {
  if (runnerInterval) return;
  console.log(`[Auto-Reminder] Starting WhatsApp Auto-Reminder Background Worker (every ${intervalMs / 1000}s)...`);
  runnerInterval = setInterval(processDueReminders, intervalMs);
  // Also run immediately on start
  processDueReminders();
}

function stopReminderWorker() {
  if (runnerInterval) {
    clearInterval(runnerInterval);
    runnerInterval = null;
  }
}

module.exports = {
  startReminderWorker,
  stopReminderWorker,
  processDueReminders,
};
