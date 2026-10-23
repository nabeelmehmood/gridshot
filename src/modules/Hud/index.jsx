import { useGame } from '../Context';
import { Crosshair } from '../Crosshair';
import { MODES } from '../../game/modes';
import { calculateScore, formatAccuracy } from '../../game/scoring';
import styles from './index.module.css';

export default function Hud() {
  const { game, settings } = useGame();
  const { mode, timeLeft, elapsed, lives, hits, clicks, expired, bonus } = game;
  const { lives: maxLives, untimed } = MODES[mode];

  return (
    <div className={styles.hud} aria-live="off">
      <div className={styles.bar}>
        <Stat label="Score" value={calculateScore(hits, clicks, expired, bonus)} />
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
      {/* Streak and pace are on the scoreboard in the scene (Scene/Scoreboard.jsx). */}
      <Crosshair className={styles.crosshair} {...settings.crosshair} />
      <div className={styles.hint}>{game.practice ? 'Practice run, not saved · Esc to end run' : 'Esc to end run'}</div>
    </div>
  );
}

// Shown over the scene between the camera arriving and the run starting.
export function Countdown({ value }) {
  const { settings } = useGame();
  return (
    <div className={styles.hud} aria-live="assertive">
      <span key={value} className={styles.countdown}>
        {value}
      </span>
      <Crosshair className={styles.crosshair} {...settings.crosshair} />
      <div className={styles.hint}>Get ready · Esc to cancel</div>
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
