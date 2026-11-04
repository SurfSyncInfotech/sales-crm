export default function Footer() {
  return (
    <footer className="final" id="demo">
      <div className="wrap">
        <div className="final-cta">
          <h2>Bring us your next ten leads.</h2>
          <p>
            In a 20-minute demo we set up your lead sources, assignment rules and follow-up schedule, then run one of
            your real enquiries through PatronPing.
          </p>
          <div className="hero-ctas">
            <a href="mailto:info@surfsyncinfotech.in?subject=PatronPing%20demo" className="btn btn--light">
              Book a 20-minute demo
            </a>
            <a href="#journey" className="btn btn--ghost">
              See the lead journey again
            </a>
          </div>
        </div>

        <div className="foot">
          <div className="foot-brand">
            <div className="foot-logo">
              <img src="/mark.png" alt="" />
              <b style={{ fontWeight: 700 }}>
                Patron<span>Ping</span>
              </b>
            </div>
            <p>The sales CRM for businesses that sell services. Built by SurfSync Infotech in Noida.</p>
          </div>
          <div>
            <h5>Product</h5>
            <ul>
              <li><a href="#journey">How it works</a></li>
              <li><a href="#roles">For your team</a></li>
              <li><a href="#whatsapp">WhatsApp</a></li>
              <li><a href="#branding">Your branding</a></li>
            </ul>
          </div>
          <div>
            <h5>Company</h5>
            <ul>
              <li><a href="#">About SurfSync</a></li>
              <li><a href="#">Contact</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div>
            <h5>Legal</h5>
            <ul>
              <li><a href="#">Privacy policy</a></li>
              <li><a href="#">Terms of service</a></li>
            </ul>
          </div>
        </div>
        <div className="foot-base">
          <span>© 2026 SurfSync Infotech Pvt. Ltd.</span>
          <span>Made in India</span>
        </div>
      </div>
    </footer>
  );
}
