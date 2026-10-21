import { useEffect, useImperativeHandle, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { AmbientField } from './ambient';
import { EffectsPool } from './fx';

// Long frames (tab switch, GC) would otherwise fling particles across the scene.
const MAX_DELTA = 0.1;
const pixelHeight = state => state.size.height * state.viewport.dpr;

export function Effects({ ref }) {
  const pool = useMemo(() => new EffectsPool(), []);
  useImperativeHandle(ref, () => pool, [pool]);
  useEffect(() => () => pool.dispose(), [pool]);
  useFrame((state, delta) => pool.update(Math.min(delta, MAX_DELTA), pixelHeight(state)));
  return <primitive object={pool.group} />;
}

export function Ambient({ preset }) {
  const field = useMemo(() => new AmbientField(preset), [preset]);
  useEffect(() => () => field.dispose(), [field]);
  useFrame((state, delta) => field.update(Math.min(delta, MAX_DELTA), pixelHeight(state)));
  return <primitive object={field.object} />;
}
