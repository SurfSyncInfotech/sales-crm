import {
  IconGrid,
  IconUsers,
  IconPipeline,
  IconCheck,
  IconDoc,
  IconFlow,
  IconChat,
  IconGear,
} from "./icons.jsx";

const menu = [
  { icon: IconGrid, label: "Dashboard" },
  { icon: IconUsers, label: "Leads" },
  { icon: IconPipeline, label: "Pipeline" },
  { icon: IconCheck, label: "Tasks" },
  { icon: IconDoc, label: "Quotations" },
  { icon: IconFlow, label: "Automation" },
  { icon: IconChat, label: "WhatsApp" },
  { icon: IconGear, label: "Settings" },
];

const stages = [
  ["New", 38],
  ["Called", 64],
  ["Scoped", 52],
  ["PM", 30],
  ["Sent", 72],
  ["Quote", 44],
  ["Won", 26],
];

/**
 * The company-admin dashboard, rebuilt in HTML so it stays sharp at any size
 * and so the branding lab can recolour it live through CSS variables.
 */
export default function Console({ brand, style, barsRef }) {
  return (
    <div className="console" style={style}>
      <aside className="console-side">
        <div className="console-brand">
          {brand ? (
            <>
              <span className="brand-mark">
                {brand.logo ? <img src={brand.logo} alt="" /> : brand.name.trim().charAt(0).toUpperCase() || "A"}
              </span>
              <span>
                <span className="brand-name">{brand.name || "Your company"}</span>
                <small>SALES CRM</small>
              </span>
            </>
          ) : (
            <span>
              <img src="/logo.png" alt="PatronPing" />
              <small style={{ marginTop: 6 }}>COMPANY PORTAL</small>
            </span>
          )}
        </div>
        {menu.map(({ icon: I, label }, i) => (
          <div key={label} className={`console-item ${i === 0 ? "is-active" : ""}`}>
            <I />
            {label}
          </div>
        ))}
      </aside>

      <div className="console-main">
        <div className="console-top">
          <h5>
            Admin dashboard <span className="pill">Live</span>
          </h5>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="avatar">SA</span>
            <span style={{ fontWeight: 500 }}>{brand?.name || "SurfSync Infotech"}</span>
          </div>
        </div>

        <div className="console-body">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
            <div>
              <div className="console-title">Good morning, Richa</div>
              <p>4 leads need a first call before 11:00</p>
            </div>
            {brand && <button className="btn-accent">+ Add salesperson</button>}
          </div>

          <div className="kpis">
            <div className="kpi">
              <small>New leads today</small>
              <b>18</b>
              <span className="pill">6 from Meta</span>
            </div>
            <div className="kpi">
              <small>Untouched</small>
              <b>4</b>
              <span className="pill pill--amber">Call first</span>
            </div>
            <div className="kpi">
              <small>Waiting on PM</small>
              <b>3</b>
              <span className="pill pill--blue">2 estimates</span>
            </div>
            <div className="kpi">
              <small>Follow-ups due</small>
              <b>11</b>
              <span className="pill pill--grey pill--plain">Today</span>
            </div>
          </div>

          <div className="console-grid">
            <div className="panel">
              <div className="panel-head">
                <h6>Pipeline by stage</h6>
                <span className="pill pill--grey pill--plain">This week</span>
              </div>
              <div className="bars" ref={barsRef}>
                {stages.map(([s, h]) => (
                  <div key={s}>
                    <i style={{ height: `${h}%` }} />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="panel">
              <div className="panel-head">
                <h6>Today's follow-ups</h6>
                <span className="pill pill--amber">11 due</span>
              </div>
              {[
                ["Kavya Fashions", "Day 5 · ask about the demo"],
                ["Mehta Dental", "Callback 11:00 AM"],
                ["Orbit Logistics", "Quotation day 2"],
              ].map(([n, d]) => (
                <div className="task" key={n}>
                  <span className="task-check" />
                  <div>
                    <b style={{ fontWeight: 600 }}>{n}</b>
                    <small>{d}</small>
                  </div>
                  <span className="avatar" style={{ width: 22, height: 22, fontSize: 9 }}>
                    AD
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
