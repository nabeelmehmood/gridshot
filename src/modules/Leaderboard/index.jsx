import { useEffect, useRef, useState } from 'react';
import { MODE_IDS, MODES } from '../../game/modes';
import { cleanName } from '../../game/username';
import { readStored } from '../../storage';
import { useGame } from '../Context';
import styles from './index.module.css';

export default function Leaderboard({ onClose }) {
  const { game, leaderboardFor, loadLeaderboard } = useGame();
  const [viewMode, setViewMode] = useState(game.mode);
  const dialogRef = useRef(null);
  const ownName = readStored('username', value => typeof value === 'string', '');
  const leaderboard = leaderboardFor(viewMode);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  // Esc fires 'cancel'; we close through React state instead of letting the dialog close itself.
  const handleCancel = event => {
    event.preventDefault();
    onClose();
  };

  const handleBackdropClick = event => {
    if (event.target === dialogRef.current) onClose();
  };

  const showMode = nextMode => {
    setViewMode(nextMode);
    loadLeaderboard(nextMode);
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="leaderboard-title"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
    >
      <div className={styles.dialogBody}>
        <header className={styles.dialogHeader}>
          <h2 id="leaderboard-title">Leaderboard</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close leaderboard">
            ✕
          </button>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="Game mode">
          {MODE_IDS.map(id => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={id === viewMode}
              className={styles.tab}
              onClick={() => showMode(id)}
            >
              {MODES[id].name}
            </button>
          ))}
        </div>

        {leaderboard.status === 'loading' && leaderboard.users.length === 0 && (
          <p className={styles.notice}>Loading scores…</p>
        )}
        {leaderboard.status === 'error' && (
          <p className={styles.notice}>
            Couldn&apos;t load the leaderboard.{' '}
            <button type="button" className={styles.linkButton} onClick={() => loadLeaderboard(viewMode)}>
              Try again
            </button>
          </p>
        )}
        {leaderboard.status === 'ready' && leaderboard.users.length === 0 && (
          <p className={styles.notice}>No scores yet. Be the first.</p>
        )}

        {leaderboard.users.length > 0 && (
          <ol className={styles.list}>
            {leaderboard.users.map((user, index) => (
              <li
                key={`${index}-${user.username}`}
                className={`${styles.row} ${user.username === ownName ? styles.ownRow : ''}`}
                data-rank={index + 1}
              >
                <span className={styles.rank}>{index + 1}</span>
                <span className={styles.name}>{cleanName(user.username)}</span>
                <span className={styles.score}>{user.score}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </dialog>
  );
}
