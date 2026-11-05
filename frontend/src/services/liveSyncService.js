/**
 * Universal CRM Live Synchronization Engine
 * Connects J.A.R.V.I.S. actions, Admin Portal, and Sales Panel in real-time.
 * Synchronizes across multiple open tabs and windows via BroadcastChannel.
 */

const CHANNEL_NAME = 'crm_live_sync_bus';
let channel = null;

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('[LiveSync] BroadcastChannel unavailable, falling back to window events');
}

/**
 * Broadcast an update event across all components and open tabs
 * @param {Object} eventData - { action, leadId, repId, status, meta }
 */
export function broadcastLiveUpdate(eventData = {}) {
  const payload = {
    ...eventData,
    timestamp: Date.now(),
  };

  // 1. Cross-Tab broadcast
  if (channel) {
    try {
      channel.postMessage(payload);
    } catch (e) {
      console.warn('[LiveSync] Broadcast error:', e);
    }
  }

  // 2. Intra-window custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('crm:live_update', { detail: payload }));
    window.dispatchEvent(new CustomEvent('jarvis:refresh', { detail: payload }));
    window.dispatchEvent(new Event('leads:refresh'));
    window.dispatchEvent(new Event('pipeline:refresh'));
    window.dispatchEvent(new Event('quotations:refresh'));
  }
}

/**
 * Subscribe to live updates with debouncing
 * @param {Function} callback - Callback function receiving the event payload
 * @param {number} debounceMs - Milliseconds to debounce multiple rapid triggers
 * @returns {Function} Unsubscribe cleanup function
 */
export function subscribeLiveSync(callback, debounceMs = 250) {
  if (typeof window === 'undefined') return () => {};

  let timer = null;

  const handleUpdate = (eventPayload) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        callback(eventPayload);
      } catch (err) {
        console.warn('[LiveSync] Subscriber callback error:', err);
      }
    }, debounceMs);
  };

  // Listener for intra-window events
  const onWindowEvent = (e) => {
    handleUpdate(e.detail || {});
  };

  // Listener for other open browser tabs
  const onChannelMessage = (e) => {
    handleUpdate(e.data || {});
  };

  window.addEventListener('crm:live_update', onWindowEvent);
  window.addEventListener('jarvis:refresh', onWindowEvent);

  if (channel) {
    channel.addEventListener('message', onChannelMessage);
  }

  return () => {
    clearTimeout(timer);
    window.removeEventListener('crm:live_update', onWindowEvent);
    window.removeEventListener('jarvis:refresh', onWindowEvent);
    if (channel) {
      channel.removeEventListener('message', onChannelMessage);
    }
  };
}
