import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const days = [
  { day: "Sent", date: "1 Nov", text: <><b>Estimate and demo</b> go out on WhatsApp. The schedule starts.</>, state: "on" },
  { day: "Day 2", date: "3 Nov", text: <><b>Check in.</b> Has the client looked at it? Call and answer first questions.</>, state: "on" },
  { day: "Day 5", date: "6 Nov", text: <><b>Doubts and demo.</b> Record objections and bring in the PM.</>, state: "on" },
  { day: "Day 10", date: "11 Nov", text: <><b>Decision check.</b> Confirm budget, decision-maker and next step.</>, state: "paused" },
  { day: "Day 22", date: "23 Nov", text: <><b>Clear answer.</b> Continue, revisit later or close with a reason.</>, state: "paused" },
];

export default function Cadence() {
  const root = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ wide: "(min-width: 761px)", calm: "(prefers-reduced-motion: reduce)" }, (ctx) => {
        if (ctx.conditions.calm) return;
        const tl = gsap.timeline({
          scrollTrigger: { trigger: ".cal", start: "top 70%", end: "bottom 60%", scrub: 0.6 },
        });
        tl.from(".cal-line i", { [ctx.conditions.wide ? "scaleX" : "scaleY"]: 0, ease: "none", duration: 3 }).from(
          ".cal-reply",
          { opacity: 0, y: 20, duration: 1 },
          "-=1.2"
        );
      });
    },
    { scope: root }
  );

  return (
    <section className="section cadence" ref={root}>
      <div className="wrap">
        <div className="section-head section-head--split">
          <div>
            <span className="kicker">Follow-ups that run themselves</span>
            <h2 className="h2">Day 2, 5, 10 and 22. Counted from the day details are sent.</h2>
          </div>
          <p className="lead">
            Send an estimate and PatronPing schedules the reminders and calling tasks for you. Before each message goes
            out, it checks whether the client replied, asked for a callback, opted out or already has a quote.
          </p>
        </div>

        <div className="cal">
          <div className="cal-track">
            <span className="cal-line" aria-hidden="true">
              <i />
            </span>
            {days.map((d) => (
              <div className={`cal-node is-${d.state}`} key={d.day}>
                <div className="cal-day">{d.day}</div>
                <div className="cal-date">{d.date}</div>
                <div className="cal-card">
                  <span>{d.text}</span>
                  {d.state === "paused" && <span className="pill pill--amber">Paused</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="cal-reply">
            <span className="avatar" style={{ background: "var(--ping-wash)", color: "var(--ping-deep)" }}>
              KF
            </span>
            <p>
              <b>6 Nov, 4:42 PM · Client replied:</b> “Can you add a size guide to the product page?” Day 10 and day 22
              are on hold until Aditi responds.
            </p>
            <span className="pill pill--amber">Waiting on Aditi</span>
          </div>
        </div>

        <div className="cadence-notes">
          <div>
            <h4>A reply always comes first</h4>
            <p>When a client answers, automatic reminders stop so they never get a generic nudge while waiting on you.</p>
          </div>
          <div>
            <h4>Quotes get their own cycle</h4>
            <p>Sending a quotation ends the details schedule and starts a fresh one from the quote date.</p>
          </div>
          <div>
            <h4>No silent losses</h4>
            <p>After day 22 the salesperson decides to continue, revisit later or close with a reason. Nothing is auto-closed.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
