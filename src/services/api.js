
import * as seed from '../data/dummyData';

const BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

async function http(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;

    try {
      const data = await res.json();
      message = data.message || data.error || message;
    } catch {
      // Keep the default error message.
    }

    throw new Error(message);
  }

  return res.json();
}

// ---------- Mock backend ----------

const fresh = () =>
  structuredClone({
    platforms: seed.socialPlatforms,
    nodes: seed.sourceNodes,
    claims: seed.viralClaims,
    reports: seed.factCheckerReports,
    metrics: seed.amplificationMetrics,
    panic: seed.publicPanicIndex,
  });

let db = fresh();

const wait = (value, ms = 300) =>
  new Promise((resolve) =>
    setTimeout(() => resolve(structuredClone(value)), ms),
  );

const fail = (message, ms = 200) =>
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error(message)), ms),
  );

const platformName = (id) =>
  db.platforms.find((p) => p.platform_id === id)?.platform_name ?? 'Unknown';

const nodeOf = (id) => db.nodes.find((n) => n.node_id === id);

const verdictOf = (claimId) => {
  const latest = db.reports
    .filter((r) => r.claim_id === claimId)
    .sort((a, b) =>
      b.publication_date.localeCompare(a.publication_date),
    )[0];

  return latest ? latest.verdict : 'Unverified';
};

const enrich = (claim) => ({
  ...claim,
  username: nodeOf(claim.node_id)?.username ?? 'unknown',
  platform_name: platformName(claim.platform_id),
  verdict: verdictOf(claim.claim_id),
  total_shares: db.metrics
    .filter((m) => m.claim_id === claim.claim_id)
    .reduce((sum, metric) => sum + metric.shares, 0),
});

const mock = {
  stats() {
    const claims = db.claims.map(enrich);
    const distribution = {
      False: 0,
      True: 0,
      Misleading: 0,
      Unverified: 0,
    };

    claims.forEach((claim) => {
      distribution[claim.verdict] =
        (distribution[claim.verdict] || 0) + 1;
    });

    return {
      total_claims: claims.length,
      false_claims: distribution.False,
      awaiting_verification: distribution.Unverified,
      total_platforms: db.platforms.length,
      verdict_distribution: distribution,
      recent_claims: [...claims]
        .sort(
          (a, b) =>
            b.first_seen_date.localeCompare(a.first_seen_date) ||
            String(b.claim_id).localeCompare(String(a.claim_id)),
        )
        .slice(0, 6),
      top_claims: [...claims]
        .sort((a, b) => b.total_shares - a.total_shares)
        .slice(0, 4),
    };
  },

  claims: () => db.claims.map(enrich),

  claim(id) {
    const claim = db.claims.find(
      (item) => String(item.claim_id) === String(id),
    );

    if (!claim) return null;

    return {
      ...enrich(claim),
      source: nodeOf(claim.node_id),
      reports: db.reports.filter((r) => r.claim_id === id),
      metrics: db.metrics
        .filter((m) => m.claim_id === id)
        .map((m) => ({
          ...m,
          platform_name: platformName(m.platform_id),
        })),
      panic: db.panic.filter((p) => p.claim_id === id),
    };
  },

  create(payload) {
    const username = payload.username.startsWith('@')
      ? payload.username
      : `@${payload.username}`;

    let node = db.nodes.find(
      (item) => item.username.toLowerCase() === username.toLowerCase(),
    );

    if (!node) {
      node = {
        node_id: `N-${String(db.nodes.length + 1).padStart(3, '0')}`,
        username,
        platform_id: payload.platform_id,
        is_verified: false,
        follower_count: 0,
        bot_probability: null,
      };

      db.nodes.push(node);
    }

    const nextId =
      Math.max(
        0,
        ...db.claims.map((item) =>
          Number(String(item.claim_id).replace(/^C-/, '')),
        ),
      ) + 1;

    const claim = {
      claim_id: `C-${nextId}`,
      claim_text: payload.claim_text.trim(),
      node_id: node.node_id,
      platform_id: payload.platform_id,
      media_type: payload.media_type,
      first_seen_date: new Date().toISOString().slice(0, 10),
      evidence_url: payload.evidence_url?.trim() || '',
      is_demo: false,
    };

    db.claims.push(claim);

    db.metrics.push({
      metric_id: `M-${String(db.metrics.length + 1).padStart(3, '0')}`,
      claim_id: claim.claim_id,
      platform_id: payload.platform_id,
      shares: 0,
      views: 0,
      recorded_date: claim.first_seen_date,
    });

    return enrich(claim);
  },

  platformAnalytics() {
    const dates = [...new Set(db.metrics.map((m) => m.recorded_date))].sort();
    const split = dates[Math.max(0, dates.length - 3)];

    return db.platforms.map((platform) => {
      const rows = db.metrics.filter(
        (m) => m.platform_id === platform.platform_id,
      );

      const recent = rows
        .filter((m) => m.recorded_date >= split)
        .reduce((sum, m) => sum + m.shares, 0);

      const earlier = rows
        .filter((m) => m.recorded_date < split)
        .reduce((sum, m) => sum + m.shares, 0);

      return {
        ...platform,
        total_shares: rows.reduce((sum, m) => sum + m.shares, 0),
        total_views: rows.reduce((sum, m) => sum + m.views, 0),
        claim_count: new Set(rows.map((m) => m.claim_id)).size,
        growth_pct: earlier
          ? Math.round((recent / earlier - 1) * 100)
          : null,
      };
    });
  },

  trends() {
    const dates = [...new Set(db.metrics.map((m) => m.recorded_date))].sort();

    const sumForDate = (rows, date) =>
      rows
        .filter((m) => m.recorded_date === date)
        .reduce((sum, m) => sum + m.shares, 0);

    return {
      dates,
      totals: dates.map((date) => sumForDate(db.metrics, date)),
      series: db.platforms.map((platform) => ({
        platform_id: platform.platform_id,
        platform_name: platform.platform_name,
        data: dates.map((date) =>
          sumForDate(
            db.metrics.filter(
              (m) => m.platform_id === platform.platform_id,
            ),
            date,
          ),
        ),
      })),
    };
  },

  reports: () =>
    db.reports
      .map((report) => ({
        ...report,
        claim_text:
          db.claims.find((c) => c.claim_id === report.claim_id)?.claim_text ??
          '',
      }))
      .sort((a, b) =>
        b.publication_date.localeCompare(a.publication_date),
      ),

  nodes: () =>
    db.nodes.map((node) => ({
      ...node,
      platform_name: platformName(node.platform_id),
      claim_count: db.claims.filter((c) => c.node_id === node.node_id).length,
    })),

  panic: () =>
    db.panic
      .map((item) => ({
        ...item,
        claim_text:
          db.claims.find((c) => c.claim_id === item.claim_id)?.claim_text ?? '',
        verdict: verdictOf(item.claim_id),
      }))
      .sort((a, b) => b.recorded_date.localeCompare(a.recorded_date)),
};

// ---------- Public API ----------

export const getDashboardStats = async () => {
  if (USE_MOCK) return wait(mock.stats());

  const stats = await http('/api/dashboard/stats');

  return {
    ...stats,
    false_claims: stats.claims_marked_false,
  };
};

export const getClaims = () =>
  USE_MOCK ? wait(mock.claims()) : http('/api/claims');

export const getClaim = (id) => {
  if (!USE_MOCK) {
    return http(`/api/claims/${encodeURIComponent(id)}`);
  }

  const claim = mock.claim(id);

  return claim ? wait(claim) : fail(`No claim found with ID ${id}.`);
};

export const createClaim = (payload) =>
  USE_MOCK
    ? wait(mock.create(payload), 400)
    : http('/api/claims', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

export const getPlatformAnalytics = async () => {
  if (USE_MOCK) return wait(mock.platformAnalytics());

  const platforms = await http('/api/platforms/amplification');

  return platforms.map((platform) => ({
    ...platform,
    claim_count: null,
    growth_pct: null,
  }));
};

export const getTrends = () =>
  USE_MOCK ? wait(mock.trends()) : http('/api/analytics/trends');

export const getReports = () =>
  USE_MOCK ? wait(mock.reports()) : http('/api/reports');

export const getSourceNodes = () =>
  USE_MOCK ? wait(mock.nodes()) : http('/api/source-nodes');

export const getPanicIndex = () =>
  USE_MOCK ? wait(mock.panic()) : http('/api/public-panic-index');

// Mock-only helper used by Settings.
export const resetDemoData = () => {
  db = fresh();
  return wait({ ok: true }, 150);
};
