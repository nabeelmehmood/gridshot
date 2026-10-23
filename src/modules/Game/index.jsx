import { useEffect, useState } from 'react';
import Cursor from '../Cursor';
import Hud, { Countdown } from '../Hud';
import Menu from '../Menu';
import Scene from '../Scene';
import { useGame } from '../Context';
import { PHASES } from '../../game/state';
import { applyThemeUi, THEMES } from '../../themes';
import { hasFinePointer } from '../../device';

export default function Game() {
  const { game, settings, setSettings, view, countdown } = useGame();
  const [soundToast, setSoundToast] = useState(null);

  useEffect(() => {
    applyThemeUi(THEMES[settings.theme]);
  }, [settings.theme]);

  // index.css stills CSS animations and transitions under this attribute.
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(settings.reduceMotion);
  }, [settings.reduceMotion]);

  // M mutes or unmutes everywhere, including mid-run.
  const { muted } = settings;
  useEffect(() => {
    const handleKey = event => {
      if (event.code !== 'KeyM' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      setSettings(current => ({ ...current, muted: !current.muted }));
      setSoundToast(muted ? 'Sound on' : 'Sound off');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [setSettings, muted]);

  useEffect(() => {
    if (!soundToast) return undefined;
    const timer = setTimeout(() => setSoundToast(null), 1200);
    return () => clearTimeout(timer);
  }, [soundToast]);

  return (
    <>
      <Scene />
      {settings.effects && <div className="vignette" aria-hidden="true" />}
      {/* Nothing overlays the scene while the camera glides in. */}
      {game.phase === PHASES.RUNNING ? <Hud /> : view === 'menu' && <Menu />}
      {view === 'game' && countdown > 0 && <Countdown value={countdown} />}
      {soundToast && (
        <div className="soundToast" role="status">
          {soundToast} · M
        </div>
      )}
      {/* Menu only: in game the pointer is captured and the crosshair takes over. */}
      {hasFinePointer && settings.customCursor && view === 'menu' && game.phase !== PHASES.RUNNING && (
        <Cursor theme={settings.theme} colors={THEMES[settings.theme].swatch} reduceMotion={settings.reduceMotion} />
      )}
    </>
  );
}
