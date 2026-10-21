import { useSyncExternalStore } from 'react';
import { readStored, writeStored } from './storage';

// GA4 only loads after the player accepts; until then nothing is sent and no cookies are set.
// index.html queues the config call with consent denied, so accepting just updates consent and
// loads the tag. Locally events are logged to the console instead.
const MEASUREMENT_ID = 'G-QTXSEFZPY1';
const CONSENT_KEY = 'analyticsConsent';
const LOCAL = import.meta.env.DEV || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

const isChoice = value => value === 'granted' || value === 'denied';
let consent = readStored(CONSENT_KEY, isChoice, null);
let tagLoaded = false;
const listeners = new Set();

const gtag = (...args) => window.gtag?.(...args);

function loadTag() {
  if (tagLoaded || LOCAL) return;
  tagLoaded = true;
  gtag('consent', 'update', { analytics_storage: 'granted' });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
}

if (consent === 'granted') loadTag();

export function setConsent(granted) {
  consent = granted ? 'granted' : 'denied';
  writeStored(CONSENT_KEY, consent);
  if (granted) {
    loadTag();
  } else if (tagLoaded) {
    // Already loaded this visit: stop collection now; the tag stays out from the next page load.
    gtag('consent', 'update', { analytics_storage: 'denied' });
  }
  listeners.forEach(listener => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// null until the player picks; 'granted' or 'denied' after.
export const useConsent = () => useSyncExternalStore(subscribe, () => consent);

export function track(name, params = {}) {
  if (LOCAL) {
    console.debug('[analytics]', name, params);
    return;
  }
  if (consent === 'granted') gtag('event', name, params);
}
