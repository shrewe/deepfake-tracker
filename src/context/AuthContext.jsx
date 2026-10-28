// DEMO SESSION ONLY. Stores a fake profile in localStorage. No passwords are stored or verified.
import { createContext, useContext, useState } from 'react';

const KEY = 'dtt_demo_session';
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
  });
  const start = (profile) => {
    const session = { ...profile, demo: true, started: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(session));
    setUser(session);
  };
  const signOut = () => { localStorage.removeItem(KEY); setUser(null); };
  return <AuthCtx.Provider value={{ user, start, signOut }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);
