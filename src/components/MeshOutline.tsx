import { useMemo } from 'react';
import type { BufferGeometry } from 'three';
import { BackSide } from 'three';

/**
 * Props for the MeshOutline component.
 */
export interface MeshOutlineProps {
  /** The geometry to outline */
  geometry: BufferGeometry;
  /** Color of the outline @default '#ff6b00' */
  color?: string;
  /** Thickness of the outline (scale multiplier) @default 0.03 */
  thickness?: number;
  /** Whether the outline is visible @default true */
  visible?: boolean;
}

/**
 * Renders an outline effect around a mesh using the inverted hull technique.
 *
 * Creates a slightly larger copy of the mesh rendered with backside-only
 * rendering, producing a silhouette outline effect.
 *
 * @example
 * ```tsx
 * <MeshOutline
 *   geometry={geometry}
 *   color="#ff6b00"
 *   thickness={0.03}
 * />
 * ```
 */
export function MeshOutline({
  geometry,
  color = '#ff6b00',
  thickness = 0.03,
  visible = true,
}: MeshOutlineProps) {
  // Calculate scale based on thickness
  const scale = useMemo(() => {
    return 1 + thickness;
  }, [thickness]);

  if (!visible) return null;

  return (
    <mesh geometry={geometry} scale={[scale, scale, scale]}>
      <meshBasicMaterial
        color={color}
        side={BackSide}
        transparent
        opacity={1}
        depthWrite={false}
      />
    </mesh>
  );
}
