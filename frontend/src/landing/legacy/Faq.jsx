const faqs = [
  [
    "Can other companies on PatronPing see our leads?",
    "No. Each company has its own workspace. Customers, messages, balances and reports from one company are never visible to another, and inside your company each person sees only what you allow.",
  ],
  [
    "Is WhatsApp included in the CRM plan?",
    "WhatsApp is a separate service you can request from inside the CRM. It has its own setup charge and prepaid messaging balance, and its status is shown apart from your subscription so you always know which one needs attention.",
  ],
  [
    "What if a salesperson leaves?",
    "Disable their login and transfer their open leads, tasks and PM requests to someone else. Notes and messages stay in the customer history, and earlier work stays credited to the person who did it.",
  ],
  [
    "Can we import the leads we already have?",
    "Yes. Upload an Excel or CSV file and review incomplete or duplicate entries before they go live. If a phone number or email already exists, PatronPing shows the earlier history instead of creating a copy.",
  ],
  [
    "What happens if our renewal is late?",
    "You get reminders before expiry. After a grace period, new paid activity and automatic messages pause, but your customer history stays readable and exportable.",
  ],
  [
    "Can we change the follow-up schedule?",
    "Day 2, 5, 10 and 22 is the default after details are sent. Admins can set working hours, contact windows and the quotation follow-up schedule before launch.",
  ],
];

export default function Faq() {
  return (
    <section className="section faq" id="faq">
      <div className="wrap faq-grid">
        <div>
          <span className="kicker">Questions</span>
          <h2 className="h2">What business owners ask us first.</h2>
          <p className="lead" style={{ marginTop: 20 }}>
            Something else on your mind? We'll answer it on the demo call, using your own sales process as the example.
          </p>
        </div>
        <div className="faq-list">
          {faqs.map(([q, a], i) => (
            <details className="faq-item" key={q} open={i === 0}>
              <summary>
                {q}
                <span className="faq-plus" aria-hidden="true" />
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
