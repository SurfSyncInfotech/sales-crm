import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import AppLoginShell from '../components/AppLoginShell';
import { authApi } from '../api/client';

export default function CompanyLoginPage() {
  const { user, login } = useAuth('company');
  const navigate = useNavigate();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(Boolean(slug));

  useEffect(() => {
    if (!slug) {
      setLoadingPortal(false);
      return;
    }

    setLoadingPortal(true);
    authApi
      .companyPortal(slug)
      .then((data) => {
        setCompanyName(data.company.name);
        if (data.company.admin_email) setEmail(data.company.admin_email);
      })
      .catch((err) => setError(err.message || 'Company portal not found'))
      .finally(() => setLoadingPortal(false));
  }, [slug]);

  if (user) return <Navigate to="/company" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/company');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLoginShell
      eyebrow={companyName || 'Company portal'}
      title="Run your sales floor from one clear workspace."
      subtitle="Sign in with your company admin credentials."
      continueLabel="Sign in"
    >
      <form className="login-form" onSubmit={handleSubmit}>
        <BrandLogo variant="login" />
        <h2>{companyName ? `${companyName} login` : 'Company sign in'}</h2>
        <p className="muted">For company admins and salespersons.</p>

        {loadingPortal && <p className="muted">Loading company portal…</p>}
        {error && <div className="alert">{error}</div>}

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
            placeholder="admin@yourcompany.com"
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        <button type="submit" className="primary-btn" disabled={busy || loadingPortal}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AppLoginShell>
  );
}
