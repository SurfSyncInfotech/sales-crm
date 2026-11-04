const cols = [
  {
    when: "Daily",
    lead: "What needs doing before lunch.",
    rows: [
      ["New and assigned leads", "18"],
      ["Untouched enquiries", "4"],
      ["Calls attempted / connected", "42 / 27"],
      ["Missing feedback", "2"],
      ["Overdue follow-ups", "3"],
    ],
    spark: "M0 40 L20 34 L40 38 L60 22 L80 28 L100 14 L120 20 L140 10",
  },
  {
    when: "Weekly",
    lead: "Where deals are slowing down.",
    rows: [
      ["Estimates sent", "9"],
      ["Quotations sent", "6"],
      ["Overdue PM requests", "2"],
      ["Best source", "Meta ads"],
      ["Top lost reason", "Budget"],
    ],
    spark: "M0 30 L20 32 L40 24 L60 26 L80 18 L100 22 L120 12 L140 16",
  },
  {
    when: "Monthly",
    lead: "Which sources produce customers.",
    rows: [
      ["Deals won / lost", "11 / 7"],
      ["Won value", "₹4.8L"],
      ["Payments received", "₹3.1L"],
      ["WhatsApp usage", "₹2,340"],
      ["Avg. PM turnaround", "1.6 days"],
    ],
    spark: "M0 44 L20 38 L40 40 L60 30 L80 24 L100 26 L120 16 L140 8",
  },
];

export default function Reports() {
  return (
    <section className="section reports">
      <div className="wrap">
        <div className="section-head section-head--split">
          <div>
            <span className="kicker">Reports</span>
            <h2 className="h2">Daily, weekly and monthly. By person, team or source.</h2>
          </div>
          <p className="lead">
            Reports separate a call attempt from a connected call, and a won deal from money received. You judge the
            team on outcomes and fix the actual delay.
          </p>
        </div>

        <div className="report-cols">
          {cols.map((c) => (
            <article className="report" key={c.when}>
              <div>
                <div className="report-when">{c.when}</div>
                <p>{c.lead}</p>
              </div>
              <svg className="spark" viewBox="0 0 140 50" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  <linearGradient id={`g-${c.when}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0" stopColor="#16b26c" stopOpacity=".25" />
                    <stop offset="1" stopColor="#16b26c" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={`${c.spark} L140 50 L0 50 Z`} fill={`url(#g-${c.when})`} />
                <path d={c.spark} fill="none" stroke="#16b26c" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
              <ul>
                {c.rows.map(([k, v]) => (
                  <li key={k}>
                    <span>{k}</span>
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="report-foot">
          Figures above are sample data. Every report shows the period and your company's timezone, and past work stays
          credited to the person who did it, even after a lead changes hands.
        </p>
      </div>
    </section>
  );
}
