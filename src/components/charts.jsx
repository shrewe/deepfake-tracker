
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { VERDICT_COLORS, VERDICTS } from './UI';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
);

ChartJS.defaults.color = '#94a3b8';
ChartJS.defaults.borderColor = 'rgba(148,163,184,0.12)';

const PALETTE = ['#818cf8', '#38bdf8', '#a78bfa', '#34d399', '#f472b6'];

const opts = (legend = false) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: legend,
      labels: { boxWidth: 10 },
    },
  },
});

const shortDate = (value) => {
  if (!value) return '—';

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(String(value))
      ? `${value}T00:00:00`
      : value,
  );

  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
      });
};

const numericValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export function PlatformBar({
  rows = [],
  field = 'total_shares',
  label = 'Shares',
}) {
  const safeRows = Array.isArray(rows) ? rows : [];

  const data = {
    labels: safeRows.map(
      (row) => row.platform_name ?? 'Unknown platform',
    ),
    datasets: [
      {
        label,
        data: safeRows.map((row) => numericValue(row[field])),
        backgroundColor: safeRows.map(
          (_, index) => PALETTE[index % PALETTE.length],
        ),
        borderRadius: 4,
      },
    ],
  };

  if (safeRows.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        No platform analytics available yet.
      </div>
    );
  }

  return (
    <div className="h-64">
      <Bar
        data={data}
        options={opts()}
        aria-label={`${label} by platform`}
        role="img"
      />
    </div>
  );
}

export function TrendLine({ trends, multi = false }) {
  // Accept only valid chart data; missing API fields must not crash the page.
  const safeTrends =
    trends && typeof trends === 'object' && !Array.isArray(trends)
      ? trends
      : {};

  const dates = Array.isArray(safeTrends.dates)
    ? safeTrends.dates
    : [];

  const totals = Array.isArray(safeTrends.totals)
    ? safeTrends.totals
    : [];

  const series = Array.isArray(safeTrends.series)
    ? safeTrends.series
    : [];

  // If only live trend rows are passed accidentally, convert them here too.
  const labels = dates.map(shortDate);

  const datasets = multi
    ? series.map((item, index) => ({
        label: item.platform_name ?? `Platform ${index + 1}`,
        data: Array.isArray(item.data) ? item.data.map(numericValue) : [],
        borderColor: PALETTE[index % PALETTE.length],
        backgroundColor: PALETTE[index % PALETTE.length],
        tension: 0.3,
        pointRadius: 2,
      }))
    : [
        {
          label: 'Total shares',
          data: totals.map(numericValue),
          borderColor: '#818cf8',
          backgroundColor: 'rgba(129,140,248,0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
        },
      ];

  const hasData =
    labels.length > 0 &&
    datasets.some((dataset) => dataset.data.length > 0);

  if (!hasData) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        No trend data available yet.
      </div>
    );
  }

  return (
    <div className="h-64">
      <Line
        data={{ labels, datasets }}
        options={opts(multi)}
        aria-label="Claim amplification over time"
        role="img"
      />
    </div>
  );
}

export function VerdictDoughnut({ dist = {} }) {
  const safeDist =
    dist && typeof dist === 'object' && !Array.isArray(dist)
      ? dist
      : {};

  const data = {
    labels: VERDICTS,
    datasets: [
      {
        data: VERDICTS.map((verdict) =>
          numericValue(safeDist[verdict] ?? 0),
        ),
        backgroundColor: VERDICTS.map(
          (verdict) => VERDICT_COLORS[verdict],
        ),
        borderColor: '#0f172a',
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="h-64">
      <Doughnut
        data={data}
        options={{
          ...opts(true),
          cutout: '62%',
          plugins: {
            legend: {
              display: true,
              position: 'bottom',
              labels: { boxWidth: 10 },
            },
          },
        }}
        aria-label="Fact-check verdict distribution"
        role="img"
      />
    </div>
  );
}
