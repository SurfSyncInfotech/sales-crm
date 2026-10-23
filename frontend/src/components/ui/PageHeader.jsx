export default function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="page-head ui-page-head">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="muted ui-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="ui-actions">{actions}</div>}
    </header>
  );
}
