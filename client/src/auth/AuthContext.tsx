import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser } from '@career-intelligence/shared';
import { api } from '../services/api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  setupRequired: boolean;
  login: (email: string, password: string) => Promise<void>;
  setup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  const refresh = useCallback(async () => {
    const status = await api.getAuthStatus();
    setSetupRequired(status.setupRequired);
    if (status.setupRequired) {
      setUser(null);
      return;
    }
    try {
      const { user: me } = await api.getMe();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  useEffect(() => {
    const onUnauthorized = () => {
      setUser(null);
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const login = async (email: string, password: string) => {
    await api.getAuthStatus();
    const { user: loggedIn } = await api.login({ email, password });
    setUser(loggedIn);
    setSetupRequired(false);
  };

  const setup = async (email: string, password: string, name: string) => {
    await api.getAuthStatus();
    const { user: created } = await api.setup({ email, password, name });
    setUser(created);
    setSetupRequired(false);
  };

  const logout = async () => {
    try {
      await api.getAuthStatus();
      await api.logout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, setupRequired, login, setup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
