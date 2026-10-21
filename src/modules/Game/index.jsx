import Hud from '../Hud';
import Menu from '../Menu';
import Scene from '../Scene';
import { useGame } from '../Context';
import { PHASES } from '../../game/state';

export default function Game() {
  const { game } = useGame();

  return (
    <>
      <Scene />
      {game.phase === PHASES.RUNNING ? <Hud /> : <Menu />}
    </>
  );
}
