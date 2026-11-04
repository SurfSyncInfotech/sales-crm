import "./styles.css";
import { lazy, Suspense, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { demoRequestsApi } from "../api/client";

gsap.registerPlugin(useGSAP, ScrollTrigger);
import Brand, { sources } from "./components/Brand.jsx";
import Icon from "./components/Icon.jsx";
import Fit from "./components/Fit.jsx";
const GlassGL = lazy(() => import("./components/Glass.jsx"));
const Glass = (p) => <Suspense fallback={<div className="glass" />}><GlassGL {...p} /></Suspense>;
import { ProductWindow, SourcesBox, Rotation, Calendar, Growth, Venn, vennGroups } from "./components/Visuals.jsx";

const Arrow = () => <Icon name="arrow" stroke={2.3} />;

function Cta({ children = "Book a demo", tone = "" }) {
  return (
    <a href="#demo" className={`br cta-wrap ${tone}`}>
      <span className="cta"><i><Arrow /></i>{children}</span>
    </a>
  );
}

function DemoForm({ onSubmitted }) {
  const [formData, setFormData] = useState({
    fullName: '',
    companyName: '',
    email: '',
    phone: '',
    requirement: 'WhatsApp API + CRM',
  });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');

  const services = [
    'WhatsApp API + CRM',
    'AI Voice Agent',
    'Sales Automation & Calling',
    'Apify Lead Scraping',
    'Custom Sales Setup',
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setErr('');
    setBusy(true);

    try {
      const payload = {
        full_name: formData.fullName.trim(),
        company_name: formData.companyName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        requirement: formData.requirement,
      };

      await demoRequestsApi.submit(payload);

      setSent(true);
      if (onSubmitted) onSubmitted();
    } catch (error) {
      setErr(error.message || 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="br demo-success-card" style={{ maxWidth: '580px', margin: '30px auto 0', padding: '32px 24px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid #BBF7D0', textAlign: 'center', boxShadow: '0 12px 30px rgba(22, 178, 108, 0.08)' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px auto', fontSize: '22px' }}>
          ✓
        </div>
        <h3 style={{ fontSize: '1.4rem', fontWeight: '700', color: '#111827', margin: 0 }}>
          Demo Request Received!
        </h3>
        <p style={{ fontSize: '0.92rem', color: '#4B5563', margin: '8px 0 16px 0', lineHeight: 1.5 }}>
          Thank you, <strong>{formData.fullName}</strong>. We have received your request for <strong>{formData.companyName}</strong>. Our team will contact you via WhatsApp & Call on <strong>{formData.phone}</strong> shortly.
        </p>
        <button
          type="button"
          onClick={() => { setSent(false); setFormData({ fullName: '', companyName: '', email: '', phone: '', requirement: 'WhatsApp API + CRM' }); }}
          style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '7px 16px', fontSize: '0.82rem', cursor: 'pointer', color: '#6B7280', fontWeight: '600' }}
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form className="br demo-grid-form" onSubmit={handleSubmit} style={{ maxWidth: '640px', width: '100%', margin: '28px auto 0', padding: '24px', backgroundColor: '#FFFFFF', borderRadius: '16px', border: '1px solid var(--line)', boxShadow: '0 20px 40px -15px rgba(16, 25, 54, 0.08)', textAlign: 'left' }}>
      {err && (
        <div style={{ padding: '10px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', color: '#B91C1C', fontSize: '0.84rem', marginBottom: '16px' }}>
          {err}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '5px' }}>
            Full Name *
          </label>
          <input
            required
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder="e.g. Rahul Sharma"
            style={{ width: '100%', height: '44px', borderRadius: '9px', border: '1px solid var(--line)', padding: '0 12px', fontSize: '0.88rem', outline: 'none' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '5px' }}>
            Company / Business Name *
          </label>
          <input
            required
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            placeholder="e.g. Acme Studio / Tech Corp"
            style={{ width: '100%', height: '44px', borderRadius: '9px', border: '1px solid var(--line)', padding: '0 12px', fontSize: '0.88rem', outline: 'none' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '5px' }}>
            Work Email *
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="you@company.com"
            style={{ width: '100%', height: '44px', borderRadius: '9px', border: '1px solid var(--line)', padding: '0 12px', fontSize: '0.88rem', outline: 'none' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '5px' }}>
            Phone / WhatsApp Number *
          </label>
          <input
            type="tel"
            required
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+91 98765 43210"
            style={{ width: '100%', height: '44px', borderRadius: '9px', border: '1px solid var(--line)', padding: '0 12px', fontSize: '0.88rem', outline: 'none' }}
          />
        </div>
      </div>

      {/* Requirement / Services Select */}
      <div style={{ marginBottom: '18px' }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--ink)', marginBottom: '8px' }}>
          Service / Requirement Interested In:
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {services.map((s) => {
            const active = formData.requirement === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setFormData({ ...formData, requirement: s })}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: active ? '700' : '500',
                  border: active ? '1px solid var(--green)' : '1px solid var(--line)',
                  backgroundColor: active ? 'var(--green-w)' : '#FFFFFF',
                  color: active ? 'var(--green-d)' : 'var(--ink-2)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {active ? '● ' : ''}{s}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        disabled={busy}
        style={{
          width: '100%',
          height: '48px',
          borderRadius: '10px',
          backgroundColor: 'var(--ink)',
          color: '#FFFFFF',
          fontSize: '0.94rem',
          fontWeight: '700',
          border: 'none',
          cursor: busy ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 4px 14px rgba(16, 25, 54, 0.2)',
          transition: 'all 0.15s ease',
        }}
      >
        {busy ? 'Submitting Request...' : 'Book a demo →'}
      </button>
      <small style={{ display: 'block', textAlign: 'center', color: 'var(--ink-3)', fontSize: '0.74rem', marginTop: '10px' }}>
        🔒 Strictly confidential · We will never spam or sell your information.
      </small>
    </form>
  );
}

function Head({ children, sub, center }) {
  return (
    <div className={`sh reveal ${center ? "sh--c" : ""}`}>
      <div className="br sh-in">
        <h2><span>{children}</span></h2>
        {sub && <p>{sub}</p>}
      </div>
    </div>
  );
}

const features = [
  ["inbox", "Every enquiry lands in one place", "Meta forms, IndiaMART, Justdial and website leads arrive together. Duplicates are caught before anyone calls twice.", SourcesBox],
  ["userPlus", "The right salesperson, in seconds", "Equal rotation hands each lead to the next free person. The owner sees anything still waiting for a first call.", Rotation],
  ["calendar", "Follow-ups that run themselves", "WhatsApp reminders go out on day 2, 5, 10 and 22. When the client replies, the rest pause until your salesperson answers.", Calendar],
  ["chart", "See what's working, every week", "Reports by person, team and source. A call attempt is never counted as a conversation, and a won deal never as money received.", Growth],
];

const steps = [
  ["Connect", "Connect your lead sources", "Meta lead forms, IndiaMART, Justdial and your website forms flow straight into PatronPing.", "No copy-pasting from inboxes.", "funnel"],
  ["Assign", "Your team gets every lead", "Rotation rules give each enquiry an owner. Every call ends with feedback and a next step.", "Nobody asks “who's handling this?” again.", "bubble"],
  ["Close", "Follow-ups close the deal", "Estimates, quotes and WhatsApp reminders run on schedule until the client says yes.", "This is what a sales desk should feel like.", "calendar"],
];

/* [file, name, height] — heights are tuned so each mark reads at the same visual weight */
const clients = [
  ["atleast80", "Atleast80", 34], ["doctor360", "Doctor360", 46], ["foodies", "Foodies", 44],
  ["infocus", "Infocus", 22], ["natural", "The Natural Ayurved", 66], ["vls", "VLS Wellness", 58],
];

/* [name, role · company, short quote, avatar colour] — filled from the customer story pages */
const stories = [];

const roles = [
  ["layout", "OWNER", "Every deal on one screen.", "Untouched leads, overdue follow-ups and PM delays, every morning.", ["Overdue", "By person"]],
  ["phone", "SALES", "Know who to call next, and why.", "New leads, client replies and today's follow-ups in one list. Calls and WhatsApp from the lead page.", ["Call log", "WhatsApp", "Next step"]],
  ["file", "PROJECT MANAGER", "Price work from complete briefs.", "Requests arrive with the brief, budget and timeline. Revised quotes keep the old version.", ["Estimate", "Versions"]],
  ["chat", "WHATSAPP", "Every chat tied to a deal.", "Your business number inside the CRM, with the balance always on screen.", ["Templates", "Balance"]],
  ["palette", "BRANDING", "Your logo on the CRM.", "Your team logs in to a CRM with your name, logo and colours.", ["Logo", "Colours"]],
];

const plans = [
  ["STANDARD", "For service teams that want every lead owned and followed up.", "", ["Leads from Meta, IndiaMART, Justdial and website", "Automatic assignment by rotation", "Call logging with feedback and next step", "PM estimates and quotations with versions", "WhatsApp follow-ups on day 2, 5, 10 and 22", "Reports by person, team and source"]],
  ["WHITE-LABEL", "For businesses that want the CRM to carry their own brand.", "alt", ["Everything in Standard", "Your logo, colours and company name", "Menu access set per person", "Admin approval on quotations", "Separate WhatsApp credit with low-balance alerts"]],
];

export default function App() {
  const root = useRef(null);
  const [step, setStep] = useState(0);
  const [role, setRole] = useState(null);

  useGSAP(() => {
    steps.forEach((_, i) =>
      ScrollTrigger.create({ trigger: `.step:nth-child(${i + 1})`, start: "top 55%", end: "bottom 55%", onToggle: (s) => s.isActive && setStep(i) })
    );
    gsap.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
      gsap.timeline({ defaults: { ease: "expo.out" } })
        .from(".hero .badge", { y: 14, autoAlpha: 0, duration: 0.8 })
        .from(".hero h1", { y: 30, autoAlpha: 0, duration: 1.1 }, "<0.1")
        .from(".hero-sub, .hero .form, .sources", { y: 18, autoAlpha: 0, duration: 0.9, stagger: 0.08 }, "<0.3")
        .from(".hero .wash", { autoAlpha: 0, duration: 1.6 }, 0);
      gsap.utils.toArray(".reveal").forEach((el) =>
        gsap.from(el, { y: 36, autoAlpha: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } })
      );
      gsap.from(".stage", { y: 80, scale: 0.96, autoAlpha: 0, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".stage", start: "top 92%", once: true } });
      gsap.from(".toast", { x: 40, autoAlpha: 0, duration: 0.7, stagger: 0.35, ease: "back.out(1.6)", scrollTrigger: { trigger: ".stage", start: "top 60%", once: true } });
    });
  }, { scope: root });

  return (
    <div ref={root} className="patronping-landing">
      <nav className="nav">
        <a href="#top"><img className="nav-logo" src="/logo.png" alt="PatronPing" /></a>
        <div className="nav-links">
          {[["Product", "#features"], ["How it works", "#how"], ["Roles", "#roles"], ["Pricing", "#pricing"]].map(([l, h], i) => (
            <a key={l} href={h}>{l}</a>
          ))}
        </div>
        <div className="nav-right">
          <a className="btn-ghost" href="/company/login">Log in</a>
          <Cta />
        </div>
      </nav>

      <main>
        {/* hero */}
        <section className="hero" id="top">
          <div className="wash" aria-hidden="true">
            <svg viewBox="0 0 1440 980" fill="none" preserveAspectRatio="none">
              <g stroke="#16b26c" strokeWidth="1.2"><path strokeOpacity=".35" d="M-40 980 C 80 760, 160 560, 120 300 S 220 60, 300 -20" /><path strokeOpacity=".22" d="M-80 980 C 40 720, 120 520, 70 280 S 160 40, 230 -20" /><path strokeOpacity=".18" d="M10 980 C 130 800, 210 610, 180 360 S 280 100, 380 -20" /></g>
              <g stroke="#1b63e8" strokeWidth="1.2"><path strokeOpacity=".3" d="M1480 980 C 1360 760, 1280 560, 1320 300 S 1220 60, 1140 -20" /><path strokeOpacity=".2" d="M1520 980 C 1400 720, 1320 520, 1370 280 S 1280 40, 1210 -20" /><path strokeOpacity=".16" d="M1430 980 C 1310 800, 1230 610, 1260 360 S 1160 100, 1060 -20" /></g>
            </svg>
          </div>
          <div className="wrap hero-copy">
            <span className="br badge"><b>New</b> Your logo and colours on the whole CRM</span>
            <h1>Every lead gets an owner and a <span className="g">follow-up.</span></h1>
            <p className="hero-sub">Enquiries from Meta, IndiaMART, Justdial and your website reach the right salesperson in seconds. PatronPing follows up on WhatsApp until the deal closes.</p>
            <div style={{ marginTop: '28px', marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
              <a
                href="#demo"
                className="br cta-wrap"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '13px 30px',
                  backgroundColor: 'var(--ink)',
                  color: '#FFFFFF',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '0.96rem',
                  textDecoration: 'none',
                  boxShadow: '0 8px 24px rgba(16, 25, 54, 0.18)',
                  transition: 'transform 0.15s ease',
                }}
              >
                <span>Book a demo</span>
                <span style={{ fontSize: '1.1rem' }}>→</span>
              </a>
            </div>
            <div className="sources">
              <span className="sources-l">Leads arrive from</span>
              {sources.map((s) => <span key={s.id} className="src"><Brand id={s.id} size={18} />{s.id === "justdial" ? <span className="sr">{s.label}</span> : s.label}</span>)}
            </div>
          </div>
          <p className="pain reveal">Forty enquiries came in today.<span>Someone will call them back. Probably.</span></p>
          <div className="wrap stage br">
            <Fit w={1180} h={700}><ProductWindow /></Fit>
          </div>
        </section>

        {/* customer logos */}
        <section className="logos wrap">
          <p className="logos-h">Trusted by growing businesses across India</p>
          <div className="logo-grid">
            {clients.map(([f, name, h]) => <div key={f}><img src={`/clients/${f}.png`} alt={name} style={{ height: h }} /></div>)}
          </div>
        </section>
        <div className="cross wrap" />

        {/* features */}
        <section className="wrap" id="features">
          <Head sub="From the first enquiry to the signed quote, every lead keeps moving.">
            Your sales desk runs <span className="g">all day.</span> And never forgets a <span className="b">follow-up.</span>
          </Head>
          <div className="feat">
            {features.map(([ic, h, p, V], i) => (
              <article className="fcard br reveal" key={h}>
                <div className="fcopy">
                  <span className="tag"><Icon name={ic} size={13} />{i + 1}/4</span>
                  <h3>{h}</h3>
                  <p>{p}</p>
                  {i === 3 && <a href="#demo" style={{ color: "white" }} className="cta-dark">Book a demo<Arrow /></a>}
                </div>
                <div className="panel-wrap br"><Fit w={620} h={440}><V /></Fit></div>
              </article>
            ))}
          </div>
        </section>
        <div className="cross wrap" />

        {/* how it works */}
        <section className="wrap" id="how">
          <Head sub="We connect your sources and run one of your real enquiries through PatronPing on the call.">
            One <span className="g">20-minute</span> call to set up. First lead routed today.
          </Head>
          <div className="steps">
            <div className="snav">{steps.map(([n], i) => <div key={n} className={i === step ? "on" : ""}>{n}</div>)}</div>
            <div className="slist">
              {steps.map(([, h, p, aside, icon], i) => (
                <div className="step" key={h}>
                  <div className="reveal">
                    <span className="tag tag--b"><Icon name="step" size={13} />0{i + 1}</span>
                    <h3>{h}</h3>
                    <p>{p}</p>
                    <div className="aside">{aside}</div>
                    {i === 2 && <a href="#demo" style={{ color: "white" }} className="cta-dark">Book a demo <Arrow /></a>}
                  </div>
                  <Glass icon={icon} />
                </div>
              ))}
            </div>
          </div>
        </section>
        <div className="cross wrap" />

        {/* roles */}
        <section className="wrap" id="roles">
          <Head sub="Owners, salespeople and project managers each see their part of the deal.">
            Built for the <span className="g">whole sales desk.</span>
          </Head>
          <div className="marquee reveal">
            <div className="marquee-track">
              {[0, 1].map((copy) => roles.map(([ic, l, h, p, tags]) => {
                const k = `${copy}-${l}`;
                return (
                  <button type="button" key={k} className={`rc br ${role === k ? "open" : ""}`} aria-hidden={copy === 1 || undefined} tabIndex={copy === 1 ? -1 : 0}
                    onClick={() => setRole(k)} onMouseEnter={() => setRole(k)} onMouseLeave={() => setRole(null)} onFocus={() => setRole(k)} onBlur={() => setRole(null)}>
                    <Icon name={ic} stroke={1.2} className="rc-ic" />
                    <div className="rt">
                      <span className="lbl br">{l}</span>
                      <h4>{h}</h4>
                      <p>{p}</p>
                      <div className="tags">{tags.map((t, j) => <span key={t} className={["t-g", "t-b", "t-a"][j]}>{t}</span>)}</div>
                    </div>
                  </button>
                );
              }))}
            </div>
          </div>
        </section>
        <div className="cross wrap" />

        {/* one crm */}
        <section className="wrap" id="stack">
          <Head sub="Spreadsheets, WhatsApp groups and reminder apps, replaced by one place that remembers everything.">
            One CRM. Your <span className="g">entire</span> sales desk.
          </Head>
          <div className="venn-desk reveal"><Fit w={1200} h={560}><Venn /></Fit></div>
          <div className="venn-list">
            {vennGroups.map((g) => (
              <div key={g.label} className="vg br">
                <h4 className={g.tone}>{g.icon}{g.label}</h4>
                <div>{g.chips.map(([ic, t], i) => <span key={i} className="vc">{ic}{t}</span>)}</div>
              </div>
            ))}
          </div>
        </section>
        <div className="cross wrap" />

        {/* proof */}
        <section className="wrap" id="proof">
          <div className="facts-intro reveal"><div className="br sh-in">
            <h2>Built for <span className="g">agencies, clinics and studios</span> that sell services, not boxes.</h2>
          </div></div>
          <div className="facts">
            <div className="fact reveal"><b>4</b><p>Lead sources routed automatically</p></div>
            <div className="fact reveal"><b className="days">2 · 5 · 10 · 22</b><p>Follow-up days, counted from the quote</p></div>
            <div className="fact reveal"><b>3<sub> roles</sub></b><p>Owner, sales and PM on one deal</p></div>
          </div>
          {stories.length > 0 && (
            <div className="quotes">
              {stories.map(([name, role, quote, bg]) => (
                <figure className="q br" key={name}>
                  <blockquote>“{quote}”</blockquote>
                  <figcaption className="q-h">
                    <span className="av" style={{ background: bg }}>{name.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
                    <div><b>{name}</b><small>{role}</small></div>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>
        <div className="cross wrap" />

        {/* integrations */}
        <section className="wrap" id="integrations">
          <Head sub="Meta lead ads, IndiaMART, Justdial, your website forms and WhatsApp Business.">
            Works where your <span className="g">leads already are.</span>
          </Head>
          <div className="tree reveal">
            <svg viewBox="0 0 1200 500" fill="none" preserveAspectRatio="none" aria-hidden="true">
              <path d="M600 170 C 600 300, 220 300, 220 380" stroke="#16b26c" strokeOpacity=".45" />
              <path d="M600 170 C 600 300, 410 300, 410 380" stroke="#1b63e8" strokeOpacity=".35" />
              <path d="M600 170 L 600 380" stroke="#d5dbd6" />
              <path d="M600 170 C 600 300, 790 300, 790 380" stroke="#16b26c" strokeOpacity=".45" />
              <path d="M600 170 C 600 300, 980 300, 980 380" stroke="#1b63e8" strokeOpacity=".35" />
            </svg>
            <div className="hub br"><Glass icon="bubble" /></div>
            <div className="tiles">
              {[["meta", "Meta lead ads"], ["indiamart", "IndiaMART"], ["justdial", "Justdial"], ["website", "Website forms"], ["whatsapp", "WhatsApp Business"]].map(([id, l]) => (
                <div className="ti br" key={id}><Brand id={id} size={40} tile /><span>{l}</span></div>
              ))}
            </div>
          </div>
        </section>
        <div className="cross wrap" />

        {/* pricing */}
        <section className="wrap" id="pricing">
          <Head center sub="Every plan is set up with you on a 20-minute demo.">
            Simple plans. <span className="g">Priced</span> on a call.
          </Head>
          <div className="price">
            {plans.map(([l, h, alt, items]) => (
              <div className={`pc br reveal ${alt}`} key={l}>
                <span className="lbl br">{l}</span>
                <h3>Talk to us</h3>
                <h4>{h}</h4>
                <Cta tone={alt} />
                <hr />
                <h5>What's included</h5>
                <ul>{items.map((t) => <li key={t}><Icon name="tick" size={17} />{t}</li>)}</ul>
              </div>
            ))}
          </div>
        </section>

        {/* final cta */}
        <section className="final wrap reveal" id="demo">
          <svg className="waves" viewBox="0 0 1200 520" fill="none" preserveAspectRatio="none" aria-hidden="true">
            <g stroke="#16b26c" strokeWidth="1.2"><path strokeOpacity=".3" d="M-20 520 C 120 380, 180 250, 140 60" /><path strokeOpacity=".2" d="M-60 520 C 80 360, 120 230, 80 40" /></g>
            <g stroke="#1b63e8" strokeWidth="1.2"><path strokeOpacity=".28" d="M1220 0 C 1080 140, 1020 270, 1060 460" /><path strokeOpacity=".2" d="M1260 0 C 1120 160, 1080 290, 1120 480" /></g>
          </svg>
          <h2>Your next 10 clients <span className="g">already enquired.</span></h2>
          <p>Make sure someone follows up.</p>
          <DemoForm />
          <small>20-minute call · Set up with one of your real enquiries</small>
        </section>
      </main>

      <footer>
        <div className="foot wrap">
          <div><img src="/logo.png" alt="PatronPing" /><p>The sales CRM for businesses that sell services.</p></div>
          <div><h5>Product</h5>{["Lead capture", "Assignment", "Follow-ups", "WhatsApp", "Reports", "Custom branding"].map((t) => <a key={t} href="#features">{t}</a>)}</div>
          <div><h5>For</h5>{["Business owners", "Salespeople", "Project managers", "Agencies", "Clinics"].map((t) => <a key={t} href="#roles">{t}</a>)}</div>
          <div>
            <h5>Access</h5>
            <a href="/company/login">Company Portal</a>
            <a href="/sales/login">Sales Rep Portal</a>
            <a href="/superadmin">Superadmin Console</a>
          </div>
        </div>
        <div className="foot-b wrap"><span>© 2026 PatronPing</span><span>Privacy · Terms</span></div>
      </footer>
    </div>
  );
}
