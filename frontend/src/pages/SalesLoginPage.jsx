import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, Smartphone, CheckCircle2, ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { salesAuthApi } from '../api/client';
import BrandLogo from '../components/BrandLogo';
import AppLoginShell from '../components/AppLoginShell';

export default function SalesLoginPage() {
  const { login, user } = useAuth('sales');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Mode: 'login' | 'forgot_phone' | 'forgot_otp' | 'forgot_new_password' | 'forgot_success'
  const [mode, setMode] = useState('login');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password flow state
  const [forgotMobile, setForgotMobile] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [demoOtpDisplay, setDemoOtpDisplay] = useState('1234');
  const [verifyToken, setVerifyToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Common UI state
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const prefill = searchParams.get('email');
    if (prefill) {
      setEmail(prefill);
    }
  }, [searchParams]);

  if (user && ['salesperson', 'company_admin'].includes(user.role)) {
    return <Navigate to="/sales" replace />;
  }

  // Submit standard login
  async function handleLoginSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      await login(email.trim(), password);
      navigate('/sales', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please verify your email and password.');
    } finally {
      setBusy(false);
    }
  }

  // Step 1: Send 4-Digit OTP
  async function handleSendOtp(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!forgotMobile.trim()) {
      setError('Please enter your registered mobile number.');
      return;
    }

    setBusy(true);
    try {
      const res = await salesAuthApi.sendForgotOtp(forgotMobile.trim());
      setMaskedPhone(res.maskedPhone || forgotMobile);
      if (res.demoOtp) setDemoOtpDisplay(res.demoOtp);
      setSuccessMsg(res.message || '4-digit OTP sent to your registered mobile!');
      setMode('forgot_otp');
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please check your mobile number.');
    } finally {
      setBusy(false);
    }
  }

  // Step 2: Verify 4-Digit OTP
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
      const res = await salesAuthApi.verifyForgotOtp(forgotMobile.trim(), forgotOtp.trim());
      setVerifyToken(res.verifyToken);
      setSuccessMsg(res.message || 'OTP verified successfully!');
      setMode('forgot_new_password');
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  // Step 3: Set New Password
  async function handleResetPassword(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setBusy(true);
    try {
      const res = await salesAuthApi.resetPassword(verifyToken, newPassword);
      setSuccessMsg(res.message || 'Password reset successfully!');
      setMode('forgot_success');
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please restart the process.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppLoginShell
      eyebrow="Nexora Sales CRM"
      title="Close deals faster with unified pipeline & auto-reminders."
      subtitle="Sign in with your salesperson credentials to access leads, follow-ups, and pipeline."
      continueLabel="Sign in"
    >
      {/* 1. STANDARD LOGIN MODE */}
      {mode === 'login' && (
        <form className="login-form" onSubmit={handleLoginSubmit}>
          <BrandLogo variant="login" />
          <h2>Sales CRM Sign in</h2>
          <p className="muted">Dedicated portal for sales representatives and executives.</p>

          {error && <div className="alert">{error}</div>}
          {successMsg && (
            <div
              style={{
                padding: '0.65rem 0.85rem',
                backgroundColor: '#ecfdf5',
                color: '#047857',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                fontWeight: '600',
              }}
            >
              {successMsg}
            </div>
          )}

          <label>
            Salesperson Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sales@company.com"
              autoComplete="username"
              required
              autoFocus={!email}
            />
          </label>

          <label>
            Password
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                autoFocus={!!email}
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  background: 'none',
                  border: 'none',
                  padding: '0.2rem',
                  cursor: 'pointer',
                  color: '#64748b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {/* Forgot Password Link */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px', marginBottom: '8px' }}>
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
                color: '#0d9488',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Forgot password?
            </button>
          </div>

          <button type="submit" className="primary-btn" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in to Sales CRM'}
          </button>
        </form>
      )}

      {/* 2. FORGOT PASSWORD - ENTER MOBILE */}
      {mode === 'forgot_phone' && (
        <form className="login-form" onSubmit={handleSendOtp}>
          <BrandLogo variant="login" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#ccfbf1',
                color: '#0d9488',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Smartphone size={17} />
            </div>
            <h2 style={{ margin: 0 }}>Forgot Password</h2>
          </div>
          <p className="muted">Enter your registered salesperson mobile number to receive a 4-digit verification OTP.</p>

          {error && <div className="alert">{error}</div>}

          <label>
            Registered Mobile Number
            <input
              type="text"
              value={forgotMobile}
              onChange={(e) => setForgotMobile(e.target.value)}
              placeholder="e.g. 7378647099"
              required
              autoFocus
            />
          </label>

          <button type="submit" className="primary-btn" disabled={busy || !forgotMobile.trim()}>
            {busy ? 'Sending OTP…' : 'Send 4-Digit OTP'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
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
                color: '#64748b',
                fontSize: '0.8rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <ArrowLeft size={13} />
              <span>Back to Sign in</span>
            </button>
          </div>
        </form>
      )}

      {/* 3. FORGOT PASSWORD - ENTER 4-DIGIT OTP */}
      {mode === 'forgot_otp' && (
        <form className="login-form" onSubmit={handleVerifyOtp}>
          <BrandLogo variant="login" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#ccfbf1',
                color: '#0d9488',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={18} />
            </div>
            <h2 style={{ margin: 0 }}>Enter 4-Digit OTP</h2>
          </div>
          <p className="muted">
            We sent a verification code to <strong>{maskedPhone || forgotMobile}</strong>.
          </p>

          {/* Demo OTP Helper Callout */}
          <div
            style={{
              padding: '0.65rem 0.85rem',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '8px',
              color: '#047857',
              fontSize: '0.78rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              🧪 Demo Mode: OTP is <strong>{demoOtpDisplay}</strong>
            </span>
            <button
              type="button"
              onClick={() => setForgotOtp(demoOtpDisplay)}
              style={{
                backgroundColor: '#059669',
                color: '#fff',
                border: 'none',
                padding: '3px 8px',
                borderRadius: '5px',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Auto-fill
            </button>
          </div>

          {error && <div className="alert">{error}</div>}

          <label>
            Enter 4-Digit Code
            <input
              type="text"
              maxLength={4}
              value={forgotOtp}
              onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="••••"
              required
              autoFocus
              style={{
                fontSize: '1.4rem',
                letterSpacing: '0.75rem',
                textAlign: 'center',
                fontWeight: '800',
                padding: '0.65rem',
              }}
            />
          </label>

          <button type="submit" className="primary-btn" disabled={busy || forgotOtp.length !== 4}>
            {busy ? 'Verifying…' : 'Verify 4-Digit OTP'}
          </button>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={() => {
                setMode('forgot_phone');
                setForgotOtp('');
                setError('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748b',
                fontSize: '0.78rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <ArrowLeft size={12} />
              <span>Change Number</span>
            </button>

            <button
              type="button"
              onClick={handleSendOtp}
              disabled={busy}
              style={{
                background: 'none',
                border: 'none',
                color: '#0d9488',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              Resend OTP
            </button>
          </div>
        </form>
      )}

      {/* 4. FORGOT PASSWORD - SET NEW PASSWORD */}
      {mode === 'forgot_new_password' && (
        <form className="login-form" onSubmit={handleResetPassword}>
          <BrandLogo variant="login" />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#ccfbf1',
                color: '#0d9488',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <KeyRound size={17} />
            </div>
            <h2 style={{ margin: 0 }}>Create New Password</h2>
          </div>
          <p className="muted">Enter a secure new password for your salesperson account.</p>

          {error && <div className="alert">{error}</div>}

          <label>
            New Password
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                autoFocus
                style={{ paddingRight: '2.5rem' }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((p) => !p)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  background: 'none',
                  border: 'none',
                  padding: '0.2rem',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label>
            Confirm New Password
            <input
              type={showNewPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
            />
          </label>

          <button type="submit" className="primary-btn" disabled={busy || !newPassword || !confirmPassword}>
            {busy ? 'Updating Password…' : 'Save New Password & Finish'}
          </button>
        </form>
      )}

      {/* 5. FORGOT PASSWORD - SUCCESS */}
      {mode === 'forgot_success' && (
        <div className="login-form" style={{ textAlign: 'center' }}>
          <BrandLogo variant="login" />
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '1rem auto 0.5rem auto',
            }}
          >
            <CheckCircle2 size={32} />
          </div>
          <h2>Password Reset Complete!</h2>
          <p className="muted">Your new password is now active. Please sign in with your updated credentials.</p>

          <button
            type="button"
            className="primary-btn"
            style={{ width: '100%', marginTop: '1rem' }}
            onClick={() => {
              setMode('login');
              setPassword('');
              setError('');
              setSuccessMsg('Password updated! Please enter your new password to sign in.');
            }}
          >
            Sign in to Sales CRM
          </button>
        </div>
      )}
    </AppLoginShell>
  );
}
