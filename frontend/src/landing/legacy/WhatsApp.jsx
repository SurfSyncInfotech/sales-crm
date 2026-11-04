import { IconSend } from "./icons.jsx";

const contacts = [
  ["KF", "Kavya Fashions", "Can we do 2 milestones?", 2, true],
  ["OL", "Orbit Logistics", "Quotation v1.pdf", 0],
  ["MD", "Mehta Dental", "Thanks, will check the demo", 1],
  ["SI", "Sharma Interiors", "Hi, I saw your ad on Justdial", 0],
  ["NR", "Nova Realty", "Can we meet Tuesday?", 0],
];

const states = [
  ["Requested", true],
  ["Payment verified", true],
  ["Number connected", true],
  ["Send and reply test passed", true],
  ["Active", true],
];

export default function WhatsApp() {
  return (
    <section className="section dark" id="whatsapp">
      <div className="dark-glow" aria-hidden="true" />
      <div className="wrap" style={{ position: "relative" }}>
        <div className="section-head section-head--split">
          <div>
            <span className="kicker">WhatsApp inside the CRM</span>
            <h2 className="h2">Your business number, with every chat tied to a deal.</h2>
          </div>
          <p className="lead">
            Once your WhatsApp service is active, the team replies, sends estimates and shares quotes from PatronPing.
            Each conversation sits next to the lead's stage, owner and history, and the balance is always on screen.
          </p>
        </div>

        <div className="wa-grid">
          <div className="wa-inbox">
            <div className="wa-list">
              {contacts.map(([i, n, m, u, a]) => (
                <div className={`wa-contact ${a ? "is-active" : ""}`} key={n}>
                  <span className="avatar">{i}</span>
                  <div>
                    {n}
                    <small>{m}</small>
                  </div>
                  {u ? <span className="wa-unread">{u}</span> : <span />}
                </div>
              ))}
            </div>
            <div className="wa-thread">
              <div className="wa-thread-head">
                <div>
                  <b>Kavya Fashions</b>
                  <small>+91 92554 12341 · Owner: Aditi</small>
                </div>
                <span className="pill pill--blue">Quotation sent · v1</span>
              </div>
              <div className="wa-msgs">
                <div className="bubble bubble--out">
                  Hi Kavya, sharing the quotation for your Shopify store as discussed.
                  <small>14 Nov · 11:02 · Read</small>
                </div>
                <div className="bubble bubble--out bubble--file">
                  <i>PDF</i>
                  <span>
                    Quotation_v1_KavyaFashions.pdf
                    <small style={{ textAlign: "left" }}>Valid till 30 Nov</small>
                  </span>
                </div>
                <div className="bubble bubble--in">
                  Looks good. Can we do 2 payment milestones instead of 3?
                  <small>15 Nov · 09:18</small>
                </div>
                <div className="bubble bubble--in">Want to start before Diwali sale 🙏<small>15 Nov · 09:19</small></div>
              </div>
              <div className="wa-compose">
                <span>Reply as Aditi…</span>
                <IconSend />
              </div>
            </div>
          </div>

          <div className="wa-side">
            <div className="dark-card">
              <h4>Messaging balance</h4>
              <div className="balance-num">₹1,600</div>
              <p className="muted" style={{ fontSize: "0.88rem", marginTop: 6 }}>
                Available to use now
              </p>
              <div className="balance-bar" aria-hidden="true">
                <i style={{ width: "80%" }} />
                <i style={{ width: "5%" }} />
                <i style={{ width: "15%" }} />
              </div>
              <div className="balance-rows">
                <div>
                  Recharged <b>₹2,000</b>
                </div>
                <div>
                  Reserved, awaiting confirmation <b>₹100</b>
                </div>
                <div>
                  Settled usage <b>₹300</b>
                </div>
              </div>
            </div>
            <div className="dark-card">
              <h4>Service status</h4>
              <div className="states">
                {states.map(([s, d]) => (
                  <div className={`state ${d ? "is-done" : ""}`} key={s}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="wa-rules">
          <div>
            <b>Replies pause reminders</b>
            The assigned salesperson is notified and queued nudges hold.
          </div>
          <div>
            <b>Opt-outs are respected</b>
            A client who asks you to stop gets no further campaign messages.
          </div>
          <div>
            <b>Failures are visible</b>
            A failed send shows up with a recovery task, never as delivered.
          </div>
          <div>
            <b>Billed separately</b>
            Your CRM plan and WhatsApp credit are tracked apart, with low-balance alerts.
          </div>
        </div>
      </div>
    </section>
  );
}
