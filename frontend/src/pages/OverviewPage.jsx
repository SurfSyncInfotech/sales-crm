import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/client';

function money(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

export default function OverviewPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi
      .overview()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="page">
        <div className="alert">{error}</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <div className="skeleton-block" />
      </div>
    );
  }

  const maxMonth = Math.max(...data.monthly.map((m) => Number(m.revenue)), 1);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Platform pulse</p>
          <h1>Overview</h1>
        </div>
        <Link to="/admin/companies" className="primary-btn">
          + New company
        </Link>
      </header>

      <div className="mobile-cta-row mobile-only">
        <Link to="/admin/companies" className="primary-btn">
          + New company
        </Link>
      </div>

      <section className="stat-grid">
        <article className="stat-card accent">
          <span>MRR</span>
          <strong>{money(data.revenue.mrr)}</strong>
          <small>Active subscriptions</small>
        </article>
        <article className="stat-card">
          <span>Month to date</span>
          <strong>{money(data.revenue.mtd_revenue)}</strong>
          <small>Paid this month</small>
        </article>
        <article className="stat-card">
          <span>Total revenue</span>
          <strong>{money(data.revenue.total_revenue)}</strong>
          <small>All-time collected</small>
        </article>
        <article className="stat-card">
          <span>Companies</span>
          <strong>{data.counts.total_companies}</strong>
          <small>
            {data.counts.active_companies} active · {data.counts.trial_companies} trial
          </small>
        </article>
      </section>

      <section className="split-grid">
        <article className="panel">
          <div className="panel-head">
            <h2>Revenue trend</h2>
            <span className="muted">Last 12 months</span>
          </div>
          <div className="bars">
            {data.monthly.length === 0 && <p className="muted">No paid invoices yet.</p>}
            {data.monthly.map((m) => (
              <div key={m.month} className="bar-row">
                <span>{m.month.slice(5)}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(Number(m.revenue) / maxMonth) * 100}%` }} />
                </div>
                <em>{money(m.revenue)}</em>
              </div>
            ))}
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h2>By plan</h2>
            <span className="muted">Active + trial</span>
          </div>
          <ul className="plan-list">
            {data.byPlan.map((p) => (
              <li key={p.plan_name}>
                <div>
                  <strong>{p.plan_name}</strong>
                  <small>{p.companies} companies</small>
                </div>
                <span>{money(p.mrr_estimate)}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="split-grid">
        <article className="panel">
          <div className="panel-head">
            <h2>Recent companies</h2>
            <Link to="/admin/companies">View all</Link>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Plan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentCompanies.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.plan_name || '—'}</td>
                  <td>
                    <span className={`badge badge-${c.status}`}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>

        <article className="panel">
          <div className="panel-head">
            <h2>Recent payments</h2>
            <Link to="/admin/revenue">View all</Link>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Company</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.recentPayments.map((p) => (
                <tr key={p.id}>
                  <td>{p.invoice_number}</td>
                  <td>{p.company_name}</td>
                  <td>{money(p.amount)}</td>
                </tr>
              ))}
              {data.recentPayments.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted">
                    No payments recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </article>
      </section>
    </div>
  );
}
