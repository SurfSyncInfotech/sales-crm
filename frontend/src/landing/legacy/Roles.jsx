import { useLayoutEffect, useRef, useState } from "react";
import { IconTick } from "./icons.jsx";

const roles = [
  {
    id: "owner",
    tab: "Business owner",
    title: "See every deal without chasing anyone for an update.",
    intro:
      "Open one screen in the morning and know which leads are untouched, which follow-ups are overdue and where the PM is holding things up.",
    points: [
      ["Your team, your rules.", "Add salespeople and PMs, choose which menus each person can open, and set how leads are shared out."],
      ["Every company is sealed off.", "Your customers, messages, balances and reports are never visible to another business on the platform."],
      ["Money stays clear.", "Won value, payments received and WhatsApp spend are reported separately, so a proposal never looks like revenue."],
    ],
    shot: "owner",
  },
  {
    id: "sales",
    tab: "Salesperson",
    title: "Know exactly who to call next, and why.",
    intro:
      "A salesperson starts the day with new leads, client replies and today's follow-ups in one list. Every call ends with feedback and a next step.",
    points: [
      ["Calls and WhatsApp from the lead page.", "Record the outcome, a note and the next action in one place."],
      ["Ask the PM without leaving the deal.", "Send requirements for an estimate or quotation and see when it is ready."],
      ["Pick up any lead mid-conversation.", "The timeline shows every message, call and quote, so a handover takes minutes."],
    ],
    shot: "sales",
  },
  {
    id: "pm",
    tab: "Project manager",
    title: "Price work from complete requirements.",
    intro:
      "Estimate and quotation requests arrive with the brief, budget, requested timeline and conversation context. Questions go back to sales on the same request.",
    points: [
      ["A queue with due dates.", "See what is waiting, what is overdue and what is blocked on the client."],
      ["Versions that stay honest.", "Revised estimates and quotes keep the earlier version, so sales never sends an old price."],
      ["Demos when they help.", "Attach a demo link or schedule a walkthrough before the full estimate."],
    ],
    shot: "pm",
  },
];

function OwnerShot() {
  return (
    <div className="console-body" style={{ background: "var(--paper)" }}>
      <div className="panel-head" style={{ marginBottom: 0 }}>
        <h6 style={{ fontFamily: "var(--display)", fontSize: 18, margin: 0 }}>Needs attention today</h6>
        <span className="pill pill--amber">7 items</span>
      </div>
      <div className="panel" style={{ padding: "8px 6px" }}>
        <table className="mini-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Issue</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Sharma Interiors", "Justdial · 3h ago", "No first call yet", "pill--amber", "Unassigned"],
              ["Orbit Logistics", "Quote sent 4 days ago", "Day 5 follow-up overdue", "pill--amber", "Rahul"],
              ["Kavya Fashions", "Estimate requested", "Waiting on PM for 2 days", "pill--blue", "Priya"],
              ["Mehta Dental", "Call logged 11:20", "Feedback missing", "pill--grey", "Aditi"],
            ].map(([n, s, issue, c, o]) => (
              <tr key={n}>
                <td>
                  <b>{n}</b>
                  <small>{s}</small>
                </td>
                <td>
                  <span className={`pill ${c}`}>{issue}</span>
                </td>
                <td>{o}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="kpi">
          <small>Won this month</small>
          <b>₹4.8L</b>
        </div>
        <div className="kpi">
          <small>Payments received</small>
          <b>₹3.1L</b>
        </div>
        <div className="kpi">
          <small>WhatsApp balance</small>
          <b>₹1,600</b>
        </div>
      </div>
    </div>
  );
}

function SalesShot() {
  return (
    <div className="console-body" style={{ background: "var(--paper)" }}>
      <div className="panel">
        <div className="panel-head">
          <h6>Log this call · Mehta Dental</h6>
          <span className="pill pill--blue">Website lead</span>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {["Connected", "No answer", "Busy", "Wrong number"].map((o, i) => (
            <span key={o} className={`pill pill--plain ${i === 0 ? "" : "pill--grey"}`}>
              {o}
            </span>
          ))}
        </div>
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            boxShadow: "inset 0 0 0 1px var(--line)",
            color: "var(--ink-2)",
            fontSize: 13,
          }}
        >
          Spoke to Dr. Mehta. Wants online booking on the clinic site. Send two dental demos tomorrow, call Friday 11 AM.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <div className="kpi" style={{ padding: 10 }}>
            <small>Next action</small>
            <div style={{ fontWeight: 600 }}>Send demo</div>
          </div>
          <div className="kpi" style={{ padding: 10 }}>
            <small>Due</small>
            <div style={{ fontWeight: 600 }}>Fri, 11:00 AM</div>
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head">
          <h6>My day</h6>
          <span className="pill">3 replies</span>
        </div>
        {[
          ["Kavya Fashions replied", "“Can we do 2 milestones?”"],
          ["Day 2 follow-up · Orbit Logistics", "Quotation v1 sent Monday"],
          ["New lead · Sharma Interiors", "Justdial · assigned to you"],
        ].map(([a, b]) => (
          <div className="task" key={a}>
            <span className="task-check" />
            <div>
              <b style={{ fontWeight: 600 }}>{a}</b>
              <small>{b}</small>
            </div>
            <span />
          </div>
        ))}
      </div>
    </div>
  );
}

function PmShot() {
  return (
    <div className="console-body" style={{ background: "var(--paper)" }}>
      <div className="panel" style={{ padding: "8px 6px" }}>
        <div className="panel-head" style={{ padding: "8px 10px 0" }}>
          <h6>Estimate and quote requests</h6>
          <span className="pill pill--blue">5 open</span>
        </div>
        <table className="mini-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Type</th>
              <th>Status</th>
              <th>Due</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Kavya Fashions", "Shopify store", "Estimate", "Ready for sales", "", "Today"],
              ["Orbit Logistics", "Tracking app", "Quotation v2", "Awaiting approval", "pill--amber", "Tomorrow"],
              ["Mehta Dental", "Clinic website", "Estimate", "Waiting on client", "pill--grey", "Fri"],
              ["Nova Realty", "CRM portal", "Demo", "Scheduled", "pill--blue", "Mon"],
            ].map(([n, s, t, st, c, d]) => (
              <tr key={n}>
                <td>
                  <b>{n}</b>
                  <small>{s}</small>
                </td>
                <td>{t}</td>
                <td>
                  <span className={`pill ${c}`}>{st}</span>
                </td>
                <td>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel">
        <div className="panel-head">
          <h6>Estimate · Kavya Fashions</h6>
          <span className="pill pill--grey pill--plain">v1</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
          <div className="kpi" style={{ padding: 10 }}>
            <small>Budget</small>
            <div style={{ fontWeight: 600 }}>₹60,000</div>
          </div>
          <div className="kpi" style={{ padding: 10 }}>
            <small>Timeline</small>
            <div style={{ fontWeight: 600 }}>5 weeks</div>
          </div>
          <div className="kpi" style={{ padding: 10 }}>
            <small>Excludes</small>
            <div style={{ fontWeight: 600 }}>Product shoot</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const shots = { owner: OwnerShot, sales: SalesShot, pm: PmShot };

export default function Roles() {
  const [current, setCurrent] = useState("owner");
  const [thumb, setThumb] = useState({ left: 5, width: 0 });
  const tabs = useRef({});

  useLayoutEffect(() => {
    const el = tabs.current[current];
    if (el) setThumb({ left: el.offsetLeft, width: el.offsetWidth });
  }, [current]);

  const role = roles.find((r) => r.id === current);
  const Shot = shots[role.shot];

  return (
    <section className="section roles" id="roles">
      <div className="wrap">
        <div className="section-head">
          <span className="kicker">Built for the whole team</span>
          <h2 className="h2" style={{ maxWidth: "20ch" }}>
            Everyone sees their part of the deal.
          </h2>
        </div>

        <div className="seg" role="tablist" aria-label="Choose a role">
          <span className="seg-thumb" style={{ left: thumb.left, width: thumb.width }} aria-hidden="true" />
          {roles.map((r) => (
            <button
              key={r.id}
              role="tab"
              id={`tab-${r.id}`}
              aria-selected={current === r.id}
              aria-controls="role-panel"
              ref={(el) => (tabs.current[r.id] = el)}
              onClick={() => setCurrent(r.id)}
            >
              {r.tab}
            </button>
          ))}
        </div>

        <div className="role-panel" id="role-panel" role="tabpanel" aria-labelledby={`tab-${current}`}>
          <div className="role-copy" key={current + "-copy"}>
            <h3>{role.title}</h3>
            <p className="lead">{role.intro}</p>
            <ul className="role-list">
              {role.points.map(([b, t]) => (
                <li key={b}>
                  <IconTick />
                  <span>
                    <b>{b}</b> {t}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="role-shot" key={current}>
            <Shot />
          </div>
        </div>
      </div>
    </section>
  );
}
