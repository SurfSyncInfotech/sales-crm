const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5010/api';
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
    if (portal === 'sales' && !['salesperson', 'company_admin'].includes(user.role)) {
      clearToken(portal);
      return null;
    }
    return user;
  } catch {
    clearToken(portal);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [superadminUser, setSuperadminUser] = useState(null);
  const [companyUser, setCompanyUser] = useState(null);
  const [salesUser, setSalesUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function boot() {
      const [admin, company, sales] = await Promise.all([
        restoreSession('superadmin'),
        restoreSession('company'),
        restoreSession('sales'),
      ]);
      setSuperadminUser(admin);
      setCompanyUser(company);
      setSalesUser(sales);
      setLoading(false);
    }

    boot();
  }, []);

  async function login(email, password, portal = 'superadmin') {
    const data = await authApi.login(email, password, portal);
    setToken(portal, data.token);

    if (portal === 'company') {
      setCompanyUser(data.user);
    } else if (portal === 'sales') {
      setSalesUser(data.user);
    } else {
      setSuperadminUser(data.user);
    }

    return data.user;
  }

  function setSalesSession(token, user) {
    setToken('sales', token);
    setSalesUser(user);
  }

  function logout(portal = 'superadmin') {
    clearToken(portal);
    if (portal === 'company') {
      setCompanyUser(null);
    } else if (portal === 'sales') {
      setSalesUser(null);
    } else {
      setSuperadminUser(null);
    }
  }

  const value = useMemo(
    () => ({
      superadminUser,
      companyUser,
      salesUser,
      loading,
      login,
      setSalesSession,
      logout,
      getUser: (portal) => {
        if (portal === 'sales') return salesUser;
        if (portal === 'company') return companyUser;
        return superadminUser;
      },
    }),
    [superadminUser, companyUser, salesUser, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(portal) {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  if (portal === 'sales') {
    return {
      user: ctx.salesUser,
      loading: ctx.loading,
      login: (email, password) => ctx.login(email, password, 'sales'),
      logout: () => ctx.logout('sales'),
      setSalesSession: ctx.setSalesSession,
      portal: 'sales',
      salesUser: ctx.salesUser,
    };
  }

  if (portal === 'company') {
    return {
      user: ctx.companyUser,
      loading: ctx.loading,
      login: (email, password) => ctx.login(email, password, 'company'),
      logout: () => ctx.logout('company'),
      setSalesSession: ctx.setSalesSession,
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
