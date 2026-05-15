import { useState } from 'react';
import { authApi } from '../api';
import { AuthContext } from './authContextValue';

const decodeUserFromToken = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      username: payload.sub,
      role: payload.role,
    };
  } catch {
    return null;
  }
};

const getStoredUser = () => {
  const token = localStorage.getItem('accessToken');
  if (!token) {
    return null;
  }

  const user = decodeUserFromToken(token);
  if (!user) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
  return user;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const loading = false;

  const applyLoginTokens = (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(decodeUserFromToken(accessToken));
  };

  const login = async (username, password) => {
    const res = await authApi.login({ username, password });
    const { accessToken, refreshToken } = res.data.result;
    applyLoginTokens(accessToken, refreshToken);
    return res.data;
  };

  const loginWithTokens = (accessToken, refreshToken) => {
    applyLoginTokens(accessToken, refreshToken);
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
      value={{
        user,
        login,
        loginWithTokens,
        logout,
        loading,
        isAuthenticated,
        isAdmin,
        isStaff,
        isStaffOrAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
