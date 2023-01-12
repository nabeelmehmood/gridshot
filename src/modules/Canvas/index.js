import { PointerLockControls, Sky } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { DoubleSide, Vector3 } from 'three';
import { useContext, useEffect, useRef } from 'react';
// import Controls from "../Controls";
import SphereGrid from '../SphereGrid';
import { GameContext, GAME_STATES } from '../Context';
import './index.css';

const ThreeCanvas = () => {
  const controls = useRef();
  const { gameStart, setGameStart, setTimeLeft, setScore, setTotalClicks } =
    useContext(GameContext);

  useEffect(() => {}, [controls]);
  useEffect(() => {
    if (gameStart === GAME_STATES.FINISHED) {
      controls.current.unlock();
    }
  }, [gameStart]);

  const startGame = () => {
    setTimeLeft(60);
    setGameStart(GAME_STATES.START_TIMER);
    setScore(0);
    setTotalClicks(0);
  };

  return (
    <Canvas
      onCreated={e => {
        const cursor = document.querySelector('#cursor');
        const startOverlay = document.querySelector('#startOverlay');
        controls.current.addEventListener('lock', () => {
          document.body.style.cursor = 'none';
          cursor.style.display = 'initial';
          startOverlay.style.display = 'none';
          startGame();
        });
        controls.current.addEventListener('unlock', () => {
          document.body.style.cursor = 'initial';
          cursor.style.display = 'none';
          startOverlay.style.display = 'block';
          controls.current && controls.current.camera && controls.current.camera.rotation.set(0, 0, 0);
          setGameStart(GAME_STATES.FINISHED);
        });
        controls.current.addEventListener('change', e => {
          const x = new Vector3();
          controls.current.getDirection(x);
        });
      }}
    >
      <pointLight
        castShadow
        color={`#fff`}
        position={[0, 4, 10]}
        intensity={2}
      />
      <ambientLight intensity={1} />
      <SphereGrid setScore={setScore} />
      <mesh scale={[20, 10, 18]} position={[0, 4, 0]}>
        <boxGeometry />
        <meshPhysicalMaterial
          metalness={0.7}
          roughness={2}
          color="#fff"
          side={DoubleSide}
        />
      </mesh>
      <PointerLockControls selector="#startButton" ref={controls} />
    </Canvas>
  );
};

export default ThreeCanvas;
