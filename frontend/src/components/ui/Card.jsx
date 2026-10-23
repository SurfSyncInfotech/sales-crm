export default function Card({ title, hint, actions, children, className = '', flush = false }) {
  return (
    <section className={`ui-card ${className}`}>
      {(title || actions) && (
        <div className="ui-card-head">
          <div>
            {title && <h2>{title}</h2>}
            {hint && <p className="muted ui-hint">{hint}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className={flush ? 'ui-card-body flush' : 'ui-card-body'}>{children}</div>
    </section>
  );
}
