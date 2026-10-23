import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Drawer({ open, title, subtitle, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="ui-drawer-wrap" role="dialog" aria-modal="true">
      <div className="ui-drawer-backdrop" onClick={onClose} />
      <aside className="ui-drawer">
        <header className="ui-drawer-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          <button type="button" className="ui-icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <div className="ui-drawer-body">{children}</div>
      </aside>
    </div>
  );
}
