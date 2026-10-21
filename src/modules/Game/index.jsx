import { useEffect } from 'react';
import Hud from '../Hud';
import Menu from '../Menu';
import Scene from '../Scene';
import { useGame } from '../Context';
import { PHASES } from '../../game/state';
import { applyThemeUi, THEMES } from '../../themes';

export default function Game() {
  const { game, settings, view } = useGame();

  useEffect(() => {
    applyThemeUi(THEMES[settings.theme]);
  }, [settings.theme]);

  return (
    <>
      <Scene />
      {settings.effects && <div className="vignette" aria-hidden="true" />}
      {/* Nothing overlays the scene while the camera glides in. */}
      {game.phase === PHASES.RUNNING ? <Hud /> : view === 'menu' && <Menu />}
    </>
  );
}
