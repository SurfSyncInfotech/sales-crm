import { useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, CheckCircle2, ListChecks, MessageCircle, Phone, Users, Check } from 'lucide-react';
import { Avatar, Badge, Card, EmptyState, PageHeader, StatCard, Tabs } from '../components/ui';
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
    <div className="page">
      <PageHeader eyebrow="Follow-ups" title="Tasks and reminders" subtitle="Nothing slips: overdue tasks are flagged and escalate to the manager." />

      <section className="ui-stat-grid">
        <StatCard icon={CalendarClock} label="Open" value={open.length} />
        <StatCard icon={AlertTriangle} label="Overdue" value={overdue.length} tone="hot" note="Needs attention" />
        <StatCard icon={CheckCircle2} label="Completed" value={done.length} tone="green" />
      </section>

      <Card
        title="Task list"
        actions={
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { value: 'open', label: 'Open', count: open.length },
              { value: 'overdue', label: 'Overdue', count: overdue.length },
              { value: 'done', label: 'Done', count: done.length },
            ]}
          />
        }
        flush
      >
        {shown.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="All clear" text="No tasks in this view." />
        ) : (
          <ul className="wf-tasks">
            {shown.map((t) => {
              const Icon = TYPE_ICON[t.type] || ListChecks;
              const lead = wf.leadById[t.leadId];
              const owner = wf.userById[t.owner];
              return (
                <li key={t.id} className={t.done ? 'done' : ''}>
                  <button
                    type="button"
                    className={`wf-check ${t.done ? 'on' : ''}`}
                    onClick={() => wf.toggleTask(t.id)}
                    aria-label={t.done ? 'Mark as not done' : 'Mark as done'}
                  >
                    {t.done && <Check size={14} />}
                  </button>
                  <span className="wf-task-icon">
                    <Icon size={16} />
                  </span>
                  <div className="wf-task-main">
                    <strong>{t.title}</strong>
                    <small className="muted">{lead?.name}</small>
                  </div>
                  <Badge tone={t.overdue ? 'hot' : 'neutral'}>{t.overdue ? `Overdue ${timeAgo(t.due)}` : `Due ${timeAgo(t.due)}`}</Badge>
                  {owner && <Avatar name={owner.name} size={26} />}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
