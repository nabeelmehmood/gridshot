import { useState } from 'react';
import { track } from '../../analytics';
import { MODES } from '../../game/modes';
import { THEMES } from '../../themes';
import { useGame } from '../Context';
import styles from './index.module.css';

export const SITE_URL = 'https://nabeelmehmood.github.io/gridshot/';

// Google Form for feedback and bug reports.
const FEEDBACK_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSe3uEpQ_sHsJWA7uowx9UGIr7JD-C52MNJv8ZMP3jkJn3-rYA/viewform';
// Entry ids from the form's "Get pre-filled link". Game info gets the player's mode, theme and browser;
// the topic must match one of the "What's it about?" options exactly.
const FEEDBACK_GAME_INFO_ENTRY = 'entry.961657182';
const FEEDBACK_TOPIC_ENTRY = 'entry.1327230019';
const BUG_TOPIC = 'Bug';

function browserSummary() {
  const agent = navigator.userAgent;
  const browser = /Edg\//.test(agent)
    ? 'Edge'
    : /OPR\//.test(agent)
      ? 'Opera'
      : /Firefox\//.test(agent)
        ? 'Firefox'
        : /Chrome\//.test(agent)
          ? 'Chrome'
          : /Safari\//.test(agent)
            ? 'Safari'
            : 'Other';
  const platform = /Windows/.test(agent) ? 'Windows' : /Mac OS/.test(agent) ? 'macOS' : /Android/.test(agent) ? 'Android' : /iPhone|iPad/.test(agent) ? 'iOS' : /Linux/.test(agent) ? 'Linux' : 'Other';
  return `${browser} on ${platform}, ${window.innerWidth}×${window.innerHeight}`;
}

function feedbackUrl(gameInfo, topic) {
  const params = new URLSearchParams({ usp: 'pp_url', [FEEDBACK_GAME_INFO_ENTRY]: gameInfo });
  if (topic) params.set(FEEDBACK_TOPIC_ENTRY, topic);
  return `${FEEDBACK_FORM_URL}?${params}`;
}

const DEFAULT_TEXT = 'Gridshot is a free browser aim trainer for FPS warmups. 8 modes, 8 themes and leaderboards.';

const canNativeShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

function shareLinks(text) {
  const url = encodeURIComponent(SITE_URL);
  const message = encodeURIComponent(text);
  return [
    { label: 'X', href: `https://twitter.com/intent/tweet?text=${message}&url=${url}` },
    { label: 'Reddit', href: `https://www.reddit.com/submit?url=${url}&title=${message}` },
    { label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(`${text} ${SITE_URL}`)}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${url}` }
  ];
}

// `where` is the part of the page a copy or share came from: menu, results or phone.
export function useCopyLink(where) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    track('copy_link', { where });
    try {
      await navigator.clipboard.writeText(SITE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return [copied, copy];
}

// Dismissing the share sheet rejects; nothing to report.
export function nativeShare(text, where) {
  track('share', { where, network: 'native' });
  return navigator.share({ title: 'Gridshot – Free Aim Trainer', text, url: SITE_URL }).catch(() => {});
}

// Row of share targets. `text` is the message posted with the link (a score, or the default pitch).
export function ShareButtons({ text = DEFAULT_TEXT, where = 'menu' }) {
  const [copied, copy] = useCopyLink(where);
  return (
    <div className={styles.shareRow}>
      {canNativeShare() && (
        <button type="button" className={styles.pill} onClick={() => nativeShare(text, where)}>
          Share…
        </button>
      )}
      {shareLinks(text).map(({ label, href }) => (
        <a
          key={label}
          className={styles.pill}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('share', { where, network: label.toLowerCase() })}
        >
          {label}
        </a>
      ))}
      <button type="button" className={styles.pill} onClick={copy}>
        {copied ? 'Copied' : 'Copy link'}
      </button>
    </div>
  );
}

export function scoreShareText(score, modeName) {
  return `I scored ${score} in Gridshot (${modeName}). Can you beat it?`;
}

export function ShareAndFeedback() {
  const { game, settings } = useGame();
  const gameInfo = `${MODES[game.mode].name} · ${THEMES[settings.theme].name} · ${browserSummary()}`;
  return (
    <div className={styles.shareAndFeedback}>
      <section aria-labelledby="share-title" className={styles.section}>
        <h3 id="share-title" className={styles.heading}>
          Share Gridshot
        </h3>
        <ShareButtons />
      </section>
      <section aria-labelledby="feedback-title" className={styles.section}>
        <h3 id="feedback-title" className={styles.heading}>
          Feedback
        </h3>
        <p className={styles.text}>
          Ideas, a mode you&apos;d like, or found a bug? I read everything, so get in touch.
        </p>
        <div className={styles.shareRow}>
          <a
            className={`${styles.pill} ${styles.primary}`}
            href={feedbackUrl(gameInfo)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('feedback_open', { topic: 'feedback' })}
          >
            Send feedback
          </a>
          <a
            className={styles.pill}
            href={feedbackUrl(gameInfo, BUG_TOPIC)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('feedback_open', { topic: 'bug' })}
          >
            Report a bug
          </a>
        </div>
        <p className={styles.privacy}>Visits are counted anonymously with Umami: no cookies, nothing personal.</p>
      </section>
    </div>
  );
}
