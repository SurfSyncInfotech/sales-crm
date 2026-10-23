import { useState } from 'react';
import { MessageCircle, PlugZap } from 'lucide-react';
import { Avatar, Badge, Card, PageHeader, Tabs } from '../components/ui';
import { useWorkflow } from '../features/workflow/WorkflowContext';

function DomainsPanel({ wf }) {
  return (
    <div className="wf-two-col">
      <Card title="Domains" hint="A lead's domain decides who can receive it">
        <ul className="wf-domain-list">
          {wf.domains.map((d) => (
            <li key={d.id}>
              <strong>{d.name}</strong>
              <div className="wf-chips">
                {d.keywords.map((k) => (
                  <Badge key={k}>{k}</Badge>
                ))}
              </div>
              <small className="muted">Matched in the enquiry text, campaign or form</small>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Salesperson mapping" hint="Round-robin inside each domain, weighted by workload">
        <ul className="wf-load-list">
          {wf.team.map((u) => {
            const pct = Math.round((u.open / u.capacity) * 100);
            return (
              <li key={u.id}>
                <Avatar name={u.name} size={32} />
                <div className="wf-load-main">
                  <div className="wf-load-row">
                    <strong>{u.name}</strong>
                    <small className="muted">
                      {u.open}/{u.capacity} open
                    </small>
                  </div>
                  <div className="wf-meter">
                    <i style={{ width: `${pct}%` }} className={pct > 80 ? 'high' : ''} />
                  </div>
                  <div className="wf-chips">
                    {u.domains.map((id) => (
                      <Badge key={id} tone="green">
                        {wf.domainById[id].name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function WhatsAppPanel() {
  return (
    <div className="wf-two-col">
      <Card title="WhatsApp connection" hint="Provisioned through the SmartPing reseller panel">
        <div className="wf-connect">
          <span className="wf-connect-icon">
            <MessageCircle size={22} />
          </span>
          <div>
            <strong>Not connected</strong>
            <p className="muted">Waiting for SmartPing reseller API access. This panel will show number status and quality rating.</p>
          </div>
          <Badge tone="warm" dot>
            Pending
          </Badge>
        </div>
        <button type="button" className="primary-btn" disabled>
          <PlugZap size={15} /> Connect WhatsApp
        </button>
      </Card>

      <Card title="Message templates" hint="WhatsApp requires approved templates for first contact">
        <ul className="wf-rules">
          {[
            ['Welcome message', 'Sent when a lead arrives'],
            ['Follow-up reminder', 'Sent if the lead goes quiet'],
            ['Quotation sent', 'Sent with the quote PDF'],
          ].map(([name, text]) => (
            <li key={name}>
              <div>
                <strong>{name}</strong>
                <p className="muted">{text}</p>
              </div>
              <Badge>Draft</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export default function WorkflowSettingsPage() {
  const wf = useWorkflow();
  const [tab, setTab] = useState('domains');

  return (
    <div className="page">
      <PageHeader eyebrow="Settings" title="Workflow settings" subtitle="Configure how leads are routed and how WhatsApp is connected." />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'domains', label: 'Domains and assignment' },
          { value: 'whatsapp', label: 'WhatsApp' },
        ]}
      />
      {tab === 'domains' ? <DomainsPanel wf={wf} /> : <WhatsAppPanel />}
    </div>
  );
}
