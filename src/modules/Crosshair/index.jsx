// Crosshair drawn as SVG so every option (shape, colour, size, thickness, gap, outline) is exact at
// any size. Used by the HUD and by the previews in the menu.
export const CROSSHAIR_STYLES = [
  { id: 'cross', label: 'Cross' },
  { id: 'crossDot', label: 'Cross with dot' },
  { id: 'dot', label: 'Dot' },
  { id: 'circle', label: 'Circle' },
  { id: 't', label: 'T (no top line)' }
];

const OUTLINE_COLOR = 'rgba(0, 0, 0, 0.85)';

function shapes({ style, size, thickness, gap }) {
  const half = size / 2;
  const lines = [];
  if (style === 'cross' || style === 'crossDot' || style === 't') {
    if (style !== 't') lines.push([0, -gap, 0, -half]);
    lines.push([0, gap, 0, half], [-gap, 0, -half, 0], [gap, 0, half, 0]);
  }
  const dot = style === 'dot' || style === 'crossDot' ? Math.max(1.5, thickness * (style === 'dot' ? 1.4 : 0.9)) : 0;
  const ring = style === 'circle' ? Math.max(2, half - thickness / 2) : 0;
  return { lines, dot, ring };
}

function Layer({ parts, color, thickness }) {
  const { lines, dot, ring } = parts;
  return (
    <g stroke={color} strokeWidth={thickness} fill="none">
      {lines.map(([x1, y1, x2, y2]) => (
        <line key={`${x1},${y1},${x2},${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />
      ))}
      {ring > 0 && <circle r={ring} />}
      {dot > 0 && <circle r={dot} fill={color} stroke="none" />}
    </g>
  );
}

export function Crosshair({ style, color, size, thickness, gap, outline, scale = 1, className }) {
  const parts = shapes({ style, size, thickness, gap });
  // Room for the outline and the dot on every side.
  const extent = size / 2 + thickness + 2;
  const outlined = { ...parts, dot: parts.dot > 0 ? parts.dot + 1 : 0 };
  return (
    <svg
      className={className}
      width={extent * 2 * scale}
      height={extent * 2 * scale}
      viewBox={`${-extent} ${-extent} ${extent * 2} ${extent * 2}`}
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      {outline && <Layer parts={outlined} color={OUTLINE_COLOR} thickness={thickness + 2} />}
      <Layer parts={parts} color={color} thickness={thickness} />
    </svg>
  );
}
