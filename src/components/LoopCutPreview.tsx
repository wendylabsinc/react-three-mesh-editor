import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import type { Line2 } from 'three-stdlib';
import type { LoopCutPath } from '../utils/geometry';

/**
 * Props for the LoopCutPreview component.
 */
export interface LoopCutPreviewProps {
  /** The loop cut path to preview */
  path: LoopCutPath | null;
  /** Color of the preview line @default '#ffff00' */
  color?: string;
  /** Width of the preview line in pixels @default 3 */
  lineWidth?: number;
  /** Dash size @default 0.1 */
  dashSize?: number;
  /** Gap size between dashes @default 0.05 */
  gapSize?: number;
  /** Animation speed (dash offset per second) @default 0.5 */
  animationSpeed?: number;
}

/**
 * Animated preview component for loop cut operations.
 *
 * Displays a dashed line along the loop cut path with animated movement
 * to indicate where the cut will be made.
 *
 * @example
 * ```tsx
 * const path = findLoopCutPath(hoveredEdge, edges, faces, vertices);
 * <LoopCutPreview path={path} color="#ffff00" />
 * ```
 */
export function LoopCutPreview({
  path,
  color = '#ffff00',
  lineWidth = 3,
  dashSize = 0.1,
  gapSize = 0.05,
  animationSpeed = 0.5,
}: LoopCutPreviewProps) {
  const lineRef = useRef<Line2>(null);
  const dashOffsetRef = useRef(0);

  // Convert path points to line points
  const points = useMemo(() => {
    if (!path || path.points.length === 0) return null;

    const linePoints: [number, number, number][] = path.points.map((p) => p.position);

    // If closed loop, add first point again to close the line
    if (path.isClosed && linePoints.length > 0) {
      linePoints.push(linePoints[0]);
    }

    return linePoints;
  }, [path]);

  // Animate the dash offset
  useFrame((_, delta) => {
    if (lineRef.current?.material) {
      dashOffsetRef.current -= delta * animationSpeed;
      // Reset to prevent floating point issues
      if (dashOffsetRef.current < -1000) {
        dashOffsetRef.current = 0;
      }
      // Access the dash offset on the material
      const material = lineRef.current.material as { dashOffset?: number };
      if ('dashOffset' in material) {
        material.dashOffset = dashOffsetRef.current;
      }
    }
  });

  if (!points || points.length < 2) {
    return null;
  }

  return (
    <Line
      ref={lineRef}
      points={points}
      color={color}
      lineWidth={lineWidth}
      dashed
      dashSize={dashSize}
      gapSize={gapSize}
      // Render on top
      depthTest={false}
      renderOrder={999}
    />
  );
}
