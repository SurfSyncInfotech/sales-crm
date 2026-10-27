const express = require('express');
const pool = require('../config/db');
const { authRequired, requireCompanyUser } = require('../middleware/auth');
const { addClient, removeClient } = require('../services/notificationService');

const router = express.Router();

// All routes require authentication
router.use(authRequired, requireCompanyUser);

/**
 * GET /api/notifications/stream
 * Server-Sent Events (SSE) real-time notification stream
 */
router.get('/stream', (req, res) => {
  const user = req.user;
  if (!user || !user.company_id) {
    return res.status(401).end();
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Keys to subscribe this socket to
  const userKey = `user_${user.id}`;
  const roleKey = user.role === 'company_admin'
    ? `company_${user.company_id}_admin`
    : `company_${user.company_id}_sales`;
  const allKey = `company_${user.company_id}_all`;

  addClient(userKey, res);
  addClient(roleKey, res);
  addClient(allKey, res);

  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', time: new Date().toISOString() })}\n\n`);

  // Heartbeat keep-alive every 25 seconds
  const heartbeat = setInterval(() => {
    try {
      res.write(': keep-alive\n\n');
    } catch (e) {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    removeClient(userKey, res);
    removeClient(roleKey, res);
    removeClient(allKey, res);
  });
});

/**
 * GET /api/notifications
 * Fetch recent notifications (latest 30) and unread count
 */
router.get(['/', ''], async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.company_id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const [rows] = await pool.query(
      `SELECT id, company_id, user_id, role, title, message, type, link, is_read, created_at
       FROM notifications
       WHERE company_id = ?
         AND (
           user_id = ?
           OR (user_id IS NULL AND (role = 'all' OR role = ?))
         )
       ORDER BY id DESC
       LIMIT 30`,
      [user.company_id, user.id, user.role]
    );

    const [[unreadRow]] = await pool.query(
      `SELECT COUNT(*) AS unread_count
       FROM notifications
       WHERE company_id = ?
         AND is_read = 0
         AND (
           user_id = ?
           OR (user_id IS NULL AND (role = 'all' OR role = ?))
         )`,
      [user.company_id, user.id, user.role]
    );

    res.json({
      notifications: rows,
      unreadCount: Number(unreadRow?.unread_count || 0),
    });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ message: 'Failed to load notifications' });
  }
});

/**
 * PATCH /api/notifications/:id/read
 * Mark notification as read
 */
router.patch('/:id/read', async (req, res) => {
  try {
    const user = req.user;
    await pool.query(
      `UPDATE notifications SET is_read = 1
       WHERE id = ? AND company_id = ?`,
      [req.params.id, user.company_id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ message: 'Failed to update notification' });
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read for current user
 */
router.post('/read-all', async (req, res) => {
  try {
    const user = req.user;
    await pool.query(
      `UPDATE notifications SET is_read = 1
       WHERE company_id = ?
         AND is_read = 0
         AND (
           user_id = ?
           OR (user_id IS NULL AND (role = 'all' OR role = ?))
         )`,
      [user.company_id, user.id, user.role]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ message: 'Failed to update notifications' });
  }
});

module.exports = router;
