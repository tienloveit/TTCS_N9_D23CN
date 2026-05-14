import { useState } from 'react';
import { authApi } from '../api';
import { AuthContext } from './authContextValue';

const getStoredUser = () => {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      username: payload.sub,
      role: payload.role,
    };
  } catch {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const loading = false;

  const login = async (username, password) => {
    const res = await authApi.login({ username, password });
    const { accessToken, refreshToken } = res.data.result;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    const payload = JSON.parse(atob(accessToken.split('.')[1]));
    setUser({
      username: payload.sub,
      role: payload.role,
    });
    return res.data;
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'ADMIN';
  const isStaff = user?.role === 'STAFF';
  const isStaffOrAdmin = isAdmin || isStaff;

  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, isAuthenticated, isAdmin, isStaff, isStaffOrAdmin }}
    >
      {children}
    </AuthContext.Provider>
  );
}
