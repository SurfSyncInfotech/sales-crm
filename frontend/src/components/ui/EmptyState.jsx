export default function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="ui-empty">
      {Icon && <Icon size={28} />}
      <strong>{title}</strong>
      {text && <p className="muted">{text}</p>}
    </div>
  );
}
