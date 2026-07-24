const express = require('express');
const {
  ingestByWebhookKey,
  resolveIntegrationByWebhookKey,
} = require('../services/leadIngest');
const {
  verifyState,
  exchangeCodeForToken,
  exchangeLongLivedToken,
  fetchFacebookUser,
  fetchBusinesses,
  createWizardSession,
  ingestFacebookLeadgenEvent,
  metaConfigured,
  getPlatformStatus,
} = require('../services/facebookConnect');

const router = express.Router();
const APP_BASE = process.env.APP_BASE || 'http://localhost:5173';

function asyncHandler(fn) {
  return (req, res) =>
    fn(req, res).catch((err) => {
      console.error(err);
      res.status(err.status || 500).json({ message: err.message || 'Lead capture failed' });
    });
}

function metaVerify(req, res) {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expected = process.env.META_VERIFY_TOKEN || 'surfsync_verify';

  if (mode === 'subscribe' && token === expected) {
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ message: 'Verification failed' });
}

// One platform webhook for all companies (configured once by SurfSync in Meta App)
router.get('/meta/webhook', metaVerify);
router.post(
  '/meta/webhook',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const created = [];

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'leadgen') continue;
        try {
          const lead = await ingestFacebookLeadgenEvent(change.value || {});
          if (lead && !lead.duplicate && !lead.skipped) created.push(lead.lead_code);
        } catch (err) {
          console.error('Facebook leadgen ingest error:', err.message);
        }
      }
    }

    res.status(200).json({ ok: true, created });
  })
);

// OAuth callback → start Superfone-style setup wizard (Business → Pages → Ads → Forms)
router.get(
  '/facebook/oauth/callback',
  asyncHandler(async (req, res) => {
    const { code, state, error, error_description: errorDescription } = req.query;
    const redirectBase = `${APP_BASE}/company/leads`;

    if (error) {
      return res.redirect(
        `${redirectBase}?fb=error&message=${encodeURIComponent(errorDescription || error)}`
      );
    }

    const parsed = verifyState(state);
    if (!parsed?.companyId) {
      return res.redirect(`${redirectBase}?fb=error&message=${encodeURIComponent('Invalid OAuth state')}`);
    }

    if (!metaConfigured()) {
      return res.redirect(
        `${redirectBase}?fb=error&message=${encodeURIComponent('META_APP_ID not configured')}`
      );
    }

    const tokenData = await exchangeCodeForToken(code);
    const longLived = await exchangeLongLivedToken(tokenData.access_token);
    const accessToken = longLived.access_token || tokenData.access_token;

    const fbUser = await fetchFacebookUser(accessToken);
    let businesses = [];
    try {
      businesses = await fetchBusinesses(accessToken);
    } catch (err) {
      console.warn('Businesses fetch failed, will use personal pages:', err.message);
    }

    const session = await createWizardSession({
      companyId: parsed.companyId,
      userId: parsed.userId,
      accessToken,
      fbUser,
      businesses,
    });

    return res.redirect(
      `${redirectBase}?fb=setup&session=${encodeURIComponent(session.session_token)}`
    );
  })
);

router.get('/meta/status', (_req, res) => {
  res.json(getPlatformStatus());
});

router.get(
  '/form/:webhookKey/config',
  asyncHandler(async (req, res) => {
    const integration = await resolveIntegrationByWebhookKey(req.params.webhookKey, [
      'website-form',
      'landing-pages',
    ]);
    res.json({
      company: {
        name: integration.company_name,
        slug: integration.company_slug,
      },
      source: {
        slug: integration.source_slug,
        name: integration.source_name,
      },
      webhook_key: integration.webhook_key,
    });
  })
);

router.post(
  '/form/:webhookKey',
  express.urlencoded({ extended: true }),
  asyncHandler(async (req, res) => {
    const payload = { ...req.body, campaign: req.body.campaign || req.query.campaign || null };
    const integration = await resolveIntegrationByWebhookKey(req.params.webhookKey, [
      'website-form',
      'landing-pages',
    ]);

    const { lead } = await ingestByWebhookKey(req.params.webhookKey, payload, {
      expectedSlugs: ['website-form', 'landing-pages'],
      overrides: {
        campaign:
          payload.campaign ||
          (integration.source_slug === 'landing-pages' ? 'Landing Page' : 'Website Form'),
      },
    });

    if (req.headers.accept?.includes('text/html') || req.query.redirect) {
      const redirectTo = req.query.redirect || req.body.redirect || '';
      if (redirectTo) return res.redirect(redirectTo);
      return res
        .status(200)
        .send(
          `<!doctype html><html><body style="font-family:sans-serif;padding:40px;text-align:center"><h2>Thank you</h2><p>Your enquiry was received by ${integration.company_name}.</p><p>Lead ID: ${lead.lead_code}</p></body></html>`
        );
    }

    res.status(201).json({ ok: true, lead_code: lead.lead_code, lead_id: lead.id });
  })
);

// Keep legacy per-company facebook webhook for testing/Zapier
router.get('/facebook/:webhookKey', metaVerify);
router.post(
  '/facebook/:webhookKey',
  asyncHandler(async (req, res) => {
    const body = req.body || {};

    if (body.name || body.phone || body.email || body.field_data) {
      const { lead } = await ingestByWebhookKey(req.params.webhookKey, body, {
        expectedSlugs: ['facebook-ads'],
        overrides: { campaign: body.campaign || body.form_name || 'Facebook Ads' },
      });
      return res.status(201).json({ ok: true, lead_code: lead.lead_code });
    }

    const entries = body.entry || [];
    const created = [];
    for (const entry of entries) {
      for (const change of entry.changes || []) {
        if (change.field !== 'leadgen') continue;
        try {
          const lead = await ingestFacebookLeadgenEvent(change.value || {});
          if (lead) {
            created.push(lead.lead_code);
            continue;
          }
        } catch {
          // fallback to webhook-key ingest below
        }
        const value = change.value || {};
        const payload = {
          name: value.full_name || value.name || null,
          phone: value.phone_number || value.phone || null,
          email: value.email || null,
          campaign: value.campaign_name || value.ad_name || 'Facebook Ads',
          notes: `Facebook leadgen_id=${value.leadgen_id || ''}; form_id=${value.form_id || ''}`,
          field_data: value.field_data || [],
          leadgen_id: value.leadgen_id,
          page_id: value.page_id,
          form_id: value.form_id,
        };
        const { lead } = await ingestByWebhookKey(req.params.webhookKey, payload, {
          expectedSlugs: ['facebook-ads'],
        });
        created.push(lead.lead_code);
      }
    }

    res.status(200).json({ ok: true, created });
  })
);

router.post(
  '/google/:webhookKey',
  asyncHandler(async (req, res) => {
    const body = req.body || {};
    const userColumnData = body.user_column_data || body.userColumnData || [];
    const mapped = {};
    for (const col of userColumnData) {
      const key = String(col.column_id || col.column_name || col.name || '').toLowerCase();
      mapped[key] = col.string_value || col.value;
    }

    const payload = {
      ...mapped,
      ...body,
      name: body.name || mapped['full name'] || mapped.fullname || mapped.name,
      phone: body.phone || mapped['phone number'] || mapped.phone || mapped.mobile,
      email: body.email || mapped.email,
      campaign: body.campaign_id || body.campaign || body.gclid || 'Google Ads',
      notes: body.notes || `Google lead_id=${body.lead_id || body.resource_name || ''}`,
    };

    const { lead } = await ingestByWebhookKey(req.params.webhookKey, payload, {
      expectedSlugs: ['google-ads'],
    });
    res.status(201).json({ ok: true, lead_code: lead.lead_code });
  })
);

router.get('/whatsapp/:webhookKey', metaVerify);
router.post(
  '/whatsapp/:webhookKey',
  asyncHandler(async (req, res) => {
    const body = req.body || {};

    if (body.name || body.phone || body.email) {
      const { lead } = await ingestByWebhookKey(req.params.webhookKey, body, {
        expectedSlugs: ['whatsapp'],
        overrides: { campaign: body.campaign || 'WhatsApp' },
      });
      return res.status(201).json({ ok: true, lead_code: lead.lead_code });
    }

    const created = [];
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        for (const message of value.messages || []) {
          const contact = (value.contacts || [])[0] || {};
          const payload = {
            name: contact.profile?.name || message.from,
            phone: message.from,
            notes: message.text?.body || message.button?.text || message.type,
            campaign: 'WhatsApp',
            wa_message_id: message.id,
          };
          const { lead } = await ingestByWebhookKey(req.params.webhookKey, payload, {
            expectedSlugs: ['whatsapp'],
          });
          created.push(lead.lead_code);
        }
      }
    }

    res.status(200).json({ ok: true, created });
  })
);

router.post(
  '/calling/:webhookKey',
  express.urlencoded({ extended: true }),
  asyncHandler(async (req, res) => {
    const body = { ...req.body, ...req.query };
    const payload = {
      name:
        body.name ||
        body.CallerName ||
        (body.CallFrom || body.From || body.caller_id
          ? `Caller ${body.CallFrom || body.From || body.caller_id}`
          : null),
      phone: body.phone || body.CallFrom || body.From || body.caller_id || body.CallerId,
      campaign: body.campaign || body.DialWhomNumber || 'Calling',
      notes: `Call status=${body.CallStatus || body.Status || body.status || 'received'}; duration=${body.DialCallDuration || body.Duration || ''}`,
      CallStatus: body.CallStatus || body.Status,
    };

    const { lead } = await ingestByWebhookKey(req.params.webhookKey, payload, {
      expectedSlugs: ['calling'],
    });
    res.status(201).json({ ok: true, lead_code: lead.lead_code });
  })
);

router.post(
  '/:webhookKey',
  asyncHandler(async (req, res) => {
    const { lead, integration } = await ingestByWebhookKey(req.params.webhookKey, req.body || {});
    res.status(201).json({
      ok: true,
      source: integration.source_slug,
      lead_code: lead.lead_code,
      lead_id: lead.id,
    });
  })
);

module.exports = router;
