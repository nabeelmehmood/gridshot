// Rank tiers per mode. The thresholds are first estimates from how many hits each mode allows a
// minute; tune them from real leaderboard percentiles once there's data (roughly: Silver ≈ top 70%,
// Gold ≈ top 40%, Platinum ≈ top 15%, Diamond ≈ top 3%).
export const TIERS = [
  { id: 'bronze', name: 'Bronze', color: '#cd8a4f' },
  { id: 'silver', name: 'Silver', color: '#c3cbd6' },
  { id: 'gold', name: 'Gold', color: '#ffcf33' },
  { id: 'platinum', name: 'Platinum', color: '#5fe3d3' },
  { id: 'diamond', name: 'Diamond', color: '#8fb4ff' }
];

// Minimum score for Silver, Gold, Platinum and Diamond; any positive score is Bronze.
export const RANK_THRESHOLDS = {
  gridshot: [600, 1100, 1600, 2100],
  strafe: [300, 600, 900, 1200],
  popin: [300, 550, 800, 1050],
  skeet: [150, 280, 400, 500],
  spidershot: [500, 850, 1200, 1500],
  microshot: [350, 650, 950, 1250],
  bounce: [350, 650, 950, 1250],
  survival: [300, 700, 1200, 2000]
};

// The tier for a score, plus how far it is to the next one. null for scores of 0 or less.
export function rankFor(mode, score) {
  const thresholds = RANK_THRESHOLDS[mode];
  if (!thresholds || score <= 0) return null;
  const level = thresholds.filter(min => score >= min).length;
  const next = level < thresholds.length ? { tier: TIERS[level + 1], at: thresholds[level] } : null;
  return { ...TIERS[level], level, next: next && { ...next, toGo: next.at - score } };
}
