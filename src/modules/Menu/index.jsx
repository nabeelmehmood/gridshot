import { useId, useState } from 'react';
import { calculateScore, formatAccuracy, POINTS } from '../../game/scoring';
import { MODE_IDS, MODES } from '../../game/modes';
import { bestRunOf, PHASES } from '../../game/state';
import { cleanName } from '../../game/username';
import { readStored, writeStored } from '../../storage';
import { THEME_IDS, THEMES } from '../../themes';
import { DEFAULT_SETTINGS, SETTING_LIMITS, useGame } from '../Context';
import { Crosshair, CROSSHAIR_STYLES } from '../Crosshair';
import Leaderboard from '../Leaderboard';
import SaveScore from '../Leaderboard/SaveScore';
import styles from './index.module.css';

// Phones and tablets without a mouse get a showcase: browse modes, themes and the leaderboard, but
// no Start (the game is built on mouse capture) and no mouse settings.
const hasPointer = typeof window !== 'undefined' && window.matchMedia('(any-pointer: fine)').matches;
const SHARE_URL = 'https://nabeelmehmood.github.io/gridshot/';

// First visit walks through mode → theme → start; after that the picks are collapsible cards.
const STEPS = ['mode', 'theme', 'start'];
const isBoolean = value => typeof value === 'boolean';

// Mode and theme picks on the left, the run in the middle, settings on the right.
// Narrow windows stack them with the main card first.
export default function Menu() {
  const { game, settings } = useGame();
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [step, setStep] = useState(() =>
    !hasPointer || readStored('onboarded', isBoolean, false) ? null : STEPS[0]
  );
  const [open, setOpen] = useState({ mode: false, theme: false, crosshair: false });
  const [peek, setPeek] = useState(false);

  const finishOnboarding = () => {
    writeStored('onboarded', true);
    setStep(null);
  };
  const nextStep = () => setStep(current => STEPS[STEPS.indexOf(current) + 1]);
  const toggle = key => () => setOpen(current => ({ ...current, [key]: !current[key] }));
  const guide = step && { step, total: STEPS.length, onNext: nextStep, onSkip: finishOnboarding };
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
    <div className={styles.overlay}>
      <div className={styles.layout}>
        <MainCard
          onOpenLeaderboard={() => setShowLeaderboard(true)}
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
        </div>
        {hasPointer && (
          <aside className={`${styles.card} ${styles.settingsCard}`} aria-labelledby="settings-title">
            <h2 id="settings-title" className={styles.cardTitle}>
              Settings
            </h2>
            <Settings />
          </aside>
        )}
      </div>

      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
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
  const { game, leaderboardFor, loadLeaderboard, lockError, requestStart } = useGame();
  const finished = game.phase === PHASES.FINISHED;
  const bestRun = bestRunOf(game);
  const canSave = finished && bestRun?.runId && !bestRun.saved && bestRun.score > 0;
  const topScorer = leaderboardFor(game.mode).users[0];
  const mode = MODES[game.mode];
  const startStep = guide?.step === 'start';

  const openLeaderboard = () => {
    onOpenLeaderboard();
    loadLeaderboard(game.mode);
  };
  const start = () => {
    onStarted?.();
    requestStart();
  };

  return (
    <main className={`${styles.card} ${styles.mainCard} ${startStep ? styles.active : ''} ${dimmed ? styles.dimmed : ''}`}>
      <header className={styles.header}>
        <h1 className={styles.title}>Gridshot</h1>
        <p className={styles.tagline}>Aim warmups for FPS games. Every miss costs points.</p>
      </header>

      <p className={styles.currentMode}>
        <span className={styles.currentModeName}>{mode.name}</span>
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

      {!hasPointer && <PlayOnComputer />}
      {lockError && (
        <p role="alert" className={styles.warning}>
          {lockError}
        </p>
      )}

      {startStep && <StepBanner {...guide} label="You're set. Press Start when ready." />}
      {hasPointer && (
        <>
          <button type="button" className={`${styles.startButton} ${startStep ? styles.pulse : ''}`} onClick={start} autoFocus>
            {finished ? 'Play again' : 'Start'}
          </button>
          <p className={styles.rules}>
            Hit +{POINTS.HIT} · Miss {POINTS.MISS}
            {mode.expiredLabel && ` · ${mode.expiredLabel} ${POINTS.EXPIRED}`}
            {mode.untimed && ` · ${mode.lives} lives`} · Esc ends the run
          </p>
        </>
      )}

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
              You <strong>{bestRun.score}</strong>
            </>
          )}
        </span>
        <button type="button" className={styles.linkButton} onClick={openLeaderboard}>
          Leaderboard
        </button>
      </footer>
    </main>
  );
}

function PlayOnComputer() {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  // Dismissing the share sheet rejects; nothing to report.
  const share = () =>
    navigator
      .share({ title: 'Gridshot – Free Aim Trainer', text: 'Free aim trainer to play on my computer', url: SHARE_URL })
      .catch(() => {});

  return (
    <section className={styles.playOnComputer} aria-labelledby="play-on-computer">
      <h2 id="play-on-computer" className={styles.playOnComputerTitle}>
        Play on a computer
      </h2>
      <p className={styles.playOnComputerText}>
        Gridshot trains your mouse aim, so it needs a mouse and keyboard. Send yourself the link and play on your
        computer.
      </p>
      {canShare && (
        <button type="button" className={styles.startButton} onClick={share}>
          Share link
        </button>
      )}
      <button type="button" className={canShare ? styles.secondaryButton : styles.startButton} onClick={copy}>
        {copied ? 'Link copied' : 'Copy link'}
      </button>
      <p className={styles.playOnComputerHint}>Meanwhile, browse the modes, themes and leaderboard below.</p>
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
              onChange={() => setSettings(current => ({ ...current, theme: id }))}
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

function Results({ game }) {
  const { mode, hits, clicks, expired, elapsed, newBest } = game;
  const { expiredLabel, untimed } = MODES[mode];
  return (
    <section className={styles.results} aria-label="Run results">
      <div className={styles.scoreBlock}>
        <span className={styles.scoreValue}>{calculateScore(hits, clicks, expired)}</span>
        <span className={styles.scoreLabel}>{newBest ? 'New personal best!' : 'Score'}</span>
      </div>
      <dl className={styles.statGrid}>
        <Stat label="Hits" value={hits} />
        <Stat label="Misses" value={clicks - hits} />
        {expiredLabel && <Stat label={expiredLabel} value={expired} />}
        {untimed && <Stat label="Survived" value={`${elapsed}s`} />}
        <Stat label="Accuracy" value={formatAccuracy(hits, clicks)} />
      </dl>
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
  // The theme and crosshair have their own cards, so resetting settings leaves them alone.
  const isDefault = Object.keys(DEFAULT_SETTINGS).every(
    key => key === 'theme' || key === 'crosshair' || settings[key] === DEFAULT_SETTINGS[key]
  );
  const reset = () =>
    setSettings(current => ({ ...DEFAULT_SETTINGS, theme: current.theme, crosshair: current.crosshair }));

  return (
    <section className={styles.settings}>
      <Slider
        id="sensitivity"
        label="Sensitivity"
        value={settings.sensitivity}
        display={`${settings.sensitivity.toFixed(2)}×${settings.sensitivity === 1 ? ' (desktop)' : ''}`}
        onChange={update('sensitivity')}
        {...SETTING_LIMITS.sensitivity}
      />
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
        label="Hit sounds"
        value={settings.volume}
        display={settings.volume === 0 ? 'Off' : `${Math.round(settings.volume * 100)}%`}
        onChange={update('volume')}
        {...SETTING_LIMITS.volume}
      />
      <label className={styles.toggle}>
        <input type="checkbox" checked={settings.effects} onChange={toggle('effects')} />
        Particles and effects
      </label>
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

function Slider({ id, label, value, display, onChange, min, max, step }) {
  return (
    <div className={styles.slider}>
      <label htmlFor={id}>{label}</label>
      <output htmlFor={id}>{display}</output>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={onChange} />
    </div>
  );
}
