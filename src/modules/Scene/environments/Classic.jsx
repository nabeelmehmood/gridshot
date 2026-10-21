import { BackSide } from 'three';

export default function Classic() {
  return (
    <>
      <color attach="background" args={['#0d1017']} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[2, 6, 8]} intensity={1.8} />
      <mesh scale={[20, 10, 18]} position={[0, 4, 0]}>
        <boxGeometry />
        <meshStandardMaterial color="#8a93a6" roughness={0.95} side={BackSide} />
      </mesh>
    </>
  );
}
