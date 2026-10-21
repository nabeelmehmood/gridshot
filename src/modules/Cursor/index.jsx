import { useEffect, useRef } from 'react';
import styles from './index.module.css';

// Playful menu cursor: a dot that tracks the mouse exactly and a ring that trails behind with a
// spring. Colours come from the theme's --accent; clicks pop a burst whose shape depends on the
// theme (see index.module.css). Positions are written straight to the DOM every frame, so mouse
// movement never re-renders React.
const INTERACTIVE = 'button, a, label, select, summary, [role="tab"], input[type="range"], input[type="checkbox"], input[type="radio"], input[type="color"]';
// Text fields and the (top-layer) leaderboard dialog keep the native cursor.
const NATIVE = 'input[type="text"], textarea, dialog';
const BURST_PARTICLES = 7;

const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FOLLOW = reducedMotion ? 1 : 0.2;

export default function Cursor({ theme, colors }) {
  const root = useRef(null);
  const dot = useRef(null);
  const ring = useRef(null);
  const burstColors = useRef(colors);

  useEffect(() => {
    burstColors.current = colors;
  }, [colors]);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('custom-cursor');
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const trail = { ...target };
    let frame = 0;

    const loop = () => {
      trail.x += (target.x - trail.x) * FOLLOW;
      trail.y += (target.y - trail.y) * FOLLOW;
      ring.current.style.transform = `translate3d(${trail.x}px, ${trail.y}px, 0)`;
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

    const move = event => {
      target.x = event.clientX;
      target.y = event.clientY;
      dot.current.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;
      const element = event.target instanceof Element ? event.target : null;
      root.current.dataset.visible = 'true';
      root.current.dataset.mode = element?.closest(NATIVE) ? 'native' : element?.closest(INTERACTIVE) ? 'hover' : 'idle';
    };
    const down = event => {
      if (event.button !== 0) return;
      root.current.dataset.pressed = 'true';
      if (!reducedMotion && root.current.dataset.mode !== 'native') burst(event.clientX, event.clientY);
    };
    const up = () => {
      delete root.current.dataset.pressed;
    };
    const leave = () => {
      root.current.dataset.visible = 'false';
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
    };
  }, []);

  return (
    <div ref={root} className={styles.cursor} data-theme={theme} data-visible="false" data-mode="idle" aria-hidden="true">
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
