import { createContext, useState, useContext } from 'react';
import { authApi } from '../api/auth';
import { clearApiCache } from '../hooks/useApi';

const AuthContext = createContext(null);

// eslint-disable-next-line react/prop-types
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  // Store JWT token separately for easy access and reactivity
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('auth_token') || null);

  const login = async (username, password) => {
    const data = await authApi.login(username, password);
    const { access_token, token_type, ...userData } = data;
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    if (access_token) {
      setAuthToken(access_token);
      localStorage.setItem('auth_token', access_token);
    }
    return userData;
  };

  const logout = async () => {
    // Blacklist the token on the server (best-effort — don't block local logout on failure)
    try { await authApi.logout(); } catch (_) { /* ignore */ }
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
    clearApiCache();
  };

  const getAuthHeaders = () => {
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, getAuthHeaders, authToken }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

