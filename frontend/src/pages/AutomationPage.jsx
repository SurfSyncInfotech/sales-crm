import { Card, PageHeader, Badge } from '../components/ui';
import { JOURNEY } from '../features/workflow/mockData';
import JourneyFlow from '../features/workflow/components/JourneyFlow';

const RULES = [
  { name: 'New inbound lead', when: 'Lead created', then: 'Assign by domain, create first-contact task, send welcome template', on: true },
  { name: 'No first contact', when: 'First-response SLA exceeded', then: 'Remind owner, then escalate to manager', on: true },
  { name: 'Customer replies', when: 'Inbound WhatsApp reply', then: 'Pause follow-up messages, notify owner, rescore', on: true },
  { name: 'Quotation sent', when: 'Quote status becomes Sent', then: 'Create follow-up task and schedule nudge', on: true },
  { name: 'Opt-out', when: 'Customer sends STOP', then: 'Suppress all marketing messages', on: true },
];

export default function AutomationPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Automation"
        title="Lead journey"
        subtitle="The path every lead follows from capture to close. Each step is configurable per company."
      />

      <div className="wf-two-col">
        <Card title="End-to-end flow">
          <JourneyFlow steps={JOURNEY} />
        </Card>

        <Card title="Active rules" hint="Trigger, then conditions, then actions">
          <ul className="wf-rules">
            {RULES.map((r) => (
              <li key={r.name}>
                <div>
                  <strong>{r.name}</strong>
                  <p className="muted">
                    <b>When</b> {r.when}
                  </p>
                  <p className="muted">
                    <b>Then</b> {r.then}
                  </p>
                </div>
                <Badge tone={r.on ? 'green' : 'neutral'} dot>
                  {r.on ? 'On' : 'Paused'}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
