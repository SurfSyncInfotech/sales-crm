import { Sparkles, GitBranch, Play, CheckCircle2, Sliders, Shield } from 'lucide-react';
import { JOURNEY } from '../features/workflow/mockData';
import JourneyFlow from '../features/workflow/components/JourneyFlow';

const RULES = [
  { name: 'New Inbound Lead Ingest', when: 'Lead created via any integration or API', then: 'Auto-assign by domain specialization, create first-contact task, trigger welcome WhatsApp message', on: true },
  { name: 'SLA Escalation Alert', when: 'First-response SLA window (15 mins) exceeded', then: 'Notify rep via push alert, escalate to company manager if unresolved after 30 mins', on: true },
  { name: 'Inbound Customer Reply', when: 'Client replies on WhatsApp or Email', then: 'Pause automated follow-up messages, ping rep immediately, update engagement score', on: true },
  { name: 'Quotation Delivered Follow-Up', when: 'Admin approves & quotation status becomes Sent', then: 'Transition to Phase 2 cadence, schedule Day 2 and Day 5 check-in tasks', on: true },
  { name: 'Client Opt-out & Compliance', when: 'Customer sends STOP or opts out', then: 'Suppress all outbound automated sequences and flag as DND in system', on: true },
];

export default function AutomationPage() {
  return (
    <div className="automation-page" style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F68713', marginBottom: '4px' }}>
          <span>Commercial Operations</span>
          <span style={{ color: '#D1D5DB' }}>/</span>
          <span>Automation Engine</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em', fontFamily: 'Manrope, sans-serif' }}>
          Lead Journey & Behavioral Triggers
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
          Configurable sequence workflows controlling client lifecycle progression from multi-source capture to contract close.
        </p>
      </div>

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', alignItems: 'start' }}>
        {/* Left Card: End-to-End Flow */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #E6E9EE' }}>
            <GitBranch size={18} color="#2A9CB8" />
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
                End-to-End Lifecycle Sequence
              </h2>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Linear stage progression with auto-cadence stops</span>
            </div>
          </div>

          <JourneyFlow steps={JOURNEY} />
        </div>

        {/* Right Card: Active Rules */}
        <div style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #E6E9EE' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={18} color="#F68713" />
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
                  Active Execution Triggers
                </h2>
                <span style={{ fontSize: '12px', color: '#6B7280' }}>System rules handling automated handoffs</span>
              </div>
            </div>
            <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#FFF3E6', color: '#B65807', padding: '2px 8px', borderRadius: '999px' }}>
              {RULES.length} Rules Active
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {RULES.map((r) => (
              <div
                key={r.name}
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E6E9EE',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div>
                  <strong style={{ fontSize: '13px', color: '#111827', fontFamily: 'Manrope, sans-serif' }}>{r.name}</strong>
                  <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '6px', lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 700, color: '#2A9CB8' }}>When: </span>
                    {r.when}
                  </div>
                  <div style={{ fontSize: '12px', color: '#4B5563', marginTop: '3px', lineHeight: 1.4 }}>
                    <span style={{ fontWeight: 700, color: '#F68713' }}>Then: </span>
                    {r.then}
                  </div>
                </div>

                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: r.on ? '#ECFDF5' : '#F3F4F6',
                  color: r.on ? '#059669' : '#6B7280',
                  padding: '3px 8px',
                  borderRadius: '999px',
                  whiteSpace: 'nowrap',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: r.on ? '#059669' : '#9CA3AF' }} />
                  {r.on ? 'Active' : 'Paused'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
