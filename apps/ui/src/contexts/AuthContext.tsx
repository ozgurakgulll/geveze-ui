import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { User } from '@/types';

const TOKEN_KEY = 'geveze.auth.token';
const USER_KEY = 'geveze.auth.user';

interface AuthUser extends Pick<User, 'id' | 'name' | 'email' | 'color' | 'initials'> {}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
}

interface AuthContextValue extends AuthState {
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  token: null,
  user: null,
  setAuth: () => {},
  clearAuth: () => {},
});

function loadPersistedAuth(): AuthState {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);
    if (token && raw) {
      return { token, user: JSON.parse(raw) as AuthUser };
    }
  } catch {
    // ignore
  }
  return { token: null, user: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuthState] = useState<AuthState>(loadPersistedAuth);

  const setAuth = useCallback((token: string, user: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setAuthState({ token, user });
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setAuthState({ token: null, user: null });
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
