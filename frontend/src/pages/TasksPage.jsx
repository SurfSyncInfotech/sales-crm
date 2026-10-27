import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ListChecks,
  MessageCircle,
  Phone,
  Users,
  Check,
  Clock,
  Sparkles,
} from 'lucide-react';
import { useWorkflow } from '../features/workflow/WorkflowContext';
import { timeAgo } from '../features/workflow/useWorkflowStore';

const TYPE_ICON = { call: Phone, whatsapp: MessageCircle, meeting: Users, task: ListChecks };

export default function TasksPage() {
  const wf = useWorkflow();
  const [tab, setTab] = useState('open');

  const [now] = useState(() => Date.now());
  const enriched = useMemo(
    () =>
      wf.tasks.map((t) => ({
        ...t,
        overdue: !t.done && new Date(t.due).getTime() < now,
      })),
    [wf.tasks, now]
  );

  const open = enriched.filter((t) => !t.done);
  const overdue = enriched.filter((t) => t.overdue);
  const done = enriched.filter((t) => t.done);

  const shown = { open, overdue, done }[tab].slice().sort((a, b) => new Date(a.due) - new Date(b.due));

  return (
    <div className="tasks-page" style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F68713', marginBottom: '4px' }}>
          <span>Commercial Operations</span>
          <span style={{ color: '#D1D5DB' }}>/</span>
          <span>Task Cadence</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em', fontFamily: 'Manrope, sans-serif' }}>
          Cadence Tasks & Follow-Up Reminders
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
          Automated customer touchpoints and cadence reminders to ensure zero lead drop-off across representative pipelines.
        </p>
      </div>

      {/* KPI Stat Widgets (Component 3.1) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {/* Open Tasks */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderLeft: '4px solid #2A9CB8',
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
              {open.length}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#2A9CB8', backgroundColor: '#E8F6FA', padding: '2px 8px', borderRadius: '999px' }}>
              Awaiting Action
            </span>
          </div>
        </div>

        {/* Overdue Tasks */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderLeft: '4px solid #DC2626',
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
            <span className="num" style={{ fontSize: '28px', fontWeight: 800, color: overdue.length > 0 ? '#DC2626' : '#111827', fontFamily: 'Manrope, sans-serif' }}>
              {overdue.length}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', backgroundColor: '#FEF2F2', padding: '2px 8px', borderRadius: '999px' }}>
              Escalation Risk
            </span>
          </div>
        </div>

        {/* Completed Tasks */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderLeft: '4px solid #059669',
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
              {done.length}
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

          {/* Segmented Tabs (Component 3.4) */}
          <div className="lead-tabs" style={{ padding: '3px' }}>
            <button
              type="button"
              className={tab === 'open' ? 'active' : ''}
              onClick={() => setTab('open')}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              Open ({open.length})
            </button>
            <button
              type="button"
              className={tab === 'overdue' ? 'active' : ''}
              onClick={() => setTab('overdue')}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              Overdue ({overdue.length})
            </button>
            <button
              type="button"
              className={tab === 'done' ? 'active' : ''}
              onClick={() => setTab('done')}
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              Done ({done.length})
            </button>
          </div>
        </div>

        {/* Task Items List */}
        {shown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: '#9CA3AF' }}>
            <CheckCircle2 size={36} color="#059669" style={{ margin: '0 auto 8px auto', opacity: 0.8 }} />
            <p style={{ fontWeight: 700, margin: 0, color: '#111827', fontSize: '14px' }}>All caught up!</p>
            <span style={{ fontSize: '12px' }}>No tasks found in this view.</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {shown.map((t, idx) => {
              const Icon = TYPE_ICON[t.type] || ListChecks;
              const lead = wf.leadById[t.leadId];
              const owner = wf.userById[t.owner];

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
                      onClick={() => wf.toggleTask(t.id)}
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
                      title={t.done ? 'Mark as not done' : 'Mark as completed'}
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
                      {lead?.name && (
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px', fontWeight: 600 }}>
                          Contact: {lead.name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Status & Rep badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: t.overdue ? '#FEF2F2' : '#F3F4F6',
                      color: t.overdue ? '#DC2626' : '#4B5563',
                      border: t.overdue ? '1px solid #FECACA' : '1px solid #E5E7EB',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      whiteSpace: 'nowrap',
                    }}>
                      {t.overdue ? `Overdue ${timeAgo(t.due)}` : `Due ${timeAgo(t.due)}`}
                    </span>

                    {owner && (
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
                        title={owner.name}
                      >
                        {owner.name.charAt(0).toUpperCase()}
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
