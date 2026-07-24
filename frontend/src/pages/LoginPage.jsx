import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';
import AppLoginShell from '../components/AppLoginShell';

export default function LoginPage() {
  const { user, login } = useAuth('superadmin');
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@surfsync.studio');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/admin" replace />;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLoginShell
      eyebrow="SurfSync Infotech"
      title="Command every company from one clear horizon."
      subtitle="Create tenants, assign plans, and watch revenue move in real time."
      continueLabel="Sign in"
    >
      <form className="login-form" onSubmit={handleSubmit}>
        <BrandLogo variant="login" />
        <h2>Superadmin sign in</h2>
        <p className="muted">Platform control for SurfSync operators.</p>

        {error && <div className="alert">{error}</div>}

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
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

        <button type="submit" className="primary-btn" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AppLoginShell>
  );
}
