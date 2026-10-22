import { useState } from 'react';
import { track } from '../../analytics';
import { submitScore } from '../../api';
import { MODES } from '../../game/modes';
import { calculateScore } from '../../game/scoring';
import { profanity, USERNAME_HINT, USERNAME_PATTERN } from '../../game/username';
import { readStored, writeStored } from '../../storage';
import { useGame } from '../Context';
import styles from './index.module.css';

const isString = value => typeof value === 'string';

export default function SaveScore() {
  const { game, markScoreSaved, recordSavedScore } = useGame();
  const [username, setUsername] = useState(() => readStored('username', isString, ''));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // This run, whether or not it's a personal best: it can still top this week's board, and the
  // server only replaces an entry when the score is higher.
  const { runId, hits, clicks, expired, bonus } = game;
  const score = calculateScore(hits, clicks, expired, bonus);

  const handleSubmit = async event => {
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
    try {
      const message = await submitScore(name, { runId, hits, clicks, expired, bonus });
      track('score_saved', { mode: game.mode, score });
      writeStored('username', name);
      markScoreSaved(game.mode, message);
      recordSavedScore(game.mode, { username: name, score });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form className={styles.saveForm} onSubmit={handleSubmit} noValidate>
      <label htmlFor="username" className={styles.saveLabel}>
        Put this {MODES[game.mode].name} score of <strong>{score}</strong> on the leaderboard
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
      {error && (
        <p id="username-error" role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </form>
  );
}
