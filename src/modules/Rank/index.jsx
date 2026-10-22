import styles from './index.module.css';

// Shield in the tier colour; higher tiers get more chevrons.
function Shield({ color, level }) {
  return (
    <svg className={styles.shield} viewBox="0 0 24 28" aria-hidden="true">
      <path d="M12 1.5 22 5v8.5c0 6.2-4.3 10.6-10 13-5.7-2.4-10-6.8-10-13V5z" fill={color} />
      <path d="M12 1.5 22 5v8.5c0 6.2-4.3 10.6-10 13z" fill="#000" opacity="0.16" />
      {Array.from({ length: Math.min(level + 1, 4) }, (_, i) => (
        <path
          key={i}
          d={`M7 ${17 - i * 3.4} 12 ${13.6 - i * 3.4} 17 ${17 - i * 3.4}`}
          fill="none"
          stroke="#0d1017"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />
      ))}
    </svg>
  );
}

// `rank` comes from rankFor() in game/ranks.js. `showNext` adds "320 to Platinum".
export default function RankBadge({ rank, showNext = false, size = 'normal' }) {
  if (!rank) return null;
  return (
    <span className={styles.rank} data-size={size} style={{ '--tier': rank.color }}>
      <Shield color={rank.color} level={rank.level} />
      <span className={styles.name}>{rank.name}</span>
      {showNext && rank.next && (
        <span className={styles.next}>
          {rank.next.toGo} to {rank.next.tier.name}
        </span>
      )}
      {showNext && !rank.next && <span className={styles.next}>Top tier</span>}
    </span>
  );
}
