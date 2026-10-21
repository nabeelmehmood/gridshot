import { BackSide } from 'three';

// For scenery that should never take a miss mark (sky, glows, particles).
export const noRaycast = () => {};

export function SkyDome({ texture, radius = 170 }) {
  return (
    <mesh raycast={noRaycast}>
      <sphereGeometry args={[radius, 48, 24]} />
      <meshBasicMaterial map={texture} side={BackSide} fog={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

// Open-fronted box: floor, ceiling, back and side walls. Each face takes its own material element.
// Targets sit on z = -8, so keep `back` at or behind -9.
export function Room({ width = 20, height = 10, floorY = -1, back = -9, front = 9, faces }) {
  const depth = front - back;
  const midZ = (front + back) / 2;
  const midY = floorY + height / 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, floorY, midZ]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        {faces.floor}
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, floorY + height, midZ]}>
        <planeGeometry args={[width, depth]} />
        {faces.ceiling}
      </mesh>
      <mesh position={[0, midY, back]}>
        <planeGeometry args={[width, height]} />
        {faces.back}
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[-width / 2, midY, midZ]}>
        <planeGeometry args={[depth, height]} />
        {faces.left ?? faces.sides}
      </mesh>
      <mesh rotation={[0, -Math.PI / 2, 0]} position={[width / 2, midY, midZ]}>
        <planeGeometry args={[depth, height]} />
        {faces.right ?? faces.sides}
      </mesh>
    </group>
  );
}

export function Tree({ position, scale = 1, trunk = '#7a5233', leaves = ['#3f8f3a', '#4fa845'] }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.35, 3, 8]} />
        <meshStandardMaterial color={trunk} roughness={1} />
      </mesh>
      <mesh position={[0, 3.6, 0]} castShadow>
        <sphereGeometry args={[1.8, 16, 12]} />
        <meshStandardMaterial color={leaves[0]} roughness={1} />
      </mesh>
      <mesh position={[0.9, 3.0, 0.4]} castShadow>
        <sphereGeometry args={[1.2, 16, 12]} />
        <meshStandardMaterial color={leaves[1]} roughness={1} />
      </mesh>
      <mesh position={[-0.8, 3.2, -0.3]} castShadow>
        <sphereGeometry args={[1.3, 16, 12]} />
        <meshStandardMaterial color={leaves[1]} roughness={1} />
      </mesh>
    </group>
  );
}

// A puffy cluster of spheres; `parts` are [x, y, z, radius].
const CLOUD_PARTS = [
  [0, 0, 0, 2.6],
  [2.4, -0.4, 0.3, 2],
  [-2.4, -0.5, 0.2, 1.9],
  [1.1, 1.3, -0.2, 1.8],
  [-1.1, 1.0, 0.1, 1.6],
  [4.0, -0.9, 0, 1.3],
  [-4.0, -1.0, 0, 1.2]
];

export function Cloud({ color = '#ffffff', emissive = '#ffffff', emissiveIntensity = 0.25, children, ...props }) {
  return (
    <group {...props}>
      {CLOUD_PARTS.map(([x, y, z, r]) => (
        <mesh key={`${x}-${y}`} position={[x, y, z]} raycast={noRaycast}>
          <sphereGeometry args={[r, 16, 12]} />
          <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} roughness={1} />
        </mesh>
      ))}
      {children}
    </group>
  );
}
