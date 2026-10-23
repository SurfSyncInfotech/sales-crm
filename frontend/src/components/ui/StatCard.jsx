export default function StatCard({ icon: Icon, label, value, note, tone = 'default' }) {
  return (
    <article className={`ui-stat tone-${tone}`}>
      {Icon && (
        <span className="ui-stat-icon">
          <Icon size={18} />
        </span>
      )}
      <div>
        <span className="ui-stat-label">{label}</span>
        <strong className="ui-stat-value">{value}</strong>
        {note && <small className="ui-stat-note">{note}</small>}
      </div>
    </article>
  );
}
