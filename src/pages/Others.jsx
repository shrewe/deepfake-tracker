
import { useMemo, useState } from 'react';
import { ExternalLink, Activity, Gauge, MapPin } from 'lucide-react';
import useAsync from '../hooks/useAsync';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePrefs } from '../context/PrefsContext';
import {
  Badge,
  Card,
  ClaimLink,
  PageHeader,
  State,
  StatCard,
  TableWrap,
  VerdictFilter,
  fmtDate,
  fmtFull,
  fmtNum,
} from '../components/UI';
import { PlatformBar, TrendLine } from '../components/charts';

export function Reports() {
  const { data, loading, error, reload } = useAsync(api.getReports, []);
  const [f, setF] = useState('All');

  const rows = useMemo(
    () => (data || []).filter((r) => f === 'All' || r.verdict === f),
    [data, f]
  );

  return (
    <>
      <PageHeader
        title="Fact-Check Reports"
        text="Reports published by (fictional) fact-checking agencies."
      />

      <Card>
        <div className="mb-4">
          <VerdictFilter
            value={f}
            onChange={setF}
            options={['All', 'False', 'True', 'Misleading']}
          />
        </div>

        <State
          loading={loading}
          error={error}
          onRetry={reload}
          empty={rows.length === 0}
          emptyText="No reports match this verdict."
        >
          <TableWrap>
            <thead>
              <tr>
                <th className="th">Report</th>
                <th className="th">Claim</th>
                <th className="th">Agency</th>
                <th className="th">Verdict</th>
                <th className="th">Published</th>
                <th className="th">Evidence</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {rows.map((r) => (
                <tr key={r.report_id}>
                  <td className="td">{r.report_id}</td>

                  <td className="td max-w-xs">
                    <ClaimLink id={r.claim_id}>{r.claim_id}</ClaimLink>
                    <p className="text-xs text-slate-500">
                      {r.claim_text || 'Claim details unavailable'}
                    </p>
                  </td>

                  <td className="td">
                    {r.agency_name || r.checking_agency || 'Unknown agency'}
                  </td>

                  <td className="td">
                    <Badge verdict={r.verdict} />
                  </td>

                  <td className="td whitespace-nowrap">
                    {fmtDate(r.publication_date || r.date_published)}
                  </td>

                  <td className="td">
                    {r.evidence_url ? (
                      <a
                        className="inline-flex items-center gap-1 text-indigo-300 hover:underline"
                        href={r.evidence_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    ) : (
                      <span className="text-slate-500">Unavailable</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </State>
      </Card>
    </>
  );
}

export function Sources() {
  const { data, loading, error, reload } = useAsync(
    api.getSourceNodes,
    []
  );

  return (
    <>
      <PageHeader
        title="Source Accounts"
        text="Accounts that originated tracked claims. Bot probability is a demo estimate, not a finding."
      />

      <Card>
        <State
          loading={loading}
          error={error}
          onRetry={reload}
          empty={data?.length === 0}
          emptyText="No source accounts recorded."
        >
          <TableWrap>
            <thead>
              <tr>
                <th className="th">Username</th>
                <th className="th">Platform</th>
                <th className="th">Verification</th>
                <th className="th text-right">Followers</th>
                <th className="th">Bot probability</th>
                <th className="th text-right">Claims</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800">
              {(data || []).map((n) => {
                const rawProbability =
                  n.bot_probability ?? n.bot_probability_score;

                const probability =
                  rawProbability == null || rawProbability === ''
                    ? null
                    : Number(rawProbability);

                const normalizedProbability =
                  probability == null || !Number.isFinite(probability)
                    ? null
                    : probability > 1
                      ? probability
                      : probability * 100;

                const pct =
                  normalizedProbability == null
                    ? null
                    : Math.max(
                        0,
                        Math.min(100, Math.round(normalizedProbability))
                      );

                return (
                  <tr key={n.node_id}>
                    <td className="td font-medium">{n.username}</td>

                    <td className="td">
                      {n.platform_name || 'Unknown'}
                    </td>

                    <td className="td">
                      {Boolean(
                        n.is_verified === true ||
                        n.is_verified === 1 ||
                        n.is_verified === '1'
                      )
                        ? 'Verified'
                        : 'Not verified'}
                    </td>

                    <td className="td text-right">
                      {fmtFull(n.follower_count)}
                    </td>

                    <td className="td">
                      {pct == null ? (
                        'Not assessed'
                      ) : (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-1.5 w-24 rounded bg-slate-700"
                            role="img"
                            aria-label={`${pct} percent`}
                          >
                            <div
                              className={`h-1.5 rounded ${
                                pct >= 70
                                  ? 'bg-red-400'
                                  : pct >= 40
                                    ? 'bg-amber-400'
                                    : 'bg-emerald-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {pct}%
                        </div>
                      )}
                    </td>

                    <td className="td text-right">
                      {n.claim_count ?? 0}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        </State>
      </Card>
    </>
  );
}

export function Platforms() {
  const { data, loading, error, reload } = useAsync(
    () =>
      Promise.all([
        api.getPlatformAnalytics(),
        api.getTrends(),
      ]),
    []
  );

  const platformRows = Array.isArray(data?.[0]) ? data[0] : [];
  const trendData = data?.[1] ?? null;

  return (
    <>
      <PageHeader
        title="Platform Analytics"
        text="Shares, views and trends for each tracked platform."
      />

      <State
        loading={loading}
        error={error}
        onRetry={reload}
      >
        {data && (
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <Card title="Total views by platform">
                <PlatformBar
                  rows={platformRows}
                  field="total_views"
                  label="Views"
                />
              </Card>

              <Card title="Shares over time by platform">
                <TrendLine trends={trendData} multi />
              </Card>
            </div>

            <Card title="Platform summary">
              <TableWrap>
                <thead>
                  <tr>
                    <th className="th">Platform</th>
                    <th className="th">Type</th>
                    <th className="th text-right">Claims</th>
                    <th className="th text-right">Shares</th>
                    <th className="th text-right">Views</th>
                    <th className="th text-right">Recent trend</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {platformRows.map((p) => {
                    const growth =
                      p.growth_pct == null || p.growth_pct === ''
                        ? null
                        : Number(p.growth_pct);

                    return (
                      <tr key={p.platform_id}>
                        <td className="td font-medium">
                          {p.platform_name}
                        </td>

                        <td className="td">
                          {p.platform_type || 'Social platform'}
                        </td>

                        <td className="td text-right">
                          {p.claim_count ?? 0}
                        </td>

                        <td className="td text-right">
                          {fmtNum(p.total_shares)}
                        </td>

                        <td className="td text-right">
                          {fmtNum(p.total_views)}
                        </td>

                        <td
                          className={`td text-right ${
                            Number.isFinite(growth) && growth > 0
                              ? 'text-red-300'
                              : 'text-emerald-300'
                          }`}
                        >
                          {growth == null || !Number.isFinite(growth)
                            ? 'n/a'
                            : `${growth > 0 ? '+' : ''}${growth}%`}
                        </td>
                      </tr>
                    );
                  })}

                  {platformRows.length === 0 && (
                    <tr>
                      <td
                        className="td text-center text-slate-500"
                        colSpan={6}
                      >
                        No platform analytics available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </TableWrap>

              <p className="mt-3 text-xs text-slate-500">
                Recent trend compares shares in the latest three recorded
                days with earlier days.
              </p>
            </Card>
          </div>
        )}
      </State>
    </>
  );
}

export function Panic() {
  const { data, loading, error, reload } = useAsync(
    api.getPanicIndex,
    []
  );

  const readings = (data || []).map((p) => {
    const sentiment =
      p.sentiment_score == null || p.sentiment_score === ''
        ? null
        : Number(p.sentiment_score);

    const spike =
      p.search_volume_spike == null || p.search_volume_spike === ''
        ? null
        : Number(p.search_volume_spike);

    return {
      ...p,
      sentiment_score:
        sentiment != null && Number.isFinite(sentiment)
          ? sentiment
          : null,
      search_volume_spike:
        spike != null && Number.isFinite(spike) ? spike : null,
    };
  });

  const validSentiments = readings.filter(
    (p) => p.sentiment_score != null
  );

  const avg = validSentiments.length
    ? validSentiments.reduce(
        (sum, p) => sum + p.sentiment_score,
        0
      ) / validSentiments.length
    : null;

  const top = readings
    .filter((p) => p.search_volume_spike != null)
    .sort(
      (a, b) => b.search_volume_spike - a.search_volume_spike
    )[0];

  return (
    <>
      <PageHeader
        title="Public Panic Index"
        text="Recorded regional sentiment and search-volume spikes linked to tracked claims. Scores run from -1 (very negative) to 1."
      />

      <State
        loading={loading}
        error={error}
        onRetry={reload}
        empty={readings.length === 0}
        emptyText="No panic readings have been recorded."
      >
        {data && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="Readings recorded"
                value={readings.length}
                icon={Activity}
              />

              <StatCard
                label="Average sentiment"
                value={avg == null ? 'N/A' : avg.toFixed(2)}
                icon={Gauge}
                tone="text-amber-300"
              />

              <StatCard
                label="Largest search spike"
                value={
                  top
                    ? `+${top.search_volume_spike}% ${top.region}`
                    : '-'
                }
                icon={MapPin}
                tone="text-red-300"
              />
            </div>

            <Card>
              <TableWrap>
                <thead>
                  <tr>
                    <th className="th">Region</th>
                    <th className="th">Claim</th>
                    <th className="th">Sentiment</th>
                    <th className="th">Search spike</th>
                    <th className="th">Recorded</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {readings.map((p) => {
                    const recordedDate =
                      p.recorded_date ?? p.date_recorded;

                    const panicId =
                      p.panic_id ?? p.index_id;

                    return (
                      <tr key={panicId}>
                        <td className="td font-medium">
                          {p.region || 'Unknown'}
                        </td>

                        <td className="td max-w-xs">
                          <ClaimLink id={p.claim_id}>
                            {p.claim_id}
                          </ClaimLink>{' '}
                          <Badge verdict={p.verdict} />
                        </td>

                        <td
                          className={`td ${
                            p.sentiment_score == null
                              ? 'text-slate-500'
                              : p.sentiment_score <= -0.6
                                ? 'text-red-300'
                                : 'text-amber-300'
                          }`}
                        >
                          {p.sentiment_score == null
                            ? 'N/A'
                            : p.sentiment_score.toFixed(2)}
                        </td>

                        <td className="td">
                          {p.search_volume_spike == null
                            ? 'N/A'
                            : `+${p.search_volume_spike}%`}
                        </td>

                        <td className="td whitespace-nowrap">
                          {fmtDate(recordedDate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableWrap>
            </Card>
          </div>
        )}
      </State>
    </>
  );
}

export function SettingsPage() {
  const { user, signOut } = useAuth();
  const { prefs, setPref } = usePrefs();
  const [msg, setMsg] = useState('');

  const Toggle = ({ id, label, text, k }) => (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <label
          htmlFor={id}
          className="text-sm font-medium text-slate-200"
        >
          {label}
        </label>
        <p className="text-xs text-slate-500">{text}</p>
      </div>

      <input
        id={id}
        type="checkbox"
        className="mt-1 h-4 w-4 accent-indigo-500"
        checked={Boolean(prefs[k])}
        onChange={(e) => setPref(k, e.target.checked)}
      />
    </div>
  );

  return (
    <>
      <PageHeader
        title="Settings"
        text="Interface preferences are saved in this browser only."
      />

      <div className="grid max-w-4xl gap-5 lg:grid-cols-2">
        <Card title="Interface">
          <div className="divide-y divide-slate-800">
            <Toggle
              id="compact"
              k="compact"
              label="Compact table rows"
              text="Reduce row height to fit more records on screen."
            />

            <Toggle
              id="badge"
              k="badge"
              label="Notification indicator"
              text="Show the dot on the bell icon."
            />
          </div>
        </Card>

        <Card title="Demo session">
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-slate-500">Name</dt>
              <dd>{user?.name || '-'}</dd>
            </div>

            <div>
              <dt className="text-slate-500">Email</dt>
              <dd>{user?.email || '-'}</dd>
            </div>

            <div>
              <dt className="text-slate-500">Started</dt>
              <dd>
                {user?.started
                  ? new Date(user.started).toLocaleString()
                  : '-'}
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Mode</dt>
              <dd>
                Frontend demo session, not secure authentication
              </dd>
            </div>
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="btn-ghost"
              onClick={async () => {
                await api.resetDemoData();
                setMsg('Demo data reset. Added claims were removed.');
              }}
            >
              Reset demo data
            </button>

            <button className="btn-ghost" onClick={signOut}>
              Sign out
            </button>
          </div>

          {msg && (
            <p role="status" className="mt-3 text-xs text-emerald-300">
              {msg}
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
