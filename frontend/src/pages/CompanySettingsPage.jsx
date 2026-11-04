import { useEffect, useState } from 'react';
import { companyPortalApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Shield, CheckCircle2, AlertCircle, Save } from 'lucide-react';

export default function CompanySettingsPage() {
  const { user, setUser } = useAuth('company');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyInfo, setCompanyInfo] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchProfile() {
      try {
        setLoading(true);
        const data = await companyPortalApi.getProfile();
        if (data.user) {
          setName(data.user.name || '');
          setEmail(data.user.email || '');
        }
        if (data.company) {
          setCompanyInfo(data.company);
        }
      } catch (err) {
        setError(err.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Admin name is required');
      return;
    }
    if (!email.trim()) {
      setError('Admin email is required');
      return;
    }

    if (password) {
      if (password.length < 6) {
        setError('New password must be at least 6 characters long');
        return;
      }
      if (password !== confirmPassword) {
        setError('New password and confirmation do not match');
        return;
      }
    }

    try {
      setSaving(true);
      const res = await companyPortalApi.updateProfile({
        name: name.trim(),
        email: email.trim(),
        password: password ? password : undefined,
      });

      if (res.user && setUser) {
        setUser((prev) => ({ ...prev, ...res.user }));
      }

      setSuccess('Profile and credentials updated successfully!');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: 'Manrope, sans-serif' }}>
          Company Settings
        </h1>
        <p style={{ fontSize: '0.88rem', color: '#64748B', marginTop: '4px' }}>
          Manage your company administrator profile, login email, and password.
        </p>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#B91C1C',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '1.25rem',
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: '#F0FDF4',
          border: '1px solid #BBF7D0',
          color: '#15803D',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '1.25rem',
        }}>
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
          Loading profile...
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Company Details Badge */}
          {companyInfo && (
            <div style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748B', letterSpacing: '0.04em' }}>
                  Company Name
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
                  {companyInfo.name}
                </div>
              </div>
              <span style={{
                fontSize: '0.75rem',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                padding: '4px 10px',
                borderRadius: '6px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <Shield size={12} /> Active Account
              </span>
            </div>
          )}

          {/* Admin Profile Card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1E293B', margin: 0, paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
              Admin Profile Information
            </h2>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Administrator Name
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. SurfSync Admin"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Administrator Email Address (Login Username)
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@surfsync.in"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Security & Password Card */}
          <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1E293B', margin: 0, paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
              Security & Password
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '-6px 0 6px' }}>
              Leave blank if you do not want to change your current password.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  minLength={6}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    fontSize: '0.9rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                backgroundColor: '#0F172A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                opacity: saving ? 0.7 : 1,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              <Save size={16} />
              <span>{saving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
