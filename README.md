# Deepfake & Misinformation Trend Tracker (frontend prototype)

React + Vite + Tailwind CSS + React Router + Chart.js + Lucide. Frontend only: all data is **fictional demo data**. A Flask REST API and MySQL database come later.

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build check
```

## Demo entry
On the sign-in page click **Enter with demo account**, or use any valid email (e.g. `demo@tracker.example`) with any password. Sign-up works the same way.

### Limitations of the simulated authentication
- The "session" is a fake profile in `localStorage` (`dtt_demo_session`). No password is stored, hashed, sent or checked.
- Route protection is a frontend guard only. Anyone can create the key in the browser console. **This is not production authentication.**
- Real auth (hashed passwords, server sessions or JWT) must be implemented in the Flask backend.

## Structure
```
src/
  data/dummyData.js      six tables: Social_Platforms, Source_Nodes, Viral_Claims,
                         Fact_Checker_Reports, Amplification_Metrics, Public_Panic_Index
  services/api.js        the ONLY data-access layer (mock now, Flask later)
  context/               AuthContext (demo session), PrefsContext (UI preferences)
  hooks/useAsync.js      loading / error / retry helper
  components/            Layout, UI primitives, charts
  pages/                 Auth, Overview, Claims, ClaimDetail, AddClaim, Others (Reports, Sources, Platforms, Panic, Settings)
```

## Switching to Flask
Copy `.env.example` to `.env`, set `VITE_USE_MOCK=false` and `VITE_API_BASE_URL=http://localhost:5000` (enable CORS in Flask). No UI changes needed.
Verdicts are **derived**: a claim's verdict is its latest `Fact_Checker_Reports.verdict`, or `"Unverified"` when no report exists. `Viral_Claims` has no verdict column.

## Endpoint contracts
| Endpoint | Response |
|---|---|
| `GET /api/dashboard/stats` | `{ total_claims, false_claims, awaiting_verification, total_platforms, verdict_distribution: {False,True,Misleading,Unverified}, recent_claims: [Claim], top_claims: [Claim] }` |
| `GET /api/claims` | `[Claim]` where `Claim = { claim_id, claim_text, node_id, username, platform_id, platform_name, media_type, first_seen_date, evidence_url, verdict, total_shares, is_demo }` |
| `GET /api/claims/:id` | `Claim + { source: Source_Node, reports: [Report], metrics: [Metric + platform_name], panic: [Panic] }`; 404 `{ "message": "..." }` if missing |
| `POST /api/claims` | body `{ claim_text, username, media_type, platform_id, evidence_url? }` returns the created `Claim` (verdict `"Unverified"`) |
| `GET /api/analytics/platforms` | `[{ platform_id, platform_name, platform_type, active_users_millions, total_shares, total_views, claim_count, growth_pct }]` |
| `GET /api/analytics/trends` | `{ dates: ["2026-10-18"], totals: [n], series: [{ platform_id, platform_name, data: [n] }] }` |
| `GET /api/reports` | `[{ report_id, claim_id, claim_text, agency_name, verdict, publication_date, evidence_url }]` |
| `GET /api/source-nodes` | `[{ node_id, username, platform_id, platform_name, is_verified, follower_count, bot_probability, claim_count }]` |
| `GET /api/public-panic-index` | `[{ panic_id, claim_id, claim_text, verdict, region, sentiment_score, search_volume_spike, recorded_date }]` |

Dates are `YYYY-MM-DD`. Errors return a non-2xx status with `{ "message": "..." }`.

## Suggested review checklist
The production build compiles cleanly. Please click through: demo sign-in, route guard (open `/claims` while signed out), every sidebar page, claim search and verdict filters, claim detail, add-claim (appears as Unverified and updates dashboard counts), and the three overview charts.
