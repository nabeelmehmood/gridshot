import { useEffect, useId, useState } from 'react';
import {
  calculateScore,
  formatAccuracy,
  MAX_STREAK_BONUS,
  POINTS,
  STREAK_STEP,
  streakMultiplier
} from '../../game/scoring';
import { MODE_IDS, MODES } from '../../game/modes';
import { PRACTICE_OPTIONS } from '../../game/practice';
import { rankFor } from '../../game/ranks';
import { avgHitMs, bestRunOf, PHASES } from '../../game/state';
import { cleanName } from '../../game/username';
import { track } from '../../analytics';
import { hasFinePointer } from '../../device';
import { readStored, writeStored } from '../../storage';
import { TARGET_COLORS, THEME_IDS, THEMES } from '../../themes';
import { DEFAULT_SETTINGS, SETTING_LIMITS, useGame } from '../Context';
import { Crosshair, CROSSHAIR_STYLES } from '../Crosshair';
import Leaderboard from '../Leaderboard';
import MissMap from '../MissMap';
import RankBadge from '../Rank';
import SensMatch from '../SensMatch';
import SaveScore from '../Leaderboard/SaveScore';
import ScoreCardButton from '../ScoreCard';
import { nativeShare, scoreShareText, ShareAndFeedback, ShareButtons, useCopyLink } from '../Share';
import styles from './index.module.css';

// Phones and tablets without a mouse get a showcase: browse modes, themes and the leaderboard, but
// no Start (the game is built on mouse capture) and no mouse settings.
const hasPointer = hasFinePointer;

// First visit walks through mode → theme → start; after that the picks are collapsible cards.
const STEPS = ['mode', 'theme', 'start'];
const isBoolean = value => typeof value === 'boolean';

// Mode and theme picks on the left, the run in the middle, settings on the right.
// Narrow windows stack them with the main card first.
export default function Menu() {
  const { game, settings } = useGame();
  // null, or which view of the leaderboard dialog is open: 'board' or 'stats'.
  const [leaderboardView, setLeaderboardView] = useState(null);
  const [step, setStep] = useState(() =>
    !hasPointer || readStored('onboarded', isBoolean, false) ? null : STEPS[0]
  );
  const [open, setOpen] = useState({ mode: false, theme: false, crosshair: false, practice: false });
  const [peek, setPeek] = useState(false);

  const finishOnboarding = () => {
    writeStored('onboarded', true);
    setStep(null);
  };
  const nextStep = () => setStep(current => STEPS[STEPS.indexOf(current) + 1]);
  const toggle = key => () => setOpen(current => ({ ...current, [key]: !current[key] }));
  const skipOnboarding = () => {
    track('onboarding_skip', { step });
    finishOnboarding();
  };
  const guide = step && { step, total: STEPS.length, onNext: nextStep, onSkip: skipOnboarding };
  const theme = THEMES[settings.theme];

  // Theme preview on phones: the menu steps aside to show the scene until the next tap.
  if (peek) {
    return (
      <button type="button" className={styles.peekReturn} onClick={() => setPeek(false)}>
        <span>{theme.name} · tap to return</span>
      </button>
    );
  }

  return (
    <div className={`${styles.overlay} ${hasPointer ? '' : styles.withBanner}`}>
      {!hasPointer && <PreviewBanner />}
      <div className={styles.layout}>
        <MainCard
          onOpenLeaderboard={setLeaderboardView}
          guide={guide}
          dimmed={step === 'mode' || step === 'theme'}
          onStarted={step ? finishOnboarding : undefined}
        />
        <div className={styles.picks}>
          <Collapsible
            title="Mode"
            summary={MODES[game.mode].name}
            open={step ? step === 'mode' : open.mode}
            onToggle={step ? undefined : toggle('mode')}
            active={step === 'mode'}
            dimmed={Boolean(step) && step !== 'mode'}
          >
            {step === 'mode' && <StepBanner {...guide} label="Pick a mode" next="Next: theme" />}
            <ModePicker />
          </Collapsible>
          <Collapsible
            title="Theme"
            summary={
              <>
                <ThemeBadge colors={theme.swatch} />
                {theme.name}
              </>
            }
            open={step ? step === 'theme' : open.theme}
            onToggle={step ? undefined : toggle('theme')}
            active={step === 'theme'}
            dimmed={Boolean(step) && step !== 'theme'}
          >
            {step === 'theme' && <StepBanner {...guide} label="Pick a theme. It previews behind this menu." next="Next: start" />}
            <ThemePicker onPreview={hasPointer ? undefined : () => setPeek(true)} />
          </Collapsible>
          {hasPointer && (
            <Collapsible
              title="Crosshair"
              summary={<Crosshair {...settings.crosshair} scale={Math.min(1, 22 / (settings.crosshair.size + 8))} />}
              open={step ? false : open.crosshair}
              onToggle={step ? undefined : toggle('crosshair')}
              dimmed={Boolean(step)}
            >
              <CrosshairPicker />
            </Collapsible>
          )}
          {hasPointer && (
            <Collapsible
              title="Practice"
              summary={<PracticeSummary practice={settings.practice} />}
              open={step ? false : open.practice}
              onToggle={step ? undefined : toggle('practice')}
              dimmed={Boolean(step)}
            >
              <PracticePicker />
            </Collapsible>
          )}
        </div>
        <div className={styles.side}>
          {hasPointer && (
            <aside className={styles.card} aria-labelledby="settings-title">
              <h2 id="settings-title" className={styles.cardTitle}>
                Settings
              </h2>
              <Settings />
            </aside>
          )}
          <aside className={styles.card} aria-label="Share and feedback">
            <ShareAndFeedback />
          </aside>
        </div>
      </div>

      {leaderboardView && <Leaderboard initialView={leaderboardView} onClose={() => setLeaderboardView(null)} />}
    </div>
  );
}

function StepBanner({ step, total, label, next, onNext, onSkip }) {
  return (
    <div className={styles.stepBanner}>
      <span className={styles.stepCount}>
        Step {STEPS.indexOf(step) + 1} of {total}
      </span>
      <span className={styles.stepLabel}>{label}</span>
      <div className={styles.stepActions}>
        <button type="button" className={styles.linkButton} onClick={onSkip}>
          Skip
        </button>
        {next && (
          <button type="button" className={styles.stepNext} onClick={onNext}>
            {next}
          </button>
        )}
      </div>
    </div>
  );
}

function Collapsible({ title, summary, open, onToggle, active, dimmed, children }) {
  const panelId = useId();
  const classes = [styles.card, styles.collapsible, active && styles.active, dimmed && styles.dimmed].filter(Boolean);
  return (
    <section className={classes.join(' ')}>
      <button
        type="button"
        className={styles.collapseHeader}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        disabled={!onToggle}
      >
        <span className={styles.cardTitle}>{title}</span>
        <span className={styles.summary}>{summary}</span>
        {onToggle && (
          <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true">
            ▾
          </span>
        )}
      </button>
      {open && (
        <div id={panelId} className={styles.collapsePanel}>
          {children}
        </div>
      )}
    </section>
  );
}

function MainCard({ onOpenLeaderboard, guide, dimmed, onStarted }) {
  const { game, leaderboardFor, loadLeaderboard, lockError, requestStart, settings } = useGame();
  const practice = settings.practice.enabled;
  const finished = game.phase === PHASES.FINISHED;
  const bestRun = bestRunOf(game);
  const canSave = finished && bestRun?.runId && !bestRun.saved && bestRun.score > 0;
  const topScorer = leaderboardFor(game.mode).users[0];
  const mode = MODES[game.mode];
  const startStep = guide?.step === 'start';

  const openLeaderboard = () => {
    track('leaderboard_open', { mode: game.mode });
    onOpenLeaderboard('board');
    loadLeaderboard(game.mode);
  };
  const openStats = () => {
    track('stats_open', { mode: game.mode });
    onOpenLeaderboard('stats');
  };
  const start = () => {
    onStarted?.();
    requestStart();
  };

  // Space or R starts (or restarts) a run, so playing again doesn't need the mouse.
  useEffect(() => {
    if (!hasPointer) return undefined;
    const handleKey = event => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const isSpace = event.code === 'Space';
      if (!isSpace && event.code !== 'KeyR') return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"], dialog')) return;
      // Space already presses whatever button has focus.
      if (isSpace && target?.closest('button, a, label, summary')) return;
      event.preventDefault();
      onStarted?.();
      requestStart();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onStarted, requestStart]);

  return (
    <main className={`${styles.card} ${styles.mainCard} ${startStep ? styles.active : ''} ${dimmed ? styles.dimmed : ''}`}>
      <header className={styles.header}>
        <h1 className={styles.title}>Gridshot</h1>
        <p className={styles.tagline}>Aim warmups for FPS games. Every miss costs points.</p>
      </header>

      {!hasPointer && <PlayOnComputer />}

      <p className={styles.currentMode}>
        <span className={styles.currentModeName}>
          {mode.name}
          {practice && <span className={styles.practiceBadge}>Practice</span>}
        </span>
        {mode.description}
      </p>

      {finished && <Results game={game} />}
      {finished && !game.completed && (
        <p className={styles.info}>Run ended early. Only finished runs count toward your best.</p>
      )}
      {finished && game.newBest && !bestRun?.runId && (
        <p className={styles.warning}>
          The leaderboard server couldn&apos;t be reached when this run started, so it can&apos;t be submitted.
        </p>
      )}
      {canSave && <SaveScore />}
      {finished && game.newBest && bestRun?.saved && <p className={styles.success}>Saved to the leaderboard.</p>}

      {lockError && (
        <p role="alert" className={styles.warning}>
          {lockError}
        </p>
      )}

      {startStep && <StepBanner {...guide} label="You're set. Press Start when ready." />}
      {hasPointer && (
        <>
          <button type="button" className={`${styles.startButton} ${startStep ? styles.pulse : ''}`} onClick={start} autoFocus>
            {practice ? (finished ? 'Practice again' : 'Start practice') : finished ? 'Play again' : 'Start'}
          </button>
          <ScoringRules mode={mode} />
        </>
      )}
      {!hasPointer && <ScoringRules mode={mode} />}

      <footer className={styles.footer}>
        <span className={styles.topScorer}>
          {topScorer && (
            <>
              Top <strong>{cleanName(topScorer.username)}</strong> {topScorer.score}
            </>
          )}
          {topScorer && bestRun && ' · '}
          {bestRun && (
            <>
              You <strong>{bestRun.score}</strong> <RankBadge rank={rankFor(game.mode, bestRun.score)} />
            </>
          )}
        </span>
        <span className={styles.footerLinks}>
          {hasPointer && (
            <button type="button" className={styles.linkButton} onClick={openStats}>
              Your stats
            </button>
          )}
          <button type="button" className={styles.linkButton} onClick={openLeaderboard}>
            Leaderboard
          </button>
        </span>
      </footer>
    </main>
  );
}

// Point values as chips, then the streak ladder: every STREAK_STEP hits in a row is one rung.
const STREAK_RUNGS = Array.from({ length: MAX_STREAK_BONUS + 1 }, (_, tier) => tier * STREAK_STEP);

function ScoringRules({ mode }) {
  return (
    <section className={styles.rules} aria-label="Scoring">
      <ul className={styles.ruleChips}>
        <li className={`${styles.ruleChip} ${styles.good}`}>
          <strong>+{POINTS.HIT}</strong> hit
        </li>
        <li className={`${styles.ruleChip} ${styles.bad}`}>
          <strong>{POINTS.MISS}</strong> miss
        </li>
        {mode.expiredLabel && (
          <li className={`${styles.ruleChip} ${styles.bad}`}>
            <strong>{POINTS.EXPIRED}</strong> {mode.expiredLabel.toLowerCase()}
          </li>
        )}
        {mode.untimed && (
          <li className={styles.ruleChip}>
            <strong>{mode.lives}</strong> lives
          </li>
        )}
      </ul>
      <div className={styles.ladder}>
        <span className={styles.ladderTitle}>
          Streak bonus <span className={styles.ladderNote}>hits in a row · a miss resets it</span>
        </span>
        <ol className={styles.rungs}>
          {STREAK_RUNGS.map((hits, tier) => (
            <li key={hits} className={styles.rung} data-tier={tier}>
              <span className={styles.rungMultiplier}>×{streakMultiplier(hits).toFixed(1)}</span>
              <span className={styles.rungHits}>
                {tier === MAX_STREAK_BONUS ? `${hits}+` : `${hits}–${hits + STREAK_STEP - 1}`}
              </span>
            </li>
          ))}
        </ol>
      </div>
      {hasPointer && (
        <p className={styles.escHint}>
          <kbd className={styles.kbd}>Space</kbd> or <kbd className={styles.kbd}>R</kbd> to start ·{' '}
          <kbd className={styles.kbd}>Esc</kbd> to end the run
        </p>
      )}
    </section>
  );
}

// Once per page load; the banner remounts after a theme peek.
let previewTracked = false;

function PreviewBanner() {
  const [copied, copy] = useCopyLink('phone');
  useEffect(() => {
    if (previewTracked) return;
    previewTracked = true;
    track('phone_preview');
  }, []);
  return (
    <div className={styles.previewBanner} role="note">
      <span className={styles.previewTag}>Preview</span>
      <span className={styles.previewText}>Not playable on phones. Needs a mouse.</span>
      <button type="button" className={styles.previewButton} onClick={copy}>
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}

function MouseIcon() {
  return (
    <svg className={styles.mouseIcon} viewBox="0 0 48 64" aria-hidden="true">
      <rect x="6" y="4" width="36" height="56" rx="18" fill="none" stroke="currentColor" strokeWidth="3" />
      <line x1="24" y1="4" x2="24" y2="26" stroke="currentColor" strokeWidth="3" />
      <line x1="6" y1="26" x2="42" y2="26" stroke="currentColor" strokeWidth="3" />
      <rect className={styles.mouseWheel} x="21" y="11" width="6" height="10" rx="3" fill="currentColor" />
    </svg>
  );
}

function PlayOnComputer() {
  const [copied, copy] = useCopyLink('phone');
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const share = () => nativeShare('Free aim trainer to play on my computer', 'phone');

  return (
    <section className={styles.playOnComputer} aria-labelledby="play-on-computer">
      <MouseIcon />
      <h2 id="play-on-computer" className={styles.playOnComputerTitle}>
        You&apos;re looking at a preview
      </h2>
      <p className={styles.playOnComputerText}>
        Gridshot is a <strong>mouse</strong> aim trainer, so it can&apos;t be played on a phone or tablet. Send
        yourself the link and play on a computer.
      </p>
      {canShare && (
        <button type="button" className={styles.startButton} onClick={share}>
          Share link
        </button>
      )}
      <button type="button" className={canShare ? styles.secondaryButton : styles.startButton} onClick={copy}>
        {copied ? 'Link copied' : 'Copy link'}
      </button>
      <p className={styles.playOnComputerHint}>You can still browse the modes, themes and leaderboard here.</p>
    </section>
  );
}

function ModePicker() {
  const { game, selectMode } = useGame();
  return (
    <fieldset className={styles.optionList}>
      <legend className={styles.srOnly}>Game mode</legend>
      {MODE_IDS.map(id => (
        <label key={id} className={styles.option}>
          <input type="radio" name="mode" value={id} checked={game.mode === id} onChange={() => selectMode(id)} />
          <span className={styles.optionName}>{MODES[id].name}</span>
          <span className={styles.optionDescription}>{MODES[id].description}</span>
        </label>
      ))}
    </fieldset>
  );
}

function ThemePicker({ onPreview }) {
  const { settings, setSettings } = useGame();
  return (
    <fieldset className={styles.themes}>
      <legend className={styles.srOnly}>Theme</legend>
      <div className={styles.themeGrid}>
        {THEME_IDS.map(id => (
          <label key={id} className={styles.theme}>
            <input
              type="radio"
              name="theme"
              value={id}
              checked={settings.theme === id}
              onChange={() => {
                track('theme_select', { theme: id });
                setSettings(current => ({ ...current, theme: id }));
              }}
            />
            <ThemeBadge colors={THEMES[id].swatch} />
            {THEMES[id].name}
          </label>
        ))}
      </div>
      <p className={styles.themeDescription}>{THEMES[settings.theme].description}</p>
      {onPreview && (
        <button type="button" className={styles.secondaryButton} onClick={onPreview}>
          Preview full screen
        </button>
      )}
    </fieldset>
  );
}

// Round badge split by a wave into the theme's three colours (top, wave, bottom).
function ThemeBadge({ colors: [top, wave, bottom] }) {
  const clipId = useId();
  return (
    <svg className={styles.badge} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <clipPath id={clipId}>
          <circle cx="20" cy="20" r="19" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width="40" height="40" fill={wave} />
        <path d="M0 0H40V16C27 27 13 9 0 19Z" fill={top} />
        <path d="M0 27C13 17 27 35 40 24V40H0Z" fill={bottom} />
      </g>
      <circle cx="20" cy="20" r="19" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
    </svg>
  );
}

// Counts up from 0 to `target` with an ease-out; reduced-motion players see the final number at once.
const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function useCountUp(target, still, duration = 900) {
  const [shown, setShown] = useState(() => (still || prefersReducedMotion() ? target : 0));
  useEffect(() => {
    if (still || prefersReducedMotion()) return undefined;
    let frame;
    const startedAt = performance.now();
    const step = now => {
      const progress = Math.min(1, (now - startedAt) / duration);
      setShown(Math.round(target * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, still, duration]);
  return shown;
}

function Results({ game }) {
  const { mode, hits, clicks, expired, bonus, bestStreak, elapsed, newBest, completed, practice } = game;
  const { expiredLabel, untimed, name } = MODES[mode];
  const score = calculateScore(hits, clicks, expired, bonus);
  const { settings } = useGame();
  const shown = useCountUp(score, settings.reduceMotion);
  const hitMs = avgHitMs(game);
  return (
    <section className={styles.results} aria-label="Run results">
      <div className={styles.scoreBlock}>
        <span className={`${styles.scoreValue} ${shown === score ? styles.counted : ''}`} aria-label={String(score)}>
          {shown}
        </span>
        <span className={styles.scoreLabel}>
          {practice ? 'Practice score' : newBest ? 'New personal best!' : 'Score'}
        </span>
        {/* Practice changes the difficulty, so it isn't ranked. */}
        {!practice && completed && <RankBadge rank={rankFor(mode, score)} showNext size="large" />}
      </div>
      <dl className={styles.statGrid}>
        <Stat label="Hits" value={hits} />
        <Stat label="Misses" value={clicks - hits} />
        {expiredLabel && <Stat label={expiredLabel} value={expired} />}
        {untimed && <Stat label="Survived" value={`${elapsed}s`} />}
        <Stat label="Accuracy" value={formatAccuracy(hits, clicks)} />
        <Stat label="Best streak" value={bestStreak} />
        <Stat label="Streak bonus" value={`+${bonus}`} />
        <Stat label="Time per hit" value={hitMs === null ? '–' : `${Math.round(hitMs)}ms`} />
      </dl>
      {clicks > 0 && <MissMap misses={game.misses} wild={game.wildMisses} />}
      {practice && (
        <p className={styles.practiceNote}>
          Practice run: {practice.duration}s, {practice.size}× targets, {practice.speed}× speed. Not saved to your stats
          or the leaderboard.
        </p>
      )}
      {completed && !practice && score > 0 && (
        <div className={styles.shareScore}>
          <span className={styles.shareScoreLabel}>Share your score</span>
          <ShareButtons text={scoreShareText(score, name)} where="results" />
          <ScoreCardButton
            run={{
              score,
              modeName: name,
              accuracy: formatAccuracy(hits, clicks),
              bestStreak,
              hits,
              newBest,
              rankId: rankFor(mode, score)?.id ?? null
            }}
          />
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className={styles.stat}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Settings() {
  const { settings, setSettings } = useGame();
  const update = key => event => {
    const value = Number(event.target.value);
    setSettings(current => ({ ...current, [key]: value }));
  };
  const toggle = key => event => setSettings(current => ({ ...current, [key]: event.target.checked }));
  // Theme, crosshair and practice have their own cards, so resetting settings leaves them alone.
  const OWN_CARDS = ['theme', 'crosshair', 'practice'];
  const isDefault = Object.keys(DEFAULT_SETTINGS).every(
    key => OWN_CARDS.includes(key) || settings[key] === DEFAULT_SETTINGS[key]
  );
  const reset = () =>
    setSettings(current => ({
      ...DEFAULT_SETTINGS,
      theme: current.theme,
      crosshair: current.crosshair,
      practice: current.practice
    }));

  return (
    <section className={styles.settings}>
      {!settings.gameSens && (
        <Slider
          id="sensitivity"
          label="Sensitivity"
          value={settings.sensitivity}
          display={`${settings.sensitivity.toFixed(2)}×${settings.sensitivity === 1 ? ' (desktop)' : ''}`}
          onChange={update('sensitivity')}
          {...SETTING_LIMITS.sensitivity}
        />
      )}
      <SensMatch />
      <label className={styles.toggle}>
        <input type="checkbox" checked={settings.rawInput} onChange={toggle('rawInput')} />
        Raw mouse input (ignores OS pointer speed and acceleration)
      </label>
      <Slider
        id="fov"
        label="Field of view"
        value={settings.fov}
        display={`${settings.fov}°`}
        onChange={update('fov')}
        {...SETTING_LIMITS.fov}
      />
      <Slider
        id="volume"
        label="Hit sound"
        value={settings.volume}
        display={settings.volume === 0 ? 'Off' : `${Math.round(settings.volume * 100)}%`}
        onChange={update('volume')}
        {...SETTING_LIMITS.volume}
      />
      <Slider
        id="miss-volume"
        label="Miss sound"
        value={settings.missVolume}
        display={settings.missVolume === 0 ? 'Off' : `${Math.round(settings.missVolume * 100)}%`}
        onChange={update('missVolume')}
        {...SETTING_LIMITS.volume}
      />
      <label className={styles.toggle}>
        <input type="checkbox" checked={settings.muted} onChange={toggle('muted')} />
        Mute all sounds (press M any time)
      </label>
      <label className={styles.toggle}>
        <input type="checkbox" checked={settings.effects} onChange={toggle('effects')} />
        Particles and effects
      </label>
      <label className={styles.toggle}>
        <input type="checkbox" checked={settings.customCursor} onChange={toggle('customCursor')} />
        Animated cursor
      </label>
      <label className={styles.toggle}>
        <input type="checkbox" checked={settings.reduceMotion} onChange={toggle('reduceMotion')} />
        Reduce motion (no camera glide or drifting, calmer animations)
      </label>
      <fieldset className={styles.targetColors}>
        <legend className={styles.fieldLegend}>Target colour</legend>
        <div className={styles.crosshairColors}>
          {TARGET_COLORS.map(({ id, label }) => (
            <label
              key={id}
              className={id === 'theme' ? styles.themeColorOption : styles.colorSwatch}
              style={id === 'theme' ? undefined : { background: id }}
              title={label}
            >
              <input
                type="radio"
                name="target-color"
                value={id}
                checked={settings.targetColor === id}
                onChange={() => setSettings(current => ({ ...current, targetColor: id }))}
              />
              {id === 'theme' ? label : <span className={styles.srOnly}>{label}</span>}
            </label>
          ))}
        </div>
        <p className={styles.fieldHint}>High-contrast colours that don't rely on telling red from green.</p>
      </fieldset>
      <button
        type="button"
        className={styles.linkButton}
        onClick={reset}
        disabled={isDefault}
      >
        Reset to defaults
      </button>
    </section>
  );
}

const CROSSHAIR_COLORS = ['#ffffff', '#00ff6a', '#22e6ff', '#ffe600', '#ff2bd6', '#ff3b3b'];

// Shape, colour, size, thickness and gap, with a live preview over a dark and a light backdrop so
// it can be judged against any theme.
function CrosshairPicker() {
  const { settings, setSettings } = useGame();
  const crosshair = settings.crosshair;
  const set = patch => setSettings(current => ({ ...current, crosshair: { ...current.crosshair, ...patch } }));
  const number = key => event => set({ [key]: Number(event.target.value) });
  const hasLines = ['cross', 'crossDot', 't'].includes(crosshair.style);
  const isDefault = JSON.stringify(crosshair) === JSON.stringify(DEFAULT_SETTINGS.crosshair);

  return (
    <div className={styles.crosshairPicker}>
      <div className={styles.crosshairPreview} aria-hidden="true">
        <div className={styles.previewDark}>
          <Crosshair {...crosshair} />
        </div>
        <div className={styles.previewLight}>
          <Crosshair {...crosshair} />
        </div>
      </div>

      <fieldset className={styles.crosshairStyles}>
        <legend className={styles.srOnly}>Crosshair shape</legend>
        {CROSSHAIR_STYLES.map(({ id, label }) => (
          <label key={id} className={styles.crosshairStyle} title={label}>
            <input
              type="radio"
              name="crosshair-style"
              value={id}
              checked={crosshair.style === id}
              onChange={() => set({ style: id })}
            />
            <Crosshair style={id} color="#ffffff" size={18} thickness={2} gap={3} outline={false} />
            <span className={styles.srOnly}>{label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className={styles.crosshairColors}>
        <legend className={styles.srOnly}>Crosshair colour</legend>
        {CROSSHAIR_COLORS.map(color => (
          <label key={color} className={styles.colorSwatch} style={{ background: color }} title={color}>
            <input
              type="radio"
              name="crosshair-color"
              value={color}
              checked={crosshair.color === color}
              onChange={() => set({ color })}
            />
            <span className={styles.srOnly}>{color}</span>
          </label>
        ))}
        <label className={styles.customColor} title="Custom colour">
          <input type="color" value={crosshair.color} onChange={event => set({ color: event.target.value })} />
          <span className={styles.srOnly}>Custom colour</span>
        </label>
      </fieldset>

      <Slider
        id="crosshair-size"
        label="Size"
        value={crosshair.size}
        display={`${crosshair.size}px`}
        onChange={number('size')}
        {...SETTING_LIMITS.crosshairSize}
      />
      <Slider
        id="crosshair-thickness"
        label="Thickness"
        value={crosshair.thickness}
        display={`${crosshair.thickness}px`}
        onChange={number('thickness')}
        {...SETTING_LIMITS.crosshairThickness}
      />
      {hasLines && (
        <Slider
          id="crosshair-gap"
          label="Centre gap"
          value={crosshair.gap}
          display={`${crosshair.gap}px`}
          onChange={number('gap')}
          {...SETTING_LIMITS.crosshairGap}
        />
      )}
      <label className={styles.toggle}>
        <input type="checkbox" checked={crosshair.outline} onChange={event => set({ outline: event.target.checked })} />
        Dark outline
      </label>
      <button
        type="button"
        className={styles.linkButton}
        onClick={() => set(DEFAULT_SETTINGS.crosshair)}
        disabled={isDefault}
      >
        Reset crosshair
      </button>
    </div>
  );
}

const PRACTICE_LABELS = {
  duration: { title: 'Length', format: value => `${value}s` },
  size: { title: 'Target size', format: value => `${value}×` },
  speed: { title: 'Speed', format: value => `${value}×` }
};

function PracticeSummary({ practice }) {
  if (!practice.enabled) return 'Off';
  return `${practice.duration}s · ${practice.size}× · ${practice.speed}×`;
}

// Practice: pick a length, target size and speed for any mode. Runs aren't saved anywhere.
function PracticePicker() {
  const { settings, setSettings } = useGame();
  const practice = settings.practice;
  const set = patch => setSettings(current => ({ ...current, practice: { ...current.practice, ...patch } }));

  return (
    <div className={styles.practicePicker}>
      <label className={styles.toggle}>
        <input type="checkbox" checked={practice.enabled} onChange={event => set({ enabled: event.target.checked })} />
        Practice mode
      </label>
      <p className={styles.fieldHint}>
        Tune any mode to warm up or drill a weakness. Practice runs don't count towards your stats, bests or the
        leaderboard. Length applies to timed modes.
      </p>
      {Object.entries(PRACTICE_OPTIONS).map(([key, options]) => (
        <fieldset key={key} className={styles.segmentGroup} disabled={!practice.enabled}>
          <legend className={styles.fieldLegend}>{PRACTICE_LABELS[key].title}</legend>
          <div className={styles.segments}>
            {options.map(option => (
              <label key={option} className={styles.segment}>
                <input
                  type="radio"
                  name={`practice-${key}`}
                  value={option}
                  checked={practice[key] === option}
                  onChange={() => set({ [key]: option })}
                />
                {PRACTICE_LABELS[key].format(option)}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

function Slider({ id, label, value, display, onChange, min, max, step }) {
  return (
    <div className={styles.slider}>
      <label htmlFor={id}>{label}</label>
      <output htmlFor={id}>{display}</output>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={onChange} />
    </div>
  );
}
