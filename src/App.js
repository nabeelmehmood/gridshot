import Canvas from "./modules/Canvas";
import Cursor from "./modules/Cursor";
import StartOverlay from "./modules/StartOverlay";
import "./index.scss";
export default function App() {
  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <Canvas />
      <Cursor />
      <StartOverlay />
    </div>
  );
}
