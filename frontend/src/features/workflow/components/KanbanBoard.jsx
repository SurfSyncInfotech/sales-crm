import { useState } from 'react';
import LeadCard from './LeadCard';
import { money } from '../useWorkflowStore';

export default function KanbanBoard({ stages, leads, userById, domainById, onMove, onOpen }) {
  const [overStage, setOverStage] = useState(null);

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('text/plain', String(id));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e, stageId) => {
    e.preventDefault();
    const id = Number(e.dataTransfer.getData('text/plain'));
    setOverStage(null);
    if (id) onMove(id, stageId);
  };

  return (
    <div className="wf-board">
      {stages.map((stage) => {
        const items = leads.filter((l) => l.stage === stage.id);
        const total = items.reduce((sum, l) => sum + l.value, 0);
        return (
          <section
            key={stage.id}
            className={`wf-col ${overStage === stage.id ? 'over' : ''} stage-${stage.id}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOverStage(stage.id);
            }}
            onDragLeave={() => setOverStage(null)}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <header className="wf-col-head">
              <div>
                <strong>{stage.name}</strong>
                <span className="wf-col-count">{items.length}</span>
              </div>
              <small>{money(total)}</small>
            </header>
            <div className="wf-col-body">
              {items.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  owner={userById[lead.owner]}
                  domain={domainById[lead.domain]}
                  onOpen={onOpen}
                  onDragStart={handleDragStart}
                />
              ))}
              {items.length === 0 && <p className="wf-col-empty">Drop leads here</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
