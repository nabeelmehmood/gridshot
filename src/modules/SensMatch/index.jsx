import { useId, useState } from 'react';
import { track } from '../../analytics';
import { cmPer360, degreesPerCount, DPI_LIMITS, gameById, GAMES, SENS_LIMITS } from '../../game/sensitivity';
import { useGame } from '../Context';
import styles from './index.module.css';

// Settings control: copy another game's sensitivity so Gridshot turns exactly the same amount per
// mouse movement. While matched, it replaces the sensitivity slider.
export default function SensMatch() {
  const { settings, setSettings } = useGame();
  const [editing, setEditing] = useState(false);
  const matched = settings.gameSens;

  if (matched && !editing) {
    const game = gameById(matched.game);
    const cm = cmPer360(degreesPerCount(matched), matched.dpi);
    return (
      <div className={styles.matched}>
        <span className={styles.label}>Sensitivity</span>
        <p className={styles.summary}>
          Matched to <strong>{game.name}</strong> at <strong>{matched.value}</strong>
        </p>
        <p className={styles.detail}>
          {cm.toFixed(1)} cm per 360° at {matched.dpi} DPI
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.link} onClick={() => setEditing(true)}>
            Change
          </button>
          <button type="button" className={styles.link} onClick={() => setSettings(current => ({ ...current, gameSens: null }))}>
            Use the slider instead
          </button>
        </div>
      </div>
    );
  }

  if (!editing) {
    return (
      <button type="button" className={styles.link} onClick={() => setEditing(true)}>
        Match my sensitivity from another game
      </button>
    );
  }

  return (
    <MatchForm
      initial={matched}
      onCancel={() => setEditing(false)}
      onApply={gameSens => {
        // Matching only works 1:1 when the browser passes raw mouse counts through.
        setSettings(current => ({ ...current, gameSens, rawInput: true }));
        track('sens_match', { game: gameSens.game });
        setEditing(false);
      }}
    />
  );
}

function MatchForm({ initial, onCancel, onApply }) {
  const id = useId();
  const [game, setGame] = useState(initial?.game ?? GAMES[0].id);
  const [value, setValue] = useState(initial ? String(initial.value) : '');
  const [dpi, setDpi] = useState(initial ? String(initial.dpi) : '800');
  const sens = Number(value);
  const dots = Number(dpi);
  const validSens = value !== '' && sens >= SENS_LIMITS.min && sens <= SENS_LIMITS.max;
  const validDpi = Number.isInteger(dots) && dots >= DPI_LIMITS.min && dots <= DPI_LIMITS.max;
  const preview = validSens && validDpi ? cmPer360(degreesPerCount({ game, value: sens }), dots) : null;

  const submit = event => {
    event.preventDefault();
    if (validSens && validDpi) onApply({ game, value: sens, dpi: dots });
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <span className={styles.label}>Match my sensitivity</span>
      <label className={styles.field} htmlFor={`${id}-game`}>
        Game
        <select id={`${id}-game`} value={game} onChange={event => setGame(event.target.value)}>
          {GAMES.map(option => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.row}>
        <label className={styles.field} htmlFor={`${id}-sens`}>
          In-game sensitivity
          <input
            id={`${id}-sens`}
            type="number"
            inputMode="decimal"
            step="any"
            min={SENS_LIMITS.min}
            placeholder="e.g. 0.4"
            value={value}
            aria-invalid={value !== '' && !validSens}
            onChange={event => setValue(event.target.value)}
          />
        </label>
        <label className={styles.field} htmlFor={`${id}-dpi`}>
          Mouse DPI
          <input
            id={`${id}-dpi`}
            type="number"
            inputMode="numeric"
            step="50"
            min={DPI_LIMITS.min}
            value={dpi}
            aria-invalid={!validDpi}
            onChange={event => setDpi(event.target.value)}
          />
        </label>
      </div>
      <p className={styles.detail}>
        {preview === null ? 'Enter your sensitivity to see your cm/360.' : `${preview.toFixed(1)} cm per 360°.`} DPI only
        sets the cm/360 shown here; the match itself doesn&apos;t depend on it. Raw mouse input gets turned on so the
        browser doesn&apos;t change your mouse speed.
      </p>
      <div className={styles.actions}>
        <button type="submit" className={styles.apply} disabled={!validSens || !validDpi}>
          Apply
        </button>
        <button type="button" className={styles.link} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
