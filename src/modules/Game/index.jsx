import { useEffect } from 'react';
import ConsentBanner from '../Consent';
import Cursor from '../Cursor';
import Hud, { Countdown } from '../Hud';
import Menu from '../Menu';
import Scene from '../Scene';
import { useGame } from '../Context';
import { PHASES } from '../../game/state';
import { applyThemeUi, THEMES } from '../../themes';
import { hasFinePointer } from '../../device';

export default function Game() {
  const { game, settings, view, countdown } = useGame();

  useEffect(() => {
    applyThemeUi(THEMES[settings.theme]);
  }, [settings.theme]);

  return (
    <>
      <Scene />
      {settings.effects && <div className="vignette" aria-hidden="true" />}
      {/* Nothing overlays the scene while the camera glides in. */}
      {game.phase === PHASES.RUNNING ? <Hud /> : view === 'menu' && <Menu />}
      {view === 'menu' && game.phase !== PHASES.RUNNING && <ConsentBanner />}
      {view === 'game' && countdown > 0 && <Countdown value={countdown} />}
      {/* Menu only: in game the pointer is captured and the crosshair takes over. */}
      {hasFinePointer && settings.customCursor && view === 'menu' && game.phase !== PHASES.RUNNING && (
        <Cursor theme={settings.theme} colors={THEMES[settings.theme].swatch} />
      )}
    </>
  );
}
