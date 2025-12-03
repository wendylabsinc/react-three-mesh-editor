import { useRef, useState, useCallback, useMemo } from 'react';
import type { Mesh } from 'three';
import { BufferGeometry, Float32BufferAttribute, DoubleSide } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { FaceData, VertexData } from '../types';

/**
 * Props passed to the custom control render function for faces.
 */
export interface FaceControlRenderProps {
  /** The face data */
  face: FaceData;
  /** Array of vertices for position lookup */
  vertices: VertexData[];
  /** Center position of the face */
  center: [number, number, number];
  /** Callback to move face vertices by a delta */
  onMoveByDelta: (delta: [number, number, number]) => void;
  /** Callback to transform vertices (rotation/scale around center) */
  onTransform: (
    rotation: { x: number; y: number; z: number; w: number },
    scale: [number, number, number]
  ) => void;
  /** Callback to capture initial positions before transform */
  onCaptureInitialPositions: () => void;
  /** Callback when drag starts */
  onDragStart?: () => void;
  /** Callback when drag ends */
  onDragEnd?: () => void;
}

/**
 * Props for the FaceHighlight component.
 */
export interface FaceHighlightProps {
  /** The face data to render */
  face: FaceData;
  /** Array of all vertices for position lookup */
  vertices: VertexData[];
  /** Whether this face is selected */
  selected?: boolean;
  /** Color when selected @default '#ff6b00' */
  selectedColor?: string;
  /** Default color when not selected @default '#4a90d9' */
  defaultColor?: string;
  /** Color when hovered @default '#7bb3e0' */
  hoverColor?: string;
  /** Opacity of the face @default 0.3 */
  opacity?: number;
  /** Callback when face is clicked for selection */
  onSelect?: (index: number, addToSelection: boolean) => void;
  /** Callback to move vertices by a delta */
  onMoveVertices?: (vertexIndices: number[], delta: [number, number, number]) => void;
  /** Callback to apply rotation/scale transformation */
  onTransformVertices?: (
    vertexIndices: number[],
    center: [number, number, number],
    rotation: { x: number; y: number; z: number; w: number },
    scale: [number, number, number]
  ) => void;
  /** Callback to capture initial positions before transform */
  onCaptureInitialPositions?: (vertexIndices: number[]) => void;
  /**
   * Render function for custom transform controls.
   * When provided, renders custom controls for the selected face.
   */
  renderControl?: (props: FaceControlRenderProps) => React.ReactNode;
}

/**
 * Interactive face highlight component.
 *
 * Renders a semi-transparent triangle for a face that can be selected.
 * Use the `renderControl` prop to provide custom transform controls.
 *
 * @example
 * ```tsx
 * <FaceHighlight
 *   face={face}
 *   vertices={vertices}
 *   selected={isSelected}
 *   onSelect={handleSelect}
 *   onMoveVertices={handleMove}
 *   renderControl={({ center, onMoveByDelta, onTransform }) => (
 *     <PivotControls
 *       anchor={[0, 0, 0]}
 *       position={center}
 *       onDrag={(matrix) => { ... }}
 *     />
 *   )}
 * />
 * ```
 */
export function FaceHighlight({
  face,
  vertices,
  selected = false,
  selectedColor = '#ff6b00',
  defaultColor = '#4a90d9',
  hoverColor = '#7bb3e0',
  opacity = 0.3,
  onSelect,
  onMoveVertices,
  onTransformVertices,
  onCaptureInitialPositions,
  renderControl,
}: FaceHighlightProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const geometry = useMemo(() => {
    const v1 = vertices[face.vertexIndices[0]];
    const v2 = vertices[face.vertexIndices[1]];
    const v3 = vertices[face.vertexIndices[2]];

    if (!v1 || !v2 || !v3) return null;

    const geo = new BufferGeometry();
    const positions = new Float32Array([
      ...v1.position,
      ...v2.position,
      ...v3.position,
    ]);
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();

    return geo;
  }, [face.vertexIndices, vertices]);

  const faceCenter = useMemo((): [number, number, number] => {
    const v1 = vertices[face.vertexIndices[0]];
    const v2 = vertices[face.vertexIndices[1]];
    const v3 = vertices[face.vertexIndices[2]];

    if (!v1 || !v2 || !v3) return [0, 0, 0];

    return [
      (v1.position[0] + v2.position[0] + v3.position[0]) / 3,
      (v1.position[1] + v2.position[1] + v3.position[1]) / 3,
      (v1.position[2] + v2.position[2] + v3.position[2]) / 3,
    ];
  }, [face.vertexIndices, vertices]);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (isDragging) return;
      event.stopPropagation();
      onSelect?.(face.index, event.shiftKey);
    },
    [face.index, onSelect, isDragging]
  );

  const handlePointerOver = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    setHovered(true);
  }, []);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
  }, []);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(() => {
    setTimeout(() => {
      setIsDragging(false);
    }, 100);
  }, []);

  const handleMoveByDelta = useCallback(
    (delta: [number, number, number]) => {
      onMoveVertices?.(face.vertexIndices as unknown as number[], delta);
    },
    [face.vertexIndices, onMoveVertices]
  );

  const handleTransform = useCallback(
    (
      rotation: { x: number; y: number; z: number; w: number },
      scale: [number, number, number]
    ) => {
      onTransformVertices?.(
        face.vertexIndices as unknown as number[],
        faceCenter,
        rotation,
        scale
      );
    },
    [face.vertexIndices, faceCenter, onTransformVertices]
  );

  const handleCaptureInitialPositions = useCallback(() => {
    onCaptureInitialPositions?.(face.vertexIndices as unknown as number[]);
  }, [face.vertexIndices, onCaptureInitialPositions]);

  const color = selected ? selectedColor : hovered ? hoverColor : defaultColor;

  if (!geometry) return null;

  const meshElement = (
    <mesh
      ref={meshRef}
      geometry={geometry}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <meshStandardMaterial
        color={color}
        transparent
        opacity={selected ? opacity * 1.5 : hovered ? opacity * 1.2 : opacity}
        side={DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );

  // If selected and renderControl is provided, render with custom control
  if (selected && renderControl) {
    return (
      <group>
        {meshElement}
        {renderControl({
          face,
          vertices,
          center: faceCenter,
          onMoveByDelta: handleMoveByDelta,
          onTransform: handleTransform,
          onCaptureInitialPositions: handleCaptureInitialPositions,
          onDragStart: handleDragStart,
          onDragEnd: handleDragEnd,
        })}
      </group>
    );
  }

  return meshElement;
}
