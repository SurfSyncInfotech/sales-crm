import { Clock, IndianRupee } from 'lucide-react';
import { Avatar, Badge, TempBadge } from '../../../components/ui';
import { money, timeAgo } from '../useWorkflowStore';

export default function LeadCard({ lead, owner, domain, onOpen, onDragStart }) {
  return (
    <article
      className="wf-card"
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      onClick={() => onOpen(lead.id)}
    >
      <div className="wf-card-top">
        <strong>{lead.name}</strong>
        <TempBadge value={lead.temp} />
      </div>
      <p className="wf-card-note">{lead.note}</p>
      <div className="wf-card-tags">
        <Badge tone="green">{domain?.name}</Badge>
        <Badge>{lead.source}</Badge>
      </div>
      <footer className="wf-card-foot">
        <span>
          <IndianRupee size={13} />
          {money(lead.value).replace('₹', '')}
        </span>
        <span>
          <Clock size={13} />
          {timeAgo(lead.at)}
        </span>
        {owner && <Avatar name={owner.name} size={24} />}
      </footer>
    </article>
  );
}
