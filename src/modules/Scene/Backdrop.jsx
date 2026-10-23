import {
  cloudPaperTexture,
  ginghamTexture,
  hexPanelTexture,
  pixelBoardTexture,
  scanlineTexture,
  steelTexture,
  tileTexture,
  woodBoardTexture
} from './textures';

// The calm board behind the target grid that keeps targets readable in every theme. It covers the
// grid (x ±9, y 1..7, radius ≤ 1) with margin, just behind the target plane at z = -8.
const WIDTH = 21.2;
const HEIGHT = 8.8;
const CENTER_Y = 4;
const Z = -8.95;
const FRAME = 0.3;

// Repeats are tuned to the board's 21.2 × 8.8 size so features keep a natural scale.
const TEXTURES = {
  wood: () => woodBoardTexture([3, 2]),
  cloudPaper: () => cloudPaperTexture([1, 1]),
  gingham: () => ginghamTexture([12, 5]),
  tiles: () => tileTexture('board', '#d7eef8', '#a9d0e2', [12, 5]),
  hex: () => hexPanelTexture([7, 3]),
  scanlines: () => scanlineTexture([2, 1]),
  steel: () => steelTexture([3, 1.25]),
  pixelBoard: () => pixelBoardTexture([21.2, 8.8])
};

export default function Backdrop({ texture, color = '#ffffff', frame, opacity = 1, glowFrame = false }) {
  const map = texture ? TEXTURES[texture]() : null;
  const frameMaterial = glowFrame ? (
    <meshBasicMaterial color={frame} toneMapped={false} />
  ) : (
    <meshStandardMaterial color={frame} roughness={0.6} />
  );
  const bars = [
    [0, HEIGHT / 2 + FRAME / 2, WIDTH + FRAME * 2, FRAME],
    [0, -HEIGHT / 2 - FRAME / 2, WIDTH + FRAME * 2, FRAME],
    [-WIDTH / 2 - FRAME / 2, 0, FRAME, HEIGHT],
    [WIDTH / 2 + FRAME / 2, 0, FRAME, HEIGHT]
  ];

  return (
    <group position={[0, CENTER_Y, Z]}>
      <mesh receiveShadow>
        <planeGeometry args={[WIDTH, HEIGHT]} />
        {/* Slightly self-lit so the board reads as its own colour whatever the scene lighting. */}
        <meshStandardMaterial
          map={map}
          color={color}
          emissive={color}
          emissiveMap={map}
          emissiveIntensity={0.35}
          roughness={0.9}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
      {bars.map(([x, y, w, h]) => (
        <mesh key={`${x}-${y}`} position={[x, y, 0.05]}>
          <boxGeometry args={[w, h, 0.2]} />
          {frameMaterial}
        </mesh>
      ))}
    </group>
  );
}
