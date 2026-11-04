import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

/* The PRD's worked example, told as one deal moving through PatronPing. */
const steps = [
  {
    title: "The enquiry arrives",
    when: "27 Oct, 9:12 AM",
    body: "A Meta lead form lands with a phone number and a short brief. PatronPing checks for earlier history and opens a new website deal.",
    stage: "New lead",
    tags: [["Meta lead", "blue"]],
    feed: { by: "M", text: <><b>Meta lead form</b> · wants a Shopify store for a fashion label</>, time: "9:12" },
  },
  {
    title: "Aditi is assigned",
    when: "27 Oct, 9:12 AM",
    body: "Equal rotation picks the next free salesperson. Aditi gets a notification, and the admin can see the lead is waiting for its first call.",
    stage: "Assigned",
    owner: "Aditi",
    feed: { by: "AI", text: <>Assigned to <b>Aditi</b> by equal rotation</>, time: "9:12" },
  },
  {
    title: "First call, feedback saved",
    when: "27 Oct, 10:05 AM",
    body: "The client is interested, has about ₹60,000 to spend and wants to see a fashion-store demo. Aditi cannot close the call without saving feedback and a next step.",
    stage: "Interested",
    value: "₹60,000",
    tags: [["Shopify", "green"], ["High priority", "amber"]],
    feed: { by: "AD", text: <>Call connected · <b>“Budget around ₹60k. Wants a fashion-store demo.”</b></>, time: "10:05" },
  },
  {
    title: "Requirements go to Priya",
    when: "28 Oct",
    body: "Aditi sends the requirement summary to Priya, the project manager. Priya asks about payments and shipping, and the answer comes back on the same request.",
    stage: "With PM",
    feed: { by: "PR", text: <><b>Priya</b> asked: which payment gateway and courier?</>, time: "28 Oct" },
  },
  {
    title: "Estimate and demo sent",
    when: "1 Nov",
    body: "Priya marks the estimate ready. Aditi checks it and sends the budget, a 5-week timeline and the demo link on WhatsApp from inside the deal.",
    stage: "Details sent",
    feed: { by: "AD", text: <>Estimate v1 and demo sent on WhatsApp · <b>Delivered</b></>, time: "1 Nov" },
  },
  {
    title: "Follow-ups run, then pause",
    when: "3 Nov and 6 Nov",
    body: "The day 2 reminder goes out on 3 November. On 6 November the client replies with a question, so the day 10 and day 22 reminders pause until Aditi answers.",
    stage: "Details sent",
    feed: { by: "KF", text: <>Client replied on WhatsApp · <b>reminders paused</b></>, time: "6 Nov" },
  },
  {
    title: "Quotation requested",
    when: "12 Nov",
    body: "The client confirms the scope and asks for a formal quote. Priya prepares it with payment milestones and validity, and the admin approves it.",
    stage: "Quotation ready",
    feed: { by: "RS", text: <>Quotation v1 <b>approved</b> and returned to sales</>, time: "12 Nov" },
  },
  {
    title: "Quote sent, terms discussed",
    when: "14 Nov",
    body: "A new follow-up cycle starts from the quote date. The client asks for two payment milestones instead of three, and the change goes for approval.",
    stage: "Quotation sent",
    feed: { by: "AD", text: <>Asked for 2 milestones · <b>approval requested</b></>, time: "15 Nov" },
  },
  {
    title: "Won",
    when: "19 Nov",
    body: "Aditi records the accepted version, the final value and the client's confirmation. Every remaining sales reminder for this deal stops.",
    stage: "Won",
    tags: [["Won", "green"]],
    feed: { by: "AD", text: <>Deal marked <b>Won</b> · quotation v2 accepted</>, time: "19 Nov" },
  },
  {
    title: "Handed to delivery",
    when: "19 Nov",
    body: "The delivery owner receives the scope, timeline, files and commitments. Payment is recorded separately when the money arrives.",
    stage: "Won · in delivery",
    feed: { by: "DL", text: <>Handover <b>acknowledged</b> by the delivery team</>, time: "19 Nov" },
  },
];

const tone = { blue: "pill--blue", green: "", amber: "pill--amber" };

export default function Journey() {
  const root = useRef(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const n = steps.length;
      const mm = gsap.matchMedia();
      const pick = (self) => setActive(Math.min(n - 1, Math.floor(self.progress * n * 0.999)));

      mm.add("(min-width: 961px)", () => {
        gsap.to(".journey-rail i", {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".journey-pin",
            start: "top top",
            end: () => `+=${window.innerHeight * n * 0.55}`,
            pin: true,
            scrub: 0.4,
            onUpdate: pick,
            invalidateOnRefresh: true,
          },
        });
      });

      mm.add("(max-width: 960px)", () => {
        gsap.to(".journey-rail i", {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".journey-steps",
            start: "top 70%",
            end: "bottom 50%",
            scrub: 0.4,
            onUpdate: pick,
          },
        });
      });
    },
    { scope: root }
  );

  const shown = steps.slice(0, active + 1);
  const stage = steps[active].stage;
  const owner = [...shown].reverse().find((s) => s.owner)?.owner || "Unassigned";
  const value = [...shown].reverse().find((s) => s.value)?.value || "Not set";
  const tags = shown.flatMap((s) => s.tags || []);
  const feed = shown.map((s) => s.feed).reverse();

  return (
    <section className="journey" id="journey" ref={root}>
      <div className="wrap">
        <div className="section-head section-head--split" style={{ marginBottom: 0 }}>
          <div>
            <span className="kicker">How a lead moves</span>
            <h2 className="h2">One Shopify enquiry, followed all the way to Won.</h2>
          </div>
          <p className="lead">
            This is a real path through PatronPing: a lead from Meta, a salesperson, a project manager and a client
            who takes three weeks to decide. Scroll to move the deal forward.
          </p>
        </div>
      </div>

      <div className="journey-pin">
        <div className="wrap journey-grid">
          <ol className="journey-steps">
            <span className="journey-rail" aria-hidden="true">
              <i />
            </span>
            {steps.map((s, i) => (
              <li
                key={s.title}
                className={`jstep ${i < active ? "is-done" : ""} ${i === active ? "is-current" : ""}`}
                aria-current={i === active ? "step" : undefined}
              >
                <div className="jstep-title">
                  {s.title} <small>{s.when}</small>
                </div>
                <div className="jstep-body">
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="deal-wrap">
          <div className="deal-readout">
            <b key={stage} style={stage.startsWith("Won") ? { color: "var(--ping)" } : undefined}>
              {stage}
            </b>
            <span>
              Step <i>{active + 1}</i> of {steps.length}
            </span>
          </div>
          <div className="deal" aria-live="polite">
            <div className="deal-head">
              <span className="avatar">KF</span>
              <div>
                <h4>Kavya Fashions</h4>
                <p>Shopify store · +91 92554 12341</p>
              </div>
              <span className={`deal-stage ${stage.startsWith("Won") ? "is-won" : ""}`}>{stage}</span>
            </div>
            <div className="deal-meta">
              <div>
                <small>Owner</small>
                <b>{owner}</b>
              </div>
              <div>
                <small>Budget</small>
                <b>{value}</b>
              </div>
              <div>
                <small>Source</small>
                <b>Meta ads</b>
              </div>
            </div>
            <div className="deal-tags">
              {tags.map(([t, c]) => (
                <span key={t} className={`pill ${tone[c]}`}>
                  {t}
                </span>
              ))}
            </div>
            <div className="deal-feed">
              {feed.map((f) => (
                <div className="feed-item" key={f.time + f.by}>
                  <span className="avatar">{f.by}</span>
                  <p>{f.text}</p>
                  <small>{f.time}</small>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
