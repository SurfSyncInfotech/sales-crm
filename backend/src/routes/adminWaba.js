const express = require('express');
const pool = require('../config/db');
const { authRequired, requireSuperadmin } = require('../middleware/auth');
const pinbotReseller = require('../services/pinbotReseller');

const router = express.Router();

router.use(authRequired, requireSuperadmin);

/**
 * 1. Overview & Stats
 * GET /api/admin/waba/overview
 */
router.get('/overview', async (_req, res) => {
  try {
    const [accStats] = await pool.query(`
      SELECT 
        COUNT(*) AS total_accounts,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_accounts,
        SUM(CASE WHEN status = 'suspended' THEN 1 ELSE 0 END) AS suspended_accounts
      FROM company_waba_accounts
    `);

    const [reqStats] = await pool.query(`
      SELECT 
        COUNT(*) AS total_requests,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_requests,
        SUM(CASE WHEN payment_status = 'paid' OR payment_status = 'demo_verified' THEN 1 ELSE 0 END) AS paid_requests
      FROM waba_service_requests
    `);

    const [recStats] = await pool.query(`
      SELECT 
        COUNT(*) AS total_recharges,
        COALESCE(SUM(amount), 0) AS total_recharge_amount
      FROM waba_recharge_history
      WHERE status = 'success'
    `);

    const hasResellerKey = Boolean(process.env.PINBOT_RESELLER_API_KEY);

    res.json({
      success: true,
      stats: {
        totalAccounts: accStats[0]?.total_accounts || 0,
        activeAccounts: accStats[0]?.active_accounts || 0,
        suspendedAccounts: accStats[0]?.suspended_accounts || 0,
        totalRequests: reqStats[0]?.total_requests || 0,
        pendingRequests: reqStats[0]?.pending_requests || 0,
        paidRequests: reqStats[0]?.paid_requests || 0,
        totalRecharges: recStats[0]?.total_recharges || 0,
        totalRechargeAmount: recStats[0]?.total_recharge_amount || 0,
      },
      hasResellerKey,
    });
  } catch (err) {
    console.error('Error fetching admin WABA overview:', err);
    res.status(500).json({ message: 'Failed to fetch WABA overview', error: err.message });
  }
});

/**
 * 2. Incoming Service Requests
 * GET /api/admin/waba/requests
 */
router.get('/requests', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT r.*, c.name AS company_name, c.email AS company_email, c.phone AS company_phone
      FROM waba_service_requests r
      LEFT JOIN companies c ON c.id = r.company_id
      ORDER BY r.created_at DESC
    `);
    res.json({ success: true, requests: rows });
  } catch (err) {
    console.error('Error fetching admin WABA requests:', err);
    res.status(500).json({ message: 'Failed to fetch WABA requests', error: err.message });
  }
});

/**
 * 3. Accounts List
 * GET /api/admin/waba/accounts
 */
router.get('/accounts', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT a.*, c.name AS company_name, c.email AS company_email, c.phone AS company_phone
      FROM company_waba_accounts a
      LEFT JOIN companies c ON c.id = a.company_id
      ORDER BY a.created_at DESC
    `);
    res.json({ success: true, accounts: rows });
  } catch (err) {
    console.error('Error fetching admin WABA accounts:', err);
    res.status(500).json({ message: 'Failed to fetch WABA accounts', error: err.message });
  }
});

/**
 * 4. Create User Account (CDC Panel)
 * POST /api/admin/waba/create-account
 */
router.post('/create-account', async (req, res) => {
  try {
    const {
      company_id,
      request_id,
      firstname,
      lastname,
      billingname,
      email,
      mobileno,
      waba_id,
      waba_number,
      template_namespace,
      account_type = 0, // 0 = postpaid, 1 = prepaid
      billing_type = 1, // 1 = transaction, 2 = conversation
      credit_limit_assign = 0,
      credit_limit = '10000',
      gst_no = '',
      plan_name = 'Growth WABA',
      product_details = {},
    } = req.body;

    if (!company_id) {
      return res.status(400).json({ message: 'company_id is required' });
    }
    if (!waba_id || !waba_number || !firstname || !email || !mobileno) {
      return res.status(400).json({ message: 'Missing required account details (firstname, email, mobileno, waba_id, waba_number)' });
    }

    const cleanWabaNumber = String(waba_number).replace(/\D/g, '');
    const wabaNumberArr = Array.isArray(waba_number) ? waba_number : [cleanWabaNumber];

    const defaultProducts = {
      marketing: '0.20',
      utility: '0.20',
      authentication: '0.20',
      service: '0.20',
      response: '0.20',
      feedback: '0.20',
      whatsappsetupcharges: '1000',
      botcharges: '1000',
      servercharges: '1000',
      activitycharges: '1000',
      othercharges: '1000',
      livechatagentcharges: '1000',
      ...product_details,
    };

    const cdcPayload = {
      firstname,
      lastname: lastname || firstname,
      billingname: billingname || `${firstname} ${lastname || ''}`.trim(),
      email,
      mobileno: String(mobileno).replace(/\D/g, ''),
      waba_id: String(waba_id),
      waba_number: wabaNumberArr,
      template_namespace: template_namespace || `namespace_${cleanWabaNumber}`,
      account_type: Number(account_type),
      billing_type: Number(billing_type),
      credit_limit_assign: Number(credit_limit_assign),
      credit_limit: String(credit_limit || '10000'),
      gst_no: gst_no || '',
      product_details: defaultProducts,
    };

    let generatedUsername = `${billingname || firstname}Wapp`.replace(/\s+/g, '');
    let generatedPassword = `Wapp@${Math.floor(100000 + Math.random() * 900000)}`;
    let generatedApiKey = `waba_live_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    let cdcResponseData = null;

    // Call Pinbot Reseller API if key is present
    if (process.env.PINBOT_RESELLER_API_KEY) {
      const cdcRes = await pinbotReseller.createUserAccount(cdcPayload);
      if (cdcRes.ok && cdcRes.data?.data) {
        generatedUsername = cdcRes.data.data.username || generatedUsername;
        generatedPassword = cdcRes.data.data.password || generatedPassword;
        generatedApiKey = cdcRes.data.data.apikey || generatedApiKey;
        cdcResponseData = cdcRes.data;
      } else {
        console.warn('Pinbot createUserAccount response warning:', cdcRes.data);
      }
    }

    // Default expiry: 1 year from now
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    const expiryDateStr = oneYearLater.toISOString().split('T')[0];

    // Check if account already exists for company
    const [existing] = await pool.query('SELECT id FROM company_waba_accounts WHERE company_id = ?', [company_id]);

    if (existing && existing.length > 0) {
      await pool.query(
        `UPDATE company_waba_accounts 
         SET waba_id = ?, waba_number = ?, username = ?, password = ?, apikey = ?, template_namespace = ?,
             account_type = ?, billing_type = ?, plan_name = ?, expiry_date = ?, status = 'active'
         WHERE company_id = ?`,
        [
          String(waba_id),
          cleanWabaNumber,
          generatedUsername,
          generatedPassword,
          generatedApiKey,
          template_namespace || `namespace_${cleanWabaNumber}`,
          Number(account_type) === 1 ? 'prepaid' : 'postpaid',
          Number(billing_type) === 2 ? 'conversation' : 'transaction',
          plan_name,
          expiryDateStr,
          company_id,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO company_waba_accounts 
         (company_id, waba_id, waba_number, username, password, apikey, template_namespace, account_type, billing_type, plan_name, wallet_balance, expiry_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
        [
          company_id,
          String(waba_id),
          cleanWabaNumber,
          generatedUsername,
          generatedPassword,
          generatedApiKey,
          template_namespace || `namespace_${cleanWabaNumber}`,
          Number(account_type) === 1 ? 'prepaid' : 'postpaid',
          Number(billing_type) === 2 ? 'conversation' : 'transaction',
          plan_name,
          100.0,
          expiryDateStr,
        ]
      );
    }

    // Mark request as approved if provided
    if (request_id) {
      await pool.query('UPDATE waba_service_requests SET status = "approved" WHERE id = ?', [request_id]);
    } else {
      await pool.query('UPDATE waba_service_requests SET status = "approved" WHERE company_id = ? AND status = "pending"', [company_id]);
    }

    res.json({
      success: true,
      message: 'User account created and activated successfully in Reseller CDC Panel',
      data: {
        username: generatedUsername,
        password: generatedPassword,
        apikey: generatedApiKey,
        waba_number: cleanWabaNumber,
        waba_id: String(waba_id),
        expiry_date: expiryDateStr,
        cdcResponse: cdcResponseData,
      },
    });
  } catch (err) {
    console.error('Error creating WABA user account:', err);
    res.status(500).json({ message: 'Failed to create user account', error: err.message });
  }
});

/**
 * 5. Balance Transfer / User Recharge
 * POST /api/admin/waba/recharge
 */
router.post('/recharge', async (req, res) => {
  try {
    const { company_id, waba_number, amount, remark = 'Superadmin Balance Credit' } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ message: 'Valid positive amount is required' });
    }

    let targetWabaNumber = waba_number;
    let targetCompanyId = company_id;

    if (!targetWabaNumber && targetCompanyId) {
      const [acc] = await pool.query('SELECT waba_number FROM company_waba_accounts WHERE company_id = ?', [targetCompanyId]);
      targetWabaNumber = acc[0]?.waba_number;
    } else if (targetWabaNumber && !targetCompanyId) {
      const [acc] = await pool.query('SELECT company_id FROM company_waba_accounts WHERE waba_number = ?', [targetWabaNumber]);
      targetCompanyId = acc[0]?.company_id;
    }

    // Call Pinbot Reseller API if key is present
    let pinbotResult = null;
    if (process.env.PINBOT_RESELLER_API_KEY && targetWabaNumber) {
      pinbotResult = await pinbotReseller.rechargeUser(targetWabaNumber, numAmount);
    }

    // Update local database wallet
    if (targetCompanyId) {
      await pool.query(
        'UPDATE company_waba_accounts SET wallet_balance = wallet_balance + ? WHERE company_id = ?',
        [numAmount, targetCompanyId]
      );
    }

    // Log recharge transaction
    await pool.query(
      `INSERT INTO waba_recharge_history 
       (company_id, amount, payment_method, transaction_id, status)
       VALUES (?, ?, 'reseller_credit', ?, 'success')`,
      [targetCompanyId || 0, numAmount, `ADMIN_CREDIT_${Date.now()}`]
    );

    res.json({
      success: true,
      message: `Balance of ₹${numAmount} successfully credited`,
      pinbotResult: pinbotResult?.data,
    });
  } catch (err) {
    console.error('Error recharging user balance:', err);
    res.status(500).json({ message: 'Failed to credit balance', error: err.message });
  }
});

/**
 * 6. Change User Status (Active / Inactive / Suspended)
 * POST /api/admin/waba/change-status
 */
router.post('/change-status', async (req, res) => {
  try {
    const { company_id, waba_number, status } = req.body; // status: 1 or 'active', 0 or 'suspended'
    const isActive = status === 1 || status === 'active' || status === true;
    const dbStatus = isActive ? 'active' : 'suspended';
    const pinbotStatusCode = isActive ? 1 : 0;

    let targetWabaNumber = waba_number;
    if (!targetWabaNumber && company_id) {
      const [acc] = await pool.query('SELECT waba_number FROM company_waba_accounts WHERE company_id = ?', [company_id]);
      targetWabaNumber = acc[0]?.waba_number;
    }

    if (process.env.PINBOT_RESELLER_API_KEY && targetWabaNumber) {
      await pinbotReseller.changeUserStatus(targetWabaNumber, pinbotStatusCode);
    }

    if (company_id) {
      await pool.query('UPDATE company_waba_accounts SET status = ? WHERE company_id = ?', [dbStatus, company_id]);
    } else if (targetWabaNumber) {
      await pool.query('UPDATE company_waba_accounts SET status = ? WHERE waba_number = ?', [dbStatus, targetWabaNumber]);
    }

    res.json({
      success: true,
      message: `Account status updated to ${dbStatus}`,
      status: dbStatus,
    });
  } catch (err) {
    console.error('Error changing user status:', err);
    res.status(500).json({ message: 'Failed to update user status', error: err.message });
  }
});

/**
 * 7. Update User Expiry Date
 * POST /api/admin/waba/update-expiry
 */
router.post('/update-expiry', async (req, res) => {
  try {
    const { company_id, waba_number, expirydate } = req.body; // format: 'YYYY-MM-DD' or 'DD-MM-YYYY'
    if (!expirydate) {
      return res.status(400).json({ message: 'expirydate is required' });
    }

    let targetWabaNumber = waba_number;
    if (!targetWabaNumber && company_id) {
      const [acc] = await pool.query('SELECT waba_number FROM company_waba_accounts WHERE company_id = ?', [company_id]);
      targetWabaNumber = acc[0]?.waba_number;
    }

    // Convert to DD-MM-YYYY for Pinbot API
    let cdcDateFormat = expirydate;
    let dbDateFormat = expirydate;
    if (expirydate.includes('-')) {
      const parts = expirydate.split('-');
      if (parts[0].length === 4) {
        // YYYY-MM-DD -> DD-MM-YYYY
        cdcDateFormat = `${parts[2]}-${parts[1]}-${parts[0]}`;
        dbDateFormat = expirydate;
      } else {
        // DD-MM-YYYY -> YYYY-MM-DD
        dbDateFormat = `${parts[2]}-${parts[1]}-${parts[0]}`;
        cdcDateFormat = expirydate;
      }
    }

    if (process.env.PINBOT_RESELLER_API_KEY && targetWabaNumber) {
      await pinbotReseller.updateUserExpiry(targetWabaNumber, cdcDateFormat);
    }

    if (company_id) {
      await pool.query('UPDATE company_waba_accounts SET expiry_date = ? WHERE company_id = ?', [dbDateFormat, company_id]);
    } else if (targetWabaNumber) {
      await pool.query('UPDATE company_waba_accounts SET expiry_date = ? WHERE waba_number = ?', [dbDateFormat, targetWabaNumber]);
    }

    res.json({
      success: true,
      message: `Expiry date updated to ${dbDateFormat}`,
      expiry_date: dbDateFormat,
    });
  } catch (err) {
    console.error('Error updating expiry date:', err);
    res.status(500).json({ message: 'Failed to update expiry date', error: err.message });
  }
});

/**
 * 8. Live Check Expiry & Balance from Pinbot
 * GET /api/admin/waba/check-live
 */
router.get('/check-live', async (req, res) => {
  try {
    const { wabanumber } = req.query;
    if (!wabanumber) {
      return res.status(400).json({ message: 'wabanumber query parameter is required' });
    }

    let balanceData = null;
    let expiryData = null;

    if (process.env.PINBOT_RESELLER_API_KEY) {
      const [balRes, expRes] = await Promise.all([
        pinbotReseller.getUserBalance(wabanumber),
        pinbotReseller.getUserExpiringDetail(wabanumber),
      ]);
      balanceData = balRes.data;
      expiryData = expRes.data;
    }

    res.json({
      success: true,
      wabanumber,
      balanceData,
      expiryData,
    });
  } catch (err) {
    console.error('Error checking live details:', err);
    res.status(500).json({ message: 'Failed to check live details', error: err.message });
  }
});

/**
 * 9. All Recharge Logs
 * GET /api/admin/waba/recharges
 */
router.get('/recharges', async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT h.*, c.name AS company_name
      FROM waba_recharge_history h
      LEFT JOIN companies c ON c.id = h.company_id
      ORDER BY h.created_at DESC
      LIMIT 100
    `);
    res.json({ success: true, recharges: rows });
  } catch (err) {
    console.error('Error fetching admin WABA recharges:', err);
    res.status(500).json({ message: 'Failed to fetch recharge logs', error: err.message });
  }
});

/**
 * 10. WhatsApp Template Migration (CDC Panel)
 * POST /api/admin/waba/template-migration
 */
router.post('/template-migration', async (req, res) => {
  try {
    const { waba_id, waba_number } = req.body;
    if (!waba_id || !waba_number) {
      return res.status(400).json({ message: 'waba_id and waba_number are required' });
    }

    if (!process.env.PINBOT_RESELLER_API_KEY) {
      return res.status(400).json({
        message: 'PINBOT_RESELLER_API_KEY is not configured in backend .env',
      });
    }

    const migrationRes = await pinbotReseller.migrateTemplate({
      waba_id,
      waba_number,
    });

    if (!migrationRes.ok) {
      return res.status(migrationRes.status || 500).json({
        message: 'Template migration request failed on Pinbot CDC',
        details: migrationRes.data,
      });
    }

    res.json({
      success: true,
      message: 'Template migration executed successfully',
      data: migrationRes.data,
    });
  } catch (err) {
    console.error('Error during template migration:', err);
    res.status(500).json({ message: 'Failed to process template migration', error: err.message });
  }
});

module.exports = router;
