
import { Link } from 'react-router-dom';
import { Clock, Globe2, ShieldAlert, XCircle } from 'lucide-react';
import useAsync from '../hooks/useAsync';
import * as api from '../services/api';
import {
  Badge,
  Card,
  ClaimLink,
  State,
  StatCard,
  TableWrap,
  fmtDate,
  fmtFull,
  fmtNum,
} from '../components/UI';
import {
  PlatformBar,
  TrendLine,
  VerdictDoughnut,
} from '../components/charts';

const normalizeClaim = (claim) => ({
  ...claim,
  claim_id: claim.claim_id,
  claim_text: claim.claim_text ?? claim.content_text ?? 'No claim text available',
  username: claim.username ?? 'Unknown source',
  platform_name: claim.platform_name ?? 'Platform not specified',
  first_seen_date: claim.first_seen_date ?? '',
  verdict: claim.verdict ?? 'Unverified',
  total_shares: Number(claim.total_shares ?? 0),
});

const normalizeTrends = (trends) => {
  // Mock API already returns the chart-ready format.
  if (trends && !Array.isArray(trends)) {
    return {
      dates: trends.dates ?? [],
      totals: trends.totals ?? [],
      series: trends.series ?? [],
    };
  }

  // Convert live backend rows into the format expected by TrendLine.
  const rows = Array.isArray(trends) ? trends : [];
  const dates = [...new Set(rows.map((row) => row.trend_date).filter(Boolean))]
    .sort();

  const platformMap = new Map();

  rows.forEach((row) => {
    const name = row.platform_name ?? 'Unknown platform';

    if (!platformMap.has(name)) {
      platformMap.set(name, {
        platform_id: row.platform_id,
        platform_name: name,
        data: dates.map(() => 0),
      });
    }
  });

  const series = [...platformMap.values()];

  rows.forEach((row) => {
    const dateIndex = dates.indexOf(row.trend_date);
    const platform = series.find(
      (item) => item.platform_name === (row.platform_name ?? 'Unknown platform'),
    );

    if (platform && dateIndex !== -1) {
      platform.data[dateIndex] = Number(row.total_shares ?? 0);
    }
  });

  return {
    dates,
    totals: dates.map((date) =>
      rows
        .filter((row) => row.trend_date === date)
        .reduce((sum, row) => sum + Number(row.total_shares ?? 0), 0),
    ),
    series,
  };
};

export default function Overview() {
  const { data, loading, error, reload } = useAsync(
    () =>
      Promise.all([
        api.getDashboardStats(),
        api.getPlatformAnalytics(),
        api.getTrends(),
        api.getClaims(),
      ]),
    [],
  );

  return (
    <State loading={loading} error={error} onRetry={reload}>
      {data &&
        (() => {
          const [rawStats, rawPlatforms, rawTrends, rawClaims] = data;

          const platforms = Array.isArray(rawPlatforms) ? rawPlatforms : [];
          const claims = Array.isArray(rawClaims)
            ? rawClaims.map(normalizeClaim)
            : [];

          const stats = rawStats ?? {};
          const verdictDistribution = {
            False: 0,
            True: 0,
            Misleading: 0,
            Unverified: 0,
            ...(stats.verdict_distribution ?? {}),
          };

          claims.forEach((claim) => {
            const verdict = claim.verdict;
            if (Object.prototype.hasOwnProperty.call(verdictDistribution, verdict)) {
              verdictDistribution[verdict] += 1;
            } else {
              verdictDistribution.Unverified += 1;
            }
          });

          // Prefer the backend's exact counts when available.
          const totalClaims = Number(stats.total_claims ?? claims.length);
          const falseClaims = Number(
            stats.false_claims ?? stats.claims_marked_false ??
              claims.filter((claim) => claim.verdict === 'False').length,
          );
          const reportedClaims = Number(
            stats.claims_with_reports ??
              claims.filter((claim) => claim.verdict !== 'Unverified').length,
          );
          const awaitingVerification = Math.max(0, totalClaims - reportedClaims);

          const recentClaims = Array.isArray(stats.recent_claims)
            ? stats.recent_claims.map(normalizeClaim)
            : [...claims]
                .sort((a, b) =>
                  String(b.first_seen_date).localeCompare(
                    String(a.first_seen_date),
                  ),
                )
                .slice(0, 6);

          const topClaims = Array.isArray(stats.top_claims)
            ? stats.top_claims.map(normalizeClaim)
            : [...claims]
                .sort((a, b) => b.total_shares - a.total_shares)
                .slice(0, 4);

          const trends = normalizeTrends(rawTrends);

          return (
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Total Tracked Claims"
                  value={fmtFull(totalClaims)}
                  icon={ShieldAlert}
                />
                <StatCard
                  label="Claims Fact-Checked False"
                  value={fmtFull(falseClaims)}
                  icon={XCircle}
                  tone="text-red-300"
                />
                <StatCard
                  label="Awaiting Verification"
                  value={fmtFull(awaitingVerification)}
                  icon={Clock}
                  tone="text-amber-300"
                />
                <StatCard
                  label="Tracked Platforms"
                  value={fmtFull(stats.total_platforms ?? platforms.length)}
                  icon={Globe2}
                  tone="text-sky-300"
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Card title="Shares by platform">
                  <PlatformBar rows={platforms} />
                </Card>
                <Card title="Claim amplification over time">
                  <TrendLine trends={trends} />
                </Card>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                <Card title="Verdict distribution">
                  <VerdictDoughnut dist={verdictDistribution} />
                </Card>

                <Card title="Highly shared claims" className="lg:col-span-2">
                  {topClaims.length > 0 ? (
                    <ul className="divide-y divide-slate-800">
                      {topClaims.map((claim) => (
                        <li
                          key={claim.claim_id}
                          className="flex items-start justify-between gap-3 py-3"
                        >
                          <div className="min-w-0">
                            <ClaimLink id={claim.claim_id}>
                              {claim.claim_text}
                            </ClaimLink>
                            <p className="mt-1 text-xs text-slate-500">
                              {claim.username} · {claim.platform_name}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold text-white">
                              {fmtNum(claim.total_shares)}
                            </p>
                            <div className="mt-1">
                              <Badge verdict={claim.verdict} />
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-6 text-sm text-slate-400">
                      No claims available yet.
                    </p>
                  )}
                </Card>
              </div>

              <Card
                title="Recent claims"
                action={
                  <Link
                    to="/claims"
                    className="text-xs text-indigo-300 hover:underline"
                  >
                    View all claims
                  </Link>
                }
              >
                {recentClaims.length > 0 ? (
                  <TableWrap>
                    <thead>
                      <tr>
                        <th className="th">ID</th>
                        <th className="th">Claim</th>
                        <th className="th">Source</th>
                        <th className="th">First seen</th>
                        <th className="th">Verdict</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {recentClaims.map((claim) => (
                        <tr key={claim.claim_id}>
                          <td className="td">
                            <ClaimLink id={claim.claim_id}>
                              {claim.claim_id}
                            </ClaimLink>
                          </td>
                          <td className="td max-w-sm">{claim.claim_text}</td>
                          <td className="td">{claim.username}</td>
                          <td className="td whitespace-nowrap">
                            {claim.first_seen_date
                              ? fmtDate(claim.first_seen_date)
                              : '—'}
                          </td>
                          <td className="td">
                            <Badge verdict={claim.verdict} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </TableWrap>
                ) : (
                  <p className="py-6 text-sm text-slate-400">
                    No claims available yet.
                  </p>
                )}
              </Card>
            </div>
          );
        })()}
    </State>
  );
}
