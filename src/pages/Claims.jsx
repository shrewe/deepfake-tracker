import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import useAsync from '../hooks/useAsync';
import * as api from '../services/api';
import { Badge, Card, PageHeader, State, TableWrap, VerdictFilter, fmtDate, fmtFull } from '../components/UI';

export default function Claims() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const verdict = params.get('verdict') || 'All';
  const { data, loading, error, reload } = useAsync(api.getClaims, []);
  const set = (k, v) => { const p = new URLSearchParams(params); if (v && v !== 'All') p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };

  const rows = useMemo(() => (data || []).filter((c) =>
    (verdict === 'All' || c.verdict === verdict) &&
    (!q || `${c.claim_id} ${c.claim_text} ${c.username}`.toLowerCase().includes(q.toLowerCase()))
  ), [data, q, verdict]);

  return (
    <>
      <PageHeader title="Claims Tracker" text="Search tracked claims and filter by fact-check verdict. Claims with no report stay Unverified."
        action={<Link to="/claims/new" className="btn"><Plus className="h-4 w-4" aria-hidden />Add claim</Link>} />
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <label htmlFor="claim-search" className="sr-only">Search claims</label>
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-500" aria-hidden />
            <input id="claim-search" className="input pl-9" placeholder="Search by ID, text or username" value={q} onChange={(e) => set('q', e.target.value)} />
          </div>
          <VerdictFilter value={verdict} onChange={(v) => set('verdict', v)} />
        </div>
        <State loading={loading} error={error} onRetry={reload} empty={rows.length === 0} emptyText="No claims match these filters. Clear the search or choose another verdict.">
          <TableWrap>
            <thead><tr><th className="th">ID</th><th className="th">Claim</th><th className="th">Source</th><th className="th">Media</th><th className="th">First seen</th><th className="th">Verdict</th><th className="th text-right">Shares</th><th className="th"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody className="divide-y divide-slate-800">
              {rows.map((c) => (
                <tr key={c.claim_id} className="hover:bg-ink-700/40">
                  <td className="td whitespace-nowrap font-medium">{c.claim_id}</td>
                  <td className="td min-w-[240px]">{c.claim_text}{!c.is_demo && <span className="ml-2 rounded bg-indigo-500/20 px-1.5 py-0.5 text-xs text-indigo-200">New</span>}</td>
                  <td className="td whitespace-nowrap">{c.username}</td>
                  <td className="td">{c.media_type}</td>
                  <td className="td whitespace-nowrap">{fmtDate(c.first_seen_date)}</td>
                  <td className="td"><Badge verdict={c.verdict} /></td>
                  <td className="td text-right">{fmtFull(c.total_shares)}</td>
                  <td className="td"><Link className="btn-ghost" to={`/claims/${c.claim_id}`}>View details</Link></td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </State>
      </Card>
    </>
  );
}
