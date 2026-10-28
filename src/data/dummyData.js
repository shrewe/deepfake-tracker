// FICTIONAL DEMONSTRATION DATA. Every platform, account, claim, agency and verdict below is invented.
// Shapes mirror the six SQL tables so the Flask/MySQL backend can return identical field names.

// Table 1: Social_Platforms
export const socialPlatforms = [
  { platform_id: 'PLT-01', platform_name: 'ChirpNet', platform_type: 'Microblog', active_users_millions: 310 },
  { platform_id: 'PLT-02', platform_name: 'FaceLink', platform_type: 'Social Network', active_users_millions: 2900 },
  { platform_id: 'PLT-03', platform_name: 'SnapReel', platform_type: 'Short Video', active_users_millions: 1100 },
  { platform_id: 'PLT-04', platform_name: 'ChatWave', platform_type: 'Messaging', active_users_millions: 1800 },
  { platform_id: 'PLT-05', platform_name: 'PicShare', platform_type: 'Photo Sharing', active_users_millions: 1400 },
];

// Table 2: Source_Nodes (FK: platform_id -> Social_Platforms)
export const sourceNodes = [
  ['N-001', '@demo_newsflash', 'PLT-01', false, 48200, 0.72],
  ['N-002', '@demo_city_watcher', 'PLT-02', true, 15400, 0.08],
  ['N-003', '@demo_clipfarm', 'PLT-03', false, 220500, 0.91],
  ['N-004', '@demo_daily_digest', 'PLT-02', true, 380000, 0.05],
  ['N-005', '@demo_forward_all', 'PLT-04', false, 9100, 0.84],
  ['N-006', '@demo_pixel_pundit', 'PLT-05', false, 61000, 0.47],
  ['N-007', '@demo_health_hints', 'PLT-01', false, 27800, 0.63],
  ['N-008', '@demo_local_voice', 'PLT-03', true, 54300, 0.12],
].map(([node_id, username, platform_id, is_verified, follower_count, bot_probability]) => ({
  node_id, username, platform_id, is_verified, follower_count, bot_probability,
}));

// Table 3: Viral_Claims (FK: node_id -> Source_Nodes, platform_id -> Social_Platforms)
// Note: no verdict column. A verdict only exists when a Fact_Checker_Reports row exists.
export const viralClaims = [
  ['C-1001', '[DEMO] Video clip alleges the city water supply was contaminated overnight.', 'N-003', 'PLT-03', 'Video', '2026-10-14'],
  ['C-1002', '[DEMO] Post claims a new transit pass will double fares next month.', 'N-001', 'PLT-01', 'Text', '2026-10-15'],
  ['C-1003', '[DEMO] Image shows a bridge closure announced by the municipal office.', 'N-002', 'PLT-02', 'Image', '2026-10-15'],
  ['C-1004', '[DEMO] Audio message says schools will close for a week due to a rumored outbreak.', 'N-005', 'PLT-04', 'Audio', '2026-10-16'],
  ['C-1005', '[DEMO] Screenshot claims an app update secretly collects microphone data.', 'N-006', 'PLT-05', 'Image', '2026-10-18'],
  ['C-1006', '[DEMO] Video appears to show a public official announcing a fake emergency curfew.', 'N-003', 'PLT-03', 'Video', '2026-10-17'],
  ['C-1007', '[DEMO] Thread says a herbal drink cures seasonal flu within a day.', 'N-007', 'PLT-01', 'Text', '2026-10-17'],
  ['C-1008', '[DEMO] Forwarded text claims bank branches will be shut for three days.', 'N-005', 'PLT-04', 'Text', '2026-10-20'],
  ['C-1009', '[DEMO] Post says the library extended weekend hours starting November.', 'N-008', 'PLT-03', 'Text', '2026-10-19'],
  ['C-1010', '[DEMO] Image of flooded streets presented as happening today.', 'N-006', 'PLT-05', 'Image', '2026-10-19'],
  ['C-1011', '[DEMO] Voice note claims a power cut is planned citywide on Friday.', 'N-001', 'PLT-01', 'Audio', '2026-10-22'],
  ['C-1012', '[DEMO] Chart claims crime rose 300% in one quarter, with no source cited.', 'N-004', 'PLT-02', 'Image', '2026-10-21'],
].map(([claim_id, claim_text, node_id, platform_id, media_type, first_seen_date]) => ({
  claim_id, claim_text, node_id, platform_id, media_type, first_seen_date, evidence_url: '', is_demo: true,
}));

// Table 4: Fact_Checker_Reports (FK: claim_id -> Viral_Claims). Fictional agencies.
export const factCheckerReports = [
  ['C-1001', 'Veritas Demo Lab', 'False', '2026-10-16'],
  ['C-1001', 'OpenCheck Collective (Demo)', 'False', '2026-10-17'],
  ['C-1002', 'Civic Verify Desk (Demo)', 'Misleading', '2026-10-17'],
  ['C-1003', 'Veritas Demo Lab', 'True', '2026-10-16'],
  ['C-1004', 'OpenCheck Collective (Demo)', 'False', '2026-10-18'],
  ['C-1006', 'Veritas Demo Lab', 'False', '2026-10-19'],
  ['C-1007', 'Civic Verify Desk (Demo)', 'Misleading', '2026-10-19'],
  ['C-1009', 'OpenCheck Collective (Demo)', 'True', '2026-10-20'],
  ['C-1010', 'Veritas Demo Lab', 'False', '2026-10-21'],
  ['C-1012', 'Civic Verify Desk (Demo)', 'Misleading', '2026-10-23'],
].map(([claim_id, agency_name, verdict, publication_date], i) => {
  const report_id = `R-${String(i + 1).padStart(3, '0')}`;
  return { report_id, claim_id, agency_name, verdict, publication_date, evidence_url: `https://example.org/demo-reports/${report_id.toLowerCase()}` };
});

// Table 5: Amplification_Metrics (FK: claim_id, platform_id)
export const amplificationMetrics = [
  [1001, '03', 18, 5200, 61000], [1001, '03', 20, 14800, 172000], [1001, '03', 22, 26300, 301000],
  [1001, '02', 20, 4100, 52000], [1001, '01', 22, 3300, 40000],
  [1002, '01', 18, 900, 12000], [1002, '01', 20, 2100, 25000], [1002, '01', 22, 2600, 31000], [1002, '02', 21, 1200, 15000],
  [1003, '02', 18, 1500, 22000], [1003, '02', 21, 2400, 33000], [1003, '01', 23, 700, 9000],
  [1004, '04', 18, 3800, 29000], [1004, '04', 20, 7600, 51000], [1004, '04', 22, 9100, 66000],
  [1005, '05', 19, 600, 8800], [1005, '05', 23, 1400, 17000], [1005, '02', 24, 500, 6000],
  [1006, '03', 19, 8800, 120000], [1006, '03', 21, 17400, 236000], [1006, '01', 22, 4100, 52000], [1006, '04', 24, 3000, 21000],
  [1007, '01', 19, 1700, 21000], [1007, '01', 22, 3500, 42000], [1007, '05', 23, 900, 11000],
  [1008, '04', 21, 2900, 20000], [1008, '04', 23, 6200, 44000], [1008, '02', 24, 800, 9500],
  [1009, '03', 20, 300, 4200], [1009, '03', 23, 650, 8100],
  [1010, '05', 20, 2100, 31000], [1010, '05', 22, 4600, 70000], [1010, '01', 24, 1800, 26000],
  [1011, '01', 23, 1100, 14000], [1011, '04', 24, 2200, 15000],
  [1012, '02', 22, 1900, 28000], [1012, '02', 24, 3100, 45000],
].map(([c, p, day, shares, views], i) => ({
  metric_id: `M-${String(i + 1).padStart(3, '0')}`,
  claim_id: `C-${c}`, platform_id: `PLT-${p}`,
  shares, views, recorded_date: `2026-10-${day}`,
}));

// Table 6: Public_Panic_Index (FK: claim_id). sentiment_score: -1 (very negative) to 1. spike: % rise in related searches.
export const publicPanicIndex = [
  [1001, 'Western Metro', -0.74, 310, '2026-10-21'],
  [1001, 'Harbor District', -0.58, 180, '2026-10-22'],
  [1004, 'Northern Counties', -0.66, 240, '2026-10-21'],
  [1006, 'Central City', -0.81, 365, '2026-10-22'],
  [1008, 'Eastern Suburbs', -0.45, 150, '2026-10-23'],
  [1010, 'Riverside Zone', -0.52, 205, '2026-10-22'],
  [1007, 'Southern Valley', -0.31, 95, '2026-10-22'],
  [1011, 'Lakeside', -0.28, 70, '2026-10-24'],
].map(([c, region, sentiment_score, search_volume_spike, recorded_date], i) => ({
  panic_id: `P-${String(i + 1).padStart(3, '0')}`,
  claim_id: `C-${c}`, region, sentiment_score, search_volume_spike, recorded_date,
}));
