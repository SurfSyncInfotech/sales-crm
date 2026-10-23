import { useMemo, useState } from 'react';
import { Flame, IndianRupee, Layers, Search } from 'lucide-react';
import { PageHeader, StatCard, Tabs } from '../components/ui';
import { useWorkflow } from '../features/workflow/WorkflowContext';
import { money } from '../features/workflow/useWorkflowStore';
import KanbanBoard from '../features/workflow/components/KanbanBoard';
import LeadDrawer from '../features/workflow/components/LeadDrawer';

export default function PipelinePage() {
  const wf = useWorkflow();
  const [domain, setDomain] = useState('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);

  const visible = useMemo(
    () =>
      wf.leads.filter(
        (l) =>
          (domain === 'all' || l.domain === domain) &&
          (!query || `${l.name} ${l.note} ${l.phone}`.toLowerCase().includes(query.toLowerCase()))
      ),
    [wf.leads, domain, query]
  );

  const open = wf.leadById[openId];
  const pipelineValue = visible.filter((l) => l.stage !== 'won').reduce((s, l) => s + l.value, 0);
  const hot = visible.filter((l) => l.temp === 'hot' && l.stage !== 'won').length;

  const tabs = [
    { value: 'all', label: 'All leads', count: wf.leads.length },
    ...wf.domains.map((d) => ({
      value: d.id,
      label: d.name,
      count: wf.leads.filter((l) => l.domain === d.id).length,
    })),
  ];

  return (
    <div className="page">
      <PageHeader
        eyebrow="Pipeline"
        title="Sales pipeline"
        subtitle="Drag a lead between stages. Click a card for its full history."
      />

      <section className="ui-stat-grid">
        <StatCard icon={Layers} label="Open leads" value={visible.filter((l) => l.stage !== 'won').length} note="In this view" />
        <StatCard icon={IndianRupee} label="Pipeline value" value={money(pipelineValue)} note="Excludes won" tone="green" />
        <StatCard icon={Flame} label="Hot leads" value={hot} note="Ready for action" tone="hot" />
      </section>

      <div className="wf-toolbar">
        <Tabs items={tabs} value={domain} onChange={setDomain} />
        <label className="wf-search">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search leads" />
        </label>
      </div>

      <KanbanBoard
        stages={wf.stages}
        leads={visible}
        userById={wf.userById}
        domainById={wf.domainById}
        onMove={wf.moveLead}
        onOpen={setOpenId}
      />

      <LeadDrawer
        lead={open}
        owner={open && wf.userById[open.owner]}
        domain={open && wf.domainById[open.domain]}
        stages={wf.stages}
        timeline={open ? wf.activity[open.id] : []}
        onMove={wf.moveLead}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
}
