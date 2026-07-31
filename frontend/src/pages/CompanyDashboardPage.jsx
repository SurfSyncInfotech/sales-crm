import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { companyPortalApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function CompanyDashboardPage() {
  const { user } = useAuth('company');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    companyPortalApi
      .dashboard()
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

  const { company, counts } = data;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Welcome back</p>
          <h1>{company.name}</h1>
        </div>
        {user?.role === 'company_admin' && (
          <Link to="/company/team" className="primary-btn">
            + Add salesperson
          </Link>
        )}
      </header>

      {user?.role === 'company_admin' && (
        <div className="mobile-cta-row mobile-only">
          <Link to="/company/team" className="primary-btn">
            + Add salesperson
          </Link>
        </div>
      )}

      <section className="stat-grid company-stats">
        <article className="stat-card accent">
          <span>Status</span>
          <strong style={{ textTransform: 'capitalize' }}>{company.status}</strong>
          <small>{company.plan_name || 'Trial'}</small>
        </article>
        <article className="stat-card">
          <span>Salespersons</span>
          <strong>{counts.salespersons}</strong>
          <small>of {company.max_salespersons || '—'} seats</small>
        </article>
        <article className="stat-card">
          <span>Admins</span>
          <strong>{counts.admins}</strong>
          <small>Company admins</small>
        </article>
        <article className="stat-card">
          <span>Subscription</span>
          <strong>{company.subscription_end || '—'}</strong>
          <small>Ends on</small>
        </article>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Company profile</h2>
          <span className={`badge badge-${company.status}`}>{company.status}</span>
        </div>
        <div className="detail-meta">
          <div>
            <span>Email</span>
            <strong>{company.email}</strong>
          </div>
          <div>
            <span>Phone</span>
            <strong>{company.phone || '—'}</strong>
          </div>
          <div>
            <span>Industry</span>
            <strong>{company.industry || '—'}</strong>
          </div>
          <div>
            <span>Location</span>
            <strong>{[company.city, company.state].filter(Boolean).join(', ') || '—'}</strong>
          </div>
          <div>
            <span>Billing</span>
            <strong>{company.billing_cycle}</strong>
          </div>
          <div>
            <span>Plan</span>
            <strong>{company.plan_name || 'Trial'}</strong>
          </div>
        </div>
      </section>
    </div>
  );
}
