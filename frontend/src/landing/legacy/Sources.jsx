const sources = [
  ["M", "#1b63e8", "Meta lead ads"],
  ["W", "#16b26c", "Website forms"],
  ["WA", "#0a7a4a", "WhatsApp"],
  ["IM", "#e5484d", "IndiaMART"],
  ["JD", "#f59f0b", "Justdial"],
  ["XL", "#1d6f42", "Excel / CSV import"],
  ["+", "#101936", "Referrals and walk-ins"],
];

export default function Sources() {
  const row = [...sources, ...sources];
  return (
    <section className="sources" aria-label="Lead sources">
      <div className="wrap sources-inner">
        <p className="sources-label">Leads arrive from the places you already get them</p>
        <div className="marquee">
          <div className="marquee-track">
            {row.map(([k, c, label], i) => (
              <span className="source-chip" key={i} aria-hidden={i >= sources.length}>
                <i style={{ background: c }}>{k}</i>
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
