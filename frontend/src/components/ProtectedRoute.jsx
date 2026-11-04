import { Navigate, Outlet, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roles, portal = 'superadmin', loginPath = '/superadmin' }) {
  const { user, loading } = useAuth(portal);
  const { companySlug, slug } = useParams();
  const currentSlug = companySlug || slug;
  const resolvedLoginPath = currentSlug && portal === 'company'
    ? `/${currentSlug}/login`
    : loginPath;

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#F6F7F9',
          fontFamily: "'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: '24px',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E6E9EE',
            padding: '36px 44px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.04), 0 8px 10px -6px rgba(0, 0, 0, 0.02)',
            maxWidth: '360px',
            width: '100%',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          {/* PatronPing Brand Logo */}
          <img
            src="/patronping-logo.png"
            alt="PatronPing"
            style={{
              height: '34px',
              width: 'auto',
              objectFit: 'contain',
              marginBottom: '24px',
            }}
          />

          {/* Modern Dual-Tone Spinner */}
          <div
            style={{
              position: 'relative',
              width: '40px',
              height: '40px',
              marginBottom: '18px',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '3px solid #F3F4F6',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '3px solid transparent',
                borderTopColor: '#F68713',
                borderRightColor: '#2A9CB8',
                animation: 'patronping-spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
              }}
            />
          </div>

          {/* Loading Typography */}
          <div
            style={{
              fontSize: '14px',
              fontWeight: 800,
              color: '#111827',
              letterSpacing: '-0.01em',
              marginBottom: '4px',
            }}
          >
            Loading Workspace...
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#6B7280',
              fontWeight: 500,
            }}
          >
            Verifying secure session
          </div>
        </div>

        <style>{`
          @keyframes patronping-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!user) return <Navigate to={resolvedLoginPath} replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={resolvedLoginPath} replace />;
  }

  return <Outlet />;
}
