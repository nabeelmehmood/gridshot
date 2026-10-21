import { setConsent, useConsent } from '../../analytics';
import styles from './index.module.css';

// Asked once; the choice can be changed later from the feedback card.
export default function ConsentBanner() {
  const consent = useConsent();
  if (consent) return null;

  return (
    <section className={styles.banner} aria-labelledby="consent-title">
      <h2 id="consent-title" className={styles.title}>
        Help improve Gridshot?
      </h2>
      <p className={styles.text}>
        With your OK, Google Analytics records which modes and themes get played, using cookies. No account, no ads.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.accept} onClick={() => setConsent(true)}>
          Allow
        </button>
        <button type="button" className={styles.decline} onClick={() => setConsent(false)}>
          No thanks
        </button>
      </div>
    </section>
  );
}

export function ConsentToggle() {
  const consent = useConsent();
  if (!consent) return null;
  const granted = consent === 'granted';

  return (
    <p className={styles.toggle}>
      Usage stats {granted ? 'on' : 'off'} ·{' '}
      <button type="button" className={styles.toggleButton} onClick={() => setConsent(!granted)}>
        {granted ? 'Turn off' : 'Turn on'}
      </button>
    </p>
  );
}
