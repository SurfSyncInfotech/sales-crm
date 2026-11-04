import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { user, login } = useAuth('superadmin');
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@surfsync.studio');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="sa-login-container">
      <style>{`
        .sa-login-container,
        .sa-login-container * {
          font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          box-sizing: border-box;
        }
        .sa-login-container {
          min-height: 100vh;
          display: flex;
          background-color: #F6F7F9;
        }

        /* Left Hero Banner (Desktop >= 1024px) */
        .sa-login-hero {
          display: none;
          flex: 1.1;
          background: linear-gradient(140deg, #07A96A 0%, #036F45 100%);
          position: relative;
          overflow: hidden;
          padding: 56px;
          flex-direction: column;
          justify-content: space-between;
          color: #FFFFFF;
        }
        @media (min-width: 1024px) {
          .sa-login-hero {
            display: flex;
          }
        }

        /* Decorative circles */
        .sa-login-hero::before {
          content: '';
          position: absolute;
          width: 440px;
          height: 440px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          top: -120px;
          left: -120px;
          pointer-events: none;
        }
        .sa-login-hero::after {
          content: '';
          position: absolute;
          width: 520px;
          height: 520px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.05);
          bottom: -160px;
          right: -160px;
          pointer-events: none;
        }

        /* Right Form Panel */
        .sa-login-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 24px;
          background-color: #FFFFFF;
        }
        .sa-login-form-wrap {
          width: 100%;
          max-width: 400px;
        }

        .sa-input-field {
          width: 100%;
          height: 42px;
          padding: 0 14px 0 40px;
          border-radius: 12px;
          border: 1px solid #D0D5DD;
          background-color: #FFFFFF;
          color: #111827;
          font-size: 14px;
          font-weight: 500;
          outline: none;
          transition: all 0.15s ease;
        }
        .sa-input-field:focus {
          border-color: #0B6BE6;
          box-shadow: 0 0 0 4px rgba(11, 107, 230, 0.15);
        }

        .sa-primary-submit {
          width: 100%;
          height: 44px;
          border-radius: 12px;
          border: none;
          background: linear-gradient(180deg, #07A96A 0%, #036F45 100%);
          color: #FFFFFF;
          font-size: 14px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(3, 111, 69, 0.35);
          transition: all 0.15s ease;
        }
        .sa-primary-submit:hover:not(:disabled) {
          filter: brightness(1.05);
        }
        .sa-primary-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>

      {/* Left Promotional / Identity Canvas */}
      <section className="sa-login-hero">
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              padding: '8px 16px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              marginBottom: '48px',
            }}
          >
            <img src="/patronping-logo.png" alt="PatronPing" style={{ height: '34px', width: 'auto' }} />
          </div>

          <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)', marginBottom: '10px' }}>
            Multi-Tenant Enterprise Cloud
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 800, lineHeight: 1.25, letterSpacing: '-0.025em', margin: '0 0 16px 0', maxWidth: '440px' }}>
            Command every company from one clear horizon.
          </h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, margin: 0, maxWidth: '420px' }}>
            Deploy enterprise sales environments, configure subscriptions, manage WABA channels, and oversee operations in real time.
          </p>
        </div>

        {/* 3 Metric Glass Tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', position: 'relative', zIndex: 2 }}>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: '14px', padding: '16px', border: '1px solid rgba(255,255,255,0.18)' }}>
            <div style={{ fontSize: '20px', fontWeight: 800 }}>100%</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>Multi-tenant</div>
          </div>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: '14px', padding: '16px', border: '1px solid rgba(255,255,255,0.18)' }}>
            <div style={{ fontSize: '20px', fontWeight: 800 }}>Meta API</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>WABA Reseller</div>
          </div>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: '14px', padding: '16px', border: '1px solid rgba(255,255,255,0.18)' }}>
            <div style={{ fontSize: '20px', fontWeight: 800 }}>Instant</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>Impersonation</div>
          </div>
        </div>

        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', position: 'relative', zIndex: 2 }}>
          © PatronPing Superadmin Console. All rights reserved.
        </div>
      </section>

      {/* Right Login Form */}
      <section className="sa-login-panel">
        <div className="sa-login-form-wrap">
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'inline-block', marginBottom: '14px' }}>
              <img src="/patronping-logo.png" alt="PatronPing" style={{ height: '36px', width: 'auto' }} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#111827', margin: 0, letterSpacing: '-0.025em' }}>
              Superadmin sign in
            </h2>
            <p style={{ fontSize: '13.5px', color: '#6B7280', margin: '6px 0 0 0' }}>
              Platform control for authorized PatronPing operators.
            </p>
          </div>

          {error && (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                backgroundColor: '#FEECEC',
                border: '1px solid #FECACA',
                color: '#DC2626',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '20px',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Operator Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#9CA3AF" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                  placeholder="admin@patronping.com"
                  className="sa-input-field"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#9CA3AF" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••••••"
                  className="sa-input-field"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={busy} className="sa-primary-submit" style={{ marginTop: '6px' }}>
              <span>{busy ? 'Authenticating…' : 'Sign in to Console'}</span>
              {!busy && <ArrowRight size={16} />}
            </button>
          </form>

          <div
            style={{
              marginTop: '32px',
              paddingTop: '20px',
              borderTop: '1px solid #F3F4F6',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: '#9CA3AF',
            }}
          >
            <ShieldCheck size={16} color="#07A96A" />
            <span>End-to-end encrypted operator session</span>
          </div>
        </div>
      </section>
    </div>
  );
}
