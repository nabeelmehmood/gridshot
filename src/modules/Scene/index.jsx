import { useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Raycaster, Vector2, Vector3 } from 'three';
import { MODES } from '../../game/modes';
import { PHASES } from '../../game/state';
import { playShot } from '../../sound';
import { THEMES } from '../../themes';
import { useGame } from '../Context';
import Backdrop from './Backdrop';
import { Ambient, Effects } from './Effects';
import { ENVIRONMENTS } from './environments';
import LookControls from './LookControls';
import Targets from './Targets';

const SCREEN_CENTER = new Vector2(0, 0);
// Misses further than this (sky, distant scenery) get a puff on the target plane, not a mark.
const MAX_MARK_DISTANCE = 40;
const TARGET_PLANE_Z = -8;

// Shots are raycast from the crosshair on mousedown, which is how aim trainers register clicks.
// The sound plays here rather than after the state update so it lands on the same frame as the click.
function Shooter({ targetsRef, environmentRef, effectsRef, onShot, volume, theme, radius, effects, running }) {
  const camera = useThree(state => state.camera);
  const domElement = useThree(state => state.gl.domElement);

  useEffect(() => {
    const raycaster = new Raycaster();
    const worldPosition = new Vector3();
    const normal = new Vector3();

    const showMiss = () => {
      const [surface] = raycaster
        .intersectObject(environmentRef.current, true)
        .filter(hit => hit.object.isMesh && hit.face && hit.distance < MAX_MARK_DISTANCE);
      if (surface) {
        normal.copy(surface.face.normal).transformDirection(surface.object.matrixWorld);
        if (normal.dot(raycaster.ray.direction) > 0) normal.negate();
        effectsRef.current.miss(surface.point, normal, theme.missColor);
        return;
      }
      const t = (TARGET_PLANE_Z - raycaster.ray.origin.z) / raycaster.ray.direction.z;
      if (t > 0) effectsRef.current.miss(raycaster.ray.at(t, worldPosition), null, theme.missColor);
    };

    const handleMouseDown = event => {
      // Clicks during the camera glide in (locked, run not started yet) do nothing.
      if (!running || event.button !== 0 || document.pointerLockElement !== domElement || !targetsRef.current) return;
      raycaster.setFromCamera(SCREEN_CENTER, camera);
      // Recursive: each target is a group (shape, outline, halo); only the shape carries targetKey.
      const hit = raycaster
        .intersectObjects(targetsRef.current.children, true)
        .find(intersection => intersection.object.userData.targetKey !== undefined);
      playShot(Boolean(hit), volume);
      if (effects && effectsRef.current) {
        if (hit) {
          effectsRef.current.hit(hit.object.getWorldPosition(worldPosition), theme.targetColor, radius, camera.position);
        } else if (environmentRef.current) {
          showMiss();
        }
      }
      onShot(hit ? hit.object.userData.targetKey : null);
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [camera, domElement, effects, effectsRef, environmentRef, onShot, radius, running, targetsRef, theme, volume]);

  return null;
}

export default function Scene() {
  const { game, settings, controlsRef, beginEntering, enterGame, leaveGame, shoot, expire, reportLockError } = useGame();
  const targetsRef = useRef(null);
  const environmentRef = useRef(null);
  const effectsRef = useRef(null);
  const theme = THEMES[settings.theme];
  const Environment = ENVIRONMENTS[settings.theme];

  return (
    <Canvas shadows camera={{ position: [0, 4, 5], fov: settings.fov }} style={{ position: 'fixed', inset: 0 }}>
      <group ref={environmentRef}>
        <Environment key={settings.theme} />
        {theme.backdrop && <Backdrop {...theme.backdrop} />}
      </group>
      <Targets
        ref={targetsRef}
        mode={game.mode}
        targets={game.targets}
        running={game.phase === PHASES.RUNNING}
        onExpire={expire}
        color={theme.targetColor}
        outline={theme.outline}
        style={theme.targetStyle}
        halo={settings.effects && Boolean(theme.halo)}
        haloColor={theme.haloColor}
      />
      {settings.effects && theme.ambient && <Ambient key={theme.ambient} preset={theme.ambient} />}
      <Effects ref={effectsRef} />
      <LookControls
        controlsRef={controlsRef}
        sensitivity={settings.sensitivity}
        fov={settings.fov}
        onEnterStart={beginEntering}
        onEntered={enterGame}
        onLeave={leaveGame}
        onLockError={reportLockError}
      />
      <Shooter
        targetsRef={targetsRef}
        environmentRef={environmentRef}
        effectsRef={effectsRef}
        onShot={shoot}
        volume={settings.volume}
        theme={theme}
        radius={MODES[game.mode].radius}
        effects={settings.effects}
        running={game.phase === PHASES.RUNNING}
      />
    </Canvas>
  );
}
