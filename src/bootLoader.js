// The loading screen lives in index.html so it shows before any JavaScript arrives. It is hidden
// once the scene has drawn (see Scene/index.jsx), or after FALLBACK_MS so a failed WebGL start
// can't leave it up forever.
const FALLBACK_MS = 12000;

export function hideBootLoader() {
  const boot = document.getElementById('boot');
  if (!boot || boot.dataset.hiding) return;
  boot.dataset.hiding = 'true';
  boot.classList.add('boot-hidden');
  // Removed after the fade; the timeout covers browsers that skip transitionend (reduced motion).
  boot.addEventListener('transitionend', () => boot.remove(), { once: true });
  setTimeout(() => boot.remove(), 800);
}

export function hideBootLoaderEventually() {
  setTimeout(hideBootLoader, FALLBACK_MS);
}
