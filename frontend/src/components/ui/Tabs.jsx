export default function Tabs({ items, value, onChange }) {
  return (
    <div className="ui-tabs" role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          className={value === item.value ? 'active' : ''}
          onClick={() => onChange(item.value)}
        >
          {item.label}
          {item.count != null && <span className="ui-tab-count">{item.count}</span>}
        </button>
      ))}
    </div>
  );
}
