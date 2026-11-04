import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ListChecks,
  MessageCircle,
  Phone,
  Users,
  Check,
  RotateCw,
} from 'lucide-react';
import { companyApi } from '../api/client';

const TYPE_ICON = { call: Phone, whatsapp: MessageCircle, meeting: Users, task: ListChecks };

function formatRelativeDue(dateVal, isOverdue) {
  if (!dateVal) return '—';
  const target = new Date(dateVal).getTime();
  if (isNaN(target)) return '—';
  const diffMs = Math.abs(target - Date.now());
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let timeStr = '';
  if (diffHours < 1) {
    const mins = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    timeStr = `${mins}m`;
  } else if (diffHours < 24) {
    timeStr = `${diffHours}h`;
  } else {
    timeStr = `${diffDays}d`;
  }

  return isOverdue ? `Overdue ${timeStr} ago` : `Due in ${timeStr}`;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('open');
  const [metrics, setMetrics] = useState({ pending: 0, overdue: 0, completed: 0, total: 0 });

  async function loadTasks(silent = false) {
    if (!silent) setLoading(true);
    try {
      const res = await companyApi.tasks();
      const raw = res.tasks || [];
      const now = Date.now();

      const mapped = raw.map((r) => {
        const isDone = r.status === 'sent';
        const isOverdue = !isDone && new Date(r.scheduled_for).getTime() < now;
        let title = 'Follow-up cadence';
        if (r.phase === 'phase_2_post_quote') {
          title = `Quotation Follow-Up (Day ${r.day_number})`;
        } else if (r.day_number) {
          title = `Interested Lead Follow-Up (Day ${r.day_number})`;
        }

        return {
          id: r.id,
          leadId: r.lead_id,
          title,
          type: 'whatsapp',
          leadName: r.lead_name || `Lead #${r.lead_id}`,
          leadPhone: r.lead_phone,
          leadCompany: r.lead_company,
          salespersonName: r.salesperson_name || 'Assigned Rep',
          due: r.scheduled_for,
          status: r.status,
          done: isDone,
          overdue: isOverdue,
        };
      });

      setTasks(mapped);
      if (res.metrics) {
        setMetrics(res.metrics);
      } else {
        const openCnt = mapped.filter((t) => !t.done && !t.overdue).length;
        const overdueCnt = mapped.filter((t) => t.overdue).length;
        const doneCnt = mapped.filter((t) => t.done).length;
        setMetrics({ pending: openCnt, overdue: overdueCnt, completed: doneCnt, total: mapped.length });
      }
    } catch (err) {
      console.error('Failed to load company tasks:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
    const interval = setInterval(() => loadTasks(true), 20000);
    return () => clearInterval(interval);
  }, []);

  async function handleToggle(taskId, currentDone) {
    const nextDone = !currentDone;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, done: nextDone, status: nextDone ? 'sent' : 'pending', overdue: false }
          : t
      )
    );

    try {
      await companyApi.completeTask(taskId, { done: nextDone });
      loadTasks(true);
    } catch (err) {
      console.error('Failed to toggle task:', err);
      loadTasks(true);
    }
  }

  const openList = useMemo(() => tasks.filter((t) => !t.done), [tasks]);
  const overdueList = useMemo(() => tasks.filter((t) => t.overdue), [tasks]);
  const doneList = useMemo(() => tasks.filter((t) => t.done), [tasks]);

  const shown = useMemo(() => {
    const list = tab === 'overdue' ? overdueList : tab === 'done' ? doneList : openList;
    return list.slice().sort((a, b) => new Date(a.due).getTime() - new Date(b.due).getTime());
  }, [tab, openList, overdueList, doneList]);

  return (
    <div className="tasks-page" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F68713', marginBottom: '4px' }}>
            <span>Commercial Operations</span>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span>Task Cadence</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em', fontFamily: 'Manrope, sans-serif' }}>
            Follow-Up Tasks & Reminders
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
            Live WhatsApp follow-up cadence, quotation touchpoints, and scheduled rep tasks across the company.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadTasks(false)}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #D1D5DB',
            borderRadius: '8px',
            padding: '7px 14px',
            fontSize: '12px',
            fontWeight: 700,
            color: '#374151',
            cursor: 'pointer',
          }}
        >
          <RotateCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Stat Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Pending Tasks */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Pending Tasks
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#E8F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2A9CB8' }}>
              <CalendarClock size={16} />
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="num" style={{ fontSize: '28px', fontWeight: 800, color: '#111827', fontFamily: 'Manrope, sans-serif' }}>
              {openList.length}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#2A9CB8', backgroundColor: '#E8F6FA', padding: '2px 8px', borderRadius: '999px' }}>
              Awaiting Action
            </span>
          </div>
        </div>

        {/* Overdue Alerts */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Overdue Alerts
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="num" style={{ fontSize: '28px', fontWeight: 800, color: overdueList.length > 0 ? '#DC2626' : '#111827', fontFamily: 'Manrope, sans-serif' }}>
              {overdueList.length}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', backgroundColor: '#FEF2F2', padding: '2px 8px', borderRadius: '999px' }}>
              Escalation Risk
            </span>
          </div>
        </div>

        {/* Completed Touchpoints */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderRadius: '12px',
          padding: '16px 20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Completed Touchpoints
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#059669' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="num" style={{ fontSize: '28px', fontWeight: 800, color: '#111827', fontFamily: 'Manrope, sans-serif' }}>
              {doneList.length}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', backgroundColor: '#ECFDF5', padding: '2px 8px', borderRadius: '999px' }}>
              Fulfilled
            </span>
          </div>
        </div>
      </div>

      {/* Main Task List Card */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E6E9EE',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}>
        {/* Card Header with Segmented Tabs */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #E6E9EE',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ListChecks size={18} color="#F68713" />
            <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
              Scheduled Follow-Up Queue
            </h2>
          </div>

          {/* Segmented Tabs */}
          <div className="lead-tabs" style={{ padding: '3px' }}>
            <button
              type="button"
              className={tab === 'open' ? 'active' : ''}
              onClick={() => setTab('open')}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              Open ({openList.length})
            </button>
            <button
              type="button"
              className={tab === 'overdue' ? 'active' : ''}
              onClick={() => setTab('overdue')}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              Overdue ({overdueList.length})
            </button>
            <button
              type="button"
              className={tab === 'done' ? 'active' : ''}
              onClick={() => setTab('done')}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              Done ({doneList.length})
            </button>
          </div>
        </div>

        {/* Task Items List */}
        {loading && tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#6B7280' }}>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>Loading scheduled tasks…</div>
          </div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: '#9CA3AF' }}>
            <CheckCircle2 size={36} color="#059669" style={{ margin: '0 auto 8px auto', opacity: 0.8 }} />
            <p style={{ fontWeight: 700, margin: 0, color: '#111827', fontSize: '14px' }}>All caught up!</p>
            <span style={{ fontSize: '12px' }}>
              {tab === 'done' ? 'No completed tasks yet.' : tab === 'overdue' ? 'No overdue follow-up tasks.' : 'No pending tasks in the queue.'}
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {shown.map((t, idx) => {
              const Icon = TYPE_ICON[t.type] || MessageCircle;

              return (
                <div
                  key={t.id}
                  style={{
                    padding: '14px 20px',
                    borderBottom: idx === shown.length - 1 ? 'none' : '1px solid #E6E9EE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    backgroundColor: t.done ? '#FAFAFA' : '#FFFFFF',
                    transition: 'background-color 0.12s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = t.done ? '#FAFAFA' : '#FFFFFF'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                    {/* Checkbox button */}
                    <button
                      type="button"
                      onClick={() => handleToggle(t.id, t.done)}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '6px',
                        border: t.done ? 'none' : '2px solid #D1D5DB',
                        backgroundColor: t.done ? '#059669' : '#FFFFFF',
                        color: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}
                      title={t.done ? 'Mark as pending' : 'Mark as completed'}
                    >
                      {t.done && <Check size={14} strokeWidth={3} />}
                    </button>

                    {/* Task Type Icon */}
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#F3F4F6',
                      color: '#4B5563',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Icon size={15} />
                    </div>

                    {/* Title & Lead info */}
                    <div>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: t.done ? '#9CA3AF' : '#111827',
                        textDecoration: t.done ? 'line-through' : 'none',
                        fontFamily: 'Manrope, sans-serif',
                      }}>
                        {t.title}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px', fontWeight: 600 }}>
                        Contact: {t.leadName} {t.leadPhone ? `(${t.leadPhone})` : ''} {t.leadCompany ? `• ${t.leadCompany}` : ''}
                      </div>
                    </div>
                  </div>

                  {/* Right Status & Rep badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: t.done ? '#ECFDF5' : t.overdue ? '#FEF2F2' : '#F3F4F6',
                      color: t.done ? '#059669' : t.overdue ? '#DC2626' : '#4B5563',
                      border: t.done ? '1px solid #A7F3D0' : t.overdue ? '1px solid #FECACA' : '1px solid #E5E7EB',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                    }}>
                      {t.done ? 'Completed' : formatRelativeDue(t.due, t.overdue)}
                    </span>

                    {t.salespersonName && (
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          backgroundColor: '#E8F6FA',
                          color: '#1D667C',
                          fontWeight: 800,
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                        title={`Rep: ${t.salespersonName}`}
                      >
                        {t.salespersonName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
