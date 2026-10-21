import { useState } from 'react';
import { calculateScore, formatAccuracy, GAME_DURATION, POINTS } from '../../game/scoring';
import { MODE_IDS, MODES } from '../../game/modes';
import { bestRunOf, PHASES } from '../../game/state';
import { cleanName } from '../../game/username';
import { DEFAULT_SETTINGS, SETTING_LIMITS, useGame } from '../Context';
import Leaderboard from '../Leaderboard';
import SaveScore from '../Leaderboard/SaveScore';
import styles from './index.module.css';

const hasPointer = typeof window !== 'undefined' && window.matchMedia('(any-pointer: fine)').matches;

export default function Menu() {
  const { game, leaderboardFor, loadLeaderboard, lockError, requestStart } = useGame();
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const finished = game.phase === PHASES.FINISHED;
  const bestRun = bestRunOf(game);
  const canSave = finished && bestRun?.runId && !bestRun.saved && bestRun.score > 0;
  const topScorer = leaderboardFor(game.mode).users[0];

  const openLeaderboard = () => {
    setShowLeaderboard(true);
    loadLeaderboard(game.mode);
  };

  return (
    <div className={styles.overlay}>
      <main className={styles.card}>
        <header className={styles.header}>
          <h1 className={styles.title}>Gridshot</h1>
          <p className={styles.tagline}>{GAME_DURATION}-second aim warmups. Every miss costs points.</p>
        </header>

        <ModePicker />

        {finished && <Results game={game} />}
        {finished && !game.completed && (
          <p className={styles.info}>Run ended early. Only full runs count toward your best.</p>
        )}
        {finished && game.newBest && !bestRun?.runId && (
          <p className={styles.warning}>
            The leaderboard server couldn&apos;t be reached when this run started, so it can&apos;t be submitted.
          </p>
        )}
        {canSave && <SaveScore />}
        {finished && game.newBest && bestRun?.saved && <p className={styles.success}>Saved to the leaderboard.</p>}

        {!hasPointer && (
          <p className={styles.warning}>Gridshot needs a mouse. Open it in a desktop browser to play.</p>
        )}
        {lockError && (
          <p role="alert" className={styles.warning}>
            {lockError}
          </p>
        )}

        <button type="button" className={styles.startButton} onClick={requestStart} disabled={!hasPointer} autoFocus>
          {finished ? 'Play again' : 'Start'}
        </button>
        <p className={styles.rules}>
          Hit +{POINTS.HIT} · Miss {POINTS.MISS}
          {game.mode === 'popin' && ` · Expired ${POINTS.EXPIRED}`} · Esc ends the run
        </p>

        <Settings />

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

      {showLeaderboard && <Leaderboard onClose={() => setShowLeaderboard(false)} />}
    </div>
  );
}

function ModePicker() {
  const { game, selectMode } = useGame();
  return (
    <fieldset className={styles.modes}>
      <legend className={styles.srOnly}>Game mode</legend>
      {MODE_IDS.map(id => (
        <label key={id} className={styles.mode}>
          <input
            type="radio"
            name="mode"
            value={id}
            checked={game.mode === id}
            onChange={() => selectMode(id)}
          />
          <span className={styles.modeName}>{MODES[id].name}</span>
        </label>
      ))}
      <p className={styles.modeDescription}>{MODES[game.mode].description}</p>
    </fieldset>
  );
}

function Results({ game }) {
  const { mode, hits, clicks, expired, newBest } = game;
  return (
    <section className={styles.results} aria-label="Run results">
      <div className={styles.scoreBlock}>
        <span className={styles.scoreValue}>{calculateScore(hits, clicks, expired)}</span>
        <span className={styles.scoreLabel}>{newBest ? 'New personal best!' : 'Score'}</span>
      </div>
      <dl className={styles.statGrid}>
        <Stat label="Hits" value={hits} />
        <Stat label="Misses" value={clicks - hits} />
        {mode === 'popin' && <Stat label="Expired" value={expired} />}
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
  const isDefault = Object.keys(DEFAULT_SETTINGS).every(key => settings[key] === DEFAULT_SETTINGS[key]);

  return (
    <section className={styles.settings} aria-label="Settings">
      <Slider
        id="sensitivity"
        label="Sensitivity"
        value={settings.sensitivity}
        display={`${settings.sensitivity.toFixed(2)}×`}
        onChange={update('sensitivity')}
        {...SETTING_LIMITS.sensitivity}
      />
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
      <button
        type="button"
        className={styles.linkButton}
        onClick={() => setSettings(DEFAULT_SETTINGS)}
        disabled={isDefault}
      >
        Reset to defaults
      </button>
    </section>
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
