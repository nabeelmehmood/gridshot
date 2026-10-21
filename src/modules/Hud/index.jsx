import { useGame } from '../Context';
import { Crosshair } from '../Crosshair';
import { MODES } from '../../game/modes';
import {
  calculateScore,
  formatAccuracy,
  MAX_STREAK_BONUS,
  STREAK_STEP,
  streakBonus,
  streakMultiplier
} from '../../game/scoring';
import styles from './index.module.css';

export default function Hud() {
  const { game, settings } = useGame();
  const { mode, timeLeft, elapsed, lives, hits, clicks, expired, bonus, streak, streakBreaks, lostStreak } = game;
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
      <Streak streak={streak} streakBreaks={streakBreaks} lostStreak={lostStreak} />
      <Crosshair className={styles.crosshair} {...settings.crosshair} />
      <div className={styles.hint}>Esc to end run</div>
    </div>
  );
}

// Count, progress to the next tier, and the current multiplier; keys restart the pop animations.
function Streak({ streak, streakBreaks, lostStreak }) {
  const tier = streakBonus(streak);
  const progress = tier >= MAX_STREAK_BONUS ? 1 : (streak % STREAK_STEP) / STREAK_STEP;
  return (
    <div className={styles.streak} data-tier={tier} aria-label={`Streak ${streak}`}>
      <div className={styles.streakRow}>
        <span key={`count-${streak}`} className={`${styles.streakCount} ${streak > 0 ? styles.bump : ''}`}>
          {streak}
        </span>
        <span className={styles.statLabel}>Streak</span>
        <span key={`tier-${tier}`} className={`${styles.multiplier} ${tier > 0 ? styles.tierUp : ''}`}>
          ×{streakMultiplier(streak).toFixed(1)}
        </span>
      </div>
      <div className={styles.streakTrack}>
        <div className={styles.streakFill} style={{ transform: `scaleX(${progress})` }} />
      </div>
      {streakBreaks > 0 && (
        <span key={`lost-${streakBreaks}`} className={styles.streakLost}>
          {lostStreak} streak lost
        </span>
      )}
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
