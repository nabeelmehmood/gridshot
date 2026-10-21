import { useEffect, useRef, useState } from 'react';
import { MODE_IDS, MODES } from '../../game/modes';
import { cleanName } from '../../game/username';
import { readStored } from '../../storage';
import { useGame } from '../Context';
import StatsPanel from '../Stats';
import styles from './index.module.css';

// One dialog, two views over the same mode tabs: the global board and the player's own stats.
export default function Leaderboard({ onClose, initialView = 'board' }) {
  const { game, leaderboardFor, loadLeaderboard } = useGame();
  const [viewMode, setViewMode] = useState(game.mode);
  const [view, setView] = useState(initialView);
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
    if (view === 'board') loadLeaderboard(nextMode);
  };

  const showView = nextView => {
    setView(nextView);
    if (nextView === 'board') loadLeaderboard(viewMode);
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
          <h2 id="leaderboard-title">{view === 'board' ? 'Leaderboard' : 'Your stats'}</h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close leaderboard">
            ✕
          </button>
        </header>

        <div className={styles.viewSwitch} role="group" aria-label="Show">
          <button type="button" aria-pressed={view === 'board'} onClick={() => showView('board')}>
            Leaderboard
          </button>
          <button type="button" aria-pressed={view === 'stats'} onClick={() => showView('stats')}>
            Your stats
          </button>
        </div>

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

        {view === 'stats' && <StatsPanel mode={viewMode} />}

        {view === 'board' && leaderboard.status === 'loading' && leaderboard.users.length === 0 && (
          <p className={styles.notice}>Loading scores…</p>
        )}
        {view === 'board' && leaderboard.status === 'error' && (
          <p className={styles.notice}>
            Couldn&apos;t load the leaderboard.{' '}
            <button type="button" className={styles.linkButton} onClick={() => loadLeaderboard(viewMode)}>
              Try again
            </button>
          </p>
        )}
        {view === 'board' && leaderboard.status === 'ready' && leaderboard.users.length === 0 && (
          <p className={styles.notice}>No scores yet. Be the first.</p>
        )}

        {view === 'board' && leaderboard.users.length > 0 && (
          <ol className={styles.list}>
            {leaderboard.users.map((user, index) => {
              const own = user.username === ownName;
              return (
                <li
                  key={`${index}-${user.username}`}
                  className={`${styles.row} ${own ? styles.ownRow : ''}`}
                  data-rank={index + 1}
                >
                  <span className={styles.rank}>{index + 1}</span>
                  <span className={styles.name}>
                    <span className={styles.nameText}>{cleanName(user.username)}</span>
                    {own && <span className={styles.you}>you</span>}
                  </span>
                  <span className={styles.score}>{user.score}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </dialog>
  );
}
