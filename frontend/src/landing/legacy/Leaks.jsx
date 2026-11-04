import { IconTick } from "./icons.jsx";

const leaks = [
  {
    q: "A Meta lead came in on Saturday night. Who called them back?",
    fix: "Every lead is assigned the moment it lands, by rotation, workload, service or location. If nobody is free, it waits in an Unassigned list the admin can see.",
  },
  {
    q: "The estimate went out on the 1st. Did anyone check in after that?",
    fix: "Sending details starts a follow-up schedule on day 2, 5, 10 and 22. When the client replies, the automatic reminders pause so a person can answer.",
  },
  {
    q: "Sales is waiting on the PM, and the PM is waiting on a missing answer from the client.",
    fix: "Estimate and quotation requests have an owner, a due date and a clear status. Questions go back to sales on the same request, so nothing is lost in a chat thread.",
  },
  {
    q: "Your salesperson left. Their clients are still waiting to hear from you.",
    fix: "Disable the login and move their leads, tasks and PM requests to someone else. The new owner gets every note, call and message, so clients never repeat themselves.",
  },
];

export default function Leaks() {
  return (
    <section className="section leaks">
      <div className="wrap">
        <div className="section-head section-head--split">
          <div>
            <span className="kicker">Why sales teams switch</span>
            <h2 className="h2">Most deals are lost between conversations.</h2>
          </div>
          <p className="lead">
            Service businesses rarely lose to a better competitor. They lose to a missed callback, a quote that went out
            a week late, or a lead nobody owned. PatronPing closes each of those gaps with a rule, an owner and a
            reminder.
          </p>
        </div>

        <div className="leak-list">
          {leaks.map((l) => (
            <article className="leak" key={l.q}>
              <p className="leak-q">{l.q}</p>
              <p className="leak-fix">
                <IconTick />
                <span>{l.fix}</span>
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
