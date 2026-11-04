import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Console from "./Console.jsx";

const toasts = [
  { src: "M", color: "#1b63e8", title: "New lead from Meta ads", who: "Kavya Fashions · Shopify store", to: "Aditi" },
  { src: "IM", color: "#e5484d", title: "IndiaMART enquiry", who: "Orbit Logistics · tracking app", to: "Rahul" },
  { src: "W", color: "#16b26c", title: "Website callback form", who: "Mehta Dental · clinic website", to: "Aditi" },
];

export default function Hero() {
  const root = useRef(null);
  const bars = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

        tl.from(".hero-badge", { y: 16, opacity: 0, duration: 0.8 })
          .from(".hero h1 .line > span", { yPercent: 110, duration: 1.1, stagger: 0.09 }, "<0.1")
          .from(".hero-sub, .hero-ctas", { y: 18, opacity: 0, duration: 0.9, stagger: 0.08 }, "<0.45")
          .from(".hero-frame", { y: 80, opacity: 0, scale: 0.96, duration: 1.4 }, "<0.15")
          .from(bars.current.querySelectorAll("i"), { scaleY: 0, duration: 0.9, stagger: 0.05, ease: "power3.out" }, "<0.5")
          .from(".toast", { x: 40, opacity: 0, scale: 0.94, duration: 0.7, stagger: 0.55, ease: "back.out(1.6)" }, "<0.2")
          .from(".hero-callout", { y: 24, opacity: 0, duration: 0.8 }, "<0.6");

        // the logo's "ping" waves, radiating very slowly behind the product
        gsap.fromTo(
          ".hero-arcs circle",
          { scale: 0.6, opacity: 0, transformOrigin: "50% 50%" },
          { scale: 1.15, opacity: 1, duration: 9, ease: "none", repeat: -1, stagger: { each: 3, repeat: -1 } }
        );

        // product frame tilts back a touch as you scroll away
        gsap.to(".hero-frame", {
          yPercent: -6,
          ease: "none",
          scrollTrigger: { trigger: ".hero-stage", start: "top 60%", end: "bottom top", scrub: true },
        });
      });
    },
    { scope: root }
  );

  return (
    <section className="hero" id="top" ref={root}>
      <svg className="hero-arcs" viewBox="0 0 1600 1600" aria-hidden="true">
        <circle cx="800" cy="800" r="420" strokeWidth="1.5" />
        <circle cx="800" cy="800" r="600" strokeWidth="1.5" />
        <circle cx="800" cy="800" r="780" strokeWidth="1.5" />
      </svg>

      <div className="wrap hero-copy">
        <span className="hero-badge">
          <b>New</b> Run the CRM under your own logo and colours
        </span>
        <h1>
          <span className="line">
            <span>Every lead gets</span>
          </span>
          <span className="line">
            <span>an owner, a next step</span>
          </span>
          <span className="line">
            <span>and a follow-up.</span>
          </span>
        </h1>
        <p className="hero-sub">
          PatronPing is the sales CRM for businesses that sell services. Enquiries from Meta, IndiaMART, Justdial and
          your website reach the right salesperson in seconds. Your project managers price the work, and WhatsApp
          follow-ups go out on day 2, 5, 10 and 22 until the deal closes.
        </p>
        <div className="hero-ctas">
          <a href="#demo" className="btn btn--primary">
            <span className="btn-dot" aria-hidden="true" />
            Book a 20-minute demo
          </a>
          <a href="#journey" className="btn btn--ghost">
            Follow one lead to Won
          </a>
        </div>
      </div>

      <div className="wrap hero-stage">
        <div className="hero-toasts" aria-hidden="true">
          {toasts.map((t) => (
            <div className="toast" key={t.title}>
              <span className="toast-icon" style={{ background: t.color }}>
                {t.src}
              </span>
              <div>
                <strong>{t.title}</strong>
                <span>{t.who}</span>
                <br />
                <em>Assigned to {t.to}</em> <span>· just now</span>
              </div>
            </div>
          ))}
        </div>

        <div className="hero-callout" aria-hidden="true">
          <b style={{ fontWeight: 600 }}>Priya marked the estimate ready</b>
          <div style={{ color: "rgba(255,255,255,.6)", marginTop: 4 }}>Kavya Fashions · Shopify store</div>
          <div className="row">
            Budget <b>₹60,000</b>
          </div>
          <div className="row">
            Timeline <b>5 weeks</b>
          </div>
        </div>

        <div className="hero-frame">
          <Console barsRef={bars} />
        </div>
      </div>
    </section>
  );
}
