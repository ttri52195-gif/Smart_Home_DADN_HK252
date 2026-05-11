import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  DEV_MODE,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(DEV_MODE ? 'dev-token' : null);
  const [user, setUser] = useState(DEV_MODE ? { username: 'dev' } : null);
  const [error, setError] = useState(null);

  const signIn = useCallback(async (username, password) => {
    setError(null);
    try {
      const data = await apiLogin(username, password);
      setToken(data.access_token);
      setUser({ username });
      return true;
    } catch (e) {
      setError(
        e.message.includes('401') ? 'Invalid username or password.' : e.message,
      );
      return false;
    }
  }, []);

  const signUp = useCallback(
    async (username, password, isOwner) => {
      setError(null);
      try {
        await apiRegister(username, password, isOwner);
        return true;
      } catch (e) {
        setError(
          e.message.includes('400') ? 'Username already exists.' : e.message,
        );
        return false;
      }
    },
    [signIn],
  );

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ token, user, error, signIn, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
