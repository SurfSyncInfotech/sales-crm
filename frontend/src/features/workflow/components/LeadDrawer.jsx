import { Flame, Inbox, MessageCircle, Reply, Send, UserCheck } from 'lucide-react';
import { Avatar, Badge, Drawer, TempBadge } from '../../../components/ui';
import { money, timeAgo } from '../useWorkflowStore';

const ICONS = {
  capture: Inbox,
  assign: UserCheck,
  send: Send,
  reply: Reply,
  temp: Flame,
};

export default function LeadDrawer({ lead, owner, domain, stages, timeline = [], onClose, onMove }) {
  return (
    <Drawer open={!!lead} onClose={onClose} title={lead?.name} subtitle={lead?.phone}>
      {lead && (
        <>
          <div className="wf-drawer-meta">
            <TempBadge value={lead.temp} />
            <Badge tone="green">{domain?.name}</Badge>
            <Badge>{lead.source}</Badge>
          </div>

          <dl className="wf-facts">
            <div>
              <dt>Expected value</dt>
              <dd>{money(lead.value)}</dd>
            </div>
            <div>
              <dt>Owner</dt>
              <dd className="wf-owner">
                {owner && <Avatar name={owner.name} size={22} />}
                {owner?.name || 'Unassigned'}
              </dd>
            </div>
            <div>
              <dt>Received</dt>
              <dd>{timeAgo(lead.at)}</dd>
            </div>
          </dl>

          <label className="wf-field">
            <span>Pipeline stage</span>
            <select value={lead.stage} onChange={(e) => onMove(lead.id, e.target.value)}>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <div className="wf-drawer-actions">
            <button type="button" className="primary-btn">
              <MessageCircle size={15} /> WhatsApp
            </button>
            <button type="button" className="secondary-btn">
              Request quotation
            </button>
          </div>

          <h3 className="wf-section-title">Activity</h3>
          {timeline.length === 0 ? (
            <p className="muted">No activity logged yet.</p>
          ) : (
            <ol className="wf-timeline">
              {timeline.map((item) => {
                const Icon = ICONS[item.kind] || Inbox;
                return (
                  <li key={item.id}>
                    <span className="wf-tl-icon">
                      <Icon size={14} />
                    </span>
                    <div>
                      <p>{item.text}</p>
                      <small className="muted">{timeAgo(item.at)}</small>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </Drawer>
  );
}
