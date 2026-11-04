import Brand from "./Brand.jsx";
import Icon from "./Icon.jsx";

const Av = ({ t, bg, fg = "#fff", className = "" }) => (
  <span className={`av ${className}`} style={{ background: bg, color: fg }}>{t}</span>
);
const AD = <Av t="AD" bg="#16b26c" />, RA = <Av t="RA" bg="#1b63e8" />, SN = <Av t="SN" bg="#8b5cf6" />;

/* ---------- hero product window (drawn at 1180 x 700) ---------- */
const rows = [
  ["KF", "#e8b4c8", "#5a2440", "Kavya Fashions", "meta", "Shopify store", AD, "Aditi", "", "Details sent", "Day 2", "Tomorrow"],
  ["OL", "#c9d8fb", "#16357a", "Orbit Logistics", "indiamart", "Tracking app", RA, "Rahul", "amber", "Quotation sent", "Day 5", "4:00 PM"],
  ["MD", "#d6f0e2", "#0b5c37", "Mehta Dental", "website", "Clinic site", AD, "Aditi", "blue", "With PM", "Estimate", "Fri"],
  ["SI", "#fde2b8", "#7a4a00", "Sharma Interiors", "justdial", "Office fit-out", SN, "Sneha", "grey", "New lead", "First call", "12 min"],
  ["NR", "#e3e0fb", "#3b2a8a", "Nova Realty", "meta", "CRM portal", RA, "Rahul", "", "Won", "In delivery", ""],
];

export function ProductWindow() {
  return (
    <div className="pw">
      <div className="toasts">
        <div className="toast"><Brand id="meta" size={30} tile /><div><b>New lead from Meta ads</b><span>Kavya Fashions · Shopify store</span><br /><em>Assigned to Aditi</em> <span>· 4 sec ago</span></div></div>
        <div className="toast"><Brand id="indiamart" size={30} tile /><div><b>IndiaMART enquiry</b><span>Orbit Logistics · tracking app</span><br /><em>Assigned to Rahul</em> <span>· just now</span></div></div>
        <div className="toast"><Av t="PR" bg="#16b26c" /><div><b>Priya marked the estimate ready</b><span>Kavya Fashions · ₹60,000 · 5 weeks</span></div></div>
      </div>
      <div className="wa">
        <div className="wa-h"><Brand id="whatsapp" size={22} /><div>Kavya Fashions<small>WhatsApp · linked to deal</small></div></div>
        <div className="wa-b">
          <div className="bub me">Hi Kavya, sharing the estimate and demo for your Shopify store.<small>1 Nov · 11:02 ✓✓</small></div>
          <div className="bub">Looks good. Can we do 2 payment milestones?<small>15 Nov · 09:18</small></div>
        </div>
      </div>
      <div className="win">
        <div className="chrome">
          <div className="dots"><i /><i /><i /></div>
          <div className="url"><Icon name="lock" size={12} />app.patronping.com/leads</div>
        </div>
        <div className="app">
          <aside className="side">
            <img src="/logo.png" alt="" />
            <small>WORKSPACE</small>
            {[["grid", "Dashboard"], ["inbox", "Leads", 12], ["pipeline", "Pipeline"], ["check", "Follow-ups"], ["file", "Quotations"], ["chat", "WhatsApp"], ["chart", "Reports"], ["team", "Team"]].map(([i, l, n]) => (
              <a key={l} className={n ? "on" : ""}><Icon name={i} size={16} />{l}{n && <em>{n}</em>}</a>
            ))}
          </aside>
          <div className="main">
            <div className="main-head">
              <h4>Leads<small>Today · sample data</small></h4>
              <div className="chips"><span className="chip on">All</span>{["meta", "indiamart", "justdial"].map((s) => <span key={s} className="chip"><Brand id={s} size={14} /></span>)}</div>
            </div>
            <div className="kpis">
              <div className="kpi"><small>New today</small><b>40<span>all assigned</span></b></div>
              <div className="kpi"><small>Waiting for first call</small><b>3</b></div>
              <div className="kpi"><small>Follow-ups due</small><b>18</b></div>
            </div>
            <div className="tbl">
              <div className="tr th"><span>Lead</span><span>Owner</span><span>Stage</span><span>Next step</span></div>
              {rows.map(([i, bg, fg, n, src, s, av, o, tone, st, a, b]) => (
                <div className="tr" key={n}>
                  <div className="who"><Av t={i} bg={bg} fg={fg} /><div><b>{n}</b><small><Brand id={src} size={12} />{s}</small></div></div>
                  <span className="owner">{av}{o}</span>
                  <span><span className={`pill ${tone}`}>{st}</span></span>
                  <span className="next">{a}{b && <> · <i>{b}</i></>}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- feature panels (drawn at 620 x 440) ---------- */
const leadAvs = [
  [80, 110, "KF", "#e8b4c8", "#5a2440"], [140, 170, "AK", "#c9e7ff", "#0b3d6b"], [224, 118, "OL", "#c9d8fb", "#16357a"], [262, 186, "RG", "#ffd9d9", "#7a1d1d"],
  [386, 112, "SI", "#fde2b8", "#7a4a00"], [350, 182, "VP", "#e3e0fb", "#3b2a8a"], [530, 116, "MD", "#d6f0e2", "#0b5c37"], [476, 176, "TC", "#f2e8d5", "#5c4416"],
];
export function SourcesBox() {
  return (
    <div className="panel">
      <svg className="abs" viewBox="0 0 620 440" fill="none">
        <g stroke="#dfe4df" strokeWidth="1.2">
          <path d="M90 52 C 90 160, 300 170, 310 250" /><path d="M230 52 C 230 150, 305 170, 310 250" /><path d="M390 52 C 390 150, 315 170, 310 250" /><path d="M530 52 C 530 160, 320 170, 310 250" />
        </g>
        <circle cx="310" cy="236" r="4" fill="#16b26c" />
        <g stroke="#d5dbd6" strokeWidth="1.2" strokeLinejoin="round">
          <path d="M200 280 L310 236 L420 280 L310 324 Z" fill="#eef1ee" />
          <path d="M200 280 L310 324 L310 420 L200 376 Z" fill="#f6f7f5" />
          <path d="M310 324 L420 280 L420 376 L310 420 Z" fill="#e9ece8" />
          <path d="M200 280 L150 246 L250 206 L310 236 Z" fill="#fafbfa" />
          <path d="M420 280 L470 246 L370 206 L310 236 Z" fill="#f2f4f1" />
        </g>
        <rect width="44" height="44" rx="10" fill="#fff" stroke="#d5dbd6" transform="translate(348 338) skewY(-22)" />
      </svg>
      <img className="box-mark" src="/mark.png" alt="" />
      {[["meta", 90], ["indiamart", 230], ["justdial", 390], ["website", 530]].map(([id, x]) => (
        <span key={id} className="srcpill" style={{ left: x }}><Brand id={id} size={16} />{id === "website" ? "Website" : null}</span>
      ))}
      {leadAvs.map(([x, y, t, bg, fg]) => <span key={t} className="fl av" style={{ left: x, top: y, background: bg, color: fg }}>{t}</span>)}
    </div>
  );
}

export function Rotation() {
  const reps = [["RA", "#1b63e8", "Rahul", "On a call", "8 open", "dim"], ["AD", "#16b26c", "Aditi", "Next in rotation", "Assigned", "on"], ["SN", "#8b5cf6", "Sneha", "Free", "6 open", ""], ["AR", "#f08a00", "Arjun", "Free", "7 open", ""], ["KM", "#64748b", "Karan", "On leave today", "skipped", "dim"]];
  return (
    <div className="panel">
      <div className="incoming"><Av t="MD" bg="#d6f0e2" fg="#0b5c37" /><div><b>Mehta Dental</b><small>Website form · new</small></div></div>
      <svg className="abs" viewBox="0 0 620 440" fill="none">
        <path d="M140 78 C 150 120, 150 130, 140 160" stroke="#16b26c" strokeWidth="1.4" strokeDasharray="3 4" />
        <path d="M240 220 C 270 220, 270 128, 282 112" stroke="#16b26c" strokeWidth="1.4" />
        <circle cx="282" cy="112" r="3.5" fill="#16b26c" />
      </svg>
      <div className="ring"><img src="/mark.png" alt="" /></div>
      <div className="timer">Assigned in 0:04</div>
      <div className="rot">
        {reps.map(([t, bg, n, s, p, c]) => (
          <div key={n} className={`rep ${c}`}><Av t={t} bg={bg} /><div><b>{n}</b><small>{s}</small></div><span className="pct">{p}</span></div>
        ))}
      </div>
    </div>
  );
}

const events = { 1: ["blue", "Estimate sent", "Day 0"], 3: ["green", "WhatsApp reminder", "Day 2 ✓"], 6: ["amber", "Client replied", "paused"], 11: ["ghost", "Day 10", "held"], 12: ["blue", "Quote requested", ""], 14: ["blue", "Quotation sent", "Day 0"], 16: ["green", "WhatsApp reminder", "Day 2 ✓"], 19: ["won", "Won", "₹60,000"], 23: ["ghost", "Day 22", "cancelled"] };
export function Calendar() {
  return (
    <div className="panel">
      <div className="cal">
        <div className="cal-h"><b>Kavya Fashions · follow-up plan</b><span className="pill">Sample</span></div>
        <div className="cal-g">
          {"MTWTFSS".split("").map((d, i) => <div key={i} className="wd">{d}</div>)}
          {Array.from({ length: 28 }, (_, i) => {
            const e = events[i + 1];
            return <div key={i}>{i + 1}{e && <div className={`ev ${e[0]}`}>{e[1]}<small>{e[2]}</small></div>}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

function network(n, won, pipe, seed) {
  let s = seed;
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const pts = Array.from({ length: n }, () => [30 + r() * 140, 60 + r() * 270]);
  const links = pts.map((p, i) => {
    let best = -1, bd = 1e9;
    for (let j = 0; j < i; j++) { const d = (p[0] - pts[j][0]) ** 2 + (p[1] - pts[j][1]) ** 2; if (d < bd) { bd = d; best = j; } }
    return best >= 0 ? <line key={"l" + i} x1={p[0]} y1={p[1]} x2={pts[best][0]} y2={pts[best][1]} stroke="#d9dfda" /> : null;
  });
  const dots = pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r={i < won ? 7 : i < won + pipe ? 5 : 3.5} fill={i < won ? "#16b26c" : i < won + pipe ? "#1b63e8" : "#cfd5cf"} />);
  return <svg viewBox="0 0 200 380">{links}{dots}</svg>;
}
export function Growth() {
  return (
    <div className="panel v4">
      <div className="legend"><span><i style={{ background: "#16b26c" }} />Won</span><span><i style={{ background: "#1b63e8" }} />In pipeline</span><span><i style={{ background: "#cfd5cf" }} />Enquiry</span></div>
      {[[6, 1, 1, 7, "Week 1"], [14, 3, 4, 11, "Week 3"], [24, 7, 7, 3, "Week 5"]].map(([n, w, p, s, l]) => (
        <div key={l}>{network(n, w, p, s)}<span>{l}</span></div>
      ))}
    </div>
  );
}

/* ---------- one-CRM venn (drawn at 1200 x 560) ---------- */
export const vennGroups = [
  { label: "Lead capture", icon: <span className="vi g"><Icon name="inbox" size={22} /></span>, tone: "g", x: 250, y: 120,
    chips: [[<Brand id="meta" size={18} />, "Meta", 470, 140], [<Brand id="indiamart" size={18} />, "IndiaMART", 450, 185], [<Brand id="justdial" size={18} />, "", 500, 230]] },
  { label: "WhatsApp follow-ups", icon: <span className="vi"><Brand id="whatsapp" size={24} /></span>, tone: "b", x: 960, y: 120,
    chips: [[<i style={{ background: "#16b26c" }}>2</i>, "Day 2 · 5 · 10 · 22", 740, 150], [<i style={{ background: "#1b63e8" }}>II</i>, "Auto-pause on reply", 730, 200]] },
  { label: "PM estimates", icon: <span className="vi n"><Icon name="file" size={22} /></span>, tone: "", x: 250, y: 440,
    chips: [[<i style={{ background: "#101936" }}>v1</i>, "Estimate", 470, 345], [<i style={{ background: "#e6960a" }}>✓</i>, "Quote approval", 470, 395]] },
  { label: "Honest reports", icon: <span className="vi g"><Icon name="chart" size={22} /></span>, tone: "g", x: 960, y: 440,
    chips: [[<i style={{ background: "#16b26c" }}>₹</i>, "Won vs received", 735, 350], [<i style={{ background: "#64748b" }}>%</i>, "By source", 725, 400]] },
];
export function Venn() {
  return (
    <div className="venn">
      <svg className="abs" viewBox="0 0 1200 560" fill="none">
        <g stroke="#cfd5d0" strokeWidth="1.2"><circle cx="520" cy="200" r="150" /><circle cx="680" cy="200" r="150" /><circle cx="520" cy="360" r="150" /><circle cx="680" cy="360" r="150" /></g>
        <g stroke="#c4cbc5"><path d="M370 120h30l20 -16" /><path d="M820 120h-20l-20 -16" /><path d="M370 440h30l20 16" /><path d="M830 440h-30l-20 16" /></g>
      </svg>
      {vennGroups.map((g) => (
        <div key={g.label}>
          <span className={`vl ${g.tone}`} style={{ left: g.x, top: g.y }}>{g.icon}{g.label}</span>
          {g.chips.map(([ic, t, x, y], i) => <span key={i} className="vc" style={{ left: x, top: y }}>{ic}{t}</span>)}
        </div>
      ))}
      <div className="vcenter"><img src="/mark.png" alt="" /></div>
      {[["Sales", 170, 215, ""], ["Owner", 1060, 250, "g"], ["PM", 200, 525, "b"]].map(([t, x, y, c]) => (
        <span key={t} className={`role-p ${c}`} style={{ left: x, top: y }}>
          <svg viewBox="0 0 24 24"><path d="M4 2l16 9-7 2-3 7z" /></svg>{t}
        </span>
      ))}
    </div>
  );
}
