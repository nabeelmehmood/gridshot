import { useSyncExternalStore } from 'react';
import { track } from './analytics';

// Chrome and Edge fire beforeinstallprompt when the site can be installed; it's kept so the menu can
// offer an Install button. Other browsers never fire it, so the button simply doesn't show there.
let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach(listener => listener());

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredPrompt = event;
  notify();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  track('app_installed');
  notify();
});

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const useCanInstall = () => useSyncExternalStore(subscribe, () => deferredPrompt !== null);

export async function promptInstall() {
  const event = deferredPrompt;
  if (!event) return;
  deferredPrompt = null;
  notify();
  event.prompt();
  const { outcome } = await event.userChoice;
  track('app_install_prompt', { outcome });
}

// Production only: a worker in dev would cache Vite's modules and fight hot reload.
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}
