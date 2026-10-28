import { createContext, useContext, useEffect, useState } from 'react';

const KEY = 'dtt_prefs';
const DEFAULTS = { compact: false, badge: true };
const Ctx = createContext(null);

export function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY)) }; } catch { return DEFAULTS; }
  });
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(prefs));
    document.documentElement.dataset.compact = String(prefs.compact);
  }, [prefs]);
  const setPref = (k, v) => setPrefs((p) => ({ ...p, [k]: v }));
  return <Ctx.Provider value={{ prefs, setPref }}>{children}</Ctx.Provider>;
}
export const usePrefs = () => useContext(Ctx);
