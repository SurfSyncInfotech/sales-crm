import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  KeyRound,
  Smartphone,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { salesAuthApi } from '../api/client';

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

  useEffect(() => {
    const prefill = searchParams.get('email');
    if (prefill) {
      setEmail(prefill);
    }
  }, [searchParams]);

  useEffect(() => {
    let timer;
    if (resendCountdown > 0) {
      timer = setInterval(() => {
        setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCountdown]);

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
      const res = await salesAuthApi.sendForgotOtp(forgotMobile.trim());
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
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#F6F7F9',
        fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        padding: '2.5rem 1.5rem',
      }}
      className="sales-login-container"
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
          {/* 1. STANDARD LOGIN MODE */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Header inside form */}
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
                    Sales Console Sign In
                  </h2>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#6B7280' }}>
                  Access your assigned leads, pipeline, and follow-up reminders.
                </p>
              </div>

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

              {/* Email Input */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#374151', marginBottom: '5px' }}>
                  Salesperson Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sales@company.com"
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

              {/* Password Input */}
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
                {busy ? 'Authenticating…' : 'Sign In to Console'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.74rem', color: '#9CA3AF' }}>
                  Need account access? Contact your Company Administrator.
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
                    Forgot Password
                  </h2>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#6B7280' }}>
                  Enter your registered mobile number to receive a 4-digit verification code.
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

          {/* 3. FORGOT PASSWORD - ENTER 4-DIGIT OTP */}
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

          {/* 4. FORGOT PASSWORD - SET NEW PASSWORD */}
          {mode === 'forgot_new_password' && (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
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
                    <KeyRound size={15} />
                  </div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111827', margin: 0 }}>
                    Create New Password
                  </h2>
                </div>
                <p style={{ margin: 0, fontSize: '0.84rem', color: '#6B7280' }}>
                  Set a secure new password for your salesperson console account.
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
                  Your password has been updated. You can now sign in with your new credentials.
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
                  setSuccessMsg('Password updated successfully. Please sign in.');
                }}
              >
                Return to Sign In
              </button>
            </div>
          )}
        </div>
      </div>
  );
}
