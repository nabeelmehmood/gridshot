import { PointerLockControls, Sky } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { DoubleSide, Vector3 } from "three";
import { useEffect, useRef } from "react";
// import Controls from "../Controls";
import SphereGrid from "../SphereGrid";
import "./index.scss";

const ThreeCanvas = () => {
  const controls = useRef();

  useEffect(() => {}, [controls]);

  return (
    <Canvas
      onCreated={(e) => {
        const cursor = document.querySelector("#cursor");
        const startOverlay = document.querySelector("#startOverlay");
        controls.current.addEventListener("lock", () => {
          document.body.style.cursor = "none";
          cursor.style.display = "initial";
          startOverlay.style.display = "none";
        });
        controls.current.addEventListener("unlock", () => {
          document.body.style.cursor = "initial";
          cursor.style.display = "none";
          startOverlay.style.display = "block";
        });
        controls.current.addEventListener("change", (e) => {
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
      <SphereGrid />
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
