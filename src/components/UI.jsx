import { Link } from 'react-router-dom';
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';

export const fmtNum = (n) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n ?? 0);
export const fmtFull = (n) => new Intl.NumberFormat('en').format(n ?? 0);
export const fmtDate = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

export const VERDICTS = ['False', 'True', 'Misleading', 'Unverified'];
export const VERDICT_COLORS = { False: '#f87171', True: '#34d399', Misleading: '#fbbf24', Unverified: '#64748b' };
const STYLES = {
  False: 'bg-red-500/15 text-red-300 border-red-500/30',
  True: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  Misleading: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  Unverified: 'bg-slate-500/15 text-slate-300 border-slate-500/40',
};

export function Badge({ verdict }) {
  return <span className={`inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${STYLES[verdict] || STYLES.Unverified}`}>{verdict}</span>;
}

export function Card({ title, action, children, className = '' }) {
  return (
    <section className={`rounded-xl border border-slate-800 bg-ink-800 ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-white">{title}</h2>{action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'text-indigo-300' }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-ink-800 p-4">
      <div><p className="text-sm text-slate-400">{label}</p><p className="mt-1 text-2xl font-semibold text-white">{value}</p></div>
      <div className={`rounded-lg bg-ink-700 p-2.5 ${tone}`}><Icon className="h-5 w-5" aria-hidden /></div>
    </div>
  );
}

export function PageHeader({ title, text, action }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-xl font-semibold text-white">{title}</h2>{text && <p className="mt-1 max-w-2xl text-sm text-slate-400">{text}</p>}</div>
      {action}
    </div>
  );
}

export function Field({ label, id, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-300">{label}</label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

// Handles loading / error / empty for any async block.
export function State({ loading, error, empty, emptyText = 'Nothing to show yet.', onRetry, children }) {
  if (loading) return <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-400" role="status"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Loading data…</div>;
  if (error) return (
    <div className="flex flex-col items-center gap-2 py-12 text-center" role="alert">
      <AlertTriangle className="h-6 w-6 text-red-400" aria-hidden />
      <p className="text-sm text-slate-300">{error}</p>
      {onRetry && <button className="btn-ghost" onClick={onRetry}>Try again</button>}
    </div>
  );
  if (empty) return <div className="flex flex-col items-center gap-2 py-12 text-center text-slate-400"><Inbox className="h-6 w-6" aria-hidden /><p className="text-sm">{emptyText}</p></div>;
  return children;
}

export function VerdictFilter({ value, onChange, options = ['All', ...VERDICTS] }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by verdict">
      {options.map((v) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
          className={`rounded-full border px-3 py-1 text-xs ${value === v ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>{v}</button>
      ))}
    </div>
  );
}

export function TableWrap({ children }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[640px] divide-y divide-slate-800">{children}</table></div>;
}

export const ClaimLink = ({ id, children }) => <Link className="text-indigo-300 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300" to={`/claims/${id}`}>{children}</Link>;
