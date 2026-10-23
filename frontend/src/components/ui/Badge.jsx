export default function Badge({ tone = 'neutral', children, dot = false }) {
  return (
    <span className={`ui-badge tone-${tone}`}>
      {dot && <i className="ui-badge-dot" />}
      {children}
    </span>
  );
}

const TEMP = {
  hot: { tone: 'hot', label: 'Hot' },
  warm: { tone: 'warm', label: 'Warm' },
  cold: { tone: 'cold', label: 'Cold' },
};

export function TempBadge({ value }) {
  const t = TEMP[value];
  if (!t) return null;
  return (
    <Badge tone={t.tone} dot>
      {t.label}
    </Badge>
  );
}
