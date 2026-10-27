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
} from 'lucide-react';
import { companyApi } from '../api/client';

export default function WhatsAppChatModal({ isOpen, onClose, initialSalespersonId = 'all', initialLeadId = null }) {
  const [salespersons, setSalespersons] = useState([]);
  const [selectedSalesperson, setSelectedSalesperson] = useState(initialSalespersonId);
  const [conversations, setConversations] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(initialLeadId);
  const [activeLead, setActiveLead] = useState(null);
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

  useEffect(() => {
    if (initialLeadId) {
      setSelectedLeadId(initialLeadId);
    }
  }, [initialLeadId]);

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
  async function loadConversations(spId = selectedSalesperson, q = search) {
    setLoadingList(true);
    try {
      const res = await companyApi.whatsappConversations(spId, q);
      const list = res.conversations || [];
      setConversations(list);
      if (list.length > 0 && !selectedLeadId) {
        setSelectedLeadId(list[0].lead_id);
      } else if (list.length === 0) {
        setSelectedLeadId(null);
        setActiveLead(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoadingList(false);
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
  async function loadMessages(leadId) {
    if (!leadId) return;
    setLoadingChat(true);
    try {
      const res = await companyApi.whatsappMessages(leadId);
      setActiveLead(res.lead || null);
      setMessages(res.messages || []);
      setReminders(res.reminders || []);
    } catch (err) {
      console.error('Failed to load messages for lead:', err);
    } finally {
      setLoadingChat(false);
    }
  }

  useEffect(() => {
    if (selectedLeadId) {
      loadMessages(selectedLeadId);
    }
  }, [selectedLeadId]);

  // Auto scroll to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle send message
  async function handleSend(e) {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedLeadId || sending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setSending(true);

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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1240px',
          height: '90vh',
          maxHeight: '860px',
          backgroundColor: '#fff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #cbd5e1',
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            backgroundColor: '#075e54',
            color: '#fff',
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #004d40',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: '#25d366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              }}
            >
              <MessageSquare size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>WhatsApp Live Chat Hub</span>
                <span
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    fontSize: '0.72rem',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontWeight: '600',
                  }}
                >
                  Meta Verified Webhook
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#bbf7d0', marginTop: '2px' }}>
                Live interactions, follow-up cadences, proposals & client responses
              </div>
            </div>
          </div>

          {/* Salesperson Filter & Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Salesperson Selector */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'rgba(255,255,255,0.12)',
                padding: '4px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <User size={15} color="#86efac" />
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#f0fdf4' }}>Salesperson:</span>
              <select
                value={selectedSalesperson}
                onChange={(e) => setSelectedSalesperson(e.target.value)}
                style={{
                  backgroundColor: '#043b35',
                  color: '#fff',
                  border: '1px solid #10b981',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Salespersons ({conversations.length} leads)</option>
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
              style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                border: 'none',
                color: '#fff',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Refresh messages"
            >
              <RefreshCw size={16} />
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                border: 'none',
                color: '#fff',
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Close modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body - Two Column Layout */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Left Column: Conversations List */}
          <div
            style={{
              width: '360px',
              borderRight: '1px solid #e2e8f0',
              backgroundColor: '#fff',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            {/* Search Bar */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
              <div style={{ position: 'relative' }}>
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
                  placeholder="Search chats, leads or numbers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    fontSize: '0.84rem',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    backgroundColor: '#fff',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
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
                  const initial = (c.lead_name || 'L').charAt(0).toUpperCase();

                  return (
                    <div
                      key={c.lead_id}
                      onClick={() => setSelectedLeadId(c.lead_id)}
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
                              maxWidth: '170px',
                            }}
                          >
                            {c.lead_name}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            {c.last_message_at
                              ? new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : ''}
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

                        {/* Last Message Snippet */}
                        <div
                          style={{
                            fontSize: '0.76rem',
                            color: '#64748b',
                            marginTop: '4px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {c.last_msg_direction === 'out' && <CheckCheck size={13} color="#3b82f6" />}
                          <span>{c.last_message || 'Template message sent'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat Window */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#efeae2', // WhatsApp background tone
              backgroundImage: 'radial-gradient(#d5cdc4 0.75px, transparent 0.75px)',
              backgroundSize: '16px 16px',
            }}
          >
            {activeLead ? (
              <>
                {/* Active Lead Header Bar */}
                <div
                  style={{
                    backgroundColor: '#f0f2f5',
                    padding: '10px 18px',
                    borderBottom: '1px solid #d1d7db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '800',
                        fontSize: '1rem',
                      }}
                    >
                      {(activeLead.name || 'L').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.98rem', fontWeight: '800', color: '#111b21' }}>
                          {activeLead.name}
                        </span>
                        {activeLead.lead_company && (
                          <span style={{ fontSize: '0.78rem', color: '#667781', fontWeight: '500' }}>
                            • {activeLead.lead_company}
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            padding: '1px 8px',
                            borderRadius: '999px',
                            textTransform: 'capitalize',
                          }}
                        >
                          {activeLead.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: '#667781', marginTop: '2px' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>{activeLead.phone}</span>
                        <span>•</span>
                        <span style={{ color: '#047857', fontWeight: '700' }}>
                          Managed by: {activeLead.salesperson_name || 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Header Badges & Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {activeLead.phone && (
                      <a
                        href={`https://wa.me/${activeLead.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: '#25d366',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          textDecoration: 'none',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                        }}
                      >
                        <ExternalLink size={13} />
                        <span>Open WhatsApp App</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Chat Messages Body */}
                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '18px 24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
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
                  ) : (
                    messages.map((m) => {
                      const isOutbound = m.direction === 'out';
                      let payloadData = null;
                      if (m.payload) {
                        try {
                          payloadData = typeof m.payload === 'string' ? JSON.parse(m.payload) : m.payload;
                        } catch (e) {
                          payloadData = null;
                        }
                      }

                      return (
                        <div
                          key={m.id}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isOutbound ? 'flex-end' : 'flex-start',
                            marginBottom: '4px',
                          }}
                        >
                          <div
                            style={{
                              maxWidth: '70%',
                              backgroundColor: isOutbound ? '#d9fdd3' : '#ffffff', // WhatsApp bubble tones
                              borderRadius: isOutbound ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                              padding: '8px 12px',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                              position: 'relative',
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
                                <span>{activeLead.salesperson_name || 'Sales Rep'}</span>
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
                            {m.msg_type === 'image' && payloadData?.link && (
                              <div style={{ marginBottom: '8px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                <img
                                  src={payloadData.link}
                                  alt="WhatsApp attachment"
                                  style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', display: 'block' }}
                                />
                              </div>
                            )}

                            {/* Message Body */}
                            <div
                              style={{
                                fontSize: '0.86rem',
                                color: '#111b21',
                                lineHeight: '1.4',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              }}
                            >
                              {m.body}
                            </div>

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
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input Bar */}
                <form
                  onSubmit={handleSend}
                  style={{
                    backgroundColor: '#f0f2f5',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    borderTop: '1px solid #d1d7db',
                  }}
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
                    style={{
                      flex: 1,
                      backgroundColor: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                    }}
                  />

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      backgroundColor: inputText.trim() ? '#00a884' : '#cbd5e1',
                      border: 'none',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: inputText.trim() ? 'pointer' : 'default',
                      transition: 'background-color 0.15s',
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
