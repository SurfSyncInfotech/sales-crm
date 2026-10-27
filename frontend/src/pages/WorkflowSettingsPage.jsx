import { useState } from 'react';
import { MessageCircle, PlugZap, Network, Users, Sliders, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';
import { useWorkflow } from '../features/workflow/WorkflowContext';

function DomainsPanel({ wf }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', alignItems: 'start' }}>
      {/* Domains Card */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E6E9EE',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}>
        <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #E6E9EE' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
            Domain Categorization
          </h2>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>
            Inbound enquiry keywords map leads automatically to specialized rep pools
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {wf.domains.map((d) => (
            <div
              key={d.id}
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E6E9EE',
                borderRadius: '10px',
                padding: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag size={13} color="#F68713" />
                <strong style={{ fontSize: '14px', color: '#111827', fontFamily: 'Manrope, sans-serif' }}>{d.name}</strong>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0' }}>
                {d.keywords.map((k) => (
                  <span
                    key={k}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E6E9EE',
                      color: '#374151',
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {k}
                  </span>
                ))}
              </div>
              <small style={{ fontSize: '11px', color: '#9CA3AF' }}>Matched across enquiry message, campaign tags, or website forms</small>
            </div>
          ))}
        </div>
      </div>

      {/* Salesperson Capacity & Workload Mapping */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E6E9EE',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}>
        <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #E6E9EE' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
            Sales Representative Load Balancing
          </h2>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>
            Workload-weighted round-robin distribution inside each specialization
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {wf.team.map((u) => {
            const pct = Math.round((u.open / u.capacity) * 100);
            return (
              <div
                key={u.id}
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E6E9EE',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#E8F6FA',
                  color: '#1D667C',
                  fontWeight: 800,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {u.name.charAt(0).toUpperCase()}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '13px', color: '#111827', fontFamily: 'Manrope, sans-serif' }}>{u.name}</strong>
                    <span className="num" style={{ fontSize: '11px', color: '#6B7280', fontWeight: 700 }}>
                      {u.open} / {u.capacity} active leads
                    </span>
                  </div>

                  {/* Progress Meter */}
                  <div style={{ width: '100%', height: '6px', backgroundColor: '#E2E8F0', borderRadius: '999px', margin: '6px 0', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: pct > 80 ? '#DC2626' : '#F68713',
                        borderRadius: '999px',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>

                  {/* Domain Badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {u.domains.map((id) => (
                      <span
                        key={id}
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          backgroundColor: '#ECFDF5',
                          color: '#059669',
                          border: '1px solid #A7F3D0',
                          padding: '1px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        {wf.domainById[id]?.name || 'Domain'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WhatsAppPanel() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', alignItems: 'start' }}>
      {/* WhatsApp Connection */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E6E9EE',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}>
        <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #E6E9EE' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
            WhatsApp Business Integration
          </h2>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>
            Multi-agent customer messaging gateway & official WABA status
          </span>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E6E9EE',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
        }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: '#ECFDF5', color: '#047857', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <MessageCircle size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827' }}>SmartPing Reseller Integration</div>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6B7280' }}>
              Connected to active WABA phone number. Real-time delivery callbacks & agent messaging active.
            </p>
          </div>
          <span style={{
            fontSize: '11px',
            fontWeight: 800,
            backgroundColor: '#ECFDF5',
            color: '#059669',
            padding: '3px 8px',
            borderRadius: '999px',
          }}>
            Active
          </span>
        </div>

        <button
          type="button"
          style={{
            height: '38px',
            padding: '0 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: '#F68713',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <PlugZap size={15} />
          <span>Configure Webhooks</span>
        </button>
      </div>

      {/* Message Templates */}
      <div style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E6E9EE',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}>
        <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #E6E9EE' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
            Meta Approved Message Templates
          </h2>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>
            Outbound templates authorized for initial contact and cadence sequences
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            ['Welcome & Service Intro', 'Delivered automatically upon new lead acquisition', 'Approved'],
            ['Follow-Up Cadence Check-in', 'Triggered when client goes quiet past SLA window', 'Approved'],
            ['Official Proposal Notification', 'Accompanies PDF quotation delivery with link', 'Approved'],
          ].map(([name, text, status]) => (
            <div
              key={name}
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E6E9EE',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div>
                <strong style={{ fontSize: '13px', color: '#111827', fontFamily: 'Manrope, sans-serif' }}>{name}</strong>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#6B7280' }}>{text}</p>
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                backgroundColor: '#ECFDF5',
                color: '#059669',
                padding: '2px 8px',
                borderRadius: '6px',
              }}>
                {status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WorkflowSettingsPage() {
  const wf = useWorkflow();
  const [tab, setTab] = useState('domains');

  return (
    <div className="workflow-settings-page" style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#F68713', marginBottom: '4px' }}>
          <span>Commercial Operations</span>
          <span style={{ color: '#D1D5DB' }}>/</span>
          <span>System Settings</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.02em', fontFamily: 'Manrope, sans-serif' }}>
          Workflow & Distribution Settings
        </h1>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6B7280' }}>
          Configure automated lead routing rules, domain specializations, representative capacities, and messaging gateways.
        </p>
      </div>

      {/* Segmented Tabs (Component 3.4) */}
      <div className="lead-tabs">
        <button
          type="button"
          className={tab === 'domains' ? 'active' : ''}
          onClick={() => setTab('domains')}
        >
          Domains & Representative Mapping
        </button>
        <button
          type="button"
          className={tab === 'whatsapp' ? 'active' : ''}
          onClick={() => setTab('whatsapp')}
        >
          WhatsApp Business Gateway
        </button>
      </div>

      {tab === 'domains' ? <DomainsPanel wf={wf} /> : <WhatsAppPanel />}
    </div>
  );
}
