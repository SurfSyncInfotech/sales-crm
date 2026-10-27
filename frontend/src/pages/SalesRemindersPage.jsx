import { useEffect, useMemo, useState } from 'react';
import { salesApi } from '../api/client';
import {
  Calendar,
  CheckCircle2,
  Mail,
  Clock,
  MessageSquare,
  Search,
  Filter,
  Tag,
  ChevronDown,
  MoreHorizontal,
  X,
  Send,
  Sparkles,
  Trophy,
  Check,
  Phone,
  LayoutGrid,
  List,
  RotateCcw,
  Building,
} from 'lucide-react';

const AVATAR_COLORS = [
  { bg: '#dbeafe', color: '#1e40af' }, // Blue
  { bg: '#ffedd5', color: '#9a3412' }, // Orange
  { bg: '#fce7f3', color: '#9d174d' }, // Pink
  { bg: '#ede9fe', color: '#5b21b6' }, // Purple
  { bg: '#dcfce7', color: '#166534' }, // Green
  { bg: '#fef3c7', color: '#854d0e' }, // Amber
  { bg: '#ccfbf1', color: '#0f766e' }, // Teal
];

function getAvatarStyle(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'L';
}

function getLocalDateStr(dateVal) {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateParts(dateString) {
  if (!dateString) return { date: '—', time: '—' };
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return { date: String(dateString), time: '' };

  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return { date, time };
}

export default function SalesRemindersPage() {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // View: 'cards' (grouped by lead) or 'table' (flat rows)
  const [viewMode, setViewMode] = useState('cards');

  // Filters
  const [search, setSearch] = useState('');
  const [cadenceFilter, setCadenceFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [specificDate, setSpecificDate] = useState('');

  // Selection
  const [selectedIds, setSelectedIds] = useState([]);
  const [menuId, setMenuId] = useState(null);

  async function loadReminders() {
    setLoading(true);
    setError('');
    try {
      const data = await salesApi.reminders();
      setReminders(data.reminders || []);
    } catch (err) {
      setError(err.message || 'Failed to load reminders');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReminders();
    setSelectedIds([]);
    setMenuId(null);
  }, []);

  function getWhatsAppUrl(reminder) {
    const phone = (reminder.lead_phone || '').replace(/[^0-9]/g, '');
    let text = '';

    if (reminder.phase === 'phase_2_post_quote') {
      text = `Hi ${reminder.lead_name}, hope you are doing well! Just following up regarding the quotation our team shared with you. Please let us know if you have any questions or if you'd like to proceed!`;
    } else if (reminder.day_number === 2) {
      text = `Hi ${reminder.lead_name}, thank you for your interest! We're here to assist you with any questions. Would you like to schedule a quick call today?`;
    } else if (reminder.day_number === 5) {
      text = `Hello ${reminder.lead_name}, checking in to see if you had a chance to review the details we discussed. We'd love to help you get started!`;
    } else if (reminder.day_number === 10) {
      text = `Hi ${reminder.lead_name}, hope your week is going great! Let us know if you need an official quotation or scope discussion for your project.`;
    } else {
      text = `Hi ${reminder.lead_name}, we are wrapping up our onboarding queue. Please let us know if your project is still active so we can reserve your slot!`;
    }

    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  // Top Cadence Statistics (Calculated from all reminders)
  const cadenceStats = useMemo(() => {
    const now = Date.now();
    const stats = {
      day2: { total: 0, dueNow: 0 },
      day5: { total: 0, dueNow: 0 },
      day10: { total: 0, dueNow: 0 },
      day21: { total: 0, dueNow: 0 },
    };

    reminders.forEach((r) => {
      const isDue = r.status === 'pending' && new Date(r.scheduled_for).getTime() <= now;
      const day = Number(r.day_number);

      if (day === 2) {
        stats.day2.total += 1;
        if (isDue) stats.day2.dueNow += 1;
      } else if (day === 5 || day === 4) {
        stats.day5.total += 1;
        if (isDue) stats.day5.dueNow += 1;
      } else if (day === 10 || day === 7) {
        stats.day10.total += 1;
        if (isDue) stats.day10.dueNow += 1;
      } else if (day === 21) {
        stats.day21.total += 1;
        if (isDue) stats.day21.dueNow += 1;
      }
    });

    return stats;
  }, [reminders]);

  // Filtered Reminders
  const filteredReminders = useMemo(() => {
    const now = Date.now();
    const q = search.toLowerCase().trim();

    return reminders.filter((r) => {
      // Search filter
      const matchesSearch =
        !q ||
        (r.lead_name && r.lead_name.toLowerCase().includes(q)) ||
        (r.lead_phone && r.lead_phone.includes(q)) ||
        (r.lead_company && r.lead_company.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Cadence filter
      if (cadenceFilter !== 'all') {
        const day = String(r.day_number);
        if (cadenceFilter === 'day2' && day !== '2') return false;
        if (cadenceFilter === 'day5' && day !== '5' && day !== '4') return false;
        if (cadenceFilter === 'day10' && day !== '10' && day !== '7') return false;
        if (cadenceFilter === 'day21' && day !== '21') return false;
      }

      // Stage filter
      if (stageFilter !== 'all' && r.lead_status !== stageFilter) {
        return false;
      }

      // Status filter
      const isDue = r.status === 'pending' && new Date(r.scheduled_for).getTime() <= now;
      const isUpcoming = r.status === 'pending' && new Date(r.scheduled_for).getTime() > now;
      const isSent = r.status === 'sent';

      if (statusFilter === 'due' && !isDue) return false;
      if (statusFilter === 'upcoming' && !isUpcoming) return false;
      if (statusFilter === 'sent' && !isSent) return false;

      // Date filter (Timezone-safe)
      if (dateFilter !== 'all') {
        const remDateStr = getLocalDateStr(r.scheduled_for);
        const todayStr = getLocalDateStr(new Date());

        if (dateFilter === 'custom' && specificDate) {
          if (remDateStr !== specificDate) return false;
        } else if (dateFilter === 'today') {
          if (remDateStr !== todayStr) return false;
        } else if (dateFilter === 'this_week') {
          const diff = Date.now() - new Date(r.scheduled_for).getTime();
          if (diff > 7 * 24 * 60 * 60 * 1000) return false;
        } else if (dateFilter === 'this_month') {
          const diff = Date.now() - new Date(r.scheduled_for).getTime();
          if (diff > 30 * 24 * 60 * 60 * 1000) return false;
        }
      }

      return true;
    });
  }, [reminders, search, cadenceFilter, stageFilter, statusFilter, dateFilter, specificDate]);

  // Group filtered reminders by lead
  const groupedByLead = useMemo(() => {
    const groups = [];
    const leadMap = new Map();

    filteredReminders.forEach((r) => {
      const key = r.lead_id || r.lead_phone || r.lead_name;
      const rTime = Math.max(
        new Date(r.scheduled_for || 0).getTime(),
        new Date(r.created_at || 0).getTime(),
        Number(r.id || 0)
      );

      if (!leadMap.has(key)) {
        const groupObj = {
          lead_id: r.lead_id,
          lead_name: r.lead_name || 'Unnamed Lead',
          lead_phone: r.lead_phone || '',
          lead_company: r.lead_company || '',
          lead_status: r.lead_status || '',
          latestTime: rTime,
          reminders: [],
        };
        leadMap.set(key, groupObj);
        groups.push(groupObj);
      } else {
        const g = leadMap.get(key);
        if (rTime > g.latestTime) {
          g.latestTime = rTime;
        }
      }
      leadMap.get(key).reminders.push(r);
    });

    // Sort each group's reminders by scheduled_for ascending (Day 2 -> Day 5 -> Day 10 -> Day 21)
    groups.forEach((g) => {
      g.reminders.sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime());
    });

    // Sort the lead cards so the latest / newest leads appear FIRST
    groups.sort((a, b) => b.latestTime - a.latestTime);

    return groups;
  }, [filteredReminders]);

  function toggleSelectAll() {
    if (selectedIds.length === filteredReminders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredReminders.map((r) => r.id));
    }
  }

  function toggleSelectRow(id) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  // Cadence badge styler
  function getCadenceBadge(dayNumber) {
    const day = Number(dayNumber);
    if (day === 2) return { bg: '#eff6ff', color: '#2563eb', label: 'Day 2' };
    if (day === 5 || day === 4) return { bg: '#ecfdf5', color: '#16a34a', label: 'Day 5' };
    if (day === 10 || day === 7) return { bg: '#faf5ff', color: '#7c3aed', label: 'Day 10' };
    return { bg: '#fdf2f8', color: '#db2777', label: 'Day 21' };
  }

  // Stage badge styler
  function getStageBadge(status) {
    switch (status) {
      case 'interested':
        return { bg: '#ecfdf5', color: '#16a34a', label: 'Interested' };
      case 'followup':
        return { bg: '#eff6ff', color: '#4f46e5', label: 'Follow-Up' };
      case 'quotation_sent':
        return { bg: '#faf5ff', color: '#9333ea', label: 'Quotation Sent' };
      case 'quotation_requested':
        return { bg: '#fff7ed', color: '#ea580c', label: 'Quotation Requested' };
      case 'won':
        return { bg: '#ecfdf5', color: '#10b981', label: 'Won' };
      case 'lost':
        return { bg: '#fef2f2', color: '#dc2626', label: 'Lost' };
      default:
        return { bg: '#f1f5f9', color: '#475569', label: status || 'Lead' };
    }
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: '800', color: '#0d9488', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Automated Engagement
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: '800', color: '#0f172a', margin: '0.2rem 0 0 0', letterSpacing: '-0.02em' }}>
            WhatsApp Auto-Reminders
          </h1>
          <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.86rem' }}>
            When a lead is marked as <strong>Interested</strong> or <strong>Quotation Sent</strong>, the system schedules automated touchpoint reminders.
          </p>
        </div>

        {/* Top-Right Controls & View Switch */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '5px 12px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '20px',
              fontSize: '0.74rem',
              fontWeight: '700',
              color: '#065f46',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
            <span>Cadence Active: Day 2, 5, 10, 21</span>
          </div>

          {/* View Switch: Cards vs Table */}
          <div style={{ display: 'flex', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: '700',
                border: 'none',
                backgroundColor: viewMode === 'cards' ? '#072423' : '#fff',
                color: viewMode === 'cards' ? '#fff' : '#475569',
                cursor: 'pointer',
              }}
            >
              <LayoutGrid size={13} />
              <span>By Person (Cards)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: '700',
                border: 'none',
                backgroundColor: viewMode === 'table' ? '#072423' : '#fff',
                color: viewMode === 'table' ? '#fff' : '#475569',
                cursor: 'pointer',
              }}
            >
              <List size={13} />
              <span>All Rows (Table)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Cadence Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.85rem' }}>
        {/* Card 1: Day 2 Reminders */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Calendar size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Day 2 Reminders</strong>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>First follow-up & brief.</div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '8px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
              {cadenceStats.day2.total}
            </div>
            <div style={{ fontSize: '0.68rem', fontWeight: '700', color: cadenceStats.day2.dueNow > 0 ? '#dc2626' : '#64748b', marginTop: '3px', whiteSpace: 'nowrap' }}>
              {cadenceStats.day2.dueNow > 0 ? `${cadenceStats.day2.dueNow} due now` : cadenceStats.day2.total > 0 ? 'Concluded / Sent' : 'Scheduled'}
            </div>
          </div>
        </div>

        {/* Card 2: Day 5 Reminders */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckCircle2 size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Day 5 Reminders</strong>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Value & case studies.</div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '8px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
              {cadenceStats.day5.total}
            </div>
            <div style={{ fontSize: '0.68rem', fontWeight: '700', color: cadenceStats.day5.dueNow > 0 ? '#dc2626' : '#64748b', marginTop: '3px', whiteSpace: 'nowrap' }}>
              {cadenceStats.day5.dueNow > 0 ? `${cadenceStats.day5.dueNow} due now` : cadenceStats.day5.total > 0 ? 'Concluded / Sent' : 'Scheduled'}
            </div>
          </div>
        </div>

        {/* Card 3: Day 10 Reminders */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#faf5ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Mail size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Day 10 Reminders</strong>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Proposal inquiry.</div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '8px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
              {cadenceStats.day10.total}
            </div>
            <div style={{ fontSize: '0.68rem', fontWeight: '700', color: cadenceStats.day10.dueNow > 0 ? '#dc2626' : '#64748b', marginTop: '3px', whiteSpace: 'nowrap' }}>
              {cadenceStats.day10.dueNow > 0 ? `${cadenceStats.day10.dueNow} due now` : cadenceStats.day10.total > 0 ? 'Concluded / Sent' : 'Scheduled'}
            </div>
          </div>
        </div>

        {/* Card 4: Day 21 Reminders */}
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', backgroundColor: '#fdf2f8', color: '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Clock size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <strong style={{ fontSize: '0.85rem', color: '#0f172a', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Day 21 Reminders</strong>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Final re-engagement.</div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '8px' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', lineHeight: 1 }}>
              {cadenceStats.day21.total}
            </div>
            <div style={{ fontSize: '0.68rem', fontWeight: '700', color: cadenceStats.day21.dueNow > 0 ? '#dc2626' : '#64748b', marginTop: '3px', whiteSpace: 'nowrap' }}>
              {cadenceStats.day21.dueNow > 0 ? `${cadenceStats.day21.dueNow} due now` : cadenceStats.day21.total > 0 ? 'Concluded / Sent' : 'Scheduled'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
          backgroundColor: '#fff',
          padding: '0.75rem 1rem',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}
      >
        {/* Left: Search Bar */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '200px' }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search client name, phone, company…"
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

        {/* Filter 1: Cadence */}
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 8px' }}>
          <select
            value={cadenceFilter}
            onChange={(e) => setCadenceFilter(e.target.value)}
            style={{ border: 'none', outline: 'none', padding: '8px 4px', fontSize: '0.82rem', fontWeight: '600', color: '#334155', backgroundColor: 'transparent', cursor: 'pointer' }}
          >
            <option value="all">All Reminders</option>
            <option value="day2">Day 2</option>
            <option value="day5">Day 5</option>
            <option value="day10">Day 10</option>
            <option value="day21">Day 21</option>
          </select>
        </div>

        {/* Filter 2: Stages */}
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 8px' }}>
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            style={{ border: 'none', outline: 'none', padding: '8px 4px', fontSize: '0.82rem', fontWeight: '600', color: '#334155', backgroundColor: 'transparent', cursor: 'pointer' }}
          >
            <option value="all">All Stages</option>
            <option value="interested">Interested</option>
            <option value="followup">Follow-Up</option>
            <option value="quotation_requested">Quotation Requested</option>
            <option value="quotation_sent">Quotation Sent</option>
            <option value="won">Won</option>
          </select>
        </div>

        {/* Filter 3: Status */}
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 8px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ border: 'none', outline: 'none', padding: '8px 4px', fontSize: '0.82rem', fontWeight: '600', color: '#334155', backgroundColor: 'transparent', cursor: 'pointer' }}
          >
            <option value="all">All Status</option>
            <option value="due">Due Now</option>
            <option value="upcoming">Upcoming</option>
            <option value="sent">Sent</option>
          </select>
        </div>

        {/* Filter 4: Dates */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '0 8px' }}>
          <Calendar size={13} color="#64748b" />
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              if (e.target.value !== 'custom') setSpecificDate('');
            }}
            style={{ border: 'none', outline: 'none', padding: '8px 4px', fontSize: '0.82rem', fontWeight: '600', color: '#334155', backgroundColor: 'transparent', cursor: 'pointer' }}
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="custom">Specific Date…</option>
          </select>

          {dateFilter === 'custom' && (
            <input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              style={{ border: '1px solid #cbd5e1', borderRadius: '4px', padding: '2px 4px', fontSize: '0.78rem' }}
            />
          )}

          {specificDate && (
            <button
              type="button"
              onClick={() => setSpecificDate('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.85rem 1rem', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: '8px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Main View Area */}
      {loading ? (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '3.5rem', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
          Loading scheduled touchpoint reminders…
        </div>
      ) : filteredReminders.length === 0 ? (
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '3.5rem', textAlign: 'center', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#475569' }}>No scheduled reminders found</div>
          <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
            Mark leads as <strong>Interested</strong> or <strong>Quotation Sent</strong> to auto-schedule cadences.
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* ========================================================================= */
        /* GROUPED BY PERSON (CARDS VIEW) - Clean, Uncluttered, Line-by-Line         */
        /* ========================================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {groupedByLead.map((group) => {
            const avatarStyle = getAvatarStyle(group.lead_name);
            const initials = getInitials(group.lead_name);
            const stageBadge = getStageBadge(group.lead_status);
            const sentCount = group.reminders.filter((r) => r.status === 'sent').length;
            const totalCount = group.reminders.length;

            return (
              <div
                key={group.lead_id || group.lead_name}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '14px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Lead Header */}
                <div
                  style={{
                    padding: '1rem 1.25rem',
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  {/* Left: Avatar + Lead Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: avatarStyle.bg,
                        color: avatarStyle.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '800',
                        fontSize: '0.95rem',
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '1.02rem', color: '#0f172a' }}>
                          {group.lead_name}
                        </strong>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            backgroundColor: stageBadge.bg,
                            color: stageBadge.color,
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          {stageBadge.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.8rem', color: '#64748b', marginTop: '3px', flexWrap: 'wrap' }}>
                        {group.lead_company && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Building size={12} /> {group.lead_company}
                          </span>
                        )}
                        {group.lead_phone && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={12} /> {group.lead_phone}
                            </span>
                            <a
                              href={`tel:${group.lead_phone}`}
                              style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center' }}
                              title="Call"
                            >
                              <Phone size={13} />
                            </a>
                            <a
                              href={`https://wa.me/${group.lead_phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center' }}
                              title="Open in WhatsApp"
                            >
                              <MessageSquare size={13} />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Cadence Progress Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '0.76rem',
                        fontWeight: '700',
                        backgroundColor: sentCount === totalCount ? '#ecfdf5' : '#f1f5f9',
                        color: sentCount === totalCount ? '#16a34a' : '#475569',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        border: '1px solid',
                        borderColor: sentCount === totalCount ? '#bbf7d0' : '#e2e8f0',
                      }}
                    >
                      {sentCount === totalCount ? '✓ All Reminders Sent' : `${sentCount} of ${totalCount} Reminders Sent`}
                    </span>
                  </div>
                </div>

                {/* Line-by-Line Reminders for this Lead */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {group.reminders.map((rem, idx) => {
                    const { date, time } = formatDateParts(rem.scheduled_for);
                    const cadenceBadge = getCadenceBadge(rem.day_number);
                    const isSent = rem.status === 'sent';
                    const isDue = rem.status === 'pending' && new Date(rem.scheduled_for).getTime() <= Date.now();
                    const isWon = rem.lead_status === 'won';
                    const isLost = rem.lead_status === 'lost';
                    const waUrl = getWhatsAppUrl(rem);

                    return (
                      <div
                        key={rem.id}
                        style={{
                          padding: '0.85rem 1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '12px',
                          borderBottom: idx < group.reminders.length - 1 ? '1px solid #f1f5f9' : 'none',
                          backgroundColor: isSent ? '#fff' : isDue ? '#fff5f5' : '#fafbfc',
                        }}
                      >
                        {/* Cadence + Scheduled Date/Time */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px' }}>
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              backgroundColor: cadenceBadge.bg,
                              color: cadenceBadge.color,
                              padding: '3px 10px',
                              borderRadius: '6px',
                              minWidth: '58px',
                              textAlign: 'center',
                            }}
                          >
                            {cadenceBadge.label}
                          </span>
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b' }}>
                              {date}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {time}
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div>
                          {isWon ? (
                            <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#059669', backgroundColor: '#ecfdf5', padding: '3px 9px', borderRadius: '6px', border: '1px solid #a7f3d0' }}>
                              Deal Won • Concluded
                            </span>
                          ) : isLost ? (
                            <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#dc2626', backgroundColor: '#fef2f2', padding: '3px 9px', borderRadius: '6px' }}>
                              Deal Lost
                            </span>
                          ) : isSent ? (
                            <span style={{ fontSize: '0.74rem', fontWeight: '700', backgroundColor: '#ecfdf5', color: '#16a34a', padding: '3px 9px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Check size={12} />
                              <span>Sent by Worker</span>
                            </span>
                          ) : isDue ? (
                            <span style={{ fontSize: '0.74rem', fontWeight: '700', backgroundColor: '#fee2e2', color: '#dc2626', padding: '3px 9px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
                              <span>Due Now</span>
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.74rem', fontWeight: '700', backgroundColor: '#f1f5f9', color: '#475569', padding: '3px 9px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} />
                              <span>Upcoming</span>
                            </span>
                          )}
                        </div>

                        {/* WhatsApp Action Button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isWon ? (
                            <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '600' }}>
                              ✓ No further actions
                            </span>
                          ) : isSent ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                backgroundColor: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                color: '#16a34a',
                                textDecoration: 'none',
                                fontSize: '0.74rem',
                                fontWeight: '700',
                              }}
                              title="Resend WhatsApp message"
                            >
                              <MessageSquare size={12} />
                              <span>Resend</span>
                            </a>
                          ) : isDue ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '5px 12px',
                                borderRadius: '6px',
                                backgroundColor: '#16a34a',
                                color: '#fff',
                                textDecoration: 'none',
                                fontSize: '0.74rem',
                                fontWeight: '700',
                              }}
                            >
                              <Send size={12} />
                              <span>Send Now</span>
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                              Auto-sends at scheduled time
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ========================================================================= */
        /* FLAT TABLE VIEW (Original Full Table)                                    */
        /* ========================================================================= */
        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
              <thead>
                <tr style={{ backgroundColor: '#fafbfc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '0.85rem 1rem', width: '36px' }}>
                    <input
                      type="checkbox"
                      checked={filteredReminders.length > 0 && selectedIds.length === filteredReminders.length}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', borderRadius: '4px' }}
                    />
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Client / Company
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Cadence
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Scheduled For
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Status
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Current Stage
                  </th>
                  <th style={{ padding: '0.85rem 1rem', fontSize: '0.72rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    WhatsApp Action
                  </th>
                  <th style={{ padding: '0.85rem 1rem', width: '40px', textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredReminders.map((reminder) => {
                  const now = Date.now();
                  const isDue = reminder.status === 'pending' && new Date(reminder.scheduled_for).getTime() <= now;
                  const isSent = reminder.status === 'sent';

                  const avatarStyle = getAvatarStyle(reminder.lead_name || 'L');
                  const initials = getInitials(reminder.lead_name || 'L');

                  const cadenceBadge = getCadenceBadge(reminder.day_number);
                  const stageBadge = getStageBadge(reminder.lead_status);
                  const { date, time } = formatDateParts(reminder.scheduled_for);
                  const waUrl = getWhatsAppUrl(reminder);

                  return (
                    <tr
                      key={reminder.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        backgroundColor: selectedIds.includes(reminder.id) ? '#f0fdfa' : '#fff',
                        transition: 'background-color 0.1s',
                      }}
                    >
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(reminder.id)}
                          onChange={() => toggleSelectRow(reminder.id)}
                          style={{ cursor: 'pointer', borderRadius: '4px' }}
                        />
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              backgroundColor: avatarStyle.bg,
                              color: avatarStyle.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '800',
                              fontSize: '0.82rem',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <strong style={{ fontSize: '0.88rem', color: '#0f172a', display: 'block', lineHeight: 1.25 }}>
                              {reminder.lead_name}
                            </strong>
                            {reminder.lead_company && (
                              <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: '2px' }}>
                                {reminder.lead_company}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: '700',
                            backgroundColor: cadenceBadge.bg,
                            color: cadenceBadge.color,
                            padding: '3px 9px',
                            borderRadius: '6px',
                            display: 'inline-block',
                          }}
                        >
                          {cadenceBadge.label}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b' }}>
                          {date}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1px' }}>
                          {time}
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        {isSent ? (
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              backgroundColor: '#ecfdf5',
                              color: '#16a34a',
                              padding: '3px 9px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            ✓ Sent
                          </span>
                        ) : isDue ? (
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              padding: '3px 9px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
                            <span>Due Now</span>
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: '700',
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              padding: '3px 9px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            ✓ Upcoming
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.74rem',
                            fontWeight: '700',
                            backgroundColor: stageBadge.bg,
                            color: stageBadge.color,
                            padding: '3px 9px',
                            borderRadius: '6px',
                            display: 'inline-block',
                          }}
                        >
                          {stageBadge.label}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        {reminder.lead_status === 'won' ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              backgroundColor: '#ecfdf5',
                              border: '1px solid #a7f3d0',
                              color: '#059669',
                              fontSize: '0.76rem',
                              fontWeight: '700',
                            }}
                          >
                            <Trophy size={13} color="#059669" />
                            <span>Deal Won • Concluded</span>
                          </div>
                        ) : reminder.lead_status === 'lost' ? (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              backgroundColor: '#fef2f2',
                              color: '#dc2626',
                              fontSize: '0.74rem',
                              fontWeight: '700',
                            }}
                          >
                            Deal Closed / Lost
                          </div>
                        ) : isSent ? (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '0.74rem',
                                color: '#16a34a',
                                fontWeight: '700',
                              }}
                            >
                              <Check size={13} />
                              <span>Sent by Worker</span>
                            </span>
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                backgroundColor: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                color: '#16a34a',
                                textDecoration: 'none',
                                fontSize: '0.72rem',
                                fontWeight: '700',
                              }}
                              title="Resend WhatsApp message"
                            >
                              <MessageSquare size={11} />
                              <span>Resend</span>
                            </a>
                          </div>
                        ) : (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              backgroundColor: '#16a34a',
                              color: '#fff',
                              textDecoration: 'none',
                              padding: '7px 14px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: '700',
                              boxShadow: '0 1px 2px rgba(22, 163, 74, 0.2)',
                              transition: 'opacity 0.15s',
                            }}
                          >
                            <MessageSquare size={14} color="#fff" />
                            <span>Send WhatsApp Follow-up</span>
                          </a>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', position: 'relative' }}>
                        <button
                          type="button"
                          onClick={() => setMenuId(menuId === reminder.id ? null : reminder.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '4px',
                          }}
                          title="Options"
                        >
                          <MoreHorizontal size={16} />
                        </button>

                        {menuId === reminder.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: '12px',
                              top: '32px',
                              zIndex: 100,
                              backgroundColor: '#fff',
                              borderRadius: '8px',
                              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                              border: '1px solid #e2e8f0',
                              padding: '4px',
                              width: '160px',
                              textAlign: 'left',
                            }}
                          >
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                display: 'block',
                                padding: '6px 10px',
                                fontSize: '0.75rem',
                                color: '#16a34a',
                                textDecoration: 'none',
                                fontWeight: '700',
                              }}
                            >
                              Open in WhatsApp
                            </a>
                            {reminder.lead_phone && (
                              <a
                                href={`tel:${reminder.lead_phone}`}
                                style={{
                                  display: 'block',
                                  padding: '6px 10px',
                                  fontSize: '0.75rem',
                                  color: '#334155',
                                  textDecoration: 'none',
                                  fontWeight: '600',
                                }}
                              >
                                Call Client
                              </a>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
