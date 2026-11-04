import { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Send,
  X,
  Phone,
  Paperclip,
  Check,
  CheckCheck,
  User,
  Clock,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Image as ImageIcon,
  ArrowLeft,
} from 'lucide-react';
import { companyApi, API_BASE } from '../api/client';
import './WhatsAppChatModal.css';

const KNOWN_TEMPLATES = {
  greetings: 'Hello! 👋 Welcome to SurfSync Infotech Pvt. Ltd.\n\nThank you for contacting us. Please let us know how we can help you, and our team will get back to you shortly.',
  welcome: 'Welcome to SurfSync Infotech! We are thrilled to partner with you to grow your business.',
  services: 'Explore our full suite of professional IT services, custom development, and digital marketing consulting.',
  main_menu: 'Please select an option below to explore our services, products, or career opportunities.',
  follow_up: 'Hello! Following up on our recent conversation. Let us know how we can assist you further!',
  unlock_secret: 'Unlock Secret to High Conversions! Get exclusive strategies for 10x ROI.',
  ai_automation_solutions: 'Accelerate your business with our AI-powered automation workflows and robotic process pipelines.',
  cloud_devops_solutions: 'Streamline your infrastructure with end-to-end Cloud migration, CI/CD pipelines, and DevOps consulting.',
  website_mobile_app_development: 'Build next-gen web applications and iOS/Android mobile apps engineered for high performance.',
  custom_software: 'Need tailored business software? Our team designs and builds customized enterprise platforms.',
  products: 'Discover our wide range of business software products and enterprise solutions.',
  career: 'Explore exciting career opportunities with us at SurfSync Infotech. Send us your resume today!',
  swagat_cube: 'Experience our innovative Swagat Cube solutions tailored for modern business environments.',
  hemo: 'Greetings from SurfSync Infotech. Check out our latest diagnostic and health monitoring suite.',
  testing: 'This is a test notification template. Confirmed operational.',
};

const TEMPLATE_BUTTONS = {
  main_menu: ['Explore Services', 'Explore our Products', 'Explore career with us'],
};

function getTemplateKey(body) {
  if (!body) return null;
  const match = String(body).trim().match(/\[?\s*Template\s*:\s*([a-zA-Z0-9_\-]+)\s*\]?/i);
  return match ? match[1].toLowerCase() : null;
}

function resolveMessageText(body, payload, contactName = '') {
  let text = body;
  let payloadData = null;
  if (payload) {
    try {
      payloadData = typeof payload === 'string' ? JSON.parse(payload) : payload;
    } catch (e) {
      payloadData = null;
    }
  }

  // 1. Template resolution: "Template: greetings" or "[Template: greetings]"
  if (typeof text === 'string') {
    const match = text.trim().match(/\[?\s*Template\s*:\s*([a-zA-Z0-9_\-]+)\s*\]?/i);
    if (match) {
      const key = match[1].toLowerCase();
      let tBody = KNOWN_TEMPLATES[key] || `Hello! Welcome to SurfSync Infotech. How can we assist you today?`;
      if (payloadData?.template?.components?.[0]?.parameters) {
        const params = payloadData.template.components[0].parameters;
        params.forEach((p, idx) => {
          const val = p.text || p.value || '';
          tBody = tBody.replace(new RegExp(`\\{\\{${idx + 1}\\}\\}`, 'g'), val);
        });
      }
      if (contactName) {
        tBody = tBody.replace(/\{\{1\}\}/g, contactName);
      }
      tBody = tBody.replace(/\{\{\d+\}\}/g, '').trim();
      return tBody;
    }
  }

  // 2. Extract from payload if body is empty or generic marker
  if (!text || typeof text !== 'string' || !text.trim() || text.trim() === 'Photo' || text.trim() === '[Photo]' || text.trim() === 'Photo / Attachment') {
    const extracted = payloadData?.text?.body ||
      payloadData?.caption ||
      payloadData?.interactive?.button_reply?.title ||
      payloadData?.interactive?.list_reply?.title ||
      payloadData?.button?.text ||
      payloadData?.reaction?.emoji ||
      (payloadData?.location ? `📍 Location: ${payloadData.location.name || 'Shared Location'}` : '') ||
      (payloadData?.document?.filename ? `📄 ${payloadData.document.filename}` : '') ||
      (payloadData?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body || '') ||
      (payloadData?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.interactive?.button_reply?.title || '') ||
      '';
    if (extracted && extracted.trim()) {
      return extracted.trim();
    }
  }

  if (text && typeof text === 'string' && text.trim()) {
    return text.trim();
  }

  return '';
}

function formatChatDateTime(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

    if (isToday) {
      return `Today, ${timeStr}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${timeStr}`;
    }
    const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return `${dateStr}, ${timeStr}`;
  } catch (e) {
    return '';
  }
}

export default function WhatsAppChatModal({ isOpen, onClose, initialSalespersonId = 'all', initialLeadId = null }) {
  const [salespersons, setSalespersons] = useState([]);
  const [selectedSalesperson, setSelectedSalesperson] = useState(initialSalespersonId);
  const [conversations, setConversations] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(initialLeadId);
  const [activeLead, setActiveLead] = useState(null);
  const [mobileView, setMobileView] = useState(initialLeadId ? 'chat' : 'list');
  const [messages, setMessages] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [search, setSearch] = useState('');
  const [inputText, setInputText] = useState('');
  const [loadingList, setLoadingList] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const [sending, setSending] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');

  const chatEndRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const isAtBottomRef = useRef(true);
  const selectedLeadIdRef = useRef(selectedLeadId);
  const prevLeadIdRef = useRef(selectedLeadId);
  const justSentRef = useRef(false);

  useEffect(() => {
    selectedLeadIdRef.current = selectedLeadId;
  }, [selectedLeadId]);

  useEffect(() => {
    if (initialLeadId) {
      setSelectedLeadId(initialLeadId);
      selectedLeadIdRef.current = initialLeadId;
      isAtBottomRef.current = true;
      setMobileView('chat');
    }
  }, [initialLeadId]);

  // Track if user scrolled up to read chat history
  function handleScroll() {
    const el = chatMessagesRef.current;
    if (!el) return;
    // If within 100px of bottom, consider user is at bottom
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    isAtBottomRef.current = atBottom;
  }

  // Load salespersons
  useEffect(() => {
    if (!isOpen) return;
    companyApi.whatsappSalespersons()
      .then((res) => {
        setSalespersons(res.salespersons || []);
      })
      .catch((err) => console.error('Failed to load salespersons:', err));
  }, [isOpen]);

  // Load conversation list
  async function loadConversations(spId = selectedSalesperson, q = search, silent = false) {
    if (!silent) setLoadingList(true);
    try {
      const res = await companyApi.whatsappConversations(spId, q);
      const list = res.conversations || [];
      setConversations(list);
      // Only select list[0] on initial load if NO lead was selected yet
      if (list.length > 0 && !selectedLeadIdRef.current) {
        setSelectedLeadId(list[0].lead_id);
        selectedLeadIdRef.current = list[0].lead_id;
        isAtBottomRef.current = true;
      } else if (list.length === 0) {
        setSelectedLeadId(null);
        selectedLeadIdRef.current = null;
        setActiveLead(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      if (!silent) setLoadingList(false);
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadConversations(selectedSalesperson, search);
    }
  }, [isOpen, selectedSalesperson]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      loadConversations(selectedSalesperson, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load messages for selected lead
  async function loadMessages(leadId, silent = false) {
    if (!leadId) return;
    if (!silent) setLoadingChat(true);
    try {
      const res = await companyApi.whatsappMessages(leadId);
      setActiveLead(res.lead || null);
      // Keep previous message array reference if nothing changed to prevent unnecessary re-render/scroll
      setMessages((prev) => {
        const next = res.messages || [];
        if (prev.length === next.length) {
          const isSame = prev.every((m, idx) => m.id === next[idx]?.id && m.status === next[idx]?.status);
          if (isSame) return prev;
        }
        return next;
      });
      setReminders(res.reminders || []);
    } catch (err) {
      console.error('Failed to load messages for lead:', err);
    } finally {
      if (!silent) setLoadingChat(false);
    }
  }

  useEffect(() => {
    if (selectedLeadId && isOpen) {
      loadMessages(selectedLeadId);

      // 5-second silent polling while chat is open for live WhatsApp experience
      const interval = setInterval(() => {
        loadMessages(selectedLeadId, true);
        loadConversations(selectedSalesperson, search, true);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [selectedLeadId, isOpen, selectedSalesperson, search]);

  // Smart Auto scroll: NEVER pull user down if they scrolled up to read previous messages
  useEffect(() => {
    const isNewLead = prevLeadIdRef.current !== selectedLeadId;
    if (isNewLead) {
      prevLeadIdRef.current = selectedLeadId;
      isAtBottomRef.current = true;
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'auto' });
      }
      return;
    }

    if (justSentRef.current) {
      justSentRef.current = false;
      isAtBottomRef.current = true;
      if (chatEndRef.current) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    // Only auto-scroll on new message if user is already at the bottom
    if (isAtBottomRef.current && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, selectedLeadId]);

  // Handle send message
  async function handleSend(e) {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedLeadId || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);
    justSentRef.current = true;

    try {
      const res = await companyApi.whatsappSendMessage(selectedLeadId, {
        text: textToSend,
        type: 'text',
      });
      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
        // Update snippet in conversations list
        setConversations((prev) =>
          prev.map((c) =>
            c.lead_id === selectedLeadId
              ? {
                  ...c,
                  last_message: textToSend,
                  last_message_at: new Date().toISOString(),
                  last_msg_direction: 'out',
                }
              : c
          )
        );
      }
    } catch (err) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  }

  // Handle send image
  async function handleSendImage() {
    if (!imageUrl.trim() || !selectedLeadId || sending) return;
    setSending(true);
    justSentRef.current = true;
    try {
      const res = await companyApi.whatsappSendMessage(selectedLeadId, {
        type: 'image',
        link: imageUrl.trim(),
        caption: imageCaption.trim() || 'Attached Image',
      });
      if (res.message) {
        setMessages((prev) => [...prev, res.message]);
        setShowImageModal(false);
        setImageUrl('');
        setImageCaption('');
      }
    } catch (err) {
      alert(err.message || 'Failed to send image');
    } finally {
      setSending(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="wa-modal-overlay">
      <div className="wa-modal-container">
        {/* Top Header Bar */}
        <div className="wa-modal-header">
          <div className="wa-header-brand">
            <div className="wa-header-icon">
              <MessageSquare size={20} color="#fff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <div className="wa-header-title">
                <span>WhatsApp Live Chat</span>
                <span className="wa-header-badge">Meta Webhook</span>
              </div>
              <div className="wa-header-subtitle">
                Live interactions, follow-up cadences, proposals & client responses
              </div>
            </div>
          </div>

          {/* Salesperson Filter & Actions */}
          <div className="wa-header-actions">
            {/* Salesperson Selector */}
            <div className="wa-salesperson-box">
              <User size={14} color="#86efac" />
              <span className="wa-salesperson-label">Salesperson:</span>
              <select
                value={selectedSalesperson}
                onChange={(e) => setSelectedSalesperson(e.target.value)}
                className="wa-salesperson-select"
              >
                <option value="all">All Reps ({conversations.length})</option>
                {salespersons.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => {
                loadConversations(selectedSalesperson, search);
                if (selectedLeadId) loadMessages(selectedLeadId);
              }}
              className="wa-icon-btn"
              title="Refresh messages"
            >
              <RefreshCw size={15} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="wa-icon-btn"
              title="Close modal"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Modal Body - Two Column Responsive Layout */}
        <div className="wa-modal-body">
          {/* Left Column: Conversations List */}
          <div className={`wa-sidebar-col ${mobileView === 'chat' ? 'mobile-hide' : ''}`}>
            {/* Search Bar */}
            <div className="wa-search-bar">
              <div className="wa-search-row">
                <div className="wa-search-input-wrap">
                  <Search
                    size={15}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#94a3b8',
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search chats, leads..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="wa-search-input"
                  />
                </div>
                {/* Mobile-only salesperson filter next to search (never overlaps title!) */}
                <div className="wa-mobile-salesperson-box">
                  <select
                    value={selectedSalesperson}
                    onChange={(e) => setSelectedSalesperson(e.target.value)}
                    className="wa-mobile-select"
                  >
                    <option value="all">All Reps</option>
                    {salespersons.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="wa-conv-list">
              {loadingList ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.86rem' }}>
                  Loading WhatsApp chats...
                </div>
              ) : conversations.length === 0 ? (
                <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                  <MessageSquare size={32} style={{ margin: '0 auto 8px auto', opacity: 0.4 }} />
                  <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#475569' }}>No chats found</div>
                  <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                    {selectedSalesperson !== 'all'
                      ? 'No conversations found for this salesperson.'
                      : 'No WhatsApp messages found.'}
                  </div>
                </div>
              ) : (
                conversations.map((c) => {
                  const isSelected = c.lead_id === selectedLeadId;
                  const isUnread = Number(c.unread_count) > 0 || (c.last_msg_direction === 'in' && selectedLeadId !== c.lead_id);
                  const initial = (c.lead_name || 'L').charAt(0).toUpperCase();

                  return (
                    <div
                      key={c.lead_id}
                      onClick={() => {
                        setSelectedLeadId(c.lead_id);
                        selectedLeadIdRef.current = c.lead_id;
                        isAtBottomRef.current = true;
                        setMobileView('chat');
                      }}
                      style={{
                        padding: '12px 14px',
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: isSelected ? '#f0fdf4' : '#fff',
                        borderLeft: isSelected ? '4px solid #10b981' : '4px solid transparent',
                        cursor: 'pointer',
                        transition: 'background-color 0.1s',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start',
                      }}
                    >
                      {/* Avatar */}
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '800',
                          fontSize: '1rem',
                          flexShrink: 0,
                        }}
                      >
                        {initial}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span
                            style={{
                              fontWeight: '700',
                              fontSize: '0.88rem',
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '160px',
                            }}
                          >
                            {c.lead_name}
                          </span>
                          <span style={{ fontSize: '0.72rem', color: isUnread ? '#25d366' : '#64748b', fontWeight: isUnread ? 700 : 600, flexShrink: 0 }}>
                            {formatChatDateTime(c.last_message_at)}
                          </span>
                        </div>

                        {/* Phone & Salesperson Tag */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.74rem', color: '#64748b', fontFamily: 'monospace' }}>
                            {c.phone || 'No phone'}
                          </span>
                          {c.salesperson_name && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: '700',
                                backgroundColor: '#ecfdf5',
                                color: '#047857',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                border: '1px solid #a7f3d0',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                              }}
                            >
                              <User size={10} />
                              <span>{c.salesperson_name}</span>
                            </span>
                          )}
                        </div>

                        {/* Last Message Snippet + Unread Badge */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                            marginTop: '4px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.76rem',
                              color: isUnread ? '#111b21' : '#64748b',
                              fontWeight: isUnread ? 700 : 400,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            {c.last_msg_direction === 'out' && <CheckCheck size={13} color="#3b82f6" />}
                            {c.last_msg_type === 'image' ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0d9488', fontWeight: '600' }}>
                                <ImageIcon size={13} />
                                <span>Photo</span>
                              </span>
                            ) : (
                              <span>{resolveMessageText(c.last_message) || 'Photo / Attachment'}</span>
                            )}
                          </div>

                          {isUnread && (
                            <span
                              style={{
                                backgroundColor: '#25D366',
                                color: '#FFFFFF',
                                fontSize: '0.68rem',
                                fontWeight: 800,
                                minWidth: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 4px',
                                flexShrink: 0,
                              }}
                            >
                              {c.unread_count || 1}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat Window */}
          <div className={`wa-chat-col ${mobileView === 'list' ? 'mobile-hide' : ''}`}>
            {activeLead ? (
              <>
                {/* Active Lead Header Bar */}
                <div className="wa-chat-header">
                  <div className="wa-chat-header-info">
                    {/* Mobile Back Button to Contacts List */}
                    <button
                      type="button"
                      className="wa-back-btn"
                      onClick={() => setMobileView('list')}
                      title="Back to chats list"
                    >
                      <ArrowLeft size={19} />
                    </button>

                    <div className="wa-chat-avatar">
                      {(activeLead.name || 'L').charAt(0).toUpperCase()}
                    </div>
                    <div className="wa-chat-title-group">
                      <div className="wa-chat-name-row">
                        <span className="wa-chat-name">
                          {activeLead.name}
                        </span>
                        {activeLead.lead_company && (
                          <span style={{ fontSize: '0.74rem', color: '#667781', fontWeight: '500' }}>
                            • {activeLead.lead_company}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            padding: '1px 6px',
                            borderRadius: '999px',
                            textTransform: 'capitalize',
                          }}
                        >
                          {activeLead.status}
                        </span>
                      </div>
                      <div className="wa-chat-sub-row">
                        <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{activeLead.phone}</span>
                        <span>•</span>
                        <span style={{ color: '#047857', fontWeight: '700' }}>
                          {activeLead.salesperson_name ? `Rep: ${activeLead.salesperson_name}` : 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Header Badges & Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {activeLead.phone && (
                      <a
                        href={`https://wa.me/${activeLead.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="wa-open-app-btn"
                        title="Open in WhatsApp"
                      >
                        <ExternalLink size={13} />
                        <span><span className="wa-open-app-text">Open </span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Chat Messages Body */}
                <div
                  ref={chatMessagesRef}
                  onScroll={handleScroll}
                  className="wa-chat-messages"
                >
                  {/* Cadence Reminder Banner */}
                  {reminders.length > 0 && (
                    <div
                      style={{
                        margin: '0 auto 10px auto',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        border: '1px solid #cbd5e1',
                        borderRadius: '20px',
                        padding: '4px 14px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        color: '#475569',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                    >
                      <Sparkles size={12} color="#0d9488" />
                      <span>
                        Cadence Flow: {reminders.filter((r) => r.status === 'sent').length}/{reminders.length} Auto-Reminders Sent
                      </span>
                    </div>
                  )}

                  {loadingChat ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem', fontSize: '0.86rem' }}>
                      Loading chat history...
                    </div>
                  ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem 1rem' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>No messages yet</div>
                      <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                        Type a message below to start the WhatsApp conversation with {activeLead.name}.
                      </div>
                    </div>
                  ) : (() => {
                    let lastDateKey = null;
                    return messages.map((m) => {
                      const isOutbound = m.direction === 'out';
                      let payloadData = null;
                      if (m.payload) {
                        try {
                          payloadData = typeof m.payload === 'string' ? JSON.parse(m.payload) : m.payload;
                        } catch (e) {
                          payloadData = null;
                        }
                      }

                      const isUnsupported = m.msg_type === 'unsupported';
                      const isAudio = m.msg_type === 'audio' || m.msg_type === 'voice' || m.msg_type === 'unsupported' ||
                        Boolean(payloadData?.audio || payloadData?.voice || (payloadData?.link && typeof payloadData.link === 'string' && payloadData.link.match(/\.(ogg|mp3|wav|m4a|aac)/i)));
                      
                      let audioUrl = null;
                      if (payloadData?.link && typeof payloadData.link === 'string' && (payloadData.link.match(/\.(ogg|mp3|wav|m4a|aac)/i) || isAudio)) {
                        audioUrl = payloadData.link;
                      } else if (payloadData?.url && typeof payloadData.url === 'string' && (payloadData.url.match(/\.(ogg|mp3|wav|m4a|aac)/i) || isAudio)) {
                        audioUrl = payloadData.url;
                      } else if (payloadData?.audio?.link) {
                        audioUrl = payloadData.audio.link;
                      } else if (payloadData?.audio?.id || payloadData?.voice?.id) {
                        const mediaId = payloadData.audio?.id || payloadData.voice?.id;
                        audioUrl = `/api/company/whatsapp/media/${mediaId}`;
                      } else if (m.msg_type === 'audio' && m.body?.startsWith('http')) {
                        audioUrl = m.body;
                      }

                      if (audioUrl && !audioUrl.startsWith('http://') && !audioUrl.startsWith('https://')) {
                        const base = (API_BASE || '').replace(/\/api\/?$/, '');
                        audioUrl = `${base}${audioUrl.startsWith('/') ? '' : '/'}${audioUrl}`;
                      }

                      const imageUrl = (!isAudio) ? (payloadData?.link || payloadData?.url || payloadData?.image?.url || payloadData?.image?.link ||
                        (m.msg_type === 'image' && (m.body?.startsWith('http') || m.body?.startsWith('data:')) ? m.body : null)) : null;
                      const resolvedText = resolveMessageText(m.body, m.payload, activeLead?.lead_name || activeLead?.name);
                      const displayText = (resolvedText && resolvedText !== imageUrl && resolvedText !== audioUrl && resolvedText !== '[Photo]' && resolvedText !== 'Photo' && resolvedText !== 'Photo / Attachment' && resolvedText !== 'Message received' && resolvedText !== 'Message sent' && resolvedText !== '📎 Media / Voice Note received' && resolvedText !== '🎙️ Voice Note received' && resolvedText !== '🎙️ Voice note') ? resolvedText : '';
                      const isPhoto = m.msg_type === 'image' || m.body === 'Photo' || m.body === 'Photo / Attachment';
                      const fallbackText = displayText || ((isUnsupported || isAudio) ? '' : (!imageUrl && !isPhoto ? (m.direction === 'in' ? 'Message received' : 'Message sent') : ''));

                      const msgDate = m.created_at ? new Date(m.created_at) : null;
                      const dateKey = msgDate && !isNaN(msgDate.getTime()) ? msgDate.toDateString() : null;
                      let showDateBadge = false;
                      let dateBadgeLabel = '';
                      if (dateKey && dateKey !== lastDateKey) {
                        lastDateKey = dateKey;
                        showDateBadge = true;
                        const now = new Date();
                        if (msgDate.toDateString() === now.toDateString()) {
                          dateBadgeLabel = 'Today';
                        } else {
                          const yesterday = new Date(now);
                          yesterday.setDate(now.getDate() - 1);
                          if (msgDate.toDateString() === yesterday.toDateString()) {
                            dateBadgeLabel = 'Yesterday';
                          } else {
                            dateBadgeLabel = msgDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                          }
                        }
                      }

                      return (
                        <div key={m.id} style={{ display: 'contents' }}>
                          {showDateBadge && (
                            <div style={{ display: 'flex', justifyContent: 'center', width: '100%', margin: '14px 0 10px 0' }}>
                              <div
                                style={{
                                  backgroundColor: '#ffffff',
                                  color: '#54656f',
                                  fontSize: '0.72rem',
                                  fontWeight: '600',
                                  padding: '4px 12px',
                                  borderRadius: '8px',
                                  boxShadow: '0 1px 2px rgba(11,20,26,0.12)',
                                  letterSpacing: '0.3px',
                                }}
                              >
                                {dateBadgeLabel}
                              </div>
                            </div>
                          )}
                          <div
                            className="wa-bubble-wrap"
                            style={{
                              alignItems: isOutbound ? 'flex-end' : 'flex-start',
                            }}
                          >
                            <div
                              className="wa-bubble"
                              style={{
                                backgroundColor: isOutbound ? '#d9fdd3' : '#ffffff',
                                borderRadius: isOutbound ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                              }}
                            >
                              {/* Sender Info for Outbound */}
                              {isOutbound && (
                                <div
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: '800',
                                    color: '#075e54',
                                    marginBottom: '3px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <span>{m.purpose === 'bot' ? 'SurfSync Infotech' : (activeLead.salesperson_name || 'Sales Rep')}</span>
                                  {m.purpose === 'bot' && (
                                    <span
                                      style={{
                                        backgroundColor: '#e0f2fe',
                                        color: '#0369a1',
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        fontSize: '0.62rem',
                                      }}
                                    >
                                      Bot
                                    </span>
                                  )}
                                  {m.purpose === 'reminder' && (
                                    <span
                                      style={{
                                        backgroundColor: '#fed7aa',
                                        color: '#9a3412',
                                        padding: '1px 5px',
                                        borderRadius: '4px',
                                        fontSize: '0.62rem',
                                      }}
                                    >
                                      Auto Cadence
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Image / Media Preview if present */}
                              {imageUrl ? (
                                <div
                                  style={{
                                    marginBottom: (displayText || fallbackText) ? '6px' : '2px',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    backgroundColor: '#00000008',
                                  }}
                                  onClick={() => window.open(imageUrl, '_blank')}
                                  title="Click to view full image in new tab"
                                >
                                  <img
                                    src={imageUrl}
                                    alt="WhatsApp attachment"
                                    style={{
                                      maxWidth: '280px',
                                      maxHeight: '360px',
                                      width: '100%',
                                      height: 'auto',
                                      objectFit: 'contain',
                                      display: 'block',
                                      borderRadius: '6px',
                                    }}
                                  />
                                </div>
                              ) : isPhoto ? (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    backgroundColor: isOutbound ? 'rgba(7, 94, 84, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                                    marginBottom: (displayText || fallbackText) ? '6px' : '2px',
                                    fontSize: '0.82rem',
                                    fontWeight: '600',
                                    color: '#334155'
                                  }}
                                >
                                  <span style={{ fontSize: '1.1rem' }}>📷</span>
                                  <span>Photo Attachment</span>
                                </div>
                              ) : isAudio ? (
                                <div
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    padding: '10px 12px',
                                    borderRadius: '12px',
                                    backgroundColor: isOutbound ? 'rgba(7, 94, 84, 0.08)' : '#f8fafc',
                                    border: '1px solid rgba(0,0,0,0.06)',
                                    minWidth: '240px',
                                    maxWidth: '320px',
                                    marginBottom: (displayText || fallbackText) ? '6px' : '2px',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div
                                      style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: '#075e54',
                                        color: '#ffffff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '0.95rem',
                                        flexShrink: 0,
                                      }}
                                    >
                                      🎙️
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1f2937' }}>
                                        Voice Note
                                      </div>
                                      <div style={{ fontSize: '0.67rem', color: '#64748b' }}>
                                        WhatsApp Audio Message
                                      </div>
                                    </div>
                                  </div>
                                  {audioUrl ? (
                                    <audio
                                      controls
                                      src={audioUrl}
                                      preload="metadata"
                                      style={{ width: '100%', height: '36px', outline: 'none', borderRadius: '6px' }}
                                    >
                                      Your browser does not support the audio element.
                                    </audio>
                                  ) : (
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic', padding: '2px 0' }}>
                                      Audio unavailable (received before Meta token was linked)
                                    </div>
                                  )}
                                </div>
                              ) : isUnsupported ? (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    backgroundColor: isOutbound ? 'rgba(7, 94, 84, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                                    marginBottom: (displayText || fallbackText) ? '6px' : '2px',
                                    fontSize: '0.82rem',
                                    fontWeight: '600',
                                    color: '#334155'
                                  }}
                                >
                                  <span style={{ fontSize: '1.1rem' }}>📎</span>
                                  <div>
                                    <div>Attachment received</div>
                                    <div style={{ fontSize: '0.68rem', fontWeight: '400', color: '#64748b' }}>Non-text media format</div>
                                  </div>
                                </div>
                              ) : null}

                              {/* Message Body */}
                              {(displayText || fallbackText) ? (
                                <div
                                  style={{
                                    fontSize: '0.86rem',
                                    color: '#111b21',
                                    lineHeight: '1.4',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    marginTop: imageUrl || isPhoto ? '4px' : '0',
                                  }}
                                >
                                  {displayText || fallbackText}
                                  {(() => {
                                    const tKey = getTemplateKey(m.body);
                                    if (!tKey || !TEMPLATE_BUTTONS[tKey]) return null;
                                    return (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '6px' }}>
                                        {TEMPLATE_BUTTONS[tKey].map((btn, bIdx) => (
                                          <div
                                            key={bIdx}
                                            style={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              gap: '6px',
                                              padding: '6px 12px',
                                              borderRadius: '6px',
                                              backgroundColor: '#ffffff',
                                              color: '#00a884',
                                              fontSize: '0.82rem',
                                              fontWeight: '600',
                                              boxShadow: '0 1px 1px rgba(0,0,0,0.06)',
                                              border: '1px solid rgba(0,0,0,0.08)',
                                            }}
                                          >
                                            <span style={{ fontSize: '0.85rem' }}>↩</span>
                                            <span>{btn}</span>
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                              ) : null}

                              {/* Timestamp & Status Checkmark */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'flex-end',
                                  gap: '4px',
                                  marginTop: '4px',
                                  fontSize: '0.66rem',
                                  color: '#667781',
                                }}
                              >
                                <span>
                                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                {isOutbound && (
                                  <span>
                                    {m.status === 'read' ? (
                                      <CheckCheck size={14} color="#53bdeb" /> // Blue double checkmark
                                    ) : m.status === 'delivered' ? (
                                      <CheckCheck size={14} color="#8696a0" />
                                    ) : (
                                      <Check size={14} color="#8696a0" />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input Bar */}
                <form
                  onSubmit={handleSend}
                  className="wa-chat-input-bar"
                >
                  {/* Attachment Button */}
                  <button
                    type="button"
                    onClick={() => setShowImageModal(true)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#54656f',
                      cursor: 'pointer',
                      padding: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title="Send Image / Brochure"
                  >
                    <Paperclip size={20} />
                  </button>

                  {/* Input Field */}
                  <input
                    type="text"
                    placeholder={`Type a message to ${activeLead.name}...`}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    className="wa-chat-input"
                  />

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="wa-send-btn"
                    style={{
                      backgroundColor: inputText.trim() ? '#00a884' : '#cbd5e1',
                      cursor: inputText.trim() ? 'pointer' : 'default',
                    }}
                    title="Send Message"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </>
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  padding: '2rem',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: '#dcfce7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <MessageSquare size={32} color="#15803d" />
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>
                  Select a Lead to View WhatsApp Chat
                </div>
                <div style={{ fontSize: '0.84rem', marginTop: '6px', maxWidth: '360px', textAlign: 'center' }}>
                  Choose any lead from the left list or switch the salesperson filter to view specific sales team conversations.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image / Brochure Modal */}
      {showImageModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '480px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} color="#0d9488" />
                <span>Send WhatsApp Image / Brochure</span>
              </div>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Public HTTPS Image URL *
                </label>
                <input
                  type="url"
                  placeholder="https://example.com/catalogue.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '0.84rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                  Caption / Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Product Catalogue & Pricing Overview"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '0.84rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Sample Quick-fill options */}
              <div style={{ backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>
                  Quick Portfolio Samples:
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl('https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&auto=format&fit=crop&q=80');
                      setImageCaption('Product & Pricing Structure Overview');
                    }}
                    style={{
                      fontSize: '0.72rem',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    Pricing Brochure
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl('https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&auto=format&fit=crop&q=80');
                      setImageCaption('Client Success Case Studies 2026');
                    }}
                    style={{
                      fontSize: '0.72rem',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#fef3c7',
                      color: '#92400e',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    Case Studies
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowImageModal(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#fff',
                    color: '#475569',
                    fontSize: '0.82rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendImage}
                  disabled={!imageUrl.trim() || sending}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#075e54',
                    color: '#fff',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: imageUrl.trim() ? 'pointer' : 'default',
                  }}
                >
                  {sending ? 'Sending...' : 'Send Image'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
