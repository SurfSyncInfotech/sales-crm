import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, ExternalLink, Sparkles, Send } from 'lucide-react';
import { notificationsApi } from '../api/client';

// Synthesize pleasant two-tone notification chime using Web Audio API
function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.36);
  } catch (e) {
    // Audio autoplay restrictions or context blocked
  }
}

export default function NotificationBell({ portal = 'sales' }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied'
  );

  const dropdownRef = useRef(null);
  const swRegRef = useRef(null);
  const seenIdsRef = useRef(new Set());
  const initialLoadDoneRef = useRef(false);

  // 1. Register Service Worker on mount for background push notifications
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          swRegRef.current = reg;
        })
        .catch((e) => console.warn('[SW] Register error:', e));
    }
  }, []);

  // 2. Dispatch real native desktop Web Push Notification
  async function showDesktopPush(notif) {
    playNotificationChime();

    if (typeof window === 'undefined') return;

    const title = notif.title || 'SurfSync CRM Notification';
    const options = {
      body: notif.message || '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: { link: notif.link || '/sales' },
      tag: `notif_${notif.id || Date.now()}`,
    };

    // Check if permission is granted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        // Direct Native Desktop Notification (immediate, works 100% on Local & Live)
        const n = new Notification(title, options);
        n.onclick = () => {
          window.focus();
          if (notif.link) navigate(notif.link);
          n.close();
        };
        return;
      } catch (err) {
        // If constructor throws (e.g. mobile Chrome requires serviceWorker registration)
        try {
          if (swRegRef.current && swRegRef.current.showNotification) {
            await swRegRef.current.showNotification(title, options);
            return;
          }
        } catch (swErr) {
          console.warn('[WebPush] SW error:', swErr);
        }
      }
    }
  }

  // 3. Request browser notification permission
  async function requestPermission() {
    if ('Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setPermission(res);
        if (res === 'granted') {
          showDesktopPush({
            id: 'welcome',
            title: '🔔 Desktop Push Notifications Enabled!',
            message: 'You will now receive instant desktop popups for new leads and quotations.',
            link: portal === 'company' ? '/company' : '/sales',
          });
        } else if (res === 'denied') {
          alert('Notifications are blocked by your browser!\n\nTo enable:\n1. Click the lock/settings icon next to the URL in your address bar.\n2. Change Notifications from "Block" to "Allow".\n3. Reload the page.');
        }
      } catch (err) {
        console.error('Permission error:', err);
      }
    }
  }

  // 4. Test Web Push button trigger
  async function handleTestPush() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted') {
        const res = await Notification.requestPermission();
        setPermission(res);
        if (res !== 'granted') {
          alert('Please click "Allow" on the browser popup to enable desktop notifications.');
          return;
        }
      }
      showDesktopPush({
        id: Date.now(),
        title: '👤 New Lead: Rajesh Kumar',
        message: 'New lead from Website Ad assigned to you! Phone: 9876543210',
        link: portal === 'company' ? '/company/leads' : '/sales/leads',
      });
    }
  }

  // 5. Fetch notifications & detect new incoming items for desktop push
  async function loadNotifications() {
    try {
      const data = await notificationsApi.list(portal);
      const incoming = data.notifications || [];

      if (initialLoadDoneRef.current) {
        // Subsequent poll: fire native push for newly arrived unread notifications
        for (const item of incoming) {
          if (!seenIdsRef.current.has(item.id) && !item.is_read) {
            seenIdsRef.current.add(item.id);
            showDesktopPush(item);
          }
        }
      } else {
        // Initial page load: seed seen IDs to avoid push spamming on refresh
        incoming.forEach((item) => seenIdsRef.current.add(item.id));
        initialLoadDoneRef.current = true;
      }

      setNotifications(incoming);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      // Quiet fail on network
    }
  }

  useEffect(() => {
    loadNotifications();

    // Auto-request browser permission on first load if default
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((res) => setPermission(res)).catch(() => {});
    }

    // Polling fallback every 10s for real-time responsiveness
    const pollInterval = setInterval(() => {
      loadNotifications();
    }, 10000);

    // Close dropdown on outside click
    function handleOutsideClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [portal]);

  async function handleMarkRead(notif) {
    try {
      await notificationsApi.markAsRead(notif.id, portal);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (notif.link) {
        setIsOpen(false);
        navigate(notif.link);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationsApi.markAllAsRead(portal);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  }

  function formatTime(iso) {
    if (!iso) return '';
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  function getTypeIcon(type) {
    switch (type) {
      case 'lead_assigned': return '👤';
      case 'open_pool': return '⚡';
      case 'quote_requested': return '📝';
      case 'quote_sent': return '🚀';
      case 'deal_won': return '🏆';
      case 'deal_lost': return '⚠️';
      case 'whatsapp_reply': return '💬';
      default: return '🔔';
    }
  }

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: unreadCount > 0 ? '#0f766e' : '#64748b',
          backgroundColor: isOpen ? '#f1f5f9' : 'transparent',
          transition: 'all 0.15s ease',
        }}
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              backgroundColor: '#ef4444',
              color: '#fff',
              fontSize: '0.68rem',
              fontWeight: '800',
              borderRadius: '999px',
              minWidth: '18px',
              height: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 0 0 2px #fff',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Drawer */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '380px',
            maxWidth: '90vw',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            boxShadow: '0 12px 30px -4px rgba(0,0,0,0.18), 0 4px 10px -2px rgba(0,0,0,0.06)',
            border: '1px solid #e2e8f0',
            zIndex: 10000,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '480px',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#fafafa',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '700', fontSize: '0.92rem', color: '#0f172a' }}>Notifications</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '2px 7px',
                    borderRadius: '12px',
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Test Push Button */}
              <button
                type="button"
                onClick={handleTestPush}
                title="Send a sample desktop push popup"
                style={{
                  background: 'none',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '2px 7px',
                  color: '#475569',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#fff',
                }}
              >
                <Send size={11} />
                <span>Test Push</span>
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#0d9488',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Check size={13} />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Browser Permission Prompt Banner */}
          {permission !== 'granted' && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#fef3c7',
                borderBottom: '1px solid #fde68a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.78rem',
                color: '#92400e',
              }}
            >
              <div>
                <strong>Desktop Push is Disabled</strong>
                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#78350f' }}>
                  Enable to get instant Windows/Mac popup banners.
                </p>
              </div>
              <button
                type="button"
                onClick={requestPermission}
                style={{
                  backgroundColor: '#d97706',
                  color: '#fff',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Enable Push
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8' }}>
                <Bell size={28} style={{ opacity: 0.35, marginBottom: '6px' }} />
                <p style={{ margin: 0, fontSize: '0.82rem' }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkRead(notif)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f8fafc',
                    backgroundColor: notif.is_read ? '#ffffff' : '#f0fdfa',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'flex-start',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = notif.is_read ? '#f8fafc' : '#e6fffa';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = notif.is_read ? '#ffffff' : '#f0fdfa';
                  }}
                >
                  <span style={{ fontSize: '1.25rem', lineHeight: 1, marginTop: '2px' }}>
                    {getTypeIcon(notif.type)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>{notif.title}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{formatTime(notif.created_at)}</span>
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                      {notif.message}
                    </p>
                    {notif.link && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          color: '#0d9488',
                          fontSize: '0.72rem',
                          fontWeight: '600',
                          marginTop: '4px',
                        }}
                      >
                        <span>Open details</span>
                        <ExternalLink size={10} />
                      </span>
                    )}
                  </div>
                  {!notif.is_read && (
                    <div
                      style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: '#0d9488',
                        marginTop: '6px',
                      }}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
