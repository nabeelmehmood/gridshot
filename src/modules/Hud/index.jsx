import { useGame } from '../Context';
import { Crosshair } from '../Crosshair';
import { MODES } from '../../game/modes';
import { paceVsBest } from '../../game/state';
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
      <Streak streak={streak} streakBreaks={streakBreaks} lostStreak={lostStreak} pace={paceVsBest(game)} />
      <Crosshair className={styles.crosshair} {...settings.crosshair} />
      <div className={styles.hint}>Esc to end run</div>
    </div>
  );
}

// Count, progress to the next tier, the current multiplier and pace against the best run;
// keys restart the pop animations.
function Streak({ streak, streakBreaks, lostStreak, pace }) {
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
      <Pace diff={pace} />
      {streakBreaks > 0 && (
        <span key={`lost-${streakBreaks}`} className={styles.streakLost}>
          {lostStreak} streak lost
        </span>
      )}
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

// Against the best run at the same second; updates once a second.
function Pace({ diff }) {
  if (diff === null) return null;
  const ahead = diff >= 0;
  return (
    <span className={`${styles.pace} ${ahead ? styles.ahead : styles.behind}`}>
      {ahead ? '+' : ''}
      {diff} vs best
    </span>
  );
}
