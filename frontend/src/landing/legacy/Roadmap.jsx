const releases = [
  ["V1.0", "Core sales CRM", "Leads, assignment, requirements, PM estimates, quotations, mandatory feedback, tags and reports.", true],
  ["V1.1", "Integrated WhatsApp", "Inbox, message history, automatic follow-ups and messaging balance inside the CRM."],
  ["V1.2", "Voice workflow", "Speak feedback and requirements, review the proposed changes, create tasks."],
  ["V2.0", "Growth automation", "Reviewed prospect lists, email and WhatsApp outreach, voice agents and lost-lead recovery."],
  ["V3.0", "Jarvis", "Ask questions about your CRM data and get summaries and draft actions to review."],
];

const answers = [
  ["Kavya Fashions", "Quote v1 · reply waiting", "2 days"],
  ["Orbit Logistics", "Quote v2 · awaiting approval", "1 day"],
  ["Nova Realty", "Valid till 26 Nov · no reply", "5 days"],
];

export default function Roadmap() {
  return (
    <section className="section roadmap">
      <div className="dark-glow" aria-hidden="true" style={{ left: -300, right: "auto", top: "auto", bottom: -400 }} />
      <div className="wrap" style={{ position: "relative" }}>
        <div className="section-head section-head--split">
          <div>
            <span className="kicker" style={{ color: "var(--ping-bright)" }}>
              What's coming
            </span>
            <h2 className="h2">Each release builds on the same customer history.</h2>
          </div>
          <p className="lead" style={{ color: "rgba(255,255,255,.66)" }}>
            You never re-enter a contact when a feature is added. Activities logged by hand stay labelled as manual,
            so your records stay honest as automation arrives.
          </p>
        </div>

        <div className="releases">
          {releases.map(([v, t, d, live]) => (
            <div className={`release ${live ? "is-live" : ""}`} key={v}>
              <div className="release-v">{v}</div>
              <h4>{t}</h4>
              <p>{d}</p>
            </div>
          ))}
        </div>

        <div className="jarvis">
          <div>
            <h3 style={{ fontSize: "var(--t-h2)", maxWidth: "13ch" }}>Ask Jarvis what needs attention.</h3>
            <p style={{ color: "rgba(255,255,255,.66)", marginTop: 20, maxWidth: "48ch", fontSize: "var(--t-lead)" }}>
              Jarvis answers from the records you already have permission to see and shows the leads behind every
              answer. When something is missing, it says so. Any change it suggests waits for your review.
            </p>
          </div>
          <div className="jarvis-chat">
            <div className="jarvis-q">Which quotations need attention?</div>
            <div className="jarvis-a">
              <small>3 quotations from this week, sorted by age</small>
              {answers.map(([n, s, a]) => (
                <div className="row" key={n}>
                  <span>
                    <b>{n}</b>
                    <br />
                    <small>{s}</small>
                  </span>
                  <small>{a}</small>
                  <span className="pill pill--plain" style={{ background: "rgba(43,214,134,.14)", color: "#2bd686" }}>
                    Open
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
