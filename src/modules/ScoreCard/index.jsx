import { useEffect, useRef, useState } from 'react';
import { track } from '../../analytics';
import { TIERS } from '../../game/ranks';
import { THEMES } from '../../themes';
import { useGame } from '../Context';
import { renderScoreCard } from './draw';
import styles from './index.module.css';

const canCopyImage = () => typeof window.ClipboardItem === 'function' && typeof navigator.clipboard?.write === 'function';

// Results button that opens a preview of the score card with save, copy and share.
export default function ScoreCardButton({ run }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={styles.openButton} onClick={() => setOpen(true)}>
        Score card image
      </button>
      {open && <ScoreCardDialog run={run} onClose={() => setOpen(false)} />}
    </>
  );
}

function ScoreCardDialog({ run, onClose }) {
  const { settings } = useGame();
  // Fields, not the object: the results screen builds a fresh `run` on every render.
  const { score, modeName, accuracy, bestStreak, hits, newBest, rankId } = run;
  const dialogRef = useRef(null);
  const [card, setCard] = useState(null);
  const [copied, setCopied] = useState(false);
  const fileName = `gridshot-${modeName.toLowerCase().replace(/\W+/g, '-')}-${score}.png`;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    let url = null;
    let cancelled = false;
    const rank = TIERS.find(tier => tier.id === rankId) ?? null;
    renderScoreCard({ score, modeName, accuracy, bestStreak, hits, newBest, rank, theme: THEMES[settings.theme] }).then(blob => {
      if (cancelled || !blob) return;
      url = URL.createObjectURL(blob);
      setCard({ blob, url, file: new File([blob], fileName, { type: 'image/png' }) });
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [score, modeName, accuracy, bestStreak, hits, newBest, rankId, settings.theme, fileName]);

  const canShare = card && typeof navigator.canShare === 'function' && navigator.canShare({ files: [card.file] });

  const copy = async () => {
    track('share', { where: 'results', network: 'image_copy' });
    try {
      await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': card.blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const share = () => {
    track('share', { where: 'results', network: 'image_share' });
    // Dismissing the share sheet rejects; nothing to report.
    navigator.share({ files: [card.file], title: 'Gridshot score' }).catch(() => {});
  };

  const handleCancel = event => {
    event.preventDefault();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="score-card-title"
      onCancel={handleCancel}
      onClick={event => event.target === dialogRef.current && onClose()}
    >
      <div className={styles.body}>
        <header className={styles.header}>
          <h2 id="score-card-title">Score card</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close score card">
            ✕
          </button>
        </header>
        <div className={styles.preview}>
          {card ? (
            <img src={card.url} alt={`Gridshot ${modeName} score card: ${score}`} width="1200" height="630" />
          ) : (
            <span className={styles.drawing}>Drawing your card…</span>
          )}
        </div>
        <div className={styles.actions}>
          <a
            className={`${styles.action} ${styles.primary}`}
            href={card?.url}
            download={fileName}
            aria-disabled={!card}
            onClick={() => track('share', { where: 'results', network: 'image_save' })}
          >
            Save image
          </a>
          {canCopyImage() && (
            <button type="button" className={styles.action} onClick={copy} disabled={!card}>
              {copied ? 'Copied' : 'Copy image'}
            </button>
          )}
          {canShare && (
            <button type="button" className={styles.action} onClick={share}>
              Share…
            </button>
          )}
        </div>
        <p className={styles.hint}>Paste it into Discord, X or a group chat.</p>
      </div>
    </dialog>
  );
}
