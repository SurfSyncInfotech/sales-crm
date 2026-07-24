import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roles, portal = 'superadmin', loginPath = '/login' }) {
  const { user, loading } = useAuth(portal);

  if (loading) {
    return (
      <div className="boot-screen">
        <div className="boot-orb" />
        <p>Loading SurfSync…</p>
      </div>
    );
  }

  if (!user) return <Navigate to={loginPath} replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={loginPath} replace />;
  }

  return <Outlet />;
}
