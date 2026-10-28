
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import useAsync from '../hooks/useAsync';
import * as api from '../services/api';
import {
  Badge,
  Card,
  State,
  TableWrap,
  fmtDate,
  fmtFull,
} from '../components/UI';

const Ext = ({ href, children }) => {
  if (!href) return <span className="text-slate-400">{children}</span>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-indigo-300 hover:underline"
    >
      {children}
      <ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  );
};

const asNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const formatScore = (value) => {
  const number = asNumber(value);
  return number === null ? '—' : number.toFixed(2);
};

const normalizeClaim = (claim) => {
  if (!claim) return null;

  const source = claim.source ?? {
    username: claim.username,
    is_verified: claim.is_verified,
    follower_count: claim.follower_count,
    bot_probability: claim.bot_probability ?? claim.bot_probability_score,
    account_creation_date: claim.account_creation_date,
  };

  const reports = (Array.isArray(claim.reports) ? claim.reports : []).map(
    (report) => ({
      ...report,
      agency_name:
        report.agency_name ?? report.checking_agency ?? 'Unknown agency',
      publication_date:
        report.publication_date ?? report.date_published ?? null,
    }),
  );

  const metrics = (Array.isArray(claim.metrics) ? claim.metrics : []).map(
    (metric) => ({
      ...metric,
      recorded_date: metric.recorded_date ?? metric.timestamp ?? null,
      shares: metric.shares ?? metric.shares_count ?? 0,
      views: metric.views ?? metric.views_count ?? 0,
    }),
  );

  const panic = (Array.isArray(claim.panic) ? claim.panic : []).map(
    (item) => ({
      ...item,
      panic_id: item.panic_id ?? item.index_id,
      sentiment_score: item.sentiment_score,
      search_volume_spike: item.search_volume_spike,
      recorded_date: item.recorded_date ?? item.date_recorded ?? null,
    }),
  );

  return {
    ...claim,
    claim_text:
      claim.claim_text ?? claim.content_text ?? 'No claim text available',
    platform_name: claim.platform_name ?? 'Platform not specified',
    first_seen_date: claim.first_seen_date ?? null,
    source,
    reports,
    metrics,
    panic,
    verdict: claim.verdict ?? reports[0]?.verdict ?? 'Unverified',
    evidence_url: claim.evidence_url ?? reports[0]?.evidence_url ?? null,
  };
};

export default function ClaimDetail() {
  const { id } = useParams();

  const { data: rawClaim, loading, error, reload } = useAsync(
    () => api.getClaim(id),
    [id],
  );

  const c = normalizeClaim(rawClaim);

  return (
    <>
      <Link
        to="/claims"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to claims
      </Link>

      <State loading={loading} error={error} onRetry={reload}>
        {c && (
          <div className="space-y-5">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">
                    Claim #{c.claim_id} · first seen{' '}
                    {c.first_seen_date ? fmtDate(c.first_seen_date) : '—'} ·{' '}
                    {c.media_type ?? 'Unknown media type'} on {c.platform_name}
                  </p>
                  <h2 className="mt-1 max-w-3xl text-lg font-semibold text-white">
                    {c.claim_text}
                  </h2>
                </div>
                <Badge verdict={c.verdict} />
              </div>

              {c.reports.length === 0 && (
                <p className="mt-3 rounded-lg border border-slate-700 bg-ink-700 p-3 text-sm text-slate-300">
                  Unverified: no fact-check report has been recorded for this
                  claim yet, so it carries no verdict.
                </p>
              )}

              {c.evidence_url && (
                <p className="mt-3 text-sm">
                  Submitted evidence:{' '}
                  <Ext href={c.evidence_url}>{c.evidence_url}</Ext>
                </p>
              )}
            </Card>

            <div className="grid gap-5 lg:grid-cols-2">
              <Card title="Source account">
                {c.source?.username ? (
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-slate-500">Username</dt>
                      <dd>{c.source.username}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Verification</dt>
                      <dd>
                        {Number(c.source.is_verified) === 1
                          ? 'Verified'
                          : 'Not verified'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Followers</dt>
                      <dd>{fmtFull(c.source.follower_count ?? 0)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Bot probability</dt>
                      <dd>
                        {asNumber(c.source.bot_probability) === null
                          ? 'Not assessed'
                          : `${Math.round(
                              asNumber(c.source.bot_probability) > 1
                                ? asNumber(c.source.bot_probability)
                                : asNumber(c.source.bot_probability) * 100,
                            )}%`}
                      </dd>
                    </div>
                    {c.source.account_creation_date && (
                      <div>
                        <dt className="text-slate-500">Account created</dt>
                        <dd>{fmtDate(c.source.account_creation_date)}</dd>
                      </div>
                    )}
                  </dl>
                ) : (
                  <p className="text-sm text-slate-400">
                    Source details unavailable.
                  </p>
                )}
              </Card>

              <Card title="Fact-check reports">
                {c.reports.length === 0 ? (
                  <p className="text-sm text-slate-400">No reports yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {c.reports.map((report) => (
                      <li
                        key={report.report_id}
                        className="flex items-start justify-between gap-3 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-200">
                            {report.agency_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {report.publication_date
                              ? fmtDate(report.publication_date)
                              : 'Date unavailable'}
                          </p>
                          {report.evidence_url && (
                            <Ext href={report.evidence_url}>Evidence link</Ext>
                          )}
                        </div>
                        <Badge verdict={report.verdict ?? 'Unverified'} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <Card title="Platform metrics">
              {c.metrics.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No metrics recorded.
                </p>
              ) : (
                <TableWrap>
                  <thead>
                    <tr>
                      <th className="th">Platform</th>
                      <th className="th">Recorded</th>
                      <th className="th text-right">Shares</th>
                      <th className="th text-right">Views</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {c.metrics.map((metric) => (
                      <tr key={metric.metric_id}>
                        <td className="td">
                          {metric.platform_name ?? 'Unknown platform'}
                        </td>
                        <td className="td">
                          {metric.recorded_date
                            ? fmtDate(metric.recorded_date)
                            : '—'}
                        </td>
                        <td className="td text-right">
                          {fmtFull(metric.shares)}
                        </td>
                        <td className="td text-right">
                          {fmtFull(metric.views)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              )}
            </Card>

            <Card title="Recorded public panic indicators">
              {c.panic.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No panic indicators recorded for this claim.
                </p>
              ) : (
                <TableWrap>
                  <thead>
                    <tr>
                      <th className="th">Region</th>
                      <th className="th">Sentiment</th>
                      <th className="th">Search spike</th>
                      <th className="th">Recorded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {c.panic.map((item) => {
                      const spike = asNumber(item.search_volume_spike);

                      return (
                        <tr key={item.panic_id}>
                          <td className="td">{item.region}</td>
                          <td className="td">
                            {formatScore(item.sentiment_score)}
                          </td>
                          <td className="td">
                            {spike === null ? '—' : `${spike > 0 ? '+' : ''}${spike}%`}
                          </td>
                          <td className="td">
                            {item.recorded_date
                              ? fmtDate(item.recorded_date)
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </TableWrap>
              )}
            </Card>
          </div>
        )}
      </State>
    </>
  );
}
