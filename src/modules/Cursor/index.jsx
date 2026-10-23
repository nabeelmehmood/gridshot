import { useEffect, useRef } from 'react';
import styles from './index.module.css';

// Menu cursor, "lock-on" style. A dot tracks the mouse exactly and a ring trails behind with a
// spring. Hovering a control snaps four corner brackets around it like a target lock, buttons lean
// towards the cursor (magnetic), and clicks flash a hitmarker with a small recoil kick plus the
// theme's burst. Colours come from the theme's --accent. Everything is written straight to the DOM
// every frame, so mouse movement never re-renders React.
const INTERACTIVE = 'button, a, label, select, summary, [role="tab"], input[type="range"], input[type="checkbox"], input[type="radio"], input[type="color"]';
// Text fields and the (top-layer) dialogs keep the native cursor.
const NATIVE = 'input[type="text"], input[type="number"], textarea, dialog';
// Controls that lean towards the cursor; wide rows and sliders would just look loose.
const MAGNETIC = 'button, a, [role="tab"], summary';
const MAX_MAGNET_WIDTH = 420;
const MAGNET_PULL = 0.18;
const MAGNET_MAX = { x: 6, y: 4 };
const BURST_PARTICLES = 7;
// Brackets sit this far outside the control, closer while the button is held.
const LOCK_PAD = 6;
const LOCK_PAD_PRESSED = 2;
const IDLE_LOCK_SIZE = 34;
const HITMARKER =
  '<svg viewBox="0 0 24 24"><path d="M3 3 9 9M21 3 15 9M3 21 9 15M21 21 15 15" stroke="rgba(0,0,0,0.7)" stroke-width="4.5" stroke-linecap="round"/><path d="M3 3 9 9M21 3 15 9M3 21 9 15M21 21 15 15" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>';

const osReducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const lerp = (from, to, amount) => from + (to - from) * amount;
const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

export default function Cursor({ theme, colors, reduceMotion = false }) {
  const root = useRef(null);
  const dot = useRef(null);
  const ring = useRef(null);
  const lock = useRef(null);
  const burstColors = useRef(colors);
  const still = useRef(reduceMotion || osReducedMotion);

  useEffect(() => {
    burstColors.current = colors;
  }, [colors]);

  useEffect(() => {
    still.current = reduceMotion || osReducedMotion;
  }, [reduceMotion]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('custom-cursor');
    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const trail = { ...pointer };
    const box = { x: pointer.x, y: pointer.y, w: 0, h: 0 };
    // The control the brackets are locked on, and the one being pulled (with its current offset).
    let locked = null;
    const magnet = { element: null, x: 0, y: 0 };
    let pressed = false;
    let kick = 'a';
    let frame = 0;

    const releaseMagnet = () => {
      if (magnet.element) magnet.element.style.translate = '';
      magnet.element = null;
      magnet.x = 0;
      magnet.y = 0;
    };

    const loop = () => {
      const follow = still.current ? 1 : 0.2;
      trail.x = lerp(trail.x, pointer.x, follow);
      trail.y = lerp(trail.y, pointer.y, follow);
      ring.current.style.transform = `translate3d(${trail.x}px, ${trail.y}px, 0)`;

      // Magnetic pull: ease the hovered button towards the pointer, and back to rest on leave.
      const pulling = !still.current && locked?.matches(MAGNETIC) && locked.offsetWidth <= MAX_MAGNET_WIDTH;
      if (pulling && magnet.element !== locked) {
        releaseMagnet();
        magnet.element = locked;
      }
      if (magnet.element) {
        let targetX = 0;
        let targetY = 0;
        if (pulling) {
          // Measured without the current offset, so the pull doesn't feed back on itself.
          const rect = magnet.element.getBoundingClientRect();
          targetX = clamp((pointer.x - (rect.left - magnet.x + rect.width / 2)) * MAGNET_PULL, MAGNET_MAX.x);
          targetY = clamp((pointer.y - (rect.top - magnet.y + rect.height / 2)) * MAGNET_PULL, MAGNET_MAX.y);
        }
        magnet.x = lerp(magnet.x, targetX, 0.25);
        magnet.y = lerp(magnet.y, targetY, 0.25);
        if (!pulling && Math.abs(magnet.x) < 0.1 && Math.abs(magnet.y) < 0.1) releaseMagnet();
        else magnet.element.style.translate = `${magnet.x.toFixed(2)}px ${magnet.y.toFixed(2)}px`;
      }

      // Brackets: wrap the locked control, or shrink back onto the trailing ring.
      if (locked && !locked.isConnected) locked = null;
      let target;
      if (locked) {
        const rect = locked.getBoundingClientRect();
        const pad = pressed ? LOCK_PAD_PRESSED : LOCK_PAD;
        target = { x: rect.left - pad, y: rect.top - pad, w: rect.width + pad * 2, h: rect.height + pad * 2 };
      } else {
        target = { x: trail.x - IDLE_LOCK_SIZE / 2, y: trail.y - IDLE_LOCK_SIZE / 2, w: IDLE_LOCK_SIZE, h: IDLE_LOCK_SIZE };
      }
      const snap = still.current ? 1 : 0.3;
      box.x = lerp(box.x, target.x, snap);
      box.y = lerp(box.y, target.y, snap);
      box.w = lerp(box.w, target.w, snap);
      box.h = lerp(box.h, target.h, snap);
      const frameEl = lock.current;
      frameEl.style.transform = `translate3d(${box.x}px, ${box.y}px, 0)`;
      frameEl.style.width = `${box.w}px`;
      frameEl.style.height = `${box.h}px`;

      frame = requestAnimationFrame(loop);
    };

    const burst = (x, y) => {
      const palette = burstColors.current;
      for (let i = 0; i < BURST_PARTICLES; i++) {
        const angle = (i / BURST_PARTICLES) * Math.PI * 2 + Math.random() * 0.6;
        const distance = 22 + Math.random() * 18;
        const particle = document.createElement('span');
        particle.className = styles.particle;
        particle.style.setProperty('--x0', `${x}px`);
        particle.style.setProperty('--y0', `${y}px`);
        particle.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
        particle.style.setProperty('--spin', `${Math.round(Math.random() * 360)}deg`);
        particle.style.color = palette[i % palette.length];
        particle.addEventListener('animationend', () => particle.remove(), { once: true });
        root.current.appendChild(particle);
      }
    };

    const hitmarker = (x, y) => {
      const marker = document.createElement('span');
      marker.className = styles.hitmarker;
      marker.style.setProperty('--x0', `${x}px`);
      marker.style.setProperty('--y0', `${y}px`);
      marker.innerHTML = HITMARKER;
      marker.addEventListener('animationend', () => marker.remove(), { once: true });
      root.current.appendChild(marker);
    };

    const move = event => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      dot.current.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
      const element = event.target instanceof Element ? event.target : null;
      const native = Boolean(element?.closest(NATIVE));
      locked = native ? null : (element?.closest(INTERACTIVE) ?? null);
      root.current.dataset.visible = 'true';
      root.current.dataset.mode = native ? 'native' : locked ? 'hover' : 'idle';
      root.current.dataset.locked = String(Boolean(locked));
    };
    const down = event => {
      // A click can arrive without a move first (touchpads, pens), so refresh the hover state.
      move(event);
      if (event.button !== 0 || root.current.dataset.mode === 'native') return;
      pressed = true;
      root.current.dataset.pressed = 'true';
      hitmarker(event.clientX, event.clientY);
      if (still.current) return;
      // Alternating names restart the recoil animation on every click.
      kick = kick === 'a' ? 'b' : 'a';
      root.current.dataset.kick = kick;
      burst(event.clientX, event.clientY);
    };
    const up = () => {
      pressed = false;
      delete root.current.dataset.pressed;
    };
    const leave = () => {
      root.current.dataset.visible = 'false';
      locked = null;
    };

    window.addEventListener('mousemove', move);
    window.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    document.addEventListener('mouseleave', leave);
    frame = requestAnimationFrame(loop);

    return () => {
      html.classList.remove('custom-cursor');
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
      document.removeEventListener('mouseleave', leave);
      cancelAnimationFrame(frame);
      releaseMagnet();
    };
  }, []);

  return (
    <div ref={root} className={styles.cursor} data-theme={theme} data-visible="false" data-mode="idle" aria-hidden="true">
      <div ref={lock} className={styles.lock}>
        <div className={styles.lockFrame}>
          <span className={`${styles.corner} ${styles.topLeft}`} />
          <span className={`${styles.corner} ${styles.topRight}`} />
          <span className={`${styles.corner} ${styles.bottomLeft}`} />
          <span className={`${styles.corner} ${styles.bottomRight}`} />
        </div>
      </div>
      <div ref={ring} className={styles.anchor}>
        <div className={styles.ring}>
          <div className={styles.ringSpin} />
        </div>
      </div>
      <div ref={dot} className={styles.anchor}>
        <div className={styles.dot} />
      </div>
    </div>
  );
}
