import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

// Sensitivity only changes from the menu (pointer unlocked), so rebuilding the controls then is free.
export default function LookControls({ controlsRef, sensitivity, fov, onLock, onUnlock, onLockError }) {
  const get = useThree(state => state.get);

  useEffect(() => {
    const { camera, gl } = get();
    const controls = new PointerLockControls(camera, gl.domElement);
    controls.pointerSpeed = sensitivity;

    // Every run starts, and every menu shows, facing the grid.
    const handleLock = () => {
      camera.quaternion.identity();
      onLock();
    };
    const handleUnlock = () => {
      camera.quaternion.identity();
      onUnlock();
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
  }, [get, controlsRef, sensitivity, onLock, onUnlock, onLockError]);

  useEffect(() => {
    const { camera } = get();
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }, [get, fov]);

  return null;
}
