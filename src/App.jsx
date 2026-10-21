import Game from './modules/Game';
import { GameContextProvider } from './modules/Context';

import './index.css';

export default function App() {
  return (
    <GameContextProvider>
      <Game />
    </GameContextProvider>
  );
}
