import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, clearToken, getToken, setToken, TOKEN_KEYS } from '../api/client';

const AuthContext = createContext(null);

async function restoreSession(portal) {
  const token = getToken(portal);
  if (!token) return null;
  try {
    const data = await authApi.me(portal);
    const user = data.user;
    if (portal === 'superadmin' && user.role !== 'superadmin') {
      clearToken(portal);
      return null;
    }
    if (portal === 'company' && !['company_admin', 'salesperson'].includes(user.role)) {
      clearToken(portal);
      return null;
    }
    return user;
  } catch {
    clearToken(portal);
    return null;
  }
}

function migrateLegacyToken() {
  const legacy = localStorage.getItem('ss_token');
  if (!legacy) return;
  // Keep it temporarily for restore; cleanup after sessions load
  return legacy;
}

export function AuthProvider({ children }) {
  const [superadminUser, setSuperadminUser] = useState(null);
  const [companyUser, setCompanyUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const legacy = migrateLegacyToken();

    async function boot() {
      // If only legacy token exists, probe once and place into the right slot
      if (legacy && !getToken('superadmin') && !getToken('company')) {
        localStorage.setItem(TOKEN_KEYS.superadmin, legacy);
        const probed = await restoreSession('superadmin');
        if (probed) {
          if (probed.role === 'superadmin') {
            setSuperadminUser(probed);
          } else if (['company_admin', 'salesperson'].includes(probed.role)) {
            clearToken('superadmin');
            setToken('company', legacy);
            const company = await restoreSession('company');
            setCompanyUser(company);
          } else {
            clearToken('superadmin');
          }
        }
        localStorage.removeItem('ss_token');
      } else {
        localStorage.removeItem('ss_token');
        const [admin, company] = await Promise.all([
          restoreSession('superadmin'),
          restoreSession('company'),
        ]);
        setSuperadminUser(admin);
        setCompanyUser(company);
      }
      setLoading(false);
    }

    boot();
  }, []);

  async function login(email, password, portal = 'superadmin') {
    const data = await authApi.login(email, password, portal);
    setToken(portal, data.token);

    if (portal === 'company') {
      setCompanyUser(data.user);
    } else {
      setSuperadminUser(data.user);
    }

    return data.user;
  }

  function logout(portal = 'superadmin') {
    clearToken(portal);
    if (portal === 'company') {
      setCompanyUser(null);
    } else {
      setSuperadminUser(null);
    }
  }

  const value = useMemo(
    () => ({
      superadminUser,
      companyUser,
      loading,
      login,
      logout,
      // Convenience aliases used across pages — prefer explicit portal helpers below
      getUser: (portal) => (portal === 'company' ? companyUser : superadminUser),
    }),
    [superadminUser, companyUser, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(portal) {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  if (portal === 'company') {
    return {
      user: ctx.companyUser,
      loading: ctx.loading,
      login: (email, password) => ctx.login(email, password, 'company'),
      logout: () => ctx.logout('company'),
      portal: 'company',
      superadminUser: ctx.superadminUser,
      companyUser: ctx.companyUser,
    };
  }

  if (portal === 'superadmin') {
    return {
      user: ctx.superadminUser,
      loading: ctx.loading,
      login: (email, password) => ctx.login(email, password, 'superadmin'),
      logout: () => ctx.logout('superadmin'),
      portal: 'superadmin',
      superadminUser: ctx.superadminUser,
      companyUser: ctx.companyUser,
    };
  }

  return ctx;
}
