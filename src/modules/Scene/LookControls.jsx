import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// PointerLockControls turns `movement × 0.002 × pointerSpeed` into radians.
const THREE_RADIANS_PER_UNIT = 0.002;

// Camera poses: the game view looks straight at the grid; the menu view is pulled back and drifts.
const GAME_POSITION = new Vector3(0, 4, 5);
const GAME_QUATERNION = new Quaternion();
const MENU_POSITION = new Vector3(0, 5.5, 13.5);
const MENU_TARGET = new Vector3(0, 4, -8);
const ENTER_SECONDS = 0.75;
const LEAVE_SECONDS = 0.9;

const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const _matrix = new Matrix4();
const _up = new Vector3(0, 1, 0);
const _targetPosition = new Vector3();
const _targetQuaternion = new Quaternion();

const easeInOut = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

function menuPose(time, position, quaternion) {
  position.copy(MENU_POSITION);
  position.x += Math.sin(time * 0.15) * 1.2;
  position.y += Math.sin(time * 0.23) * 0.3;
  quaternion.setFromRotationMatrix(_matrix.lookAt(position, MENU_TARGET, _up));
}

// Sensitivity 1 = desktop-matched: one pixel of mouse movement turns the view so the point under the
// crosshair moves one pixel on screen, just as the desktop cursor would. That depends on the
// vertical FOV and the canvas height, so the feel stays the same when either changes.
function pointerSpeedFor(sensitivity, fov, height) {
  const radiansPerPixel = (2 * Math.tan((fov * Math.PI) / 360)) / Math.max(height, 1);
  return (sensitivity * radiansPerPixel) / THREE_RADIANS_PER_UNIT;
}

// Owns the camera: the menu drift, the glide into the game once the pointer locks (the run starts
// only when the camera arrives), and the glide back out when it unlocks.
export default function LookControls({ controlsRef, sensitivity, fov, onEnterStart, onEntered, onLeave, onLockError }) {
  const get = useThree(state => state.get);
  const height = useThree(state => state.size.height);
  // Lets a rebuilt controls object start at the current speed without rebuilding on every change,
  // which would drop the pointer lock mid-run (e.g. on a window resize).
  const pointerSpeed = useRef(1);
  const transition = useRef({ mode: 'menu', t: 0, fromPosition: new Vector3(), fromQuaternion: new Quaternion() });
  const entered = useRef(onEntered);

  useEffect(() => {
    entered.current = onEntered;
  }, [onEntered]);

  useEffect(() => {
    const { camera, gl } = get();
    const controls = new PointerLockControls(camera, gl.domElement);
    controls.pointerSpeed = pointerSpeed.current;
    controls.enabled = transition.current.mode === 'game';

    const begin = mode => {
      transition.current = {
        mode,
        t: 0,
        fromPosition: camera.position.clone(),
        fromQuaternion: camera.quaternion.clone()
      };
    };

    const handleLock = () => {
      onEnterStart();
      if (reducedMotion) {
        camera.position.copy(GAME_POSITION);
        camera.quaternion.copy(GAME_QUATERNION);
        transition.current.mode = 'game';
        controls.enabled = true;
        entered.current();
        return;
      }
      // Mouse look stays off until the camera has arrived.
      controls.enabled = false;
      begin('entering');
    };
    const handleUnlock = () => {
      controls.enabled = false;
      onLeave();
      begin('leaving');
    };

    controls.addEventListener('lock', handleLock);
    controls.addEventListener('unlock', handleUnlock);
    document.addEventListener('pointerlockerror', onLockError);
    controlsRef.current = controls;

    return () => {
      controls.removeEventListener('lock', handleLock);
      controls.removeEventListener('unlock', handleUnlock);
      document.removeEventListener('pointerlockerror', onLockError);
      controls.dispose();
      controlsRef.current = null;
    };
  }, [get, controlsRef, onEnterStart, onLeave, onLockError]);

  useFrame((state, delta) => {
    const current = transition.current;
    const { camera, clock } = state;
    if (current.mode === 'game') return;

    if (current.mode === 'menu') {
      menuPose(clock.elapsedTime, camera.position, camera.quaternion);
      return;
    }

    const entering = current.mode === 'entering';
    current.t = Math.min(1, current.t + delta / (entering ? ENTER_SECONDS : LEAVE_SECONDS));
    if (entering) {
      _targetPosition.copy(GAME_POSITION);
      _targetQuaternion.copy(GAME_QUATERNION);
    } else {
      menuPose(clock.elapsedTime, _targetPosition, _targetQuaternion);
    }
    const eased = easeInOut(current.t);
    camera.position.lerpVectors(current.fromPosition, _targetPosition, eased);
    camera.quaternion.slerpQuaternions(current.fromQuaternion, _targetQuaternion, eased);

    if (current.t >= 1) {
      current.mode = entering ? 'game' : 'menu';
      if (entering) {
        if (controlsRef.current) controlsRef.current.enabled = true;
        entered.current();
      }
    }
  });

  useEffect(() => {
    pointerSpeed.current = pointerSpeedFor(sensitivity, fov, height);
    if (controlsRef.current) controlsRef.current.pointerSpeed = pointerSpeed.current;
  }, [controlsRef, sensitivity, fov, height]);

  useEffect(() => {
    const { camera } = get();
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }, [get, fov]);

  return null;
}
