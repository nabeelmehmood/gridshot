import { formatAccuracy } from '../../game/scoring';
import { MODES } from '../../game/modes';
import { useGame } from '../Context';
import styles from './index.module.css';

const RECENT = 10;
const TREND = 5;

const average = values => values.reduce((sum, value) => sum + value, 0) / values.length;

// Recent form for one mode: tiles, a chart of the kept runs against the best, and the trend.
export default function StatsPanel({ mode }) {
  const { game } = useGame();
  const history = game.history[mode];
  const runs = history?.runs ?? [];
  const bestRun = game.bestRuns[mode];

  if (runs.length === 0) {
    return <p className={styles.empty}>No finished {MODES[mode].name} runs yet. Finish one and your stats show up here.</p>;
  }

  const recent = runs.slice(-RECENT);
  const best = Math.max(bestRun?.score ?? -Infinity, ...runs.map(run => run.score));
  const hits = recent.reduce((sum, run) => sum + run.hits, 0);
  const clicks = recent.reduce((sum, run) => sum + run.clicks, 0);
  // Runs from before hit timing was recorded have no avgHitMs.
  const timed = recent.map(run => run.avgHitMs).filter(Number.isFinite);

  return (
    <div className={styles.stats}>
      <dl className={styles.tiles}>
        <Tile label="Best" value={best} />
        <Tile label="Average" value={Math.round(average(recent.map(run => run.score)))} />
        <Tile label="Accuracy" value={formatAccuracy(hits, clicks)} />
        <Tile label="Time per hit" value={timed.length ? `${Math.round(average(timed))}ms` : '–'} />
        <Tile label="Best streak" value={Math.max(0, ...runs.map(run => run.bestStreak ?? 0))} />
        <Tile label="Runs" value={history.count} />
      </dl>
      <ScoreChart scores={runs.map(run => run.score)} best={best} />
      <Trend scores={runs.map(run => run.score)} />
      <p className={styles.note}>Average, accuracy and time per hit cover your last {recent.length} runs. Stats stay in this browser.</p>
    </div>
  );
}

function Tile({ label, value }) {
  return (
    <div className={styles.tile}>
      <dt className={styles.tileLabel}>{label}</dt>
      <dd className={styles.tileValue}>{value}</dd>
    </div>
  );
}

const WIDTH = 400;
const HEIGHT = 130;
const PAD = { top: 12, right: 10, bottom: 18, left: 36 };

function ScoreChart({ scores, best }) {
  const low = Math.min(0, ...scores);
  const high = Math.max(best, ...scores, 1);
  const x = index =>
    PAD.left + (scores.length === 1 ? 0.5 : index / (scores.length - 1)) * (WIDTH - PAD.left - PAD.right);
  const y = value => PAD.top + (1 - (value - low) / (high - low)) * (HEIGHT - PAD.top - PAD.bottom);
  const points = scores.map((score, index) => `${x(index).toFixed(1)},${y(score).toFixed(1)}`);
  const last = scores.length - 1;

  return (
    <figure className={styles.chart}>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`Scores of your last ${scores.length} runs`}>
        <line className={styles.axis} x1={PAD.left} x2={WIDTH - PAD.right} y1={y(low)} y2={y(low)} />
        <line className={styles.bestLine} x1={PAD.left} x2={WIDTH - PAD.right} y1={y(best)} y2={y(best)} />
        <text className={styles.axisLabel} x={PAD.left - 6} y={y(best) + 4} textAnchor="end">
          {best}
        </text>
        <text className={styles.axisLabel} x={PAD.left - 6} y={y(low) + 4} textAnchor="end">
          {low}
        </text>
        {scores.length > 1 && <polyline className={styles.line} points={points.join(' ')} />}
        {scores.map((score, index) => (
          <circle
            key={index}
            className={index === last ? styles.lastPoint : styles.point}
            cx={x(index)}
            cy={y(score)}
            r={index === last ? 4.5 : 2.5}
          />
        ))}
      </svg>
      <figcaption className={styles.caption}>
        Last {scores.length} {scores.length === 1 ? 'run' : 'runs'}, oldest on the left · dashed line is your best
      </figcaption>
    </figure>
  );
}

// Last TREND runs against the TREND before them.
function Trend({ scores }) {
  if (scores.length < TREND * 2) {
    return <p className={styles.trend}>Play {TREND * 2 - scores.length} more to see your trend.</p>;
  }
  const now = average(scores.slice(-TREND));
  const before = average(scores.slice(-TREND * 2, -TREND));
  const change = before === 0 ? 0 : Math.round(((now - before) / Math.abs(before)) * 100);
  const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'flat';
  return (
    <p className={styles.trend} data-direction={direction}>
      {direction === 'flat'
        ? `Level with your previous ${TREND} runs.`
        : `${change > 0 ? 'Up' : 'Down'} ${Math.abs(change)}% on your previous ${TREND} runs.`}
    </p>
  );
}
