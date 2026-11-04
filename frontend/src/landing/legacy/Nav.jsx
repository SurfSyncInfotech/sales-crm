import { useEffect, useState } from "react";
import { IconMenu } from "./icons.jsx";

const links = [
  { href: "#journey", label: "How it works" },
  { href: "#roles", label: "For your team" },
  { href: "#whatsapp", label: "WhatsApp" },
  { href: "#branding", label: "Your branding" },
  { href: "#faq", label: "FAQ" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 12);
      setHidden(y > 600 && y > last + 4);
      if (y < last - 4) setHidden(false);
      last = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`nav ${scrolled || open ? "is-scrolled" : ""} ${hidden && !open ? "is-hidden" : ""}`}>
      <div className="wrap nav-inner">
        <a href="#top" className="nav-logo" aria-label="PatronPing home">
          <img src="/logo.png" alt="PatronPing" width="150" height="42" />
        </a>
        <nav aria-label="Main">
          <ul className="nav-links">
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="nav-actions">
          <a href="#" className="nav-signin">
            Sign in
          </a>
          <a href="#demo" className="btn btn--primary">
            Book a demo
          </a>
          <button
            className="nav-burger"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <IconMenu />
          </button>
        </div>
      </div>
      <div className={`nav-sheet ${open ? "is-open" : ""}`}>
        {links.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </a>
        ))}
        <a href="#">Sign in</a>
      </div>
    </header>
  );
}
