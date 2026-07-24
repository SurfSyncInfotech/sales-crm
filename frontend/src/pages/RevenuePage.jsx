import { useEffect, useState } from 'react';
import { dashboardApi, paymentsApi } from '../api/client';

function money(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

export default function RevenuePage() {
  const [overview, setOverview] = useState(null);
  const [payments, setPayments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([dashboardApi.overview(), paymentsApi.list()])
      .then(([o, p]) => {
        setOverview(o);
        setPayments(p.payments);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="page">
        <div className="alert">{error}</div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="page">
        <div className="skeleton-block" />
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Finance</p>
          <h1>Revenue</h1>
        </div>
      </header>

      <section className="stat-grid">
        <article className="stat-card accent">
          <span>MRR</span>
          <strong>{money(overview.revenue.mrr)}</strong>
        </article>
        <article className="stat-card">
          <span>YTD</span>
          <strong>{money(overview.revenue.ytd_revenue)}</strong>
        </article>
        <article className="stat-card">
          <span>MTD</span>
          <strong>{money(overview.revenue.mtd_revenue)}</strong>
        </article>
        <article className="stat-card">
          <span>Pending</span>
          <strong>{money(overview.revenue.pending_revenue)}</strong>
        </article>
      </section>

      <article className="panel">
        <div className="panel-head">
          <h2>All invoices</h2>
          <span className="muted">{payments.length} records</span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Company</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Cycle</th>
              <th>Status</th>
              <th>Paid at</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{p.invoice_number}</td>
                <td>{p.company_name}</td>
                <td>{p.plan_name || '—'}</td>
                <td>{money(p.amount)}</td>
                <td>{p.billing_cycle}</td>
                <td>
                  <span className={`badge badge-${p.status === 'paid' ? 'active' : 'trial'}`}>{p.status}</span>
                </td>
                <td>{p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-IN') : '—'}</td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">
                  No revenue recorded yet. Create a company and mark a payment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </article>
    </div>
  );
}
