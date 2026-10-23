import { useEffect, useState } from 'react';
import { track } from '../../analytics';
import { submitScore } from '../../api';
import { MODES } from '../../game/modes';
import { placementOn } from '../../game/placement';
import { calculateScore } from '../../game/scoring';
import { profanity, USERNAME_HINT, USERNAME_PATTERN } from '../../game/username';
import { readStored, writeStored } from '../../storage';
import { useGame } from '../Context';
import styles from './index.module.css';

const isString = value => typeof value === 'string';
// Runs already sent, so a remount (or React's dev double effect) can't submit one twice.
const submitted = new Set();

// Offered after every finished, ranked run, right under the score. It says where the score would
// land, and with auto-save on (the default) a player who has saved once never has to type again.
export default function SaveScore() {
  const { game, settings, setSettings, leaderboardFor, loadLeaderboard, markScoreSaved, recordSavedScore } = useGame();
  const [username, setUsername] = useState(() => readStored('username', isString, ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // This run, whether or not it's a personal best: it can still top this week's board, and the
  // server only replaces an entry when the score is higher.
  const { mode, runId, hits, clicks, expired, bonus } = game;
  const score = calculateScore(hits, clicks, expired, bonus);
  const savedName = readStored('username', isString, '');
  const auto = settings.autoSave && USERNAME_PATTERN.test(savedName);

  // State only changes once the request settles, so this is safe to start from an effect.
  const submit = (name, automatic) => {
    if (submitted.has(runId)) return;
    submitted.add(runId);
    submitScore(name, { runId, hits, clicks, expired, bonus }).then(
      message => {
        track('score_saved', { mode, score, auto: automatic });
        writeStored('username', name);
        markScoreSaved(mode, message);
        recordSavedScore(mode, { username: name, score });
      },
      err => {
        submitted.delete(runId);
        setError(err.message);
        setSaving(false);
      }
    );
  };

  const retry = () => {
    setError('');
    submit(savedName, true);
  };

  // Fresh boards for the placement line.
  useEffect(() => {
    loadLeaderboard(mode, 'week');
    loadLeaderboard(mode);
  }, [loadLeaderboard, mode]);

  useEffect(() => {
    if (auto) submit(savedName, true);
    // Once per run: submit() only uses this run's values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, runId]);

  if (auto) {
    return (
      <p className={styles.autoSaving} role="status">
        {error ? (
          <>
            Couldn&apos;t save: {error}{' '}
            <button type="button" className={styles.inlineLink} onClick={retry}>
              Try again
            </button>
          </>
        ) : (
          <>Saving as {savedName}…</>
        )}
      </p>
    );
  }

  const handleSubmit = event => {
    event.preventDefault();
    const name = username.trim();
    if (!USERNAME_PATTERN.test(name)) {
      setError(USERNAME_HINT);
      return;
    }
    if (profanity.isProfane(name)) {
      setError('Please pick a different name.');
      return;
    }
    setSaving(true);
    setError('');
    submit(name, false);
  };

  const places = [
    [placementOn(leaderboardFor(mode, 'week').users, score, username), 'this week'],
    [placementOn(leaderboardFor(mode).users, score, username), 'all time']
  ].filter(([position]) => position !== null);

  return (
    <form className={styles.saveForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.saveHeading}>
        <span className={styles.saveTitle}>Get on the leaderboard</span>
        {places.length > 0 && (
          <span className={styles.placement}>
            Save to be {places.map(([position, board]) => `#${position} ${board}`).join(' and ')}
          </span>
        )}
      </div>
      <label htmlFor="username" className={styles.saveLabel}>
        Your {MODES[mode].name} score of <strong>{score}</strong>, under the name
      </label>
      <div className={styles.saveRow}>
        <input
          id="username"
          className={styles.input}
          type="text"
          autoComplete="nickname"
          placeholder="Your name"
          maxLength={16}
          value={username}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'username-error' : undefined}
          onChange={event => setUsername(event.target.value)}
        />
        <button type="submit" className={styles.saveButton} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      <label className={styles.autoToggle}>
        <input
          type="checkbox"
          checked={settings.autoSave}
          onChange={event => setSettings(current => ({ ...current, autoSave: event.target.checked }))}
        />
        Save my next runs automatically (only your best stays on the board)
      </label>
      {error && (
        <p id="username-error" role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </form>
  );
}
