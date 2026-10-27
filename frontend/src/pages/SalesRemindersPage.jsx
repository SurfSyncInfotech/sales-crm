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
  Send,
  Check,
  Phone,
  LayoutGrid,
  List,
  Building,
  RotateCcw,
  X,
  ArrowRight,
} from 'lucide-react';

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

  async function loadReminders(silent = false) {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await salesApi.reminders();
      setReminders(data.reminders || []);
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load reminders');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadReminders();
    setSelectedIds([]);

    // Background polling every 20 seconds
    const interval = setInterval(() => {
      loadReminders(true);
    }, 20000);

    return () => clearInterval(interval);
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

  // Top Cadence Statistics
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
      const matchesSearch =
        !q ||
        (r.lead_name && r.lead_name.toLowerCase().includes(q)) ||
        (r.lead_phone && r.lead_phone.includes(q)) ||
        (r.lead_company && r.lead_company.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (cadenceFilter !== 'all') {
        const day = String(r.day_number);
        if (cadenceFilter === 'day2' && day !== '2') return false;
        if (cadenceFilter === 'day5' && day !== '5' && day !== '4') return false;
        if (cadenceFilter === 'day10' && day !== '10' && day !== '7') return false;
        if (cadenceFilter === 'day21' && day !== '21') return false;
      }

      if (stageFilter !== 'all' && r.lead_status !== stageFilter) {
        return false;
      }

      const isDue = r.status === 'pending' && new Date(r.scheduled_for).getTime() <= now;
      const isUpcoming = r.status === 'pending' && new Date(r.scheduled_for).getTime() > now;
      const isSent = r.status === 'sent';

      if (statusFilter === 'due' && !isDue) return false;
      if (statusFilter === 'upcoming' && !isUpcoming) return false;
      if (statusFilter === 'sent' && !isSent) return false;

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

    groups.forEach((g) => {
      g.reminders.sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime());
    });

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

  function getCadenceBadge(dayNumber) {
    const day = Number(dayNumber);
    if (day === 2) return { bg: '#E8F6FA', color: '#1D667C', label: 'Day 2' };
    if (day === 5 || day === 4) return { bg: '#DCFCE7', color: '#166534', label: 'Day 5' };
    if (day === 10 || day === 7) return { bg: '#FFF3E6', color: '#B65807', label: 'Day 10' };
    return { bg: '#F3E8FF', color: '#6D28D9', label: 'Day 21' };
  }

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
            Auto-Reminders & Cadence
          </h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#6B7280', fontSize: '0.86rem' }}>
            Scheduled WhatsApp touchpoints on Day 2, 5, 10, and 21 across your assigned leads.
          </p>
        </div>

        {/* View Switch: By Person (Cards) vs Flat Table */}
        <div style={{ display: 'flex', backgroundColor: '#F1F3F6', padding: '3px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              fontSize: '0.78rem',
              fontWeight: viewMode === 'cards' ? '700' : '500',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: viewMode === 'cards' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'cards' ? '#111827' : '#6B7280',
              boxShadow: viewMode === 'cards' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
            }}
          >
            <LayoutGrid size={13} /> By Client (Cards)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              fontSize: '0.78rem',
              fontWeight: viewMode === 'table' ? '700' : '500',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: viewMode === 'table' ? '#FFFFFF' : 'transparent',
              color: viewMode === 'table' ? '#111827' : '#6B7280',
              boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
            }}
          >
            <List size={13} /> Flat Table
          </button>
        </div>
      </div>

      {/* 4 Cadence Summary Cards (Component 3.1) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <div className="sales-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>Day 2 Cadence</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#E8F6FA', color: '#2A9CB8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={15} />
            </div>
          </div>
          <div className="num" style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '0.5rem', lineHeight: 1 }}>
            {cadenceStats.day2.total}
          </div>
          <div style={{ fontSize: '0.74rem', color: cadenceStats.day2.dueNow > 0 ? '#DC2626' : '#16A34A', fontWeight: '700', marginTop: '0.4rem' }}>
            {cadenceStats.day2.dueNow > 0 ? `${cadenceStats.day2.dueNow} due now` : 'All caught up'}
          </div>
        </div>

        <div className="sales-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>Day 5 Cadence</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={15} />
            </div>
          </div>
          <div className="num" style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '0.5rem', lineHeight: 1 }}>
            {cadenceStats.day5.total}
          </div>
          <div style={{ fontSize: '0.74rem', color: cadenceStats.day5.dueNow > 0 ? '#DC2626' : '#16A34A', fontWeight: '700', marginTop: '0.4rem' }}>
            {cadenceStats.day5.dueNow > 0 ? `${cadenceStats.day5.dueNow} due now` : 'All caught up'}
          </div>
        </div>

        <div className="sales-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>Day 10 Cadence</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#FFF3E6', color: '#F68713', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Mail size={15} />
            </div>
          </div>
          <div className="num" style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '0.5rem', lineHeight: 1 }}>
            {cadenceStats.day10.total}
          </div>
          <div style={{ fontSize: '0.74rem', color: cadenceStats.day10.dueNow > 0 ? '#DC2626' : '#16A34A', fontWeight: '700', marginTop: '0.4rem' }}>
            {cadenceStats.day10.dueNow > 0 ? `${cadenceStats.day10.dueNow} due now` : 'All caught up'}
          </div>
        </div>

        <div className="sales-card" style={{ padding: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6B7280' }}>Day 21 Final Cadence</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#F3E8FF', color: '#6D28D9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={15} />
            </div>
          </div>
          <div className="num" style={{ fontSize: '1.6rem', fontWeight: '800', color: '#111827', marginTop: '0.5rem', lineHeight: 1 }}>
            {cadenceStats.day21.total}
          </div>
          <div style={{ fontSize: '0.74rem', color: cadenceStats.day21.dueNow > 0 ? '#DC2626' : '#16A34A', fontWeight: '700', marginTop: '0.4rem' }}>
            {cadenceStats.day21.dueNow > 0 ? `${cadenceStats.day21.dueNow} due now` : 'All caught up'}
          </div>
        </div>
      </div>

      {/* Filter Toolbar (Foundation 02, 2.4) */}
      <div className="sales-card" style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
          <Search size={14} color="#9CA3AF" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input
            type="text"
            placeholder="Search client, phone, company…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '7px 10px 7px 32px',
              fontSize: '0.82rem',
              border: '1px solid #E6E9EE',
              borderRadius: '6px',
              outline: 'none',
            }}
          />
        </div>

        <select
          value={cadenceFilter}
          onChange={(e) => setCadenceFilter(e.target.value)}
          style={{ padding: '7px 10px', fontSize: '0.8rem', border: '1px solid #E6E9EE', borderRadius: '6px', backgroundColor: '#FFFFFF', outline: 'none' }}
        >
          <option value="all">All Cadence Days</option>
          <option value="day2">Day 2</option>
          <option value="day5">Day 5</option>
          <option value="day10">Day 10</option>
          <option value="day21">Day 21</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '7px 10px', fontSize: '0.8rem', border: '1px solid #E6E9EE', borderRadius: '6px', backgroundColor: '#FFFFFF', outline: 'none' }}
        >
          <option value="all">All Status</option>
          <option value="due">Due Now</option>
          <option value="upcoming">Upcoming</option>
          <option value="sent">Sent</option>
        </select>

        <select
          value={dateFilter}
          onChange={(e) => {
            setDateFilter(e.target.value);
            if (e.target.value !== 'custom') setSpecificDate('');
          }}
          style={{ padding: '7px 10px', fontSize: '0.8rem', border: '1px solid #E6E9EE', borderRadius: '6px', backgroundColor: '#FFFFFF', outline: 'none' }}
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="this_week">Past 7 Days</option>
          <option value="this_month">Past 30 Days</option>
          <option value="custom">Specific Date…</option>
        </select>

        {dateFilter === 'custom' && (
          <input
            type="date"
            value={specificDate}
            onChange={(e) => setSpecificDate(e.target.value)}
            style={{ padding: '5px 8px', fontSize: '0.78rem', border: '1px solid #E6E9EE', borderRadius: '6px' }}
          />
        )}

        {(search || cadenceFilter !== 'all' || statusFilter !== 'all' || dateFilter !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setCadenceFilter('all');
              setStatusFilter('all');
              setDateFilter('all');
              setSpecificDate('');
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#DC2626', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' }}
          >
            <RotateCcw size={12} /> Clear Filters
          </button>
        )}
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', color: '#DC2626', borderRadius: '8px', fontSize: '0.84rem' }}>
          {error}
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="sales-card" style={{ padding: '3rem', textAlign: 'center', color: '#6B7280' }}>
          Loading scheduled reminders…
        </div>
      ) : filteredReminders.length === 0 ? (
        <div className="sales-card" style={{ padding: '3rem', textAlign: 'center', color: '#9CA3AF' }}>
          <Clock size={32} color="#D1D5DB" style={{ margin: '0 auto 0.5rem auto' }} />
          <p style={{ margin: 0, fontWeight: '700', fontSize: '0.9rem', color: '#111827' }}>No scheduled reminders found</p>
          <small style={{ fontSize: '0.78rem' }}>When leads are moved to Interested or Quote Sent, cadences schedule automatically.</small>
        </div>
      ) : viewMode === 'cards' ? (
        /* Grouped By Person (Cards View) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {groupedByLead.map((group) => {
            const initials = getInitials(group.lead_name);
            const sentCount = group.reminders.filter((r) => r.status === 'sent').length;
            const totalCount = group.reminders.length;

            return (
              <div key={group.lead_id || group.lead_name} className="sales-card" style={{ overflow: 'hidden' }}>
                {/* Lead Header */}
                <div
                  style={{
                    padding: '0.85rem 1.25rem',
                    backgroundColor: '#F9FAFB',
                    borderBottom: '1px solid #E6E9EE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '50%',
                        backgroundColor: '#E8F6FA',
                        color: '#1D667C',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '0.82rem',
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '0.92rem', color: '#111827' }}>{group.lead_name}</strong>
                        {group.lead_company && (
                          <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>• {group.lead_company}</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem', color: '#6B7280', marginTop: '2px' }}>
                        <span className="num">{group.lead_phone}</span>
                        {group.lead_phone && (
                          <a href={`tel:${group.lead_phone}`} style={{ color: '#2A9CB8', textDecoration: 'none' }}>
                            <Phone size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <span
                    className="badge-status"
                    style={{
                      backgroundColor: sentCount === totalCount ? '#DCFCE7' : '#F1F3F6',
                      color: sentCount === totalCount ? '#166534' : '#4B5563',
                      fontSize: '0.72rem',
                    }}
                  >
                    {sentCount === totalCount ? '✓ All Sent' : `${sentCount} / ${totalCount} Sent`}
                  </span>
                </div>

                {/* Line Items */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {group.reminders.map((rem, idx) => {
                    const { date, time } = formatDateParts(rem.scheduled_for);
                    const cadenceBadge = getCadenceBadge(rem.day_number);
                    const isSent = rem.status === 'sent';
                    const isDue = rem.status === 'pending' && new Date(rem.scheduled_for).getTime() <= Date.now();
                    const waUrl = getWhatsAppUrl(rem);

                    return (
                      <div
                        key={rem.id}
                        style={{
                          padding: '0.75rem 1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '10px',
                          borderBottom: idx < group.reminders.length - 1 ? '1px solid #F1F3F6' : 'none',
                          backgroundColor: isDue ? '#FFFDF8' : '#FFFFFF',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span
                            className="badge-status"
                            style={{
                              backgroundColor: cadenceBadge.bg,
                              color: cadenceBadge.color,
                              fontSize: '0.7rem',
                              minWidth: '50px',
                              justifyContent: 'center',
                            }}
                          >
                            {cadenceBadge.label}
                          </span>
                          <div>
                            <div className="num" style={{ fontSize: '0.82rem', fontWeight: '700', color: '#111827' }}>
                              {date}
                            </div>
                            <div className="num" style={{ fontSize: '0.7rem', color: '#6B7280' }}>
                              {time}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isSent ? (
                            <span className="badge-status" style={{ backgroundColor: '#DCFCE7', color: '#166534', fontSize: '0.7rem' }}>
                              <Check size={11} /> Sent
                            </span>
                          ) : isDue ? (
                            <span className="badge-status" style={{ backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '0.7rem' }}>
                              <span className="badge-status-dot" style={{ backgroundColor: '#DC2626' }} /> Due Now
                            </span>
                          ) : (
                            <span className="badge-status" style={{ backgroundColor: '#F1F3F6', color: '#4B5563', fontSize: '0.7rem' }}>
                              <Clock size={11} /> Upcoming
                            </span>
                          )}
                        </div>

                        <div>
                          {isDue ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-primary-action"
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem' }}
                            >
                              <Send size={11} /> Send WhatsApp
                            </a>
                          ) : isSent ? (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-secondary-action"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                            >
                              <MessageSquare size={11} /> Resend
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Scheduled</span>
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
        /* Flat Table View (Component 3.2) */
        <div className="surfsync-table-container">
          <table className="surfsync-table">
            <thead>
              <tr>
                <th style={{ width: '36px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={filteredReminders.length > 0 && selectedIds.length === filteredReminders.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th>Client / Contact</th>
                <th>Cadence</th>
                <th>Scheduled Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredReminders.map((reminder) => {
                const now = Date.now();
                const isDue = reminder.status === 'pending' && new Date(reminder.scheduled_for).getTime() <= now;
                const isSent = reminder.status === 'sent';
                const cadenceBadge = getCadenceBadge(reminder.day_number);
                const { date, time } = formatDateParts(reminder.scheduled_for);
                const waUrl = getWhatsAppUrl(reminder);

                return (
                  <tr key={reminder.id}>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(reminder.id)}
                        onChange={() => toggleSelectRow(reminder.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: '700', color: '#111827' }}>{reminder.lead_name}</div>
                      <div style={{ fontSize: '0.74rem', color: '#6B7280' }}>
                        {reminder.lead_company ? `${reminder.lead_company} • ` : ''}
                        <span className="num">{reminder.lead_phone}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge-status" style={{ backgroundColor: cadenceBadge.bg, color: cadenceBadge.color, fontSize: '0.68rem' }}>
                        {cadenceBadge.label}
                      </span>
                    </td>
                    <td>
                      <div className="num" style={{ fontWeight: '700', color: '#111827' }}>{date}</div>
                      <div className="num" style={{ fontSize: '0.72rem', color: '#6B7280' }}>{time}</div>
                    </td>
                    <td>
                      {isSent ? (
                        <span className="badge-status" style={{ backgroundColor: '#DCFCE7', color: '#166534', fontSize: '0.7rem' }}>
                          ✓ Sent
                        </span>
                      ) : isDue ? (
                        <span className="badge-status" style={{ backgroundColor: '#FEE2E2', color: '#DC2626', fontSize: '0.7rem' }}>
                          Due Now
                        </span>
                      ) : (
                        <span className="badge-status" style={{ backgroundColor: '#F1F3F6', color: '#4B5563', fontSize: '0.7rem' }}>
                          Upcoming
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {isDue ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-primary-action"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                        >
                          <Send size={11} /> Send
                        </a>
                      ) : isSent ? (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary-action"
                          style={{ padding: '0.3rem 0.65rem', fontSize: '0.72rem' }}
                        >
                          Resend
                        </a>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>Queued</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
