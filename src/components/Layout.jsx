import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { Activity, BarChart3, Bell, FileCheck2, LayoutDashboard, LogOut, Menu, Search, Settings, ShieldAlert, ShieldCheck, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../context/PrefsContext';

const NAV = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/claims', label: 'Claims Tracker', icon: ShieldAlert },
  { to: '/reports', label: 'Fact-Check Reports', icon: FileCheck2 },
  { to: '/sources', label: 'Source Accounts', icon: Users },
  { to: '/platforms', label: 'Platform Analytics', icon: BarChart3 },
  { to: '/panic', label: 'Public Panic Index', icon: Activity },
  { to: '/settings', label: 'Settings', icon: Settings },
];
const NOTES = [
  { t: 'C-1006 crossed 20K shares on SnapReel', to: '/claims/C-1006' },
  { t: 'New fact-check report published for C-1012', to: '/reports' },
  { t: 'Panic index spike recorded in Central City', to: '/panic' },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const { prefs } = usePrefs();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(null); // 'bell' | 'user' | null
  const [q, setQ] = useState('');
  const cur = NAV.find((n) => (n.end ? loc.pathname === '/' : loc.pathname.startsWith(n.to)));
  const title = cur ? (cur.to === '/' ? 'Dashboard Overview' : cur.label) : 'Dashboard';

  const search = (e) => { e.preventDefault(); nav(q.trim() ? `/claims?q=${encodeURIComponent(q.trim())}` : '/claims'); setOpen(false); };
  const link = ({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-indigo-500/15 text-indigo-200' : 'text-slate-400 hover:bg-ink-700 hover:text-slate-200'}`;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 py-5">
        <ShieldCheck className="h-7 w-7 shrink-0 text-indigo-400" aria-hidden />
        <div className="leading-tight"><p className="text-sm font-semibold text-white">Trend Tracker</p><p className="text-xs text-slate-500">Deepfake &amp; Misinformation</p></div>
      </div>
      <nav aria-label="Main" className="flex-1 space-y-1 px-3">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={link} onClick={() => setOpen(false)}><Icon className="h-4 w-4" aria-hidden />{label}</NavLink>
        ))}
      </nav>
      <div className="p-3">
        <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-ink-700 hover:text-slate-200"><LogOut className="h-4 w-4" aria-hidden />Sign Out</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-60 shrink-0 border-r border-slate-800 bg-ink-950 lg:block"><div className="sticky top-0 h-screen">{sidebar}</div></aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-64 bg-ink-950" aria-label="Mobile navigation">
            <button className="absolute right-3 top-4 text-slate-400" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-slate-800 bg-ink-900/95 px-4 py-3 backdrop-blur">
          <button className="btn-ghost lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-4 w-4" /></button>
          <h1 className="mr-auto text-lg font-semibold text-white">{title}</h1>
          <form onSubmit={search} role="search" className="relative order-last w-full sm:order-none sm:w-72">
            <label htmlFor="global-search" className="sr-only">Search claims</label>
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" aria-hidden />
            <input id="global-search" className="input pl-9" placeholder="Search claims or usernames" value={q} onChange={(e) => setQ(e.target.value)} />
          </form>
          <div className="relative">
            <button className="btn-ghost relative" aria-label="Notifications" onClick={() => setMenu(menu === 'bell' ? null : 'bell')}>
              <Bell className="h-4 w-4" />{prefs.badge && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-indigo-400" />}
            </button>
            {menu === 'bell' && (<>
              <div className="fixed inset-0" onClick={() => setMenu(null)} />
              <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-700 bg-ink-800 p-2 shadow-xl">
                {NOTES.map((n) => <Link key={n.t} to={n.to} onClick={() => setMenu(null)} className="block rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-ink-700">{n.t}</Link>)}
                <p className="px-3 pt-1 text-xs text-slate-500">Demo notifications</p>
              </div>
            </>)}
          </div>
          <div className="relative">
            <button className="flex items-center gap-2 rounded-lg border border-slate-700 px-2 py-1.5 hover:bg-slate-800" onClick={() => setMenu(menu === 'user' ? null : 'user')} aria-label="Profile menu">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-indigo-500/30 text-xs font-semibold text-indigo-100">{(user?.name || 'D')[0].toUpperCase()}</span>
              <span className="hidden text-sm sm:block">{user?.name}</span>
            </button>
            {menu === 'user' && (<>
              <div className="fixed inset-0" onClick={() => setMenu(null)} />
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-700 bg-ink-800 p-2 shadow-xl">
                <p className="px-3 py-1 text-xs text-slate-500">{user?.email} (demo session)</p>
                <Link to="/settings" onClick={() => setMenu(null)} className="block rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-ink-700">Settings</Link>
                <button onClick={signOut} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-ink-700">Sign out</button>
              </div>
            </>)}
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-4 sm:p-6"><Outlet /></main>
        <footer className="px-6 pb-6 text-xs text-slate-600">Prototype with fictional demo data. Not for real fact-checking decisions.</footer>
      </div>
    </div>
  );
}
