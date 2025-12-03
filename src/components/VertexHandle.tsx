import { useRef, useState, useCallback } from 'react';
import type { Mesh } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { VertexData } from '../types';

/**
 * Props passed to the custom control render function for vertices.
 */
export interface VertexControlRenderProps {
  /** The vertex data */
  vertex: VertexData;
  /** Callback when vertex position changes (absolute position) */
  onMove: (position: [number, number, number]) => void;
  /** Callback when drag starts */
  onDragStart?: () => void;
  /** Callback when drag ends */
  onDragEnd?: () => void;
}

/**
 * Props for the VertexHandle component.
 */
export interface VertexHandleProps {
  /** The vertex data to render */
  vertex: VertexData;
  /** Size of the vertex cube in world units @default 0.05 */
  size?: number;
  /** Whether this vertex is selected */
  selected?: boolean;
  /** Color when selected @default '#ff6b00' */
  selectedColor?: string;
  /** Default color when not selected @default '#4a90d9' */
  defaultColor?: string;
  /** Color when hovered @default '#7bb3e0' */
  hoverColor?: string;
  /** Callback when vertex is clicked for selection */
  onSelect?: (index: number, addToSelection: boolean) => void;
  /** Callback when vertex position changes (absolute position) */
  onMove?: (index: number, position: [number, number, number]) => void;
  /**
   * Render function for custom transform controls.
   * When provided, wraps the vertex handle with custom controls.
   * For vertices, only translation makes sense (no rotation/scale).
   */
  renderControl?: (props: VertexControlRenderProps) => React.ReactNode;
}

/**
 * Interactive vertex handle component.
 *
 * Renders a cube at the vertex position that can be selected.
 * Use the `renderControl` prop to provide custom transform controls.
 *
 * @example
 * ```tsx
 * // With custom PivotControls
 * <VertexHandle
 *   vertex={vertex}
 *   selected={isSelected}
 *   onSelect={handleSelect}
 *   onMove={handleMove}
 *   renderControl={({ vertex, onMove }) => (
 *     <PivotControls
 *       anchor={[0, 0, 0]}
 *       onDrag={(matrix) => {
 *         const pos = new Vector3().setFromMatrixPosition(matrix);
 *         onMove([pos.x, pos.y, pos.z]);
 *       }}
 *     >
 *       {children}
 *     </PivotControls>
 *   )}
 * />
 * ```
 */
export function VertexHandle({
  vertex,
  size = 0.05,
  selected = false,
  selectedColor = '#ff6b00',
  defaultColor = '#4a90d9',
  hoverColor = '#7bb3e0',
  onSelect,
  onMove,
  renderControl,
}: VertexHandleProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (isDragging) return;
      event.stopPropagation();
      onSelect?.(vertex.index, event.shiftKey);
    },
    [vertex.index, onSelect, isDragging]
  );

  const handlePointerOver = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(true);
  }, []);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
  }, []);

  const handleMove = useCallback(
    (position: [number, number, number]) => {
      onMove?.(vertex.index, position);
    },
    [vertex.index, onMove]
  );

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setTimeout(() => {
      setIsDragging(false);
    }, 100);
  }, []);

  const color = selected ? selectedColor : hovered ? hoverColor : defaultColor;

  const meshElement = (
    <mesh
      ref={meshRef}
      position={vertex.position}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial
        color={color}
        emissive={selected ? selectedColor : undefined}
        emissiveIntensity={selected ? 0.3 : 0}
      />
    </mesh>
  );

  // If selected and renderControl is provided, wrap with custom control
  if (selected && renderControl) {
    return (
      <>
        {renderControl({
          vertex,
          onMove: handleMove,
          onDragStart: handleDragStart,
          onDragEnd: handleDragEnd,
        })}
        {meshElement}
      </>
    );
  }

  return meshElement;
}
