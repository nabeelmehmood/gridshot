// Umami Cloud: cookieless and stores nothing personal, so it needs no consent banner. Paste the
// Website ID from Umami (Settings → Websites → Edit) below; until it's set nothing is sent. Locally,
// events are logged to the console instead.
const UMAMI_WEBSITE_ID = '212bfe3a-9174-43c3-941d-8bf9cc786816';
const UMAMI_SCRIPT = 'https://cloud.umami.is/script.js';
// Only the live site counts; previews and forks on other hosts are ignored by Umami.
const SITE_DOMAIN = 'nabeelmehmood.github.io';
const LOCAL = import.meta.env.DEV || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
const ENABLED = !LOCAL && Boolean(UMAMI_WEBSITE_ID);

// Events fired before the tracker script has loaded wait here.
const pending = [];
const MAX_PENDING = 50;

function loadTracker() {
  const script = document.createElement('script');
  script.defer = true;
  script.src = UMAMI_SCRIPT;
  script.dataset.websiteId = UMAMI_WEBSITE_ID;
  script.dataset.domains = SITE_DOMAIN;
  script.addEventListener('load', () => pending.splice(0).forEach(([name, data]) => window.umami?.track(name, data)));
  document.head.appendChild(script);
}

if (ENABLED) loadTracker();

// Umami rejects null values, so missing numbers are left out instead.
const withoutEmpty = params => Object.fromEntries(Object.entries(params).filter(([, value]) => value != null));

export function track(name, params = {}) {
  const data = withoutEmpty(params);
  if (LOCAL) {
    console.debug('[analytics]', name, data);
    return;
  }
  if (!ENABLED) return;
  if (window.umami) window.umami.track(name, data);
  else if (pending.length < MAX_PENDING) pending.push([name, data]);
}
