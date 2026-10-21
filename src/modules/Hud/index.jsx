import { useGame } from '../Context';
import { MODES } from '../../game/modes';
import { calculateScore, formatAccuracy } from '../../game/scoring';
import styles from './index.module.css';

export default function Hud() {
  const { game } = useGame();
  const { mode, timeLeft, elapsed, lives, hits, clicks, expired } = game;
  const { lives: maxLives, untimed } = MODES[mode];

  return (
    <div className={styles.hud} aria-live="off">
      <div className={styles.bar}>
        <Stat label="Score" value={calculateScore(hits, clicks, expired)} />
        {untimed ? (
          <div className={styles.lives} aria-label={`${lives} lives left, ${elapsed} seconds`}>
            <div className={styles.pips}>
              {Array.from({ length: maxLives }, (_, i) => (
                <span key={i} className={`${styles.pip} ${i < lives ? styles.pipOn : ''}`} />
              ))}
            </div>
            <span className={styles.statLabel}>{elapsed}s</span>
          </div>
        ) : (
          <div className={`${styles.timer} ${timeLeft <= 10 ? styles.timerLow : ''}`}>{timeLeft}</div>
        )}
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
