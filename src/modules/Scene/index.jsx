import { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { BackSide, Raycaster, Vector2 } from 'three';
import { PHASES } from '../../game/state';
import { playShot } from '../../sound';
import { useGame } from '../Context';
import LookControls from './LookControls';
import Targets from './Targets';

const SCREEN_CENTER = new Vector2(0, 0);

// Shots are raycast from the crosshair on mousedown, which is how aim trainers register clicks.
// The sound plays here rather than after the state update so it lands on the same frame as the click.
function Shooter({ targetsRef, onShot, volume }) {
  const camera = useThree(state => state.camera);
  const domElement = useThree(state => state.gl.domElement);

  useEffect(() => {
    const raycaster = new Raycaster();
    const handleMouseDown = event => {
      if (event.button !== 0 || document.pointerLockElement !== domElement || !targetsRef.current) return;
      raycaster.setFromCamera(SCREEN_CENTER, camera);
      const [hit] = raycaster.intersectObjects(targetsRef.current.children, false);
      playShot(Boolean(hit), volume);
      onShot(hit ? hit.object.userData.targetKey : null);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [camera, domElement, onShot, targetsRef, volume]);

  return null;
}

function Room() {
  return (
    <mesh scale={[20, 10, 18]} position={[0, 4, 0]}>
      <boxGeometry />
      <meshStandardMaterial color="#8a93a6" roughness={0.95} side={BackSide} />
    </mesh>
  );
}

export default function Scene() {
  const { game, settings, controlsRef, startRun, endRun, shoot, expire, reportLockError } = useGame();
  const targetsRef = useRef(null);

  return (
    <Canvas camera={{ position: [0, 4, 5], fov: settings.fov }} style={{ position: 'fixed', inset: 0 }}>
      <color attach="background" args={['#0d1017']} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[2, 6, 8]} intensity={1.8} />
      <Room />
      <Targets
        ref={targetsRef}
        mode={game.mode}
        targets={game.targets}
        running={game.phase === PHASES.RUNNING}
        onExpire={expire}
      />
      <LookControls
        controlsRef={controlsRef}
        sensitivity={settings.sensitivity}
        fov={settings.fov}
        onLock={startRun}
        onUnlock={endRun}
        onLockError={reportLockError}
      />
      <Shooter targetsRef={targetsRef} onShot={shoot} volume={settings.volume} />
    </Canvas>
  );
}
