import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Smartphone,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
  Zap,
  Building2,
  Users,
  Layers,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi, companyAuthApi } from '../api/client';

export default function CompanyLoginPage() {
  const { user, login } = useAuth('company');
  const navigate = useNavigate();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();

  // Mode: 'login' | 'forgot_phone' | 'forgot_otp' | 'forgot_new_password' | 'forgot_success'
  const [mode, setMode] = useState('login');

  // Standard login state
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(Boolean(slug));

  // Forgot password flow state
  const [forgotMobile, setForgotMobile] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [validMinutesDisplay, setValidMinutesDisplay] = useState(10);
  const [verifyToken, setVerifyToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Common UI state
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [busy, setBusy] = useState(false);

  // Hook 1: Load company portal info if slug is present
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

  // Hook 2: OTP Resend countdown
  useEffect(() => {
    let timer;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCountdown]);

  if (user) return <Navigate to="/company" replace />;

  // Submit standard login
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate('/company');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setBusy(false);
    }
  }

  // Step 1: Send OTP
  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    if (resendCountdown > 0) return;
    setError('');
    setSuccessMsg('');
    if (!forgotMobile.trim()) {
      setError('Please enter your registered mobile number.');
      return;
    }

    setBusy(true);
    try {
      const res = await companyAuthApi.sendForgotOtp(forgotMobile.trim(), slug);
      setMaskedPhone(res.maskedPhone || forgotMobile);
      if (res.validMinutes) setValidMinutesDisplay(res.validMinutes);
      setResendCountdown(res.resendSeconds || 60);
      setSuccessMsg(res.message || `Verification code sent! Valid for ${res.validMinutes || 10} minutes.`);
      setMode('forgot_otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please check your mobile number.');
    } finally {
      setBusy(false);
    }
  }

  // Step 2: Verify OTP
  async function handleVerifyOtp(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!forgotOtp.trim() || forgotOtp.trim().length !== 4) {
      setError('Please enter the complete 4-digit OTP.');
      return;
    }

    setBusy(true);
    try {
      const res = await companyAuthApi.verifyForgotOtp(forgotMobile.trim(), forgotOtp.trim(), slug);
      setVerifyToken(res.verifyToken);
      setSuccessMsg('OTP verified successfully! Please enter your new password.');
      setMode('forgot_new_password');
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  // Step 3: Reset Password
  async function handleResetPassword(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setBusy(true);
    try {
      const res = await companyAuthApi.resetPassword(verifyToken, newPassword);
      setSuccessMsg(res.message || 'Password reset successfully!');
      setMode('forgot_success');
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#F6F7F9',
        fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
      className="company-login-container"
    >
      {/* Left Hero Pane (Midnight Slate Enterprise Theme) */}
      <section
        style={{
          flex: '1.1',
          backgroundColor: '#0B0F14',
          color: '#ECEFF3',
          padding: '3.5rem 3rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          overflow: 'hidden',
          borderRight: '1px solid #1E2530',
        }}
        className="company-login-hero"
      >
        {/* Ambient lighting */}
        <div
          style={{
            position: 'absolute',
            top: '-15%',
            left: '-10%',
            width: '420px',
            height: '420px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(246, 135, 19, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-15%',
            right: '-10%',
            width: '460px',
            height: '460px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(42, 156, 184, 0.10) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 2 }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: '#F68713',
              backgroundImage: 'linear-gradient(135deg, #F8942A 0%, #E26C04 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(246, 135, 19, 0.35)',
            }}
          >
            <Building2 size={20} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '1.25rem', color: '#ECEFF3', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {companyName || 'SurfSync'}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#F68713', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Company Administration
            </div>
          </div>
        </div>

        {/* Middle Hero Copy */}
        <div style={{ zIndex: 2, maxWidth: '520px', margin: '3rem 0' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: 'rgba(246, 135, 19, 0.14)',
              border: '1px solid rgba(246, 135, 19, 0.3)',
              color: '#F8942A',
              fontSize: '0.72rem',
              fontWeight: '700',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: '1.25rem',
            }}
          >
            <Zap size={11} /> Enterprise Company Console
          </div>

          <h1
            style={{
              fontSize: '2.35rem',
              fontWeight: '800',
              lineHeight: 1.18,
              letterSpacing: '-0.03em',
              color: '#FFFFFF',
              margin: '0 0 1rem 0',
            }}
          >
            Command your sales floor with total operational clarity.
          </h1>

          <p style={{ fontSize: '0.94rem', lineHeight: 1.55, color: '#94A3B8', margin: '0 0 2rem 0' }}>
            Multi-salesperson oversight, automated lead distribution, quotation governance, and live WhatsApp engagement logs.
          </p>

          {/* Pillars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#13181F',
                  border: '1px solid #28303B',
                  color: '#F68713',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Users size={14} />
              </div>
              <span style={{ fontSize: '0.86rem', color: '#CBD5E1', fontWeight: '600' }}>
                <strong>Team Governance:</strong> Real-time quota, claim velocity, and rep management.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#13181F',
                  border: '1px solid #28303B',
                  color: '#2A9CB8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Layers size={14} />
              </div>
              <span style={{ fontSize: '0.86rem', color: '#CBD5E1', fontWeight: '600' }}>
                <strong>Quotation Approvals:</strong> Rapid estimate reviews, negotiations, and delivery.
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: '#13181F',
                  border: '1px solid #28303B',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Zap size={14} />
              </div>
              <span style={{ fontSize: '0.86rem', color: '#CBD5E1', fontWeight: '600' }}>
                <strong>Smart Distribution:</strong> First-to-claim pools and automatic round-robin leads.
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Security */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.74rem', color: '#64748B', zIndex: 2 }}>
          <ShieldCheck size={14} color="#2A9CB8" />
          <span>SurfSync Enterprise Security · Company Session Isolated</span>
        </div>
      </section>

      {/* Right Login Form Pane */}
      <section
        style={{
          flex: '1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2.5rem 2rem',
          backgroundColor: '#F6F7F9',
        }}
        className="company-login-form-pane"
      >
        <div
          style={{
            width: '100%',
            maxWidth: '440px',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E6E9EE',
            padding: '2.25rem 2rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
            boxSizing: 'border-box',
          }}
        >
          {/* 1. STANDARD LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.35rem' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: '#FFF3E6',
                      color: '#F68713',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Lock size={15} />
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                    {companyName ? `${companyName} Admin` : 'Company Admin Sign In'}
                  </h2>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#6B7280' }}>
                  Authorized access for company directors and sales managers.
                </p>
              </div>

              {loadingPortal && (
                <div style={{ fontSize: '0.78rem', color: '#2A9CB8', fontWeight: '600' }}>
                  Loading company portal details…
                </div>
              )}

              {error && (
                <div
                  style={{
                    padding: '0.75rem 0.9rem',
                    backgroundColor: '#FEE2E2',
                    border: '1px solid #FECACA',
                    borderRadius: '8px',
                    color: '#DC2626',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                  }}
                >
                  {error}
                </div>
              )}

              {successMsg && (
                <div
                  style={{
                    padding: '0.75rem 0.9rem',
                    backgroundColor: '#DCFCE7',
                    border: '1px solid #BBF7D0',
                    borderRadius: '8px',
                    color: '#166534',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                  }}
                >
                  {successMsg}
                </div>
              )}

              {/* Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '5px' }}>
                  Company Admin Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@company.com"
                  autoComplete="username"
                  required
                  autoFocus={!email}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 12px',
                    fontSize: '0.86rem',
                    color: '#111827',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E6E9EE',
                    borderRadius: '8px',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#F68713')}
                  onBlur={(e) => (e.target.style.borderColor = '#E6E9EE')}
                />
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#374151' }}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot_phone');
                      setError('');
                      setSuccessMsg('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2A9CB8',
                      fontSize: '0.76rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    autoFocus={!!email}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '9px 36px 9px 12px',
                      fontSize: '0.86rem',
                      color: '#111827',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E6E9EE',
                      borderRadius: '8px',
                      outline: 'none',
                      transition: 'border-color 0.15s ease',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#F68713')}
                    onBlur={(e) => (e.target.style.borderColor = '#E6E9EE')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      background: 'none',
                      border: 'none',
                      padding: '2px',
                      cursor: 'pointer',
                      color: '#9CA3AF',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={busy}
                className="btn-primary-action"
                style={{ width: '100%', padding: '0.65rem 1rem', fontSize: '0.88rem', marginTop: '0.25rem' }}
              >
                {busy ? 'Authenticating…' : 'Sign In as Company Admin'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>
                  Are you a salesperson? <a href="/sales/login" style={{ color: '#F68713', fontWeight: '700' }}>Sales Login →</a>
                </span>
              </div>
            </form>
          )}

          {/* 2. FORGOT PASSWORD - ENTER MOBILE */}
          {mode === 'forgot_phone' && (
            <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.35rem' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: '#E8F6FA',
                      color: '#2A9CB8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Smartphone size={15} />
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111827', margin: 0 }}>
                    Reset Admin Password
                  </h2>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#6B7280' }}>
                  Enter your registered admin mobile number to receive a 4-digit verification code.
                </p>
              </div>

              {error && (
                <div style={{ padding: '0.75rem', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '0.8rem' }}>
                  {error}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '5px' }}>
                  Registered Mobile Number
                </label>
                <input
                  type="tel"
                  value={forgotMobile}
                  onChange={(e) => setForgotMobile(e.target.value)}
                  placeholder="e.g. 9876543210"
                  required
                  autoFocus
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 12px',
                    fontSize: '0.86rem',
                    border: '1px solid #E6E9EE',
                    borderRadius: '8px',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#F68713')}
                  onBlur={(e) => (e.target.style.borderColor = '#E6E9EE')}
                />
              </div>

              <button
                type="submit"
                disabled={busy || !forgotMobile.trim()}
                className="btn-primary-action"
                style={{ width: '100%', padding: '0.65rem 1rem', fontSize: '0.88rem' }}
              >
                {busy ? 'Sending OTP…' : 'Send 4-Digit Code'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                    setSuccessMsg('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6B7280',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ArrowLeft size={13} /> Back to Sign in
                </button>
              </div>
            </form>
          )}

          {/* 3. FORGOT PASSWORD - ENTER OTP */}
          {mode === 'forgot_otp' && (
            <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.35rem' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: '#DCFCE7',
                      color: '#16A34A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShieldCheck size={16} />
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111827', margin: 0 }}>
                    Enter Verification Code
                  </h2>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#6B7280' }}>
                  Sent to <strong style={{ color: '#111827' }}>{maskedPhone || forgotMobile}</strong>. Valid for {validMinutesDisplay} minutes.
                </p>
              </div>

              {error && (
                <div style={{ padding: '0.75rem', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '0.8rem' }}>
                  {error}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '5px' }}>
                  4-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="••••"
                  required
                  autoFocus
                  className="num"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '8px 12px',
                    fontSize: '1.4rem',
                    letterSpacing: '0.75rem',
                    textAlign: 'center',
                    fontWeight: '800',
                    border: '1px solid #E6E9EE',
                    borderRadius: '8px',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#F68713')}
                  onBlur={(e) => (e.target.style.borderColor = '#E6E9EE')}
                />
              </div>

              <button
                type="submit"
                disabled={busy || forgotOtp.length !== 4}
                className="btn-primary-action"
                style={{ width: '100%', padding: '0.65rem 1rem', fontSize: '0.88rem' }}
              >
                {busy ? 'Verifying…' : 'Verify Code'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot_phone');
                    setForgotOtp('');
                    setError('');
                  }}
                  style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                >
                  <ArrowLeft size={12} /> Change Number
                </button>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={busy || resendCountdown > 0}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: resendCountdown > 0 ? '#9CA3AF' : '#2A9CB8',
                    fontWeight: '700',
                    cursor: resendCountdown > 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {resendCountdown > 0 ? `Resend (${resendCountdown}s)` : 'Resend Code'}
                </button>
              </div>
            </form>
          )}

          {/* 4. FORGOT PASSWORD - NEW PASSWORD */}
          {mode === 'forgot_new_password' && (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111827', margin: 0 }}>
                  Create New Password
                </h2>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.84rem', color: '#6B7280' }}>
                  Set a new secure password for your company admin account.
                </p>
              </div>

              {error && (
                <div style={{ padding: '0.75rem', backgroundColor: '#FEE2E2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '0.8rem' }}>
                  {error}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '5px' }}>
                  New Password
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    required
                    autoFocus
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '9px 36px 9px 12px',
                      fontSize: '0.86rem',
                      border: '1px solid #E6E9EE',
                      borderRadius: '8px',
                      outline: 'none',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = '#F68713')}
                    onBlur={(e) => (e.target.style.borderColor = '#E6E9EE')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((p) => !p)}
                    style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 0 }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '5px' }}>
                  Confirm Password
                </label>
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '9px 12px',
                    fontSize: '0.86rem',
                    border: '1px solid #E6E9EE',
                    borderRadius: '8px',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#F68713')}
                  onBlur={(e) => (e.target.style.borderColor = '#E6E9EE')}
                />
              </div>

              <button
                type="submit"
                disabled={busy || !newPassword || !confirmPassword}
                className="btn-primary-action"
                style={{ width: '100%', padding: '0.65rem 1rem', fontSize: '0.88rem' }}
              >
                {busy ? 'Updating Password…' : 'Save New Password'}
              </button>
            </form>
          )}

          {/* 5. FORGOT PASSWORD - SUCCESS */}
          {mode === 'forgot_success' && (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem 0' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                }}
              >
                <CheckCircle2 size={30} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111827', margin: '0 0 0.35rem 0' }}>
                  Password Reset Complete
                </h2>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#6B7280' }}>
                  Your admin password has been updated. You can now sign in.
                </p>
              </div>

              <button
                type="button"
                className="btn-primary-action"
                style={{ width: '100%', padding: '0.65rem 1rem', fontSize: '0.88rem' }}
                onClick={() => {
                  setMode('login');
                  setPassword('');
                  setError('');
                  setSuccessMsg('Password updated! Please enter your new password to sign in.');
                }}
              >
                Return to Sign In
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 900px) {
          .company-login-container {
            flex-direction: column !important;
          }
          .company-login-hero {
            padding: 2rem 1.5rem !important;
            flex: none !important;
          }
          .company-login-hero h1 {
            font-size: 1.75rem !important;
          }
          .company-login-form-pane {
            padding: 2rem 1.25rem !important;
          }
        }
      `}</style>
    </div>
  );
}
