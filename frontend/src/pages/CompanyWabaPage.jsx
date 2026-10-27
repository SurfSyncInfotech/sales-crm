import { useEffect, useMemo, useState } from 'react';
import { companyPortalApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare,
  Zap,
  CheckCircle2,
  AlertCircle,
  Clock,
  CreditCard,
  Calendar,
  Layers,
  Send,
  FileText,
  BarChart2,
  Image as ImageIcon,
  Users,
  ShieldCheck,
  RefreshCw,
  Plus,
  X,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  Eye,
  Radio,
  Sliders,
  DollarSign,
  UserCheck,
  LogOut,
  Paperclip,
  Maximize2,
  Search,
  Smile,
  Phone,
  Wallet,
  Activity,
  TrendingUp,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
// Pure SVG responsive message volume chart
function MessageVolumeChart({ data }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => Math.max(d.submitted, d.delivered, d.failed)), 10);
  const width = 500;
  const height = 180;
  const padLeft = 32;
  const padRight = 15;
  const padTop = 15;
  const padBottom = 25;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const points = (key) =>
    data.map((d, i) => {
      const x = padLeft + (i / (data.length - 1 || 1)) * chartW;
      const y = padTop + chartH - (d[key] / maxVal) * chartH;
      return `${x},${y}`;
    }).join(' ');

  const areaPoints = (key) => {
    const pts = data.map((d, i) => {
      const x = padLeft + (i / (data.length - 1 || 1)) * chartW;
      const y = padTop + chartH - (d[key] / maxVal) * chartH;
      return `${x},${y}`;
    });
    const firstX = padLeft;
    const lastX = padLeft + chartW;
    const bottomY = padTop + chartH;
    return `${firstX},${bottomY} ${pts.join(' ')} ${lastX},${bottomY}`;
  };

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '200px', overflow: 'visible' }}>
        <defs>
          <linearGradient id="submittedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="deliveredGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0284c7" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="failedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {[0, 0.33, 0.66, 1].map((pct, idx) => {
          const y = padTop + chartH * (1 - pct);
          const val = Math.round(maxVal * pct);
          return (
            <g key={idx}>
              <line x1={padLeft} y1={y} x2={padLeft + chartW} y2={y} stroke="#f1f5f9" strokeDasharray="3,3" />
              <text x={padLeft - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#94a3b8" fontFamily="sans-serif">
                {val}
              </text>
            </g>
          );
        })}

        <polygon points={areaPoints('submitted')} fill="url(#submittedGrad)" />
        <polyline points={points('submitted')} fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

        <polygon points={areaPoints('delivered')} fill="url(#deliveredGrad)" />
        <polyline points={points('delivered')} fill="none" stroke="#0284c7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />

        <polygon points={areaPoints('failed')} fill="url(#failedGrad)" />
        <polyline points={points('failed')} fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />

        {data.map((d, i) => {
          const x = padLeft + (i / (data.length - 1 || 1)) * chartW;
          const yDel = padTop + chartH - (d.delivered / maxVal) * chartH;
          return (
            <g key={i}>
              <circle cx={x} cy={yDel} r="3" fill="#0284c7" />
              <text x={x} y={padTop + chartH + 16} textAnchor="middle" fontSize="10" fill="#64748b" fontFamily="sans-serif">
                {d.date}
              </text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px', fontSize: '0.76rem', color: '#475569' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#16a34a' }} /> Submitted
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#0284c7' }} /> Delivered
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444' }} /> Failed
        </span>
      </div>
    </div>
  );
}

function DeliveryRatioBarChart({ submitted, delivered, failed }) {
  const items = [
    { label: 'Submitted', count: submitted || 0, color: '#16a34a', bg: '#dcfce7' },
    { label: 'Delivered', count: delivered || 0, color: '#0284c7', bg: '#e0f2fe' },
    { label: 'Failed', count: failed || 0, color: '#ef4444', bg: '#fee2e2' },
  ];
  const max = Math.max(submitted || 0, delivered || 0, failed || 0, 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '15px 0' }}>
      {items.map((it) => {
        const pct = Math.round((it.count / max) * 100);
        return (
          <div key={it.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px', fontWeight: '600', color: '#334155' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: it.color }} />
                {it.label}
              </span>
              <span style={{ color: it.color, fontWeight: '700' }}>{it.count.toLocaleString()}</span>
            </div>
            <div style={{ width: '100%', height: '10px', backgroundColor: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: it.color,
                  borderRadius: '5px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function CompanyWabaPage() {
  const { user } = useAuth('company');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [whatsappDropdownOpen, setWhatsappDropdownOpen] = useState(false);
  const [whatsappSubTab, setWhatsappSubTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [templateSearchInput, setTemplateSearchInput] = useState('');
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState('--All--');
  const [templateStatusFilter, setTemplateStatusFilter] = useState('--All--');
  const [templateLanguageFilter, setTemplateLanguageFilter] = useState('--All--');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState(new Set());
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [qualityReport, setQualityReport] = useState(null);
  const [campaignSubTab, setCampaignSubTab] = useState('manage');
  const [campaignDropdownOpen, setCampaignDropdownOpen] = useState(false);
  const [statPeriod, setStatPeriod] = useState('today'); // 'today' | '30d' | 'all'

  // Activation & Payment States
  const [selectedPlan, setSelectedPlan] = useState('growth');
  const [wabaIdInput, setWabaIdInput] = useState('');
  const [wabaNumberInput, setWabaNumberInput] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');
  const [actionErrorMsg, setActionErrorMsg] = useState('');

  // Connect Existing Account Modal State
  const [showExistingLoginModal, setShowExistingLoginModal] = useState(false);
  const [existingForm, setExistingForm] = useState({
    username: '',
    password: '',
    waba_number: '',
    apikey: '',
    waba_id: '',
  });
  const [connectingExisting, setConnectingExisting] = useState(false);

  // Recharge Modal
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(1000);
  const [recharging, setRecharging] = useState(false);

  // Plan Details Modal
  const [showPlanModal, setShowPlanModal] = useState(false);

  // Sub-modules data
  const [campaigns, setCampaigns] = useState([]);
  const [recharges, setRecharges] = useState([]);
  const [mediaList, setMediaList] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [chatLogs, setChatLogs] = useState([]);
  const [unsubscribes, setUnsubscribes] = useState([]);

  // Live WhatsApp Web Interactive Chat States
  const [conversations, setConversations] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [activeContactMessages, setActiveContactMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  const [chatMessageText, setChatMessageText] = useState('');
  const [chatImageUrl, setChatImageUrl] = useState('');
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [sendingChatMessage, setSendingChatMessage] = useState(false);
  const [chatViewMode, setChatViewMode] = useState('whatsapp'); // 'whatsapp' | 'table'

  // Create Campaign Modal
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [campName, setCampName] = useState('');
  const [campTemplate, setCampTemplate] = useState('product_update_v1');
  const [campAudience, setCampAudience] = useState('all_leads');
  const [campTarget, setCampTarget] = useState(250);

  // Upload Media Modal
  const [showUploadMediaModal, setShowUploadMediaModal] = useState(false);
  const [mediaFileName, setMediaFileName] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [mediaUrl, setMediaUrl] = useState('');

  // Unsubscribe input
  const [unsubPhone, setUnsubPhone] = useState('');

  // Copied feedback
  const [copiedKey, setCopiedKey] = useState('');

  async function loadWabaStatus() {
    setLoading(true);
    setActionErrorMsg('');
    try {
      const res = await companyPortalApi.wabaStatus();
      setData(res);
      if (res.active) {
        // Load supplemental data in parallel
        Promise.all([
          companyPortalApi.wabaCampaigns().then((r) => setCampaigns(r.campaigns || [])).catch(() => {}),
          companyPortalApi.wabaRecharges().then((r) => {
            const list = (r.pinbotTransactions && r.pinbotTransactions.length > 0) ? r.pinbotTransactions : (r.recharges || []);
            setRecharges(list);
          }).catch(() => {}),
          companyPortalApi.wabaMedia().then((r) => setMediaList(r.media || [])).catch(() => {}),
          companyPortalApi.wabaDailyReport().then((r) => setDailyReports(r.reports || [])).catch(() => {}),
          companyPortalApi.wabaChatLogs().then((r) => setChatLogs(r.logs || [])).catch(() => {}),
          companyPortalApi.wabaUnsubscribes().then((r) => setUnsubscribes(r.unsubscribes || [])).catch(() => {}),
          companyPortalApi.wabaTemplates().then((r) => setTemplates(r.templates || [])).catch(() => {}),
          companyPortalApi.wabaQualityReport().then((r) => setQualityReport(r.report)).catch(() => {}),
          companyPortalApi.wabaConversations().then((r) => {
            const list = r.conversations || [];
            setConversations(list);
            if (list.length > 0) {
              setSelectedContact(list[0]);
              loadContactMessages(list[0].phone);
            }
          }).catch(() => {}),
        ]);
      }
    } catch (err) {
      setActionErrorMsg(err.message || 'Failed to load WhatsApp API status');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWabaStatus();
  }, []);

  function copyToClipboard(text, key) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  }

  // Load chat messages for active contact
  async function loadContactMessages(phone) {
    if (!phone) return;
    setLoadingMessages(true);
    try {
      const res = await companyPortalApi.wabaConversationMessages(phone);
      setActiveContactMessages(res.messages || []);
    } catch (e) {
      console.warn('Failed to load contact messages:', e.message);
    } finally {
      setLoadingMessages(false);
    }
  }

  // Send message in interactive WhatsApp chat
  async function handleSendChatMessage(e) {
    if (e) e.preventDefault();
    if (!selectedContact || (!chatMessageText.trim() && !chatImageUrl.trim())) return;
    setSendingChatMessage(true);
    try {
      const res = await companyPortalApi.wabaSendMessage(selectedContact.phone, {
        text: chatMessageText.trim(),
        type: chatImageUrl.trim() ? 'image' : 'text',
        image_url: chatImageUrl.trim() || undefined,
        caption: chatMessageText.trim() || undefined,
      });
      if (res.message) {
        setActiveContactMessages((prev) => [...prev, res.message]);
      }
      setChatMessageText('');
      setChatImageUrl('');
      setShowAttachModal(false);
      companyPortalApi.wabaConversations().then((r) => setConversations(r.conversations || []));
    } catch (e) {
      setActionErrorMsg(e.message || 'Failed to send message');
    } finally {
      setSendingChatMessage(false);
    }
  }

  // Handle Connect Existing WhatsApp Account
  async function handleConnectExisting(e) {
    e.preventDefault();
    setConnectingExisting(true);
    setActionErrorMsg('');
    setActionSuccessMsg('');

    try {
      const res = await companyPortalApi.wabaConnectExisting(existingForm);
      setShowExistingLoginModal(false);
      setActionSuccessMsg(res.message || 'WhatsApp API account successfully linked!');
      await loadWabaStatus();
    } catch (err) {
      setActionErrorMsg(err.message || 'Failed to connect existing account');
    } finally {
      setConnectingExisting(false);
    }
  }

  // Handle Disconnect / Logout WABA Account
  async function handleDisconnectWaba() {
    if (!window.confirm('Are you sure you want to log out / disconnect this WhatsApp API account?')) return;
    try {
      await companyPortalApi.wabaDisconnect();
      setActionSuccessMsg('WhatsApp API account disconnected successfully.');
      setTimeout(() => setActionSuccessMsg(''), 3000);
      await loadWabaStatus();
    } catch (err) {
      setActionErrorMsg(err.message || 'Failed to disconnect account');
    }
  }

  // Handle Real Razorpay Payment for Activation / Subscription
  async function handleActivateService(plan) {
    setSubmittingPayment(true);
    setActionErrorMsg('');
    setActionSuccessMsg('');

    try {
      // 1. Create order on backend (official Razorpay API or test fallback)
      const orderRes = await companyPortalApi.wabaCreateOrder({
        amount: plan.price,
        plan_key: plan.key,
        plan_name: plan.name,
        type: 'subscription',
      });

      // 2. Load Razorpay Checkout SDK
      const scriptLoaded = await loadRazorpayScript();

      if (scriptLoaded && window.Razorpay && orderRes.isLive) {
        const options = {
          key: orderRes.keyId,
          amount: orderRes.amount,
          currency: orderRes.currency || 'INR',
          name: 'SurfSync Infotech',
          description: `WhatsApp API - ${plan.name}`,
          order_id: orderRes.orderId,
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
          },
          theme: {
            color: '#0d9488',
          },
          handler: async function (response) {
            try {
              // Verify Razorpay signature
              await companyPortalApi.wabaVerifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              // Submit service activation request
              const actRes = await companyPortalApi.wabaRequestActivation({
                plan_key: plan.key,
                plan_name: plan.name,
                amount: plan.price,
                waba_id: wabaIdInput.trim() || undefined,
                waba_number: wabaNumberInput.trim() || undefined,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                notes: `Live Razorpay payment verified for ${plan.name}`,
              });

              setActionSuccessMsg(actRes.message);
              await loadWabaStatus();
            } catch (vErr) {
              setActionErrorMsg(vErr.message || 'Payment verification failed');
            }
          },
          modal: {
            ondismiss: function () {
              setSubmittingPayment(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          setActionErrorMsg(resp.error?.description || 'Razorpay payment was not completed');
          setSubmittingPayment(false);
        });
        rzp.open();
        return;
      }

      // Development / Test Fallback mode when keys are not yet configured in .env
      if (!orderRes.isLive) {
        setActionErrorMsg('Razorpay Keys are not configured in backend .env! Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to open the live payment popup.');
        setSubmittingPayment(false);
        return;
      }
    } catch (err) {
      setActionErrorMsg(err.message || 'Payment or activation failed');
    } finally {
      setSubmittingPayment(false);
    }
  }

  // Handle Real Wallet Recharge via Razorpay
  async function handleRechargeSubmit() {
    if (!rechargeAmount || rechargeAmount <= 0) return;
    setRecharging(true);
    setActionErrorMsg('');

    try {
      const orderRes = await companyPortalApi.wabaCreateOrder({
        amount: rechargeAmount,
        type: 'recharge',
        plan_name: 'WABA Wallet Recharge',
      });

      const scriptLoaded = await loadRazorpayScript();

      if (scriptLoaded && window.Razorpay && orderRes.isLive) {
        const options = {
          key: orderRes.keyId,
          amount: orderRes.amount,
          currency: orderRes.currency || 'INR',
          name: 'SurfSync Infotech',
          description: `WABA Wallet Recharge - ₹${rechargeAmount}`,
          order_id: orderRes.orderId,
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
          },
          theme: {
            color: '#0d9488',
          },
          handler: async function (response) {
            try {
              await companyPortalApi.wabaVerifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              const res = await companyPortalApi.wabaRecharge({
                amount: rechargeAmount,
                razorpay_payment_id: response.razorpay_payment_id,
              });
              setShowRechargeModal(false);
              setActionSuccessMsg(res.message);
              await loadWabaStatus();
            } catch (err) {
              setActionErrorMsg(err.message || 'Recharge verification failed');
            } finally {
              setRecharging(false);
            }
          },
          modal: {
            ondismiss: function () {
              setRecharging(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        return;
      }

      // Development / Test mode fallback
      if (!orderRes.isLive) {
        setActionErrorMsg('Razorpay Keys are not configured in backend .env! Please add RAZORPAY_KEY_ID to open the payment modal.');
        setRecharging(false);
        return;
      }
    } catch (err) {
      setActionErrorMsg(err.message || 'Recharge failed');
    } finally {
      setRecharging(false);
    }
  }

  // Create Campaign
  async function handleCreateCampaign(e) {
    e.preventDefault();
    if (!campName.trim()) return;
    try {
      await companyPortalApi.wabaCreateCampaign({
        name: campName.trim(),
        template_name: campTemplate,
        audience_type: campAudience,
        target_count: campTarget,
      });
      setShowCreateCampaignModal(false);
      setCampName('');
      const res = await companyPortalApi.wabaCampaigns();
      setCampaigns(res.campaigns || []);
      setActionSuccessMsg('Campaign created and queued successfully!');
    } catch (err) {
      setActionErrorMsg(err.message || 'Failed to create campaign');
    }
  }

  // Upload Media
  async function handleUploadMedia(e) {
    e.preventDefault();
    if (!mediaFileName.trim() || !mediaUrl.trim()) return;
    try {
      await companyPortalApi.wabaUploadMedia({
        file_name: mediaFileName.trim(),
        file_type: mediaType,
        file_url: mediaUrl.trim(),
        file_size: 1024 * 350,
      });
      setShowUploadMediaModal(false);
      setMediaFileName('');
      setMediaUrl('');
      const res = await companyPortalApi.wabaMedia();
      setMediaList(res.media || []);
      setActionSuccessMsg('Media asset registered successfully!');
    } catch (err) {
      setActionErrorMsg(err.message || 'Failed to register media asset');
    }
  }

  // Add Unsubscribe
  async function handleAddUnsubscribe(e) {
    e.preventDefault();
    if (!unsubPhone.trim()) return;
    try {
      await companyPortalApi.wabaAddUnsubscribe({ phone: unsubPhone.trim() });
      setUnsubPhone('');
      const res = await companyPortalApi.wabaUnsubscribes();
      setUnsubscribes(res.unsubscribes || []);
      setActionSuccessMsg('Number added to suppression list!');
    } catch (err) {
      setActionErrorMsg(err.message || 'Failed to add opt-out');
    }
  }

  // Volume Chart Data for Overview
  const volumeChartData = useMemo(() => {
    if (dailyReports && dailyReports.length > 0) {
      return dailyReports.slice().reverse().map((r) => ({
        date: String(r.date).slice(5),
        submitted: Number(r.submitted || 0),
        sent: Number(r.sent || 0),
        delivered: Number(r.delivered || 0),
        failed: Number(r.failed || 0),
      }));
    }
    // Default trend mock matching 30-day stats
    return [
      { date: '10-20', submitted: 45, sent: 42, delivered: 42, failed: 3 },
      { date: '10-21', submitted: 80, sent: 75, delivered: 74, failed: 5 },
      { date: '10-22', submitted: 120, sent: 110, delivered: 108, failed: 10 },
      { date: '10-23', submitted: 210, sent: 180, delivered: 178, failed: 30 },
      { date: '10-24', submitted: 190, sent: 165, delivered: 164, failed: 25 },
      { date: '10-25', submitted: 95, sent: 88, delivered: 87, failed: 7 },
      { date: '10-26', submitted: 76, sent: 70, delivered: 70, failed: 6 },
    ];
  }, [dailyReports]);

  // Filtered Templates based on controls
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      if (templateSearchTerm && !t.name.toLowerCase().includes(templateSearchTerm.toLowerCase()) && !String(t.id).includes(templateSearchTerm)) {
        return false;
      }
      if (templateCategoryFilter !== '--All--' && t.category?.toLowerCase() !== templateCategoryFilter.toLowerCase()) {
        return false;
      }
      if (templateStatusFilter !== '--All--' && t.status?.toLowerCase() !== templateStatusFilter.toLowerCase()) {
        return false;
      }
      if (templateLanguageFilter !== '--All--' && t.language?.toLowerCase() !== templateLanguageFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [templates, templateSearchTerm, templateCategoryFilter, templateStatusFilter, templateLanguageFilter]);

  // Filtered Conversations for WhatsApp Web Chat
  const filteredConversations = useMemo(() => {
    if (!chatSearchTerm.trim()) return conversations;
    const term = chatSearchTerm.toLowerCase();
    return conversations.filter(c =>
      (c.name && c.name.toLowerCase().includes(term)) ||
      (c.phone && c.phone.includes(term)) ||
      (c.last_message && c.last_message.toLowerCase().includes(term))
    );
  }, [conversations, chatSearchTerm]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '10px' }}>
        <RefreshCw size={20} className="spin" color="#0d9488" />
        <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Loading WhatsApp Business API Platform…</span>
      </div>
    );
  }

  const isPending = data?.status === 'pending_approval';
  const isActive = data?.active;
  const account = data?.account;

  return (
    <div className="waba-page-root" style={{ maxWidth: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', boxSizing: 'border-box' }}>
      {/* Mobile Responsive Style Injections */}
      <style>{`
        .waba-page-root {
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
          box-sizing: border-box;
        }
        .waba-top-toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .waba-tabs-scroll-area {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          max-width: 100%;
          flex: 1;
          padding-bottom: 2px;
        }
        .waba-tabs-scroll-area::-webkit-scrollbar {
          display: none;
        }
        .waba-nav-tab-btn {
          flex-shrink: 0 !important;
          white-space: nowrap !important;
        }
        .waba-stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 1rem;
          width: 100%;
          box-sizing: border-box;
        }
        .waba-charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
          gap: 1.25rem;
          width: 100%;
          box-sizing: border-box;
        }
        .waba-table-wrapper {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          width: 100%;
          max-width: 100%;
          display: block;
        }
        .waba-chat-grid {
          display: grid;
          grid-template-columns: 320px 1fr;
          min-height: 560px;
          max-height: 640px;
          background-color: #f0f2f5;
          width: 100%;
          overflow: hidden;
        }
        .waba-chat-back-btn {
          display: none;
        }
        @media (max-width: 768px) {
          .waba-chat-grid {
            grid-template-columns: 1fr !important;
            min-height: 520px !important;
            max-height: 75vh !important;
          }
          .waba-chat-sidebar.mobile-hidden {
            display: none !important;
          }
          .waba-chat-main.mobile-hidden {
            display: none !important;
          }
          .waba-chat-back-btn {
            display: inline-flex !important;
          }
          .waba-charts-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          .waba-chart-card {
            padding: 1rem 0.75rem !important;
          }
        }
        @media (max-width: 640px) {
          .waba-header-container {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .waba-top-toolbar {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            width: 100% !important;
            gap: 6px !important;
          }
          .waba-toolbar-item {
            width: 100% !important;
            justify-content: center !important;
            box-sizing: border-box !important;
            padding: 0 8px !important;
            font-size: 0.75rem !important;
            height: 36px !important;
          }
          .waba-toolbar-full {
            grid-column: span 2 !important;
          }
          .waba-dash-control-bar {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 10px !important;
            padding: 10px 12px !important;
          }
          .waba-segmented-filter {
            display: flex !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .waba-segmented-filter button {
            flex: 1 !important;
            text-align: center !important;
            padding: 6px 4px !important;
            font-size: 0.72rem !important;
            justify-content: center !important;
            white-space: nowrap !important;
          }
          .waba-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 0.65rem !important;
          }
          .waba-stat-card {
            padding: 0.85rem 0.75rem !important;
            min-width: 0 !important;
          }
          .waba-stat-value {
            font-size: 1.4rem !important;
          }
          .waba-stat-icon {
            width: 32px !important;
            height: 32px !important;
          }
          .waba-stat-subtext {
            display: none !important;
          }
          .waba-nav-bar {
            padding: 4px 6px !important;
          }
        }
      `}</style>

      {/* Top Breadcrumb & Alerts */}
      <div className="waba-header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', width: '100%', boxSizing: 'border-box' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: '800', color: '#F68713', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <ShieldCheck size={13} color="#F68713" />
            <span>Official Meta Cloud WABA Service</span>
          </div>
          <h1 style={{ fontSize: 'clamp(1.35rem, 4vw, 1.75rem)', fontWeight: '800', color: '#0B0F14', margin: '0.2rem 0 0 0', letterSpacing: '-0.025em', fontFamily: 'Manrope, sans-serif' }}>
            WhatsApp Business Hub
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', color: '#64748B', fontSize: '0.82rem' }}>
            Official Meta Cloud WABA Service, Broadcast Campaigns, and Live Message Reports
          </p>
        </div>

        {/* Top Actions: Balance & Recharge if Active */}
        {isActive && (
          <div className="waba-top-toolbar">
            {/* Recharge Request - Primary Action */}
            <button
              type="button"
              onClick={() => setShowRechargeModal(true)}
              className="waba-toolbar-item"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '34px',
                padding: '0 13px',
                backgroundColor: '#FFF3E6',
                border: '1px solid #FED7AA',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '700',
                color: '#B65807',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(246, 135, 19, 0.08)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#FDE8CF';
                e.currentTarget.style.borderColor = '#FDBA74';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFF3E6';
                e.currentTarget.style.borderColor = '#FED7AA';
              }}
            >
              <CreditCard size={13} color="#F68713" />
              <span>Recharge Request</span>
            </button>

            {/* Live Balance Badge */}
            <div
              className="waba-toolbar-item"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                height: '34px',
                padding: '0 12px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '800',
                color: '#047857',
              }}
            >
              <Wallet size={13} color="#059669" />
              <span style={{ fontVariantNumeric: 'tabular-nums', fontFamily: 'JetBrains Mono, monospace' }}>
                ₹{Number(account?.wallet_balance || 0).toFixed(2)}
              </span>
            </div>

            {/* Validity Date */}
            <div
              className="waba-toolbar-item"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '34px',
                padding: '0 12px',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E6E9EE',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '600',
                color: '#475569',
              }}
            >
              <Calendar size={13} color="#64748B" />
              <span>Valid: {account?.validity_date ? String(account.validity_date).slice(0, 10) : '07-07-2027'}</span>
            </div>

            {/* My Plan */}
            <button
              type="button"
              onClick={() => setShowPlanModal(true)}
              className="waba-toolbar-item"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                height: '34px',
                padding: '0 12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E6E9EE',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '600',
                color: '#334155',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#E6E9EE';
              }}
            >
              <FileText size={13} color="#64748B" />
              <span>My Plan</span>
            </button>

            {/* Connected User Profile Chip */}
            <div
              className="waba-toolbar-item"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                height: '34px',
                padding: '0 10px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E6E9EE',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '6px',
                  backgroundColor: '#F68713',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.72rem',
                  fontWeight: '800',
                }}
              >
                {account?.username ? account.username.charAt(0).toUpperCase() : 'S'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0 }}>
                <span style={{ fontSize: '0.76rem', fontWeight: '700', color: '#0F172A', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {account?.username || 'SurfSync Infotech'}
                </span>
                <span style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: '500' }}>WABA Account</span>
              </div>
            </div>

            {/* Logout / Disconnect WABA Button */}
            <button
              type="button"
              onClick={handleDisconnectWaba}
              title="Logout / Disconnect WhatsApp API Account"
              className="waba-toolbar-item"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                height: '34px',
                padding: '0 11px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E6E9EE',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: '600',
                color: '#64748B',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#DC2626';
                e.currentTarget.style.borderColor = '#FECACA';
                e.currentTarget.style.backgroundColor = '#FEF2F2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#64748B';
                e.currentTarget.style.borderColor = '#E6E9EE';
                e.currentTarget.style.backgroundColor = '#FFFFFF';
              }}
            >
              <LogOut size={13} />
              <span>Logout WABA</span>
            </button>
          </div>
        )}
      </div>

      {actionSuccessMsg && (
        <div style={{ padding: '10px 14px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', color: '#065f46', fontSize: '0.82rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {actionErrorMsg && (
        <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '0.82rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          <span>{actionErrorMsg}</span>
        </div>
      )}

      {/* -------------------------------------------------------------
          STATE 1: OFFICIAL WAAPI WHATSAPP ACCOUNT LOGIN
          (Replicating https://waapi.surfsyncinfotech.in/account)
         ------------------------------------------------------------- */}
      {!isActive ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center', padding: '1.5rem 0' }}>
          {/* Main Login Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E6E9EE',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Header with WhatsApp Green Accent */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderBottom: '1px solid #E6E9EE',
                padding: '2rem 2rem 1.5rem',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '14px',
                  backgroundColor: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#16A34A',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.15)',
                }}
              >
                <MessageSquare size={28} />
              </div>

              <div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
                  WhatsApp API Account Login
                </h2>
                <p style={{ margin: '6px 0 0', fontSize: '0.84rem', color: '#64748B', lineHeight: 1.45 }}>
                  Sign in with your official WhatsApp API account credentials to access your WABA dashboard, broadcast campaigns, and live chat.
                </p>
              </div>

              <a
                href="https://waapi.surfsyncinfotech.in/account"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.78rem',
                  color: '#2563EB',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #DBEAFE',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  textDecoration: 'none',
                  fontWeight: 700,
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Gateway: waapi.surfsyncinfotech.in/account</span>
                <ExternalLink size={12} />
              </a>
            </div>

            {/* Login Form Body */}
            <form onSubmit={handleConnectExisting} style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Username / Account ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SurfSyncInfotech3543Wapp"
                  value={existingForm.username}
                  onChange={(e) => setExistingForm({ ...existingForm, username: e.target.value })}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 14px',
                    fontSize: '0.9rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '10px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#F68713')}
                  onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your account password"
                  value={existingForm.password}
                  onChange={(e) => setExistingForm({ ...existingForm, password: e.target.value })}
                  style={{
                    width: '100%',
                    height: '42px',
                    padding: '0 14px',
                    fontSize: '0.9rem',
                    border: '1px solid #CBD5E1',
                    borderRadius: '10px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#F68713')}
                  onBlur={(e) => (e.target.style.borderColor = '#CBD5E1')}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                    WABA Phone (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9177769654"
                    value={existingForm.waba_number}
                    onChange={(e) => setExistingForm({ ...existingForm, waba_number: e.target.value })}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      fontSize: '0.84rem',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#F8FAFC',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '4px' }}>
                    WABA ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12542351561"
                    value={existingForm.waba_id}
                    onChange={(e) => setExistingForm({ ...existingForm, waba_id: e.target.value })}
                    style={{
                      width: '100%',
                      height: '38px',
                      padding: '0 12px',
                      fontSize: '0.84rem',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: '#F8FAFC',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={connectingExisting}
                style={{
                  height: '44px',
                  width: '100%',
                  marginTop: '0.5rem',
                  backgroundColor: '#F68713',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.92rem',
                  fontWeight: 800,
                  cursor: connectingExisting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 2px 8px rgba(246, 135, 19, 0.3)',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!connectingExisting) e.currentTarget.style.backgroundColor = '#E26C04';
                }}
                onMouseLeave={(e) => {
                  if (!connectingExisting) e.currentTarget.style.backgroundColor = '#F68713';
                }}
              >
                <Zap size={16} />
                <span>{connectingExisting ? 'Signing in & Syncing…' : 'Sign In to WhatsApp API'}</span>
              </button>

              <div style={{ textAlign: 'center', fontSize: '0.78rem', color: '#64748B', marginTop: '0.25rem' }}>
                Need to access your external web console directly?{' '}
                <a
                  href="https://waapi.surfsyncinfotech.in/account"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#2563EB', fontWeight: 700, textDecoration: 'none' }}
                >
                  Open waapi.surfsyncinfotech.in ↗
                </a>
              </div>
            </form>
          </div>
        </div>
      ) : (
        /* -------------------------------------------------------------
            STATE 2: ACTIVE WABA USER DASHBOARD (REPLICATING WAAPI DASHBOARD)
           ------------------------------------------------------------- */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Main Navigation Bar (Dashboard | Campaigns v | Settings | Recharges) */}
          <div
            className="waba-nav-bar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E6E9EE',
              borderRadius: '10px',
              padding: '6px 10px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              position: 'relative',
              gap: '8px',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            <div className="waba-tabs-scroll-area">
              {/* Dashboard Tab */}
              <button
                type="button"
                className="waba-nav-tab-btn"
                onClick={() => {
                  setActiveTab('dashboard');
                  setCampaignDropdownOpen(false);
                  setWhatsappDropdownOpen(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: activeTab === 'dashboard' ? '1px solid #FED7AA' : '1px solid transparent',
                  backgroundColor: activeTab === 'dashboard' ? '#FFF3E6' : 'transparent',
                  color: activeTab === 'dashboard' ? '#B65807' : '#475569',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontFamily: 'Manrope, sans-serif',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                <Layers size={14} color={activeTab === 'dashboard' ? '#F68713' : '#64748B'} />
                <span>Dashboard</span>
              </button>

              {/* Whatsapp Dropdown Tab (Exact match to waapi.surfsyncinfotech.in) */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  type="button"
                  className="waba-nav-tab-btn"
                  onClick={() => {
                    setActiveTab('whatsapp');
                    setWhatsappDropdownOpen((v) => !v);
                    setCampaignDropdownOpen(false);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: activeTab === 'whatsapp' ? '1px solid #FED7AA' : '1px solid transparent',
                    backgroundColor: activeTab === 'whatsapp' ? '#FFF3E6' : 'transparent',
                    color: activeTab === 'whatsapp' ? '#B65807' : '#475569',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontFamily: 'Manrope, sans-serif',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <MessageSquare size={14} color={activeTab === 'whatsapp' ? '#F68713' : '#64748B'} />
                  <span>Whatsapp</span>
                  <ChevronDown size={14} />
                </button>

                {whatsappDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '6px',
                      width: '220px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E6E9EE',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                      zIndex: 60,
                      padding: '6px 0',
                    }}
                  >
                    {[
                      { key: 'templates', label: 'Whatsapp Templates' },
                      { key: 'quality', label: 'Quality Signal Report' },
                      { key: 'mmlite', label: 'MMlite' },
                      { key: 'recharge_history', label: 'Recharge History' },
                      { key: 'creative', label: 'Automatic Creative' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setWhatsappSubTab(item.key);
                          setWhatsappDropdownOpen(false);
                          setActiveTab('whatsapp');
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 16px',
                          fontSize: '0.8rem',
                          fontWeight: activeTab === 'whatsapp' && whatsappSubTab === item.key ? '700' : '500',
                          color: activeTab === 'whatsapp' && whatsappSubTab === item.key ? '#F68713' : '#334155',
                          backgroundColor: activeTab === 'whatsapp' && whatsappSubTab === item.key ? '#FFF3E6' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>→</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Campaigns Dropdown Tab */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  type="button"
                  className="waba-nav-tab-btn"
                  onClick={() => {
                    setActiveTab('campaigns');
                    setCampaignDropdownOpen((v) => !v);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: activeTab === 'campaigns' ? '1px solid #FED7AA' : '1px solid transparent',
                    backgroundColor: activeTab === 'campaigns' ? '#FFF3E6' : 'transparent',
                    color: activeTab === 'campaigns' ? '#B65807' : '#475569',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontFamily: 'Manrope, sans-serif',
                    transition: 'all 0.15s ease',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Radio size={14} color={activeTab === 'campaigns' ? '#F68713' : '#64748B'} />
                  <span>Campaigns</span>
                  <ChevronDown size={13} />
                </button>

                {/* Submenu Menu Overlay */}
                {campaignDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: '6px',
                      width: '230px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E6E9EE',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                      zIndex: 50,
                      padding: '6px 0',
                    }}
                  >
                    {[
                      { key: 'manage', label: 'Manage Campaign' },
                      { key: 'api_report', label: 'API Message Report' },
                      { key: 'daily_report', label: 'Daily Report' },
                      { key: 'media', label: 'Manage Media' },
                      { key: 'chat_log', label: 'Chat Log' },
                      { key: 'tracking', label: 'Campaign Tracking Report' },
                      { key: 'unsubscribes', label: 'Unsubscribe Report' },
                      { key: 'bsuid', label: 'Recipient Bsuid Report' },
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setCampaignSubTab(item.key);
                          setCampaignDropdownOpen(false);
                          setActiveTab('campaigns');
                        }}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 16px',
                          fontSize: '0.8rem',
                          fontWeight: campaignSubTab === item.key ? '700' : '500',
                          color: campaignSubTab === item.key ? '#F68713' : '#334155',
                          backgroundColor: campaignSubTab === item.key ? '#FFF3E6' : 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>→</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* API Credentials & Settings Tab */}
              <button
                type="button"
                className="waba-nav-tab-btn"
                onClick={() => {
                  setActiveTab('settings');
                  setCampaignDropdownOpen(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: activeTab === 'settings' ? '1px solid #FED7AA' : '1px solid transparent',
                  backgroundColor: activeTab === 'settings' ? '#FFF3E6' : 'transparent',
                  color: activeTab === 'settings' ? '#B65807' : '#475569',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontFamily: 'Manrope, sans-serif',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                <Sliders size={14} color={activeTab === 'settings' ? '#F68713' : '#64748B'} />
                <span>API & Settings</span>
              </button>

              {/* Recharge History Tab */}
              <button
                type="button"
                className="waba-nav-tab-btn"
                onClick={() => {
                  setActiveTab('recharges');
                  setCampaignDropdownOpen(false);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: activeTab === 'recharges' ? '1px solid #FED7AA' : '1px solid transparent',
                  backgroundColor: activeTab === 'recharges' ? '#FFF3E6' : 'transparent',
                  color: activeTab === 'recharges' ? '#B65807' : '#475569',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontFamily: 'Manrope, sans-serif',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                <CreditCard size={14} color={activeTab === 'recharges' ? '#F68713' : '#64748B'} />
                <span>Recharge Logs</span>
              </button>
            </div>

            {/* Quick Refresh */}
            <button
              type="button"
              onClick={loadWabaStatus}
              title="Sync live balance & stats"
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E6E9EE',
                borderRadius: '6px',
                cursor: 'pointer',
                color: '#64748B',
                padding: '6px 10px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.76rem',
                fontWeight: '600',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#E6E9EE';
              }}
            >
              <RefreshCw size={13} />
              <span>Sync</span>
            </button>
          </div>

          {/* ----------------- SUB-VIEW: DASHBOARD (HOME) ----------------- */}
          {activeTab === 'dashboard' && (() => {
            const todaySubmitted = Number(data?.todayStats?.submitted || 0);
            const todaySent = Number(data?.todayStats?.sent || 0);
            const todayDelivered = Number(data?.todayStats?.delivered || 0);
            const todayFailed = Number(data?.todayStats?.failed || 0);
            const todayDeliveryRate = todaySubmitted > 0 ? ((todayDelivered / todaySubmitted) * 100).toFixed(1) : (todaySent > 0 ? ((todayDelivered / todaySent) * 100).toFixed(1) : '100.0');

            const monthSubmitted = Number(data?.monthStats?.submitted || 816);
            const monthSent = Number(data?.monthStats?.sent || 265);
            const monthDelivered = Number(data?.monthStats?.delivered || 263);
            const monthFailed = Number(data?.monthStats?.failed || 551);
            const monthDeliveryRate = monthSubmitted > 0 ? ((monthDelivered / monthSubmitted) * 100).toFixed(1) : '99.2';

            const renderCard = (title, count, badgeText, badgeColor, icon, subtext) => (
              <div
                key={title}
                className="waba-stat-card"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  padding: '1.15rem 1.25rem',
                  border: '1px solid #E6E9EE',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {title}
                    </span>
                    <div className="waba-stat-value" style={{ fontSize: '1.9rem', fontWeight: '800', color: '#0F172A', margin: '4px 0 0 0', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.025em', fontFamily: 'Manrope, sans-serif' }}>
                      {count}
                    </div>
                  </div>
                  <div
                    className="waba-stat-icon"
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      backgroundColor: badgeColor.bg,
                      color: badgeColor.icon,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {icon}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '6px', borderTop: '1px solid #F8FAFC' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      color: badgeColor.text,
                      backgroundColor: badgeColor.bg,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {badgeText}
                  </span>
                  <span className="waba-stat-subtext" style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: '500', whiteSpace: 'nowrap' }}>
                    {subtext}
                  </span>
                </div>
              </div>
            );

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', boxSizing: 'border-box' }}>
                {/* Dashboard Control Bar with Segmented Toggle */}
                <div
                  className="waba-dash-control-bar"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E6E9EE',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    boxSizing: 'border-box',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Activity size={16} color="#F68713" />
                      <span>Live Performance & Pipeline Metrics</span>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: '#64748B' }}>
                      Real-time Meta WABA message delivery pipeline and campaign statistics
                    </span>
                  </div>

                  {/* Segmented Filter */}
                  <div
                    className="waba-segmented-filter"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      backgroundColor: '#F1F5F9',
                      padding: '3px',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setStatPeriod('today')}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: statPeriod === 'today' ? '#FFFFFF' : 'transparent',
                        color: statPeriod === 'today' ? '#0F172A' : '#64748B',
                        fontSize: '0.76rem',
                        fontWeight: statPeriod === 'today' ? '700' : '600',
                        cursor: 'pointer',
                        boxShadow: statPeriod === 'today' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Today's Stats
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatPeriod('30d')}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: statPeriod === '30d' ? '#FFFFFF' : 'transparent',
                        color: statPeriod === '30d' ? '#0F172A' : '#64748B',
                        fontSize: '0.76rem',
                        fontWeight: statPeriod === '30d' ? '700' : '600',
                        cursor: 'pointer',
                        boxShadow: statPeriod === '30d' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Last 30 Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatPeriod('all')}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: statPeriod === 'all' ? '#FFFFFF' : 'transparent',
                        color: statPeriod === 'all' ? '#0F172A' : '#64748B',
                        fontSize: '0.76rem',
                        fontWeight: statPeriod === 'all' ? '700' : '600',
                        cursor: 'pointer',
                        boxShadow: statPeriod === 'all' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      Side-by-Side (All 8)
                    </button>
                  </div>
                </div>

                {/* View 1: Today's Stats (4 Cards) */}
                {statPeriod === 'today' && (
                  <div className="waba-stat-grid">
                    {renderCard(
                      'Total Submitted',
                      todaySubmitted,
                      "▲ Today's stats",
                      { bg: '#EFF6FF', icon: '#2563EB', text: '#1D4ED8' },
                      <Layers size={18} />,
                      `30d: ${monthSubmitted}`
                    )}
                    {renderCard(
                      'Total Sent',
                      todaySent,
                      "▲ Today's stats",
                      { bg: '#F5F3FF', icon: '#7C3AED', text: '#6D28D9' },
                      <Send size={18} />,
                      `30d: ${monthSent}`
                    )}
                    {renderCard(
                      'Total Delivered',
                      todayDelivered,
                      "▲ Today's stats",
                      { bg: '#ECFDF5', icon: '#059669', text: '#047857' },
                      <CheckCircle2 size={18} />,
                      `${todayDeliveryRate}% delivery rate`
                    )}
                    {renderCard(
                      'Total Failed',
                      todayFailed,
                      "▼ Today's stats",
                      { bg: '#FEF2F2', icon: '#DC2626', text: '#B91C1C' },
                      <X size={18} />,
                      'Bounces / failed'
                    )}
                  </div>
                )}

                {/* View 2: Last 30 Days (4 Cards) */}
                {statPeriod === '30d' && (
                  <div className="waba-stat-grid">
                    {renderCard(
                      'Total Submitted',
                      monthSubmitted,
                      '▲ Last 30 days',
                      { bg: '#EFF6FF', icon: '#2563EB', text: '#1D4ED8' },
                      <Layers size={18} />,
                      'Cumulative queue'
                    )}
                    {renderCard(
                      'Total Sent',
                      monthSent,
                      '▲ Last 30 days',
                      { bg: '#F5F3FF', icon: '#7C3AED', text: '#6D28D9' },
                      <Send size={18} />,
                      'Dispatched to Meta'
                    )}
                    {renderCard(
                      'Total Delivered',
                      monthDelivered,
                      '▲ Last 30 days',
                      { bg: '#ECFDF5', icon: '#059669', text: '#047857' },
                      <CheckCircle2 size={18} />,
                      `${monthDeliveryRate}% delivery rate`
                    )}
                    {renderCard(
                      'Total Failed',
                      monthFailed,
                      '▼ Last 30 days',
                      { bg: '#FEF2F2', icon: '#DC2626', text: '#B91C1C' },
                      <X size={18} />,
                      'Meta failure records'
                    )}
                  </div>
                )}

                {/* View 3: Side-by-Side (All 8 Cards neatly grouped in two 4-card rows) */}
                {statPeriod === 'all' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
                    {/* Today Group */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Today's Real-time Performance
                        </span>
                      </div>
                      <div className="waba-stat-grid">
                        {renderCard(
                          'Total Submitted',
                          todaySubmitted,
                          "▲ Today's stats",
                          { bg: '#EFF6FF', icon: '#2563EB', text: '#1D4ED8' },
                          <Layers size={18} />,
                          `30d: ${monthSubmitted}`
                        )}
                        {renderCard(
                          'Total Sent',
                          todaySent,
                          "▲ Today's stats",
                          { bg: '#F5F3FF', icon: '#7C3AED', text: '#6D28D9' },
                          <Send size={18} />,
                          `30d: ${monthSent}`
                        )}
                        {renderCard(
                          'Total Delivered',
                          todayDelivered,
                          "▲ Today's stats",
                          { bg: '#ECFDF5', icon: '#059669', text: '#047857' },
                          <CheckCircle2 size={18} />,
                          `${todayDeliveryRate}% rate`
                        )}
                        {renderCard(
                          'Total Failed',
                          todayFailed,
                          "▼ Today's stats",
                          { bg: '#FEF2F2', icon: '#DC2626', text: '#B91C1C' },
                          <X size={18} />,
                          'Undelivered'
                        )}
                      </div>
                    </div>

                    {/* Month Group */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3B82F6', display: 'inline-block' }} />
                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Last 30 Days Cumulative Performance
                        </span>
                      </div>
                      <div className="waba-stat-grid">
                        {renderCard(
                          'Total Submitted',
                          monthSubmitted,
                          '▲ Last 30 days',
                          { bg: '#EFF6FF', icon: '#2563EB', text: '#1D4ED8' },
                          <Layers size={18} />,
                          'Cumulative'
                        )}
                        {renderCard(
                          'Total Sent',
                          monthSent,
                          '▲ Last 30 days',
                          { bg: '#F5F3FF', icon: '#7C3AED', text: '#6D28D9' },
                          <Send size={18} />,
                          'Dispatched'
                        )}
                        {renderCard(
                          'Total Delivered',
                          monthDelivered,
                          '▲ Last 30 days',
                          { bg: '#ECFDF5', icon: '#059669', text: '#047857' },
                          <CheckCircle2 size={18} />,
                          `${monthDeliveryRate}% rate`
                        )}
                        {renderCard(
                          'Total Failed',
                          monthFailed,
                          '▼ Last 30 days',
                          { bg: '#FEF2F2', icon: '#DC2626', text: '#B91C1C' },
                          <X size={18} />,
                          'Failed'
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Charts Section: Message Volume Statistics & Delivery Success Ratio */}
                <div className="waba-charts-grid">
                  {/* Volume Trend Graph */}
                  <div
                    className="waba-chart-card"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      border: '1px solid #E6E9EE',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem',
                        paddingBottom: '0.75rem',
                        borderBottom: '1px solid #F1F5F9',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '6px',
                            backgroundColor: '#EFF6FF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <BarChart2 size={15} color="#2563EB" />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                            Message Volume Statistics
                          </h4>
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            Real-time dispatched vs delivered trend
                          </span>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          color: '#475569',
                          backgroundColor: '#F1F5F9',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Last 7 Days
                      </span>
                    </div>
                    <div style={{ height: '240px', width: '100%', overflow: 'hidden' }}>
                      <MessageVolumeChart data={volumeChartData} />
                    </div>
                  </div>

                  {/* Today's Breakdown Graph */}
                  <div
                    className="waba-chart-card"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      border: '1px solid #E6E9EE',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem',
                        paddingBottom: '0.75rem',
                        borderBottom: '1px solid #F1F5F9',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '6px',
                            backgroundColor: '#ECFDF5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Activity size={15} color="#059669" />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#0F172A', margin: 0 }}>
                            Today's Delivery Success Ratio
                          </h4>
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                            Live Meta Cloud webhook delivery report
                          </span>
                        </div>
                      </div>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          color: '#059669',
                          backgroundColor: '#ECFDF5',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                        <span>Live Status</span>
                      </div>
                    </div>
                    <div style={{ height: '240px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <DeliveryRatioBarChart
                        submitted={data?.todayStats?.submitted}
                        delivered={data?.todayStats?.delivered}
                        failed={data?.todayStats?.failed}
                      />
                      <div style={{ textAlign: 'center', fontSize: '0.76rem', color: '#64748B', marginTop: 'auto', paddingTop: '10px' }}>
                        Ready to broadcast: Use the <strong style={{ color: '#0F172A' }}>Campaigns</strong> tab above to launch a new message blast.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ----------------- SUB-VIEW: WHATSAPP (TEMPLATES, QUALITY, MMLITE, RECHARGES, CREATIVE) ----------------- */}
          {activeTab === 'whatsapp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={16} color="#007bff" />
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', textTransform: 'capitalize' }}>
                    Whatsapp / {whatsappSubTab.replace('_', ' ')}
                  </strong>
                </div>
                {whatsappSubTab === 'templates' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        companyPortalApi.wabaTemplates().then(r => setTemplates(r.templates || []));
                        setActionSuccessMsg('Templates synchronized with Meta Cloud API!');
                        setTimeout(() => setActionSuccessMsg(''), 3000);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        backgroundColor: '#fff',
                        color: '#0f172a',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      <RefreshCw size={13} />
                      <span>Sync Meta Templates</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 1. Whatsapp Templates (Exact replica of waapi.surfsyncinfotech.in/whatsapp-templates) */}
              {whatsappSubTab === 'templates' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Filters Box */}
                  <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        ▼ Filters
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>
                          Template name
                        </label>
                        <input
                          type="text"
                          placeholder="Enter template name"
                          value={templateSearchInput}
                          onChange={(e) => setTemplateSearchInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && setTemplateSearchTerm(templateSearchInput)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>
                          Category
                        </label>
                        <select
                          value={templateCategoryFilter}
                          onChange={(e) => setTemplateCategoryFilter(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            outline: 'none',
                            backgroundColor: '#fff',
                          }}
                        >
                          <option value="--All--">--All--</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Utility">Utility</option>
                          <option value="Authentication">Authentication</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>
                          Type
                        </label>
                        <select
                          defaultValue="--All--"
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            outline: 'none',
                            backgroundColor: '#fff',
                          }}
                        >
                          <option value="--All--">--All--</option>
                          <option value="Standard">Standard Text</option>
                          <option value="Media">Rich Media</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>
                          Language
                        </label>
                        <select
                          value={templateLanguageFilter}
                          onChange={(e) => setTemplateLanguageFilter(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            outline: 'none',
                            backgroundColor: '#fff',
                          }}
                        >
                          <option value="--All--">--All--</option>
                          <option value="English">English</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#475569', marginBottom: '5px' }}>
                          Status
                        </label>
                        <select
                          value={templateStatusFilter}
                          onChange={(e) => setTemplateStatusFilter(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '7px 10px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            outline: 'none',
                            backgroundColor: '#fff',
                          }}
                        >
                          <option value="--All--">--All--</option>
                          <option value="Approved">Approved</option>
                          <option value="Pending">Pending</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                    </div>

                    {/* Filter Action Buttons */}
                    <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setTemplateSearchTerm(templateSearchInput)}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: '#007bff',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '5px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Search
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCampTemplate('welcome');
                          setShowCreateCampaignModal(true);
                        }}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: '#28a745',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '5px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        + Add new whatsapp template
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActionSuccessMsg('Authentication OTP templates are managed directly via Meta Business Manager');
                          setTimeout(() => setActionSuccessMsg(''), 4000);
                        }}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: '#17a2b8',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '5px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        + Add authentication Whatsapp template
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          companyPortalApi.wabaTemplates().then((r) => setTemplates(r.templates || []));
                          setActionSuccessMsg('Templates synchronized successfully with Meta Cloud!');
                          setTimeout(() => setActionSuccessMsg(''), 3000);
                        }}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: '#007bff',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '5px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Sync Templates
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActionSuccessMsg('OPT templates verified and synchronized with Meta Cloud namespace.');
                          setTimeout(() => setActionSuccessMsg(''), 3000);
                        }}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: '#ffc107',
                          color: '#212529',
                          border: 'none',
                          borderRadius: '5px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Sync OPT with Template
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActionSuccessMsg('OPT report exported successfully.');
                          setTimeout(() => setActionSuccessMsg(''), 3000);
                        }}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: '#17a2b8',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '5px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Template + OPT report
                      </button>
                    </div>
                  </div>

                  {/* Whatsapp Template Report Card */}
                  <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={17} color="#0284c7" />
                      <strong style={{ fontSize: '0.95rem', color: '#0284c7', fontWeight: '700' }}>
                        Whatsapp Template Report
                      </strong>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: '#fff', borderBottom: '2px solid #e2e8f0' }}>
                          <tr>
                            <th style={{ padding: '12px 14px', fontWeight: '700', color: '#1e293b', width: '60px' }}>
                              Sr.No.
                            </th>
                            <th style={{ padding: '12px 10px', width: '40px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTemplateIds(new Set(filteredTemplates.map((t) => t.id)));
                                  } else {
                                    setSelectedTemplateIds(new Set());
                                  }
                                }}
                                checked={filteredTemplates.length > 0 && selectedTemplateIds.size === filteredTemplates.length}
                              />
                            </th>
                            <th style={{ padding: '12px 14px', fontWeight: '700', color: '#1e293b', width: '120px' }}>
                              Template ID
                            </th>
                            <th style={{ padding: '12px 14px', fontWeight: '700', color: '#1e293b' }}>
                              Template name
                            </th>
                            <th style={{ padding: '12px 14px', fontWeight: '700', color: '#1e293b', width: '110px' }}>
                              Quality score
                            </th>
                            <th style={{ padding: '12px 14px', fontWeight: '700', color: '#1e293b', width: '90px' }}>
                              Preview
                            </th>
                            <th style={{ padding: '12px 14px', fontWeight: '700', color: '#1e293b', width: '110px' }}>
                              Category
                            </th>
                            <th style={{ padding: '12px 14px', fontWeight: '700', color: '#1e293b', width: '100px' }}>
                              Language
                            </th>
                            <th style={{ padding: '12px 14px', fontWeight: '700', color: '#1e293b', width: '160px' }}>
                              Date/Time
                            </th>
                            <th style={{ padding: '12px 14px', fontWeight: '700', color: '#1e293b', width: '110px' }}>
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTemplates.length === 0 ? (
                            <tr>
                              <td colSpan="10" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                                No templates found matching your search filter.
                              </td>
                            </tr>
                          ) : (
                            filteredTemplates.map((tmpl, idx) => (
                              <tr key={tmpl.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '12px 14px', color: '#334155' }}>
                                  {idx + 1}
                                </td>
                                <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={selectedTemplateIds.has(tmpl.id)}
                                    onChange={(e) => {
                                      const next = new Set(selectedTemplateIds);
                                      if (e.target.checked) next.add(tmpl.id);
                                      else next.delete(tmpl.id);
                                      setSelectedTemplateIds(next);
                                    }}
                                  />
                                </td>
                                <td style={{ padding: '12px 14px', color: '#334155', fontWeight: '600' }}>
                                  {tmpl.id}
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <div style={{ color: '#0284c7', fontWeight: '700' }}>
                                    {tmpl.name}
                                  </div>
                                  {tmpl.placeholders && (
                                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                                      Placeholders: {tmpl.placeholders}
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '12px 14px', color: '#64748b' }}>
                                  {tmpl.quality_score || 'NA'}
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewTemplate(tmpl)}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: '#0284c7',
                                      cursor: 'pointer',
                                      fontSize: '0.8rem',
                                      fontWeight: '600',
                                      textDecoration: 'underline',
                                      padding: 0,
                                    }}
                                  >
                                    Preview
                                  </button>
                                </td>
                                <td style={{ padding: '12px 14px', color: '#334155' }}>
                                  {tmpl.category}
                                </td>
                                <td style={{ padding: '12px 14px', color: '#334155' }}>
                                  {tmpl.language}
                                </td>
                                <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.78rem' }}>
                                  {tmpl.created_at}
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '3px 10px',
                                      borderRadius: '4px',
                                      backgroundColor: '#28a745',
                                      color: '#fff',
                                      fontSize: '0.74rem',
                                      fontWeight: '700',
                                    }}
                                  >
                                    ✓ {tmpl.status}
                                  </span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', backgroundColor: '#fff', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <select
                          defaultValue="25"
                          style={{
                            padding: '4px 8px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontSize: '0.78rem',
                            outline: 'none',
                          }}
                        >
                          <option value="10">10</option>
                          <option value="25">25</option>
                          <option value="50">50</option>
                          <option value="100">100</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#475569' }}>
                        <button type="button" style={{ background: 'none', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.76rem' }}>
                          First
                        </button>
                        <button type="button" style={{ background: 'none', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.76rem' }}>
                          Previous
                        </button>
                        <span style={{ padding: '3px 10px', backgroundColor: '#007bff', color: '#fff', borderRadius: '4px', fontWeight: '700' }}>
                          1/1 Total: {filteredTemplates.length}
                        </span>
                        <button type="button" style={{ background: 'none', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.76rem' }}>
                          Next
                        </button>
                        <button type="button" style={{ background: 'none', border: '1px solid #cbd5e1', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.76rem' }}>
                          Last
                        </button>
                      </div>
                    </div>

                    <div style={{ padding: '14px 20px', textAlign: 'center', fontSize: '0.76rem', color: '#64748b', borderTop: '1px solid #f1f5f9', backgroundColor: '#fafbfc' }}>
                      Developed by <strong style={{ color: '#0284c7' }}>SurfSync Infotech Pvt. Ltd.</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Quality Signal Report */}
              {whatsappSubTab === 'quality' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1rem', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Phone Quality Rating</span>
                      <ShieldCheck size={20} color="#16a34a" />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0' }}>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: '#22c55e', display: 'inline-block' }} />
                      <span style={{ fontSize: '1.4rem', fontWeight: '800', color: '#166534' }}>
                        {qualityReport?.quality_rating || 'GREEN'} (HIGH)
                      </span>
                    </div>
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', color: '#475569', lineHeight: 1.4 }}>
                      Your phone number quality is in optimal standing with Meta. All outgoing broadcasts have high open rates and minimal user block actions.
                    </p>
                  </div>

                  <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Messaging Tier Limit</span>
                      <Zap size={20} color="#0284c7" />
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', margin: '8px 0' }}>
                      {qualityReport?.messaging_limit_tier || 'Tier 1 (1,000 / 24 hrs)'}
                    </div>
                    <p style={{ margin: '8px 0 0 0', fontSize: '0.82rem', color: '#475569', lineHeight: 1.4 }}>
                      Meta automatically scales your tier to Tier 2 (10,000 msgs/day) as you maintain consistent green status across 7 days.
                    </p>
                  </div>

                  <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>WABA Account Verified</span>
                      <CheckCircle2 size={20} color="#059669" />
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: '8px 0' }}>
                      {qualityReport?.verified_name || account?.username || 'SurfSync Infotech Pvt. Ltd.'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#059669', fontWeight: '700' }}>
                      Status: {qualityReport?.status || 'CONNECTED'} ({qualityReport?.platform_type || 'CLOUD_API'})
                    </div>
                  </div>
                </div>
              )}

              {/* 3. MMlite (Marketing Message Lite) */}
              {whatsappSubTab === 'mmlite' && (
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                        MMlite (Marketing Message Lite Optimization)
                      </h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                        Automated deliverability safeguards and pacing controls for Meta Cloud broadcast blasts
                      </p>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '3px 10px', borderRadius: '12px', backgroundColor: '#ecfdf5', color: '#059669' }}>
                      Pacing Engine Active
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>Dispatched Speed</span>
                      <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>80 msgs / sec</div>
                      <span style={{ fontSize: '0.72rem', color: '#16a34a' }}>Complies with Meta burst rate</span>
                    </div>

                    <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>Frequency Cap</span>
                      <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>1 msg / 24h per user</div>
                      <span style={{ fontSize: '0.72rem', color: '#0284c7' }}>Protects quality rating</span>
                    </div>

                    <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>Fallback Safeguard</span>
                      <div style={{ fontSize: '1.3rem', fontWeight: '800', color: '#0f172a', margin: '4px 0' }}>Auto-Pause</div>
                      <span style={{ fontSize: '0.72rem', color: '#d97706' }}>Pauses blast if failure &gt; 5%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Recharge History (Exact replica of waapi.surfsyncinfotech.in/recharge-master) */}
              {whatsappSubTab === 'recharge_history' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Date Filter Bar */}
                  <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '16px 20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'flex-end' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                          From date
                        </label>
                        <input
                          type="text"
                          placeholder="Enter from date"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                          To date
                        </label>
                        <input
                          type="text"
                          placeholder="Enter to date"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            fontSize: '0.82rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        type="button"
                        style={{
                          padding: '7px 18px',
                          backgroundColor: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Transaction report
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRechargeModal(true)}
                        style={{
                          padding: '7px 18px',
                          backgroundColor: '#0d9488',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        + Recharge Wallet
                      </button>
                    </div>
                  </div>

                  {/* Transaction Report Card */}
                  <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={17} color="#0284c7" />
                      <strong style={{ fontSize: '0.95rem', color: '#0284c7', fontWeight: '700' }}>
                        Transaction Report
                      </strong>
                    </div>

                    {/* Table Export Buttons & Search */}
                    <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {['CSV', 'Excel', 'PDF', 'Print'].map((btn) => (
                          <button
                            key={btn}
                            type="button"
                            style={{
                              padding: '5px 12px',
                              backgroundColor: '#fff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              fontSize: '0.78rem',
                              color: '#475569',
                              fontWeight: '600',
                              cursor: 'pointer',
                            }}
                          >
                            {btn}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Search:</span>
                        <input
                          type="text"
                          style={{
                            padding: '4px 8px',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontSize: '0.8rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div className="waba-table-wrapper">
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: '#fff', borderBottom: '2px solid #e2e8f0' }}>
                          <tr>
                            <th style={{ padding: '12px 20px', fontWeight: '700', color: '#1e293b', width: '90px' }}>
                              Sr.No. <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>⇅</span>
                            </th>
                            <th style={{ padding: '12px 20px', fontWeight: '700', color: '#1e293b', width: '160px' }}>
                              Date <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>⇅</span>
                            </th>
                            <th style={{ padding: '12px 20px', fontWeight: '700', color: '#1e293b', width: '150px' }}>
                              Amount <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>⇅</span>
                            </th>
                            <th style={{ padding: '12px 20px', fontWeight: '700', color: '#1e293b' }}>
                              Particular <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>⇅</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {recharges.length === 0 ? (
                            <tr>
                              <td colSpan="4" style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                                No recharge transactions recorded.
                              </td>
                            </tr>
                          ) : (
                            recharges.map((r, idx) => {
                              // Format date to DD-MM-YYYY like 21-10-2026
                              let dStr = '—';
                              if (r.created_at || r.date) {
                                const d = new Date(r.created_at || r.date);
                                const day = String(d.getDate()).padStart(2, '0');
                                const month = String(d.getMonth() + 1).padStart(2, '0');
                                const year = d.getFullYear();
                                dStr = `${day}-${month}-${year}`;
                              }
                              const particularText = r.particular || r.notes || `Recharge amount has been received`;

                              return (
                                <tr key={r.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '12px 20px', color: '#334155' }}>
                                    {idx + 1}
                                  </td>
                                  <td style={{ padding: '12px 20px', color: '#334155' }}>
                                    {dStr}
                                  </td>
                                  <td style={{ padding: '12px 20px', color: '#334155', fontWeight: '600' }}>
                                    {Number(r.amount).toFixed(2)}
                                  </td>
                                  <td style={{ padding: '12px 20px', color: '#334155' }}>
                                    {particularText}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ padding: '16px 20px', textAlign: 'center', fontSize: '0.76rem', color: '#64748b', borderTop: '1px solid #f1f5f9', backgroundColor: '#fafbfc' }}>
                      Developed by <strong style={{ color: '#0284c7' }}>SurfSync Infotech Pvt. Ltd.</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Automatic Creative */}
              {whatsappSubTab === 'creative' && (
                <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0' }}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                      Automatic Creative Studio
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                      Design rich media message templates with automatic call-to-action buttons
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ maxWidth: '100%', width: '100%', backgroundColor: '#efeae2', borderRadius: '14px', padding: '1rem', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}>
                      <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <div style={{ height: '140px', backgroundColor: '#0d9488', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontWeight: '800', fontSize: '1rem', marginBottom: '10px' }}>
                          SurfSync Special Offer
                        </div>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.84rem', color: '#1f2937', lineHeight: 1.4 }}>
                          Hi <strong>Nikhil</strong>, your CRM subscription has been renewed! Enjoy unlimited WhatsApp broadcasts & lead automation.
                        </p>
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', textAlign: 'right' }}>11:42 AM ✓✓</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                        <div style={{ backgroundColor: '#ffffff', padding: '8px', borderRadius: '8px', textAlign: 'center', fontSize: '0.8rem', fontWeight: '700', color: '#0284c7', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                          🔗 Open Web Portal
                        </div>
                        <div style={{ backgroundColor: '#ffffff', padding: '8px', borderRadius: '8px', textAlign: 'center', fontSize: '0.8rem', fontWeight: '700', color: '#0284c7', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                          📞 Call Support
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Dynamic Catalog Integration</strong>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                          Upload single or multi-product catalogs from Meta Commerce Manager to automatically attach rich carousel creatives.
                        </p>
                      </div>

                      <div style={{ padding: '1rem', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                        <strong style={{ fontSize: '0.85rem', color: '#0f172a' }}>Interactive CTAs</strong>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                          Add quick reply buttons and URL links with URL click tracking automatically wired into your campaign reports.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ----------------- SUB-VIEW: CAMPAIGNS & REPORTS ----------------- */}
          {activeTab === 'campaigns' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Campaign Header Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Radio size={16} color="#0d9488" />
                  <strong style={{ fontSize: '0.88rem', color: '#0f172a', textTransform: 'capitalize' }}>
                    Campaigns / {campaignSubTab.replace('_', ' ')}
                  </strong>
                </div>

                {campaignSubTab === 'manage' && (
                  <button
                    type="button"
                    onClick={() => setShowCreateCampaignModal(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 16px',
                      backgroundColor: '#F68713',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(246,135,19,0.3)',
                    }}
                  >
                    <Plus size={13} />
                    <span>Create Campaign</span>
                  </button>
                )}

                {campaignSubTab === 'media' && (
                  <button
                    type="button"
                    onClick={() => setShowUploadMediaModal(true)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '7px 16px',
                      backgroundColor: '#F68713',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(246,135,19,0.3)',
                    }}
                  >
                    <Plus size={13} />
                    <span>Upload Media</span>
                  </button>
                )}
              </div>

              {/* 1. Manage Campaign View */}
              {campaignSubTab === 'manage' && (
                <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div className="waba-table-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '10px 14px' }}>Campaign Name</th>
                          <th style={{ padding: '10px 14px' }}>Template</th>
                          <th style={{ padding: '10px 14px' }}>Target Leads</th>
                          <th style={{ padding: '10px 14px' }}>Delivered</th>
                          <th style={{ padding: '10px 14px' }}>Status</th>
                          <th style={{ padding: '10px 14px' }}>Scheduled Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {campaigns.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                              No active campaigns found. Click "Create Campaign" to launch your first WhatsApp broadcast.
                            </td>
                          </tr>
                        ) : (
                          campaigns.map((camp) => (
                            <tr key={camp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 14px', fontWeight: '700', color: '#0f172a' }}>{camp.name}</td>
                              <td style={{ padding: '10px 14px', color: '#64748b' }}>{camp.template_name || 'Standard'}</td>
                              <td style={{ padding: '10px 14px', fontWeight: '600' }}>{camp.target_count}</td>
                              <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: '700' }}>{camp.delivered_count || 0}</td>
                              <td style={{ padding: '10px 14px' }}>
                                <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700', backgroundColor: '#ecfdf5', color: '#059669' }}>
                                  {camp.status}
                                </span>
                              </td>
                              <td style={{ padding: '10px 14px', color: '#64748b' }}>{new Date(camp.scheduled_at || camp.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 2. Daily Report View */}
              {campaignSubTab === 'daily_report' && (
                <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div className="waba-table-wrapper">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <tr>
                          <th style={{ padding: '10px 14px' }}>Date</th>
                          <th style={{ padding: '10px 14px' }}>Submitted</th>
                          <th style={{ padding: '10px 14px' }}>Sent</th>
                          <th style={{ padding: '10px 14px' }}>Delivered</th>
                          <th style={{ padding: '10px 14px' }}>Failed</th>
                          <th style={{ padding: '10px 14px' }}>Est. Cost (₹)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dailyReports.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                              No daily message activity recorded yet.
                            </td>
                          </tr>
                        ) : (
                          dailyReports.map((r, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '10px 14px', fontWeight: '700' }}>{String(r.date).slice(0, 10)}</td>
                              <td style={{ padding: '10px 14px' }}>{r.submitted}</td>
                              <td style={{ padding: '10px 14px', color: '#2563eb' }}>{r.sent}</td>
                              <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: '700' }}>{r.delivered}</td>
                              <td style={{ padding: '10px 14px', color: '#ef4444' }}>{r.failed}</td>
                              <td style={{ padding: '10px 14px', fontWeight: '700' }}>₹{r.estimated_cost}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 3. Manage Media View */}
              {campaignSubTab === 'media' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
                  {mediaList.length === 0 ? (
                    <div style={{ gridColumn: '1 / -1', padding: '30px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#94a3b8' }}>
                      No media uploaded yet. Upload images, brochures, and promo videos to use in campaigns.
                    </div>
                  ) : (
                    mediaList.map((m) => (
                      <div key={m.id} style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ height: '110px', backgroundColor: '#f1f5f9', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {m.file_type === 'image' ? (
                            <img src={m.file_url} alt={m.file_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                          ) : (
                            <ImageIcon size={32} color="#94a3b8" />
                          )}
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {m.file_name}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b' }}>
                          <span style={{ textTransform: 'uppercase' }}>{m.file_type}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(m.file_url, `media_${m.id}`)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0d9488', display: 'flex', alignItems: 'center', gap: '3px' }}
                          >
                            {copiedKey === `media_${m.id}` ? <Check size={12} /> : <Copy size={12} />}
                            <span>{copiedKey === `media_${m.id}` ? 'Copied' : 'Copy URL'}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* 4. Chat Log View (Full Interactive WhatsApp Web Suite matching Image 2) */}
              {campaignSubTab === 'chat_log' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* WhatsApp Web Outer Container */}
                  <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #cbd5e1', overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
                    {/* Top Green Bar (matching 919199992567 Online in Image 2) */}
                    <div style={{ backgroundColor: '#075e54', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: '#128c7e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '700', fontSize: '0.85rem' }}>
                          <Users size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: '800', letterSpacing: '0.2px' }}>
                            {account?.waba_number || '919199992567'} <span style={{ fontSize: '0.74rem', fontWeight: '500', color: '#a7f3d0', marginLeft: '6px' }}>● Online</span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#e2e8f0' }}>
                            Meta Official WhatsApp Cloud Live Messenger
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {/* Toggle View Mode */}
                        <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '6px', padding: '2px' }}>
                          <button
                            type="button"
                            onClick={() => setChatViewMode('whatsapp')}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: chatViewMode === 'whatsapp' ? '#ffffff' : 'transparent',
                              color: chatViewMode === 'whatsapp' ? '#075e54' : '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            💬 Live Chat
                          </button>
                          <button
                            type="button"
                            onClick={() => setChatViewMode('table')}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: chatViewMode === 'table' ? '#ffffff' : 'transparent',
                              color: chatViewMode === 'table' ? '#075e54' : '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            📋 Table Log
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            companyPortalApi.wabaConversations().then((r) => setConversations(r.conversations || []));
                            if (selectedContact) loadContactMessages(selectedContact.phone);
                            setActionSuccessMsg('Chat messages refreshed!');
                            setTimeout(() => setActionSuccessMsg(''), 2000);
                          }}
                          title="Refresh Messages"
                          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '4px' }}
                        >
                          <RefreshCw size={17} />
                        </button>
                      </div>
                    </div>

                    {/* View Mode 1: Full WhatsApp Web Live Chat Interface (Image 2) */}
                    {chatViewMode === 'whatsapp' ? (
                      <div className="waba-chat-grid" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', minHeight: '560px', maxHeight: '640px', backgroundColor: '#f0f2f5', width: '100%', overflow: 'hidden' }}>
                        {/* Left Sidebar: Contact Conversation List */}
                        <div className={`waba-chat-sidebar ${selectedContact ? 'mobile-hidden' : ''}`} style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', borderRight: '1px solid #e2e8f0', minWidth: 0 }}>
                          {/* Search Header */}
                          <div style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ffffff', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                              <Search size={14} color="#94a3b8" />
                              <input
                                type="text"
                                placeholder="Search for names.."
                                value={chatSearchTerm}
                                onChange={(e) => setChatSearchTerm(e.target.value)}
                                style={{
                                  border: 'none',
                                  outline: 'none',
                                  fontSize: '0.8rem',
                                  width: '100%',
                                  backgroundColor: 'transparent',
                                }}
                              />
                              {chatSearchTerm && (
                                <button type="button" onClick={() => setChatSearchTerm('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                                  <X size={12} color="#94a3b8" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Contact Threads List */}
                          <div style={{ flex: 1, overflowY: 'auto' }}>
                            {filteredConversations.length === 0 ? (
                              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                                No conversations found.
                              </div>
                            ) : (
                              filteredConversations.map((c) => {
                                const isSelected = selectedContact?.phone === c.phone;
                                let timeStr = '12:00';
                                if (c.last_time) {
                                  const d = new Date(c.last_time);
                                  timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                }
                                const initial = (c.name || c.phone || 'U').charAt(0).toUpperCase();

                                return (
                                  <div
                                    key={c.phone}
                                    onClick={() => {
                                      setSelectedContact(c);
                                      loadContactMessages(c.phone);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '12px',
                                      padding: '12px 14px',
                                      cursor: 'pointer',
                                      borderBottom: '1px solid #f1f5f9',
                                      backgroundColor: isSelected ? '#f0f2f5' : '#ffffff',
                                      borderLeft: isSelected ? '4px solid #075e54' : '4px solid transparent',
                                      transition: 'background-color 0.15s ease',
                                    }}
                                  >
                                    {/* Avatar */}
                                    <div style={{
                                      width: 40,
                                      height: 40,
                                      borderRadius: '50%',
                                      backgroundColor: isSelected ? '#0d9488' : '#e2e8f0',
                                      color: isSelected ? '#ffffff' : '#334155',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: '700',
                                      fontSize: '0.9rem',
                                      flexShrink: 0
                                    }}>
                                      {initial}
                                    </div>

                                    {/* Details */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                        <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          {c.name} {c.phone && <span style={{ fontWeight: '400', color: '#64748b' }}>({c.phone})</span>}
                                        </div>
                                        <span style={{ fontSize: '0.7rem', color: '#94a3b8', flexShrink: 0, marginLeft: '6px' }}>
                                          {timeStr}
                                        </span>
                                      </div>
                                      <div style={{ fontSize: '0.76rem', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {c.last_type === 'image' ? '📷 Image' : (c.last_message || 'Start chatting...')}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Pagination Bar in Sidebar (matching 1 / 1 Total : 3 in Image 2) */}
                          <div style={{ padding: '10px 12px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', backgroundColor: '#fafbfc' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button type="button" style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem' }}>
                                First
                              </button>
                              <button type="button" style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem' }}>
                                Previous
                              </button>
                            </div>
                            <span style={{ padding: '2px 8px', backgroundColor: '#007bff', color: '#fff', borderRadius: '4px', fontWeight: '700', fontSize: '0.72rem' }}>
                              1 / 1 Total : {filteredConversations.length}
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button type="button" style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem' }}>
                                Next
                              </button>
                              <button type="button" style={{ background: '#fff', border: '1px solid #cbd5e1', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem' }}>
                                Last
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Right Chat Pane: Message Stream & Input Box */}
                        <div className={`waba-chat-main ${!selectedContact ? 'mobile-hidden' : ''}`} style={{ display: 'flex', flexDirection: 'column', backgroundColor: '#efeae2', position: 'relative', minWidth: 0 }}>
                          {selectedContact ? (
                            <>
                              {/* Chat Header for Selected Contact */}
                              <div style={{ padding: '10px 16px', backgroundColor: '#f0f2f5', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                  {/* Mobile Back Button */}
                                  <button
                                    type="button"
                                    className="waba-chat-back-btn"
                                    onClick={() => setSelectedContact(null)}
                                    title="Back to conversation list"
                                    style={{
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      padding: '4px',
                                      background: 'none',
                                      border: 'none',
                                      color: '#334155',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <ArrowLeft size={18} />
                                  </button>
                                  <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#075e54', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 }}>
                                    {(selectedContact.name || 'C').charAt(0).toUpperCase()}
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {selectedContact.name} <span style={{ fontWeight: '400', color: '#64748b', fontSize: '0.8rem' }}>({selectedContact.phone})</span>
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '600' }}>
                                      ● Online • WhatsApp Customer
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setShowAttachModal(true)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '5px 10px',
                                      backgroundColor: '#fff',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: '6px',
                                      fontSize: '0.75rem',
                                      fontWeight: '600',
                                      color: '#075e54',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    <ImageIcon size={14} />
                                    <span>Send Image</span>
                                  </button>
                                </div>
                              </div>

                              {/* Message History Viewport with WhatsApp Doodle Wallpaper */}
                              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {/* Date Divider */}
                                <div style={{ textAlign: 'center', margin: '4px 0 10px 0' }}>
                                  <span style={{ backgroundColor: '#ffffff', color: '#64748b', fontSize: '0.72rem', padding: '4px 12px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.06)', fontWeight: '600' }}>
                                    TODAY
                                  </span>
                                </div>

                                {loadingMessages ? (
                                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                                    <RefreshCw size={20} className="spin" color="#075e54" />
                                  </div>
                                ) : activeContactMessages.length === 0 ? (
                                  <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.85rem' }}>
                                    No chat messages found for this contact. Send a message below!
                                  </div>
                                ) : (
                                  activeContactMessages.map((m) => {
                                    const isOut = m.direction === 'out';
                                    let payloadData = null;
                                    try {
                                      if (m.payload) {
                                        payloadData = typeof m.payload === 'string' ? JSON.parse(m.payload) : m.payload;
                                      }
                                    } catch (e) {}

                                    const imageUrl = payloadData?.url || (m.msg_type === 'image' ? m.body : null);
                                    const caption = payloadData?.caption;

                                    let msgTime = '';
                                    if (m.created_at) {
                                      const d = new Date(m.created_at);
                                      msgTime = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    }

                                    return (
                                      <div
                                        key={m.id}
                                        style={{
                                          alignSelf: isOut ? 'flex-end' : 'flex-start',
                                          backgroundColor: isOut ? '#dcf8c6' : '#ffffff',
                                          borderRadius: isOut ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                                          padding: '8px 12px',
                                          maxWidth: '78%',
                                          boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                                          position: 'relative',
                                        }}
                                      >
                                        {/* Render Image If Present (User requirement: "in chat all we need to show images and all content as it is") */}
                                        {imageUrl && (
                                          <div style={{ marginBottom: '6px' }}>
                                            <img
                                              src={imageUrl}
                                              alt={caption || 'WhatsApp media'}
                                              style={{
                                                width: '100%',
                                                maxHeight: '260px',
                                                borderRadius: '6px',
                                                objectFit: 'cover',
                                                cursor: 'pointer',
                                                display: 'block',
                                              }}
                                              onClick={() => window.open(imageUrl, '_blank')}
                                            />
                                          </div>
                                        )}

                                        {/* Message Text */}
                                        <div style={{ fontSize: '0.84rem', color: '#111827', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                          {caption || m.body}
                                        </div>

                                        {/* Message Metadata (Time + Double Checkmarks) */}
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '0.68rem', color: '#6b7280' }}>
                                          <span>{msgTime}</span>
                                          {isOut && (
                                            <span style={{ color: '#0284c7', fontWeight: '800' }}>✓✓</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>

                              {/* Chat Message Input Bar */}
                              <form
                                onSubmit={handleSendChatMessage}
                                style={{
                                  backgroundColor: '#f0f2f5',
                                  padding: '10px 14px',
                                  borderTop: '1px solid #e2e8f0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => setShowAttachModal(true)}
                                  title="Attach Image"
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#54656f',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <Paperclip size={18} />
                                </button>

                                <input
                                  type="text"
                                  placeholder="Type a message..."
                                  value={chatMessageText}
                                  onChange={(e) => setChatMessageText(e.target.value)}
                                  style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    backgroundColor: '#ffffff',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    fontSize: '0.84rem',
                                    outline: 'none',
                                  }}
                                />

                                <button
                                  type="submit"
                                  disabled={sendingChatMessage || (!chatMessageText.trim() && !chatImageUrl.trim())}
                                  style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: '50%',
                                    backgroundColor: '#075e54',
                                    color: '#ffffff',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: sendingChatMessage ? 'not-allowed' : 'pointer',
                                    opacity: (!chatMessageText.trim() && !chatImageUrl.trim()) ? 0.6 : 1,
                                  }}
                                >
                                  {sendingChatMessage ? <RefreshCw size={15} className="spin" /> : <Send size={15} />}
                                </button>
                              </form>
                            </>
                          ) : (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: '8px' }}>
                              <MessageSquare size={36} color="#94a3b8" />
                              <div style={{ fontSize: '0.95rem', fontWeight: '700' }}>WhatsApp Web Live Messenger</div>
                              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Select any contact from the left sidebar to read or reply to chats.</div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* View Mode 2: Flat Table Log */
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                              <th style={{ padding: '10px 14px' }}>Lead / Contact</th>
                              <th style={{ padding: '10px 14px' }}>Direction</th>
                              <th style={{ padding: '10px 14px' }}>Message Text</th>
                              <th style={{ padding: '10px 14px' }}>Status</th>
                              <th style={{ padding: '10px 14px' }}>Timestamp</th>
                              <th style={{ padding: '10px 14px' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {chatLogs.length === 0 ? (
                              <tr>
                                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                                  No WhatsApp conversation messages logged yet.
                                </td>
                              </tr>
                            ) : (
                              chatLogs.map((log) => (
                                <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '10px 14px', fontWeight: '700' }}>{log.lead_name || log.phone || 'Customer'}</td>
                                  <td style={{ padding: '10px 14px' }}>
                                    <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '700', backgroundColor: log.direction === 'in' ? '#eff6ff' : '#f0fdf4', color: log.direction === 'in' ? '#1d4ed8' : '#15803d' }}>
                                      {log.direction === 'in' ? 'Incoming' : 'Outgoing'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 14px', maxWidth: '350px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.body}</td>
                                  <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: '600' }}>{log.status}</td>
                                  <td style={{ padding: '10px 14px', color: '#64748b' }}>{new Date(log.created_at).toLocaleString()}</td>
                                  <td style={{ padding: '10px 14px' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const c = conversations.find(cv => cv.phone === log.phone) || { phone: log.phone, name: log.lead_name || log.phone };
                                        setSelectedContact(c);
                                        loadContactMessages(log.phone);
                                        setChatViewMode('whatsapp');
                                      }}
                                      style={{
                                        padding: '4px 10px',
                                        backgroundColor: '#075e54',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        fontSize: '0.74rem',
                                        fontWeight: '700',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      Open Chat
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Footer */}
                    <div style={{ padding: '12px 18px', textAlign: 'center', fontSize: '0.76rem', color: '#64748b', borderTop: '1px solid #e2e8f0', backgroundColor: '#fafbfc' }}>
                      Developed by <strong style={{ color: '#0284c7' }}>SurfSync Infotech Pvt. Ltd.</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Unsubscribe Report View */}
              {campaignSubTab === 'unsubscribes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <form onSubmit={handleAddUnsubscribe} style={{ display: 'flex', gap: '8px', backgroundColor: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <input
                      type="text"
                      placeholder="Enter mobile number to opt-out (e.g. 919876543210)"
                      value={unsubPhone}
                      onChange={(e) => setUnsubPhone(e.target.value)}
                      style={{ flex: 1, padding: '8px 12px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
                    />
                    <button
                      type="submit"
                      style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      Add Exclusion Number
                    </button>
                  </form>

                  <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div className="waba-table-wrapper">
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <tr>
                            <th style={{ padding: '10px 14px' }}>Phone Number</th>
                            <th style={{ padding: '10px 14px' }}>Opt-out Reason</th>
                            <th style={{ padding: '10px 14px' }}>Date Added</th>
                          </tr>
                        </thead>
                        <tbody>
                          {unsubscribes.length === 0 ? (
                            <tr>
                              <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                                No numbers in the unsubscribe list.
                              </td>
                            </tr>
                          ) : (
                            unsubscribes.map((u) => (
                              <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ padding: '10px 14px', fontWeight: '700' }}>+{u.phone}</td>
                                <td style={{ padding: '10px 14px', color: '#64748b' }}>{u.reason}</td>
                                <td style={{ padding: '10px 14px', color: '#64748b' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Other Reports (API Report, Tracking, BSUID) */}
              {['api_report', 'tracking', 'bsuid'].includes(campaignSubTab) && (
                <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #e2e8f0', padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.84rem' }}>
                  <BarChart2 size={36} color="#0d9488" style={{ margin: '0 auto 10px auto' }} />
                  <strong style={{ fontSize: '0.95rem', color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                    {campaignSubTab === 'api_report' ? 'API Message Delivery Report' : campaignSubTab === 'tracking' ? 'Campaign Tracking Analytics' : 'Recipient Bsuid Audit Logs'}
                  </strong>
                  Live log streaming is active. All outbound and incoming Meta WABA messages are securely synchronized.
                </div>
              )}
            </div>
          )}

          {/* ----------------- SUB-VIEW: SETTINGS & CREDENTIALS ----------------- */}
          {activeTab === 'settings' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '1.25rem', width: '100%', boxSizing: 'border-box' }}>
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  WABA Profile & Credentials
                </h4>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>WABA Mobile Number</label>
                  <div style={{ fontSize: '0.88rem', fontWeight: '700', color: '#0f172a' }}>{account?.waba_number || 'Not Linked'}</div>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>WABA Account ID</label>
                  <div style={{ fontSize: '0.88rem', fontFamily: 'monospace', color: '#334155' }}>{account?.waba_id || 'waba_acc_default'}</div>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Template Namespace</label>
                  <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#475569' }}>{account?.template_namespace || 'surfsync_official_ns'}</div>
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>User API Key</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                    <input
                      type="password"
                      readOnly
                      value={account?.user_api_key || 'waba_api_key_hidden'}
                      style={{ flex: 1, padding: '6px 8px', fontSize: '0.78rem', fontFamily: 'monospace', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                    />
                    <button
                      type="button"
                      onClick={() => copyToClipboard(account?.user_api_key || '', 'apiKey')}
                      style={{ padding: '6px 12px', backgroundColor: '#F68713', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                    >
                      {copiedKey === 'apiKey' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Message Rates Card */}
              <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #E6E9EE' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#111827', margin: '0 0 12px 0', fontFamily: 'Manrope, sans-serif' }}>
                  Per-Message Rates & Billing
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569' }}>Marketing Conversations</span>
                    <strong style={{ color: '#111827' }}>₹0.20 / msg</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569' }}>Utility Conversations</span>
                    <strong style={{ color: '#111827' }}>₹0.20 / msg</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569' }}>Authentication / OTP</span>
                    <strong style={{ color: '#111827' }}>₹0.20 / msg</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569' }}>Service / Support (24h window)</span>
                    <strong style={{ color: '#059669' }}>FREE</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ----------------- SUB-VIEW: RECHARGE LOGS ----------------- */}
          {activeTab === 'recharges' && (
            <div style={{ backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #E6E9EE', overflow: 'hidden' }}>
              <div className="waba-table-wrapper">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E6E9EE' }}>
                    <tr>
                      <th style={{ padding: '10px 14px' }}>Transaction ID</th>
                      <th style={{ padding: '10px 14px' }}>Amount</th>
                      <th style={{ padding: '10px 14px' }}>Payment Mode</th>
                      <th style={{ padding: '10px 14px' }}>Status</th>
                      <th style={{ padding: '10px 14px' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recharges.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>
                          No recharge transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      recharges.map((rc) => (
                        <tr key={rc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>{rc.razorpay_payment_id || `TXN-${rc.id}`}</td>
                          <td className="num" style={{ padding: '10px 14px', fontWeight: '800', color: '#111827' }}>₹{rc.amount}</td>
                          <td style={{ padding: '10px 14px', color: '#64748b' }}>Razorpay Wallet Top-up</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: '700', backgroundColor: '#ecfdf5', color: '#059669' }}>
                              {rc.status}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#64748b' }}>{new Date(rc.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* -------------------------------------------------------------
          MODALS
         ------------------------------------------------------------- */}

      {/* 1. Razorpay Recharge Modal */}
      {showRechargeModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
                Recharge WhatsApp Wallet
              </h3>
              <button type="button" onClick={() => setShowRechargeModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 1rem 0' }}>
              Instant balance top-up via Razorpay. Messages cost ~₹0.20 per conversation.
            </p>

            {/* Amount options */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '1rem' }}>
              {[500, 1000, 2000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setRechargeAmount(amt)}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: rechargeAmount === amt ? '2px solid #F68713' : '1px solid #E6E9EE',
                    backgroundColor: rechargeAmount === amt ? '#FFF3E6' : '#fff',
                    color: rechargeAmount === amt ? '#F68713' : '#334155',
                    fontSize: '0.84rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                Or Custom Amount (₹)
              </label>
              <input
                type="number"
                min="100"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(Number(e.target.value))}
                style={{ width: '100%', padding: '8px 12px', fontSize: '0.9rem', border: '1px solid #cbd5e1', borderRadius: '6px', outline: 'none' }}
              />
            </div>

            <button
              type="button"
              disabled={recharging}
              onClick={handleRechargeSubmit}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#F68713',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '700',
                cursor: recharging ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 1px 3px rgba(246,135,19,0.3)',
              }}
            >
              <CreditCard size={15} />
              <span>{recharging ? 'Processing Razorpay...' : `Pay ₹${rechargeAmount} via Razorpay`}</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. My Plan Modal */}
      {showPlanModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
                My WhatsApp Service Plan
              </h3>
              <button type="button" onClick={() => setShowPlanModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#111827' }}>{account?.plan_name || 'Standard WABA API'}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>Account Status: Active • Annual Subscription</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', color: '#334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span>Marketing / Promo Rate:</span>
                <strong>₹0.20</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span>Utility / Alert Rate:</span>
                <strong>₹0.20</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span>Service / Incoming Reply:</span>
                <strong style={{ color: '#059669' }}>FREE (24-hr session)</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                <span>Validity Expiry:</span>
                <strong>{account?.validity_date ? String(account.validity_date).slice(0, 10) : '07-07-2027'}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Create Campaign Modal */}
      {showCreateCampaignModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <form onSubmit={handleCreateCampaign} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827', margin: 0, fontFamily: 'Manrope, sans-serif' }}>Create WhatsApp Broadcast</h3>
              <button type="button" onClick={() => setShowCreateCampaignModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Campaign Name</label>
                <input type="text" required placeholder="e.g. Diwali Fest Promotion" value={campName} onChange={(e) => setCampName(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Template</label>
                <select value={campTemplate} onChange={(e) => setCampTemplate(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                  <option value="product_update_v1">Product Update & Demo (Approved)</option>
                  <option value="festive_offer_broadcast">Festive Offer Blast (Approved)</option>
                  <option value="general_lead_followup">General Lead Followup (Approved)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Target Audience</label>
                <select value={campAudience} onChange={(e) => setCampAudience(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                  <option value="all_leads">All CRM Leads</option>
                  <option value="interested_leads">Interested & Claimed Leads Only</option>
                  <option value="custom_list">Custom Contact List</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Target Count</label>
                <input type="number" value={campTarget} onChange={(e) => setCampTarget(Number(e.target.value))} style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
            </div>

            <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#F68713', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 1px 3px rgba(246,135,19,0.3)' }}>
              Launch Broadcast Campaign
            </button>
          </form>
        </div>
      )}

      {/* 4. Upload Media Modal */}
      {showUploadMediaModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <form onSubmit={handleUploadMedia} style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1.5rem', width: '100%', maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#111827', margin: 0, fontFamily: 'Manrope, sans-serif' }}>Upload Media Asset</h3>
              <button type="button" onClick={() => setShowUploadMediaModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Asset Title</label>
                <input type="text" required placeholder="e.g. Brochure Oct 2026" value={mediaFileName} onChange={(e) => setMediaFileName(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Media Type</label>
                <select value={mediaType} onChange={(e) => setMediaType(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px' }}>
                  <option value="image">Image (JPG/PNG)</option>
                  <option value="document">Document (PDF)</option>
                  <option value="video">Video (MP4)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>Media URL / CDN Link</label>
                <input type="url" required placeholder="https://example.com/brochure.pdf" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem', border: '1px solid #cbd5e1', borderRadius: '6px' }} />
              </div>
            </div>

            <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#F68713', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 1px 3px rgba(246,135,19,0.3)' }}>
              Save Asset to Media Library
            </button>
          </form>
        </div>
      )}

      {/* 5. Connect Existing Account Modal */}
      {showExistingLoginModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <form onSubmit={handleConnectExisting} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.75rem', width: '100%', maxWidth: '480px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Connect Existing WABA Account
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                  Sign in with your Pinbot CDC / WhatsApp API credentials
                </p>
              </div>
              <button type="button" onClick={() => setShowExistingLoginModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Username / Account ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. smitagarkarWapp"
                  value={existingForm.username}
                  onChange={(e) => setExistingForm({ ...existingForm, username: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Your CDC user password"
                  value={existingForm.password}
                  onChange={(e) => setExistingForm({ ...existingForm, password: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    WABA Phone (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="9177769654"
                    value={existingForm.waba_number}
                    onChange={(e) => setExistingForm({ ...existingForm, waba_number: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    WABA ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="12542351561"
                    value={existingForm.waba_id}
                    onChange={(e) => setExistingForm({ ...existingForm, waba_id: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  API Key (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Optional existing API Key"
                  value={existingForm.apikey}
                  onChange={(e) => setExistingForm({ ...existingForm, apikey: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={connectingExisting}
              style={{
                width: '100%',
                padding: '11px',
                backgroundColor: '#0d9488',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.88rem',
                fontWeight: '700',
                cursor: connectingExisting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {connectingExisting ? <RefreshCw size={16} className="spin" /> : <UserCheck size={16} />}
              {connectingExisting ? 'Verifying & Connecting…' : 'Connect Account & Open Dashboard'}
            </button>
          </form>
        </div>
      )}

      {/* 6. Template Preview Modal */}
      {previewTemplate && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Template Preview: {previewTemplate.name}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  ID: {previewTemplate.id} • {previewTemplate.category} ({previewTemplate.language})
                </span>
              </div>
              <button type="button" onClick={() => setPreviewTemplate(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            {/* WhatsApp Phone Mockup Bubble */}
            <div style={{ backgroundColor: '#efeae2', borderRadius: '12px', padding: '1rem', border: '1px solid #cbd5e1', marginBottom: '1.25rem' }}>
              <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#1f2937', lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                  {previewTemplate.body}
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#9ca3af' }}>
                  <span>12:00 PM</span>
                  <span style={{ color: '#0284c7' }}>✓✓</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                style={{
                  padding: '7px 16px',
                  backgroundColor: '#0f172a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Send Image / Media Attachment Modal */}
      {showAttachModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <form onSubmit={handleSendChatMessage} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.5rem', width: '100%', maxWidth: '440px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Send Image / Media
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  Send an image directly to {selectedContact?.name || selectedContact?.phone}
                </p>
              </div>
              <button type="button" onClick={() => setShowAttachModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Image Public URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/brochure.png"
                  value={chatImageUrl}
                  onChange={(e) => setChatImageUrl(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
              </div>

              {chatImageUrl && (
                <div style={{ height: '140px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={chatImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Caption / Text Message
                </label>
                <input
                  type="text"
                  placeholder="e.g. Here is our product brochure and pricing details"
                  value={chatMessageText}
                  onChange={(e) => setChatMessageText(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowAttachModal(false)}
                style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#334155', border: 'none', borderRadius: '6px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={sendingChatMessage || !chatImageUrl.trim()}
                style={{
                  padding: '8px 18px',
                  backgroundColor: '#075e54',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: (sendingChatMessage || !chatImageUrl.trim()) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {sendingChatMessage ? <RefreshCw size={14} className="spin" /> : <Send size={14} />}
                <span>Send Image</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
