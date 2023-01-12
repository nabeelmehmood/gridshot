import { forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';

let pastCamera = [0, 0, 0];

const CameraControls = forwardRef((props, controlsRef) => {
  const speed = 1 + props.sensitivity * 0.1;
  useFrame(() => {
    controlsRef.current.camera.fov = props.fov;
    controlsRef.current.camera.updateProjectionMatrix();

    if (
      controlsRef.current.camera.rotation.x === 0 &&
      controlsRef.current.camera.rotation.y === 0 &&
      controlsRef.current.camera.rotation.z === 0
    ) {
      pastCamera = [0, 0, 0];
    } else {
      const diff = {
        x: pastCamera[0] - controlsRef.current.camera.rotation.x,
        y: pastCamera[1] - controlsRef.current.camera.rotation.y,
        z: pastCamera[2] - controlsRef.current.camera.rotation.z
      };
      const newAngles = [
        controlsRef.current.camera.rotation.x - diff.x * speed,
        controlsRef.current.camera.rotation.y - diff.y * speed,
        controlsRef.current.camera.rotation.z - diff.z * speed
      ];

      controlsRef.current.camera.rotation.set(
        newAngles[0],
        newAngles[1],
        newAngles[2]
      );

      pastCamera[0] = controlsRef.current.camera.rotation.x;
      pastCamera[1] = controlsRef.current.camera.rotation.y;
      pastCamera[2] = controlsRef.current.camera.rotation.z;
    }
  });

  return <PointerLockControls selector="#startButton" ref={controlsRef} />;
});

export default CameraControls;
