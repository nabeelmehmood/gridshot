import { useState } from 'react';
import { submitScore } from '../../api';
import { MODES } from '../../game/modes';
import { bestRunOf } from '../../game/state';
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
  const bestRun = bestRunOf(game);

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
      await submitScore(name, bestRun);
      writeStored('username', name);
      markScoreSaved(game.mode);
      recordSavedScore(game.mode, { username: name, score: bestRun.score });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form className={styles.saveForm} onSubmit={handleSubmit} noValidate>
      <label htmlFor="username" className={styles.saveLabel}>
        Put your best {MODES[game.mode].name} score of <strong>{bestRun.score}</strong> on the leaderboard
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
