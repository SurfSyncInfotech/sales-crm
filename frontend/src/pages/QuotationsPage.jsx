import { FileCheck2, FilePen, Send, Hourglass } from 'lucide-react';
import { Avatar, Badge, Card, PageHeader, StatCard } from '../components/ui';
import { useWorkflow } from '../features/workflow/WorkflowContext';
import { money, timeAgo } from '../features/workflow/useWorkflowStore';

const COLUMNS = [
  { status: 'requested', title: 'Requested', hint: 'Waiting for the manager', tone: 'warm' },
  { status: 'preparing', title: 'Preparing', hint: 'Being drafted', tone: 'neutral' },
  { status: 'sent', title: 'Sent', hint: 'Follow-up running', tone: 'green' },
  { status: 'accepted', title: 'Accepted', hint: 'Won deals', tone: 'green' },
];

const NEXT = {
  requested: { label: 'Start preparing', to: 'preparing' },
  preparing: { label: 'Approve and send', to: 'sent' },
  sent: { label: 'Mark accepted', to: 'accepted' },
};

export default function QuotationsPage() {
  const wf = useWorkflow();
  const by = (s) => wf.quotes.filter((q) => q.status === s);

  return (
    <div className="page">
      <PageHeader
        eyebrow="Quotations"
        title="Quotation workflow"
        subtitle="Interested leads raise a request. The manager prepares, approves and sends it; follow-up starts automatically."
      />

      <section className="ui-stat-grid">
        <StatCard icon={Hourglass} label="Awaiting manager" value={by('requested').length} tone="warm" />
        <StatCard icon={FilePen} label="In preparation" value={by('preparing').length} />
        <StatCard icon={Send} label="Sent" value={by('sent').length} tone="green" />
        <StatCard icon={FileCheck2} label="Accepted" value={by('accepted').length} tone="green" />
      </section>

      <div className="wf-quote-grid">
        {COLUMNS.map((col) => (
          <Card key={col.status} title={col.title} hint={col.hint} className="wf-quote-col">
            {by(col.status).length === 0 && <p className="muted wf-col-empty">Nothing here</p>}
            {by(col.status).map((q) => {
              const lead = wf.leadById[q.leadId];
              const rep = wf.userById[q.requestedBy];
              const next = NEXT[q.status];
              return (
                <article key={q.id} className="wf-quote">
                  <div className="wf-card-top">
                    <strong>{q.id}</strong>
                    <Badge tone={col.tone}>{money(q.amount)}</Badge>
                  </div>
                  <p>{lead?.name}</p>
                  <div className="wf-quote-foot">
                    {rep && <Avatar name={rep.name} size={22} />}
                    <small className="muted">{timeAgo(q.at)}</small>
                  </div>
                  {next && (
                    <button type="button" className="secondary-btn wf-small-btn" onClick={() => wf.setQuoteStatus(q.id, next.to)}>
                      {next.label}
                    </button>
                  )}
                </article>
              );
            })}
          </Card>
        ))}
      </div>
    </div>
  );
}
