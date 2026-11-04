import { useState, useEffect } from 'react';
import {
  GitBranch,
  Zap,
  CheckCircle2,
  Clock,
  Sliders,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MessageSquare,
  PhoneCall,
  Mail,
  Database,
  Search,
  Sparkles,
  ArrowUpRight,
  Activity,
  Layers,
  Cpu,
  X,
  Bot,
  Compass,
} from 'lucide-react';

const WORKFLOWS = [
  {
    id: 'whatsapp-automation',
    title: 'WhatsApp Business Messaging Automation',
    category: 'WhatsApp & Messaging',
    badge: 'Meta WABA API',
    image: '/Whatsapp_Banner_new.png',
    bannerImage: '/Whatsapp_Banner_new.png',
    nodesCount: 8,
    status: 'Active',
    frequency: 'Real-time (Instant)',
    lastExecuted: 'Just now',
    icon: MessageSquare,
    accentColor: '#10B981',
    description:
      'Automates WhatsApp outreach using approved message templates and the WhatsApp Business API. Integrates lead data with message delivery workflows and supports status tracking, error handling, and duplicate prevention for more reliable customer communication.',
    nodesSummary: [
      { name: 'WhatsApp Webhook', type: 'Trigger', desc: 'Inbound message from Meta WABA API' },
      { name: 'Duplicate Prevention', type: 'Condition', desc: 'Checks duplicate prevention & DND compliance' },
      { name: 'Template Dispatcher', type: 'Action', desc: 'Sends approved Meta template message' },
      { name: 'Delivery Status Tracking', type: 'Tracker', desc: 'Tracks sent, delivered, and read statuses' },
      { name: 'CRM Sync & History', type: 'Database', desc: 'Updates conversation status & customer record' },
    ],
    stats: { executions: '1,420 today', successRate: '99.8%', avgLatency: '0.4s' },
  },
  {
    id: 'voice-agent-calling',
    title: 'AI Voice Agent & Automated Outbound Calling',
    category: 'AI Voice Telephony',
    badge: 'Conversational Voice AI',
    image: '/AI-Voice_Agent_new.png',
    nodesCount: 9,
    status: 'Active',
    frequency: 'Instant on New Lead',
    lastExecuted: '4 mins ago',
    icon: PhoneCall,
    accentColor: '#EC4899',
    description:
      'Integrates AI-powered voice agents with automated outbound calling workflows to contact leads, assess their interest, and capture call outcomes. Enables structured extraction of customer responses, call summaries, and follow-up requirements for centralized lead management.',
    nodesSummary: [
      { name: 'Outbound Trigger', type: 'Trigger', desc: 'Instant trigger on newly qualified lead' },
      { name: 'Cloud Telephony Connect', type: 'Voice Engine', desc: 'Establishes direct phone connection via carrier' },
      { name: 'Conversational AI Agent', type: 'NLP / Speech', desc: 'Natural voice interaction & qualification questions' },
      { name: 'Structured Response Extraction', type: 'Analysis', desc: 'Captures call summaries & interest classification' },
      { name: 'Centralized CRM Management', type: 'Handoff', desc: 'Logs outcomes & schedules rep follow-up tasks' },
    ],
    stats: { executions: '340 calls', successRate: '98.9%', avgLatency: '1.2s' },
  },
  {
    id: 'email-outreach-scheduling',
    title: 'Automated Email Outreach & Scheduling',
    category: 'Email Outreach & Scheduling',
    badge: 'Scheduled Drip Engine',
    image: '/Email_new.png',
    nodesCount: 10,
    status: 'Active',
    frequency: 'Scheduled Intervals',
    lastExecuted: '12 mins ago',
    icon: Mail,
    accentColor: '#3B82F6',
    description:
      'Automates personalized, one-by-one email outreach to potential customers. Uses scheduled execution and controlled sending intervals to streamline prospect communication, reduce repetitive manual work, and support scalable lead engagement.',
    nodesSummary: [
      { name: 'Scheduled Execution', type: 'Cron Trigger', desc: 'Controlled batch trigger from prospect queue' },
      { name: 'Data Personalization', type: 'Transform', desc: 'Injects dynamic prospect fields & custom templates' },
      { name: 'Controlled Sending Interval', type: 'Throttling', desc: 'Paces one-by-one delivery to maximize inbox delivery' },
      { name: 'Personalized Email Dispatch', type: 'Send', desc: 'Dispatches tailored outreach message' },
      { name: 'Scalable Lead Engagement', type: 'Audit / CRM', desc: 'Logs delivery status & tracks response timeline' },
    ],
    stats: { executions: '890 sent', successRate: '99.9%', avgLatency: '0.3s' },
  },
  {
    id: 'lead-generation-scraping',
    title: 'Automated Lead Generation & Data Scraping',
    category: 'Lead Generation & Scraping',
    badge: 'Apify LinkedIn & G-Maps',
    image: '/Lead_generation_new.png',
    nodesCount: 10,
    status: 'Active',
    frequency: 'Scheduled Crawl',
    lastExecuted: '25 mins ago',
    icon: Search,
    accentColor: '#F68713',
    description:
      "Automates business lead collection using Apify's LinkedIn and Google Maps scraping tools. Extracts company information, contact details, email addresses, and phone numbers to build a structured lead database for sales and outreach campaigns.",
    nodesSummary: [
      { name: 'Apify Automation Hook', type: 'Trigger', desc: "Scheduled or on-demand crawler trigger via Apify" },
      { name: 'LinkedIn & G-Maps Scraper', type: 'Extractor', desc: 'Scrapes businesses, profiles, and local listings' },
      { name: 'Contact Data Extraction', type: 'Parser', desc: 'Extracts company info, verified emails, and phones' },
      { name: 'Validation & Deduplication', type: 'Filter', desc: 'Deduplicates records against existing CRM database' },
      { name: 'Structured Database Ingest', type: 'Database', desc: 'Builds organized lead pool for sales campaigns' },
    ],
    stats: { executions: '5,000+ records', successRate: '99.4%', avgLatency: '1.8s' },
  },
];

const CATEGORIES = [
  'All',
  'WhatsApp & Messaging',
  'AI Voice Telephony',
  'Email Outreach & Scheduling',
  'Lead Generation & Scraping',
];

export default function AutomationPage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState(WORKFLOWS[0]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [fullscreenModal, setFullscreenModal] = useState(false);

  // Close modal on Escape
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') setFullscreenModal(false);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredWorkflows =
    activeCategory === 'All'
      ? WORKFLOWS
      : WORKFLOWS.filter((w) => w.category === activeCategory);

  function handleZoom(delta) {
    setZoomLevel((prev) => Math.min(2.0, Math.max(0.6, prev + delta)));
  }

  function handleResetZoom() {
    setZoomLevel(1);
  }

  const ActiveIcon = selectedWorkflow.icon;

  return (
    <div
      className="automation-suite-page"
      style={{
        maxWidth: '1440px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* 1. Header & Live Telemetry KPIs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#F68713',
              marginBottom: '6px',
            }}
          >
            <span>Commercial Operations</span>
            <span style={{ color: '#D1D5DB' }}>/</span>
            <span>Enterprise Automation Engine</span>
          </div>
          <h1
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: '#111827',
              margin: 0,
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            Workflow Automation Suite
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#059669',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                padding: '3px 10px',
                borderRadius: '999px',
                letterSpacing: '0.04em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 6px rgba(16, 185, 129, 0.6)',
                }}
              />
              Cluster Active · 4 Live Pipelines
            </span>
          </h1>
          <p style={{ margin: '6px 0 0 0', fontSize: '13.5px', color: '#6B7280', maxWidth: '840px', lineHeight: 1.5 }}>
            Visual node-based pipelines executing WhatsApp Business API messaging, AI outbound voice calls,
            scheduled email outreach, and automated data scraping via Apify LinkedIn & Google Maps.
          </p>
        </div>

        {/* Live Metrics strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E6E9EE',
              borderRadius: '12px',
              padding: '10px 14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#FFF7ED',
                color: '#EA580C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Activity size={17} />
            </div>
            <div>
              <div style={{ fontSize: '10.5px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>
                Delivery Rate
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>99.8%</div>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E6E9EE',
              borderRadius: '12px',
              padding: '10px 14px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Cpu size={17} />
            </div>
            <div>
              <div style={{ fontSize: '10.5px', color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' }}>
                Avg Latency
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827' }}>0.5s</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Category Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
        }}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = activeCategory === cat;
          const count =
            cat === 'All' ? WORKFLOWS.length : WORKFLOWS.filter((w) => w.category === cat).length;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: '7px 14px',
                borderRadius: '999px',
                fontSize: '12.5px',
                fontWeight: isSelected ? 800 : 600,
                border: isSelected ? '1px solid #111827' : '1px solid #E5E7EB',
                backgroundColor: isSelected ? '#111827' : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : '#4B5563',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.1)' : '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <span>{cat}</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '999px',
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : '#F3F4F6',
                  color: isSelected ? '#FFFFFF' : '#6B7280',
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Hero Visual Blueprint Canvas (Spotlight View) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Spotlight Top Bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            marginBottom: '18px',
            paddingBottom: '16px',
            borderBottom: '1px solid #F1F3F5',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: `${selectedWorkflow.accentColor}15`,
                color: selectedWorkflow.accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${selectedWorkflow.accentColor}30`,
                flexShrink: 0,
              }}
            >
              <ActiveIcon size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2
                  style={{
                    fontSize: '18px',
                    fontWeight: 800,
                    color: '#111827',
                    margin: 0,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {selectedWorkflow.title}
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: '#F3F4F6',
                    color: '#374151',
                    border: '1px solid #E5E7EB',
                  }}
                >
                  {selectedWorkflow.nodesCount} Nodes
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    border: '1px solid #A7F3D0',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      backgroundColor: '#10B981',
                    }}
                  />
                  Live Execution
                </span>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: '#4B5563', lineHeight: 1.5, maxWidth: '960px' }}>
                {selectedWorkflow.description}
              </p>
            </div>
          </div>

          {/* Interactive Canvas Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '2px',
              }}
            >
              <button
                type="button"
                onClick={() => handleZoom(-0.15)}
                title="Zoom Out"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  color: '#475569',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ZoomOut size={15} />
              </button>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#334155', minWidth: '38px', textAlign: 'center' }}>
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                type="button"
                onClick={() => handleZoom(0.15)}
                title="Zoom In"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  color: '#475569',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <ZoomIn size={15} />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                title="Reset Zoom (100%)"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '6px 8px',
                  cursor: 'pointer',
                  color: '#475569',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  borderLeft: '1px solid #E2E8F0',
                }}
              >
                <RotateCcw size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setFullscreenModal(true)}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #111827',
                backgroundColor: '#111827',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <Maximize2 size={14} />
              <span>Full Canvas</span>
            </button>
          </div>
        </div>

        {/* Blueprint Canvas Frame */}
        <div
          style={{
            position: 'relative',
            backgroundColor: '#F8FAFC',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            minHeight: '380px',
            maxHeight: '520px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)',
            backgroundImage: `
              radial-gradient(circle, rgba(148, 163, 184, 0.22) 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px',
          }}
        >
          {/* Top HUD Badge */}
          <div
            style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                color: '#334155',
                border: '1px solid #E2E8F0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                backdropFilter: 'blur(4px)',
              }}
            >
              {selectedWorkflow.frequency}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                backdropFilter: 'blur(4px)',
              }}
            >
              Trigger: Active
            </span>
          </div>

          {/* Workflow Canvas Image with Pan/Zoom */}
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto',
              padding: '24px',
              cursor: 'grab',
            }}
            onClick={() => setFullscreenModal(true)}
            title="Click to view full screen"
          >
            <img
              src={selectedWorkflow.image}
              alt={selectedWorkflow.title}
              style={{
                maxWidth: '96%',
                maxHeight: '460px',
                objectFit: 'contain',
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
                borderRadius: '8px',
                filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.06))',
                userSelect: 'none',
              }}
            />
          </div>

          {/* Bottom Right Click Indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#334155',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
              backdropFilter: 'blur(4px)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={12} color="#F68713" />
            Click image to open high-res inspector
          </div>
        </div>

        {/* Node Sequence Breakdown Bar */}
        <div style={{ marginTop: '18px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#6B7280',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Live Node Sequence Pipeline ({selectedWorkflow.nodesSummary.length} Main Stages)</span>
            <span>Last trigger executed: {selectedWorkflow.lastExecuted}</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px',
            }}
          >
            {selectedWorkflow.nodesSummary.map((node, i) => (
              <div
                key={node.name}
                style={{
                  backgroundColor: '#F8FAFC',
                  border: '1px solid #E6E9EE',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      color: '#F68713',
                      backgroundColor: '#FFF7ED',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
                    Stage {i + 1}
                  </span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: '#2A9CB8',
                    }}
                  >
                    {node.type}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#111827', marginTop: '2px' }}>
                  {node.name}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B', lineHeight: 1.35 }}>
                  {node.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Complete Automation Workflows Grid (The 4 Automations) */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 800,
                color: '#111827',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Enterprise Automation Library
            </h2>
            <p style={{ margin: '3px 0 0 0', fontSize: '12.5px', color: '#6B7280' }}>
              Select any of the 4 core automations to inspect its visual node layout, triggers, and execution specifications.
            </p>
          </div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#374151',
              backgroundColor: '#F3F4F6',
              padding: '4px 10px',
              borderRadius: '8px',
            }}
          >
            Showing {filteredWorkflows.length} of {WORKFLOWS.length} Workflows
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '18px',
          }}
        >
          {filteredWorkflows.map((workflow) => {
            const isSelected = selectedWorkflow.id === workflow.id;
            const CardIcon = workflow.icon;

            return (
              <div
                key={workflow.id}
                onClick={() => {
                  setSelectedWorkflow(workflow);
                  window.scrollTo({ top: 180, behavior: 'smooth' });
                }}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '14px',
                  border: isSelected ? '2px solid #F68713' : '1px solid #E6E9EE',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected
                    ? '0 10px 25px -4px rgba(246, 135, 19, 0.15), 0 4px 6px -2px rgba(246, 135, 19, 0.05)'
                    : '0 2px 4px rgba(0,0,0,0.02)',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                }}
              >
                {/* Active Top Highlight */}
                {isSelected && (
                  <div
                    style={{
                      height: '4px',
                      backgroundColor: '#F68713',
                      width: '100%',
                    }}
                  />
                )}

                {/* Card Canvas Preview Frame */}
                <div
                  style={{
                    height: '200px',
                    backgroundColor: '#F8FAFC',
                    borderBottom: '1px solid #E6E9EE',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    boxSizing: 'border-box',
                    backgroundImage: `
                      radial-gradient(circle, rgba(148, 163, 184, 0.18) 1px, transparent 1px)
                    `,
                    backgroundSize: '16px 16px',
                  }}
                >
                  <img
                    src={workflow.image}
                    alt={workflow.title}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '100%',
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.04))',
                      transition: 'transform 0.25s ease',
                      borderRadius: '6px',
                    }}
                  />

                  {/* Top Category Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '10px',
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      color: '#1E293B',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                      backdropFilter: 'blur(4px)',
                      letterSpacing: '0.03em',
                    }}
                  >
                    {workflow.badge}
                  </div>

                  {/* Nodes Count Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '10px',
                      fontSize: '10.5px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      color: '#0F172A',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                      backdropFilter: 'blur(4px)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Layers size={11} color="#F68713" />
                    {workflow.nodesCount} Nodes
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: `${workflow.accentColor}15`,
                        color: workflow.accentColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <CardIcon size={17} />
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: '14.5px',
                          fontWeight: 800,
                          color: '#111827',
                          margin: 0,
                          lineHeight: 1.3,
                        }}
                      >
                        {workflow.title}
                      </h3>
                      <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600 }}>
                        {workflow.category}
                      </span>
                    </div>
                  </div>

                  <p
                    style={{
                      fontSize: '12px',
                      color: '#4B5563',
                      margin: 0,
                      lineHeight: 1.45,
                      flex: 1,
                    }}
                  >
                    {workflow.description}
                  </p>

                  {/* Card Footer */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '10px',
                      borderTop: '1px solid #F3F4F6',
                      marginTop: 'auto',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#059669',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#10B981',
                        }}
                      />
                      {workflow.status}
                    </span>

                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 800,
                        color: isSelected ? '#F68713' : '#2A9CB8',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isSelected ? 'Viewing Pipeline' : 'Inspect Pipeline'}
                      <ArrowUpRight size={13} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Enterprise Automation Standards Section */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9EE',
          borderRadius: '16px',
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#ECFDF5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Zap size={20} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
              Sub-Second Lead Ingest
            </div>
            <div style={{ fontSize: '12.5px', color: '#6B7280', lineHeight: 1.45 }}>
              Webhooks process incoming leads with zero delay, validating duplicate prevention and dispatching instant
              WhatsApp & voice follow-ups.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#FFF7ED',
              color: '#F68713',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Bot size={20} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
              Conversational AI Telephony
            </div>
            <div style={{ fontSize: '12.5px', color: '#6B7280', lineHeight: 1.45 }}>
              Integrated voice agents conduct real-time qualification calls, extract key structured requirements, and
              sync call summaries straight to CRM leads.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '14px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Compass size={20} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>
              Apify Scraping & Verified Leads
            </div>
            <div style={{ fontSize: '12.5px', color: '#6B7280', lineHeight: 1.45 }}>
              Automated scraping extracts company details, email addresses, and phone numbers from LinkedIn and Google Maps
              directly into your CRM pipeline.
            </div>
          </div>
        </div>
      </div>

      {/* 6. Fullscreen High-Definition Inspector Modal */}
      {fullscreenModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(3, 7, 18, 0.88)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
          }}
          onClick={() => setFullscreenModal(false)}
        >
          {/* Modal Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 22px',
              backgroundColor: '#FFFFFF',
              borderRadius: '14px 14px 0 0',
              border: '1px solid #E6E9EE',
              borderBottom: '1px solid #F1F3F5',
              color: '#111827',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                }}
              />
              <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>
                {selectedWorkflow.title}
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  backgroundColor: '#F3F4F6',
                  color: '#4B5563',
                  border: '1px solid #E5E7EB',
                }}
              >
                {selectedWorkflow.nodesCount} Nodes
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setFullscreenModal(false)}
                style={{
                  backgroundColor: '#F3F4F6',
                  border: '1px solid #E5E7EB',
                  color: '#1F2937',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <X size={15} />
                <span>Close (Esc)</span>
              </button>
            </div>
          </div>

          {/* Modal Content Frame */}
          <div
            style={{
              flex: 1,
              backgroundColor: '#F8FAFC',
              borderRadius: '0 0 14px 14px',
              border: '1px solid #E6E9EE',
              borderTop: 'none',
              overflow: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '30px',
              backgroundImage: `
                radial-gradient(circle, rgba(148, 163, 184, 0.22) 1px, transparent 1px)
              `,
              backgroundSize: '24px 24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedWorkflow.image}
              alt={selectedWorkflow.title}
              style={{
                maxWidth: '98%',
                maxHeight: '85vh',
                objectFit: 'contain',
                filter: 'drop-shadow(0 10px 25px rgba(0,0,0,0.06))',
                borderRadius: '8px',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
