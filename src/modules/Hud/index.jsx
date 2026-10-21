import { useGame } from '../Context';
import { calculateScore, formatAccuracy } from '../../game/scoring';
import styles from './index.module.css';

export default function Hud() {
  const { game } = useGame();
  const { timeLeft, hits, clicks, expired } = game;

  return (
    <div className={styles.hud} aria-live="off">
      <div className={styles.bar}>
        <Stat label="Score" value={calculateScore(hits, clicks, expired)} />
        <div className={`${styles.timer} ${timeLeft <= 10 ? styles.timerLow : ''}`}>{timeLeft}</div>
        <Stat label="Accuracy" value={formatAccuracy(hits, clicks)} />
      </div>
      <div className={styles.crosshair} />
      <div className={styles.hint}>Esc to end run</div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statValue}>{value}</span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}
