import { summarizeMisses } from '../../game/missMap';
import styles from './index.module.css';

// Plots each miss around one target (the ring is the target's edge) and names the habit, if any.
const RANGE = 3;
const clamp = value => Math.max(-RANGE, Math.min(RANGE, value));

export default function MissMap({ misses, wild }) {
  const summary = summarizeMisses(misses, wild);
  return (
    <section className={styles.missMap} aria-labelledby="miss-map-title">
      <svg
        className={styles.chart}
        viewBox={`${-RANGE} ${-RANGE} ${RANGE * 2} ${RANGE * 2}`}
        role="img"
        aria-label={`${misses.length} misses plotted around a target. ${summary.headline}`}
      >
        <circle className={styles.zone} r={RANGE} />
        <circle className={styles.ring2} r={2} />
        <line className={styles.axis} x1={-RANGE} x2={RANGE} y1={0} y2={0} />
        <line className={styles.axis} x1={0} x2={0} y1={-RANGE} y2={RANGE} />
        <circle className={styles.target} r={1} />
        {misses.map((miss, index) => (
          // SVG y grows downwards; misses are stored with y up.
          <circle key={index} className={styles.miss} cx={clamp(miss.dx)} cy={clamp(-miss.dy)} r={0.12} />
        ))}
      </svg>
      <div className={styles.text}>
        <h3 id="miss-map-title" className={styles.title}>
          Miss map
        </h3>
        <p className={styles.headline}>{summary.headline}</p>
        {summary.tip && <p className={styles.tip}>{summary.tip}</p>}
        {wild > 0 && (
          <p className={styles.wild}>
            {wild} {wild === 1 ? 'shot was' : 'shots were'} nowhere near a target.
          </p>
        )}
      </div>
    </section>
  );
}
