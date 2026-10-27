import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { companyPortalApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Key } from 'lucide-react';

const empty = { name: '', email: '', password: '', domain: '' };

export default function CompanyTeamPage() {
  const { user, setSalesSession } = useAuth('company');
  const navigate = useNavigate();
  const isAdmin = user?.role === 'company_admin';
  const [team, setTeam] = useState([]);
  const [domains, setDomains] = useState([]);
  const [editingDomains, setEditingDomains] = useState({});
  const [form, setForm] = useState(empty);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [switchingId, setSwitchingId] = useState(null);

  async function load() {
    const [teamData, domainsData] = await Promise.all([
      companyPortalApi.team(),
      companyPortalApi.domains().catch(() => ({ domains: [] })),
    ]);
    setTeam(teamData.team || []);
    setDomains(domainsData.domains || []);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await companyPortalApi.addMember(form);
      setForm(empty);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDomainSave(memberId) {
    const newDomain = editingDomains[memberId];
    if (newDomain === undefined) return;
    try {
      await companyPortalApi.updateMemberDomain(memberId, newDomain);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleStatus(member) {
    try {
      await companyPortalApi.setMemberStatus(member.id, !member.is_active);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSalesLogin(member) {
    if (!member.is_active) {
      setError('Cannot log in to a deactivated salesperson account');
      return;
    }
    setSwitchingId(member.id);
    setError('');
    try {
      const data = await companyPortalApi.impersonateSales(member.id);
      if (data.token && data.user) {
        setSalesSession(data.token, data.user);
        // Open the Sales CRM panel directly
        navigate('/sales');
      }
    } catch (err) {
      // If error, redirect to sales login with prefilled email
      navigate(`/sales/login?email=${encodeURIComponent(member.email)}`);
    } finally {
      setSwitchingId(null);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">People</p>
          <h1>Team</h1>
        </div>
        {isAdmin && (
          <button type="button" className="primary-btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Close form' : '+ Add salesperson'}
          </button>
        )}
      </header>

      {isAdmin && (
        <div className="mobile-cta-row mobile-only">
          <button type="button" className="primary-btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Close form' : '+ Add salesperson'}
          </button>
        </div>
      )}

      {error && <div className="alert">{error}</div>}

      {showForm && isAdmin && (
        <form className="panel form-grid" onSubmit={handleCreate}>
          <h2>New salesperson</h2>
          <label>
            Name
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              minLength={6}
            />
          </label>
          <label>
            Domain / Specialization
            <input
              list="domain-options"
              value={form.domain}
              onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
              placeholder="e.g. Real Estate, SaaS, Healthcare, Web Development..."
            />
            <datalist id="domain-options">
              {domains.map((d) => (
                <option key={d.id} value={d.name} />
              ))}
            </datalist>
          </label>
          <div className="full form-actions">
            <button type="submit" className="primary-btn" disabled={busy}>
              {busy ? 'Creating…' : 'Create salesperson'}
            </button>
          </div>
        </form>
      )}

      <article className="panel">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Domain</th>
              <th>Status</th>
              {isAdmin && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {team.map((member) => (
              <tr key={member.id}>
                <td>
                  <strong>{member.name}</strong>
                  <small>{member.email}</small>
                </td>
                <td>{member.role === 'company_admin' ? 'Admin' : 'Salesperson'}</td>
                <td>
                  {member.role === 'salesperson' ? (
                    isAdmin ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          list="domain-options"
                          value={editingDomains[member.id] !== undefined ? editingDomains[member.id] : (member.domain_name || '')}
                          onChange={(e) => setEditingDomains({ ...editingDomains, [member.id]: e.target.value })}
                          onBlur={() => handleDomainSave(member.id)}
                          placeholder="+ Assign domain"
                          style={{
                            fontSize: '0.8rem',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            maxWidth: '170px',
                            backgroundColor: member.domain_name ? '#f0fdf4' : '#fff',
                            color: member.domain_name ? '#15803d' : '#334155',
                            fontWeight: member.domain_name ? '700' : 'normal',
                          }}
                        />
                      </div>
                    ) : (
                      <span className="badge" style={{ backgroundColor: '#f0fdf4', color: '#15803d', fontWeight: '700' }}>
                        {member.domain_name || 'All Domains'}
                      </span>
                    )
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>All Domains</span>
                  )}
                </td>
                <td>
                  <span className={`badge badge-${member.is_active ? 'active' : 'cancelled'}`}>
                    {member.is_active ? 'active' : 'inactive'}
                  </span>
                </td>
                {isAdmin && (
                  <td>
                    {member.role === 'salesperson' ? (
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="primary-btn"
                          style={{
                            padding: '4px 12px',
                            fontSize: '0.82rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            borderRadius: '6px',
                            backgroundColor: '#0d9488',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                          onClick={() => handleSalesLogin(member)}
                          disabled={switchingId === member.id || !member.is_active}
                          title="Open and login to Sales CRM Panel"
                        >
                          <Key size={13} />
                          {switchingId === member.id ? 'Connecting…' : 'Login'}
                        </button>
                        <button type="button" className="ghost-btn" onClick={() => toggleStatus(member)}>
                          {member.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                )}
              </tr>
            ))}
            {team.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 5 : 4} className="muted">
                  No team members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </article>
    </div>
  );
}
