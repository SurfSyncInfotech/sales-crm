import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { IconMic } from "./icons.jsx";

const SPOKEN =
  "Client wants Shopify, budget around sixty thousand. Ask Priya for an estimate and remind me Friday at eleven.";

const proposals = [
  { text: "Requirement: Shopify store", sub: "Added to the deal summary" },
  { text: "Budget: about ₹60,000", sub: "Saved as approximate" },
  { text: "Estimate request for Priya", sub: "Two PMs are named Priya. Choose one", ask: true },
  { text: "Callback Fri 22 Nov, 11:00 AM", sub: "Task for Aditi" },
];

export default function Voice() {
  const root = useRef(null);
  const timer = useRef(null);
  const [typed, setTyped] = useState(0);
  const [phase, setPhase] = useState("idle"); // idle | listening | review

  const play = () => {
    clearInterval(timer.current);
    setTyped(0);
    setPhase("listening");
    let i = 0;
    timer.current = setInterval(() => {
      i += 2;
      setTyped(Math.min(i, SPOKEN.length));
      if (i >= SPOKEN.length) {
        clearInterval(timer.current);
        setPhase("review");
      }
    }, 32);
  };

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setTyped(SPOKEN.length);
      setPhase("review");
      return;
    }
    const st = ScrollTrigger.create({ trigger: root.current, start: "top 55%", once: true, onEnter: play });
    return () => {
      st.kill();
      clearInterval(timer.current);
    };
  }, []);

  const listening = phase === "listening";

  return (
    <section className="section voice" ref={root}>
      <div className="wrap voice-grid">
        <div>
          <span className="kicker">Voice updates · coming in V1.2</span>
          <h2 className="h2">Say what happened on the call. Review it. Save.</h2>
          <p className="lead" style={{ marginTop: 22 }}>
            After a call, a salesperson speaks one update in English, Hindi or Hinglish. PatronPing turns it into a
            note, fills in the requirement and budget, and prepares the PM request and the callback. Nothing is saved
            until a person checks it.
          </p>
          <p className="voice-guard">
            <b>Voice never makes commercial decisions.</b> It cannot approve discounts, send quotations or change
            balances. A client's deadline is saved as a request, never as a promise.
          </p>
        </div>

        <div className="voice-device">
          <div className="voice-rec">
            <button
              className={`mic ${listening ? "is-live" : ""}`}
              onClick={play}
              aria-label="Replay the voice update example"
            >
              <IconMic />
            </button>
            <div className={`wave ${listening ? "is-live" : ""}`} aria-hidden="true">
              {Array.from({ length: 34 }, (_, i) => (
                <i key={i} style={{ animationDelay: `${(i % 7) * -0.13}s` }} />
              ))}
            </div>
            <span style={{ fontSize: "0.85rem", color: "var(--ink-3)", fontVariantNumeric: "tabular-nums" }}>
              {listening ? "Listening" : "0:07"}
            </span>
          </div>

          <div className="transcript" aria-live="polite">
            <small>What PatronPing heard · Kavya Fashions</small>
            {SPOKEN.slice(0, typed)}
            {listening && <span className="caret" />}
          </div>

          {phase === "review" && (
            <>
              <div className="proposals">
                {proposals.map((p, i) => (
                  <label
                    className={`proposal ${p.ask ? "is-ask" : ""}`}
                    key={p.text}
                    style={{ animationDelay: `${i * 0.12}s` }}
                  >
                    <input type="checkbox" defaultChecked={!p.ask} />
                    <span>
                      {p.text}
                      <br />
                      <small>{p.sub}</small>
                    </span>
                    {p.ask ? <span className="pill pill--amber">Check</span> : <span className="pill">Ready</span>}
                  </label>
                ))}
              </div>
              <div className="voice-actions">
                <button className="btn btn--ghost" onClick={play}>
                  Record again
                </button>
                <button className="btn btn--green">Confirm and save</button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
