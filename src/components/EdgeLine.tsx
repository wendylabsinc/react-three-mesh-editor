import { useState, useCallback, useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { EdgeData, VertexData } from '../types';

/**
 * Props passed to the custom control render function for edges.
 */
export interface EdgeControlRenderProps {
  /** The edge data */
  edge: EdgeData;
  /** Array of vertices for position lookup */
  vertices: VertexData[];
  /** Center position of the edge */
  center: [number, number, number];
  /** Callback to move edge vertices by a delta */
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
 * Props for the EdgeLine component.
 */
export interface EdgeLineProps {
  /** The edge data to render */
  edge: EdgeData;
  /** Array of all vertices for position lookup */
  vertices: VertexData[];
  /** Whether this edge is selected */
  selected?: boolean;
  /** Color when selected @default '#ff6b00' */
  selectedColor?: string;
  /** Default color when not selected @default '#ffffff' */
  defaultColor?: string;
  /** Color when hovered @default '#7bb3e0' */
  hoverColor?: string;
  /** Width of the line in pixels @default 2 */
  lineWidth?: number;
  /** Callback when edge is clicked for selection */
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
   * When provided, renders custom controls for the selected edge.
   */
  renderControl?: (props: EdgeControlRenderProps) => React.ReactNode;
}

/**
 * Interactive edge line component.
 *
 * Renders a line between two vertices that can be selected.
 * Use the `renderControl` prop to provide custom transform controls.
 *
 * @example
 * ```tsx
 * <EdgeLine
 *   edge={edge}
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
export function EdgeLine({
  edge,
  vertices,
  selected = false,
  selectedColor = '#ff6b00',
  defaultColor = '#ffffff',
  hoverColor = '#7bb3e0',
  lineWidth = 2,
  onSelect,
  onMoveVertices,
  onTransformVertices,
  onCaptureInitialPositions,
  renderControl,
}: EdgeLineProps) {
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const points = useMemo(() => {
    const v1 = vertices[edge.vertexIndices[0]];
    const v2 = vertices[edge.vertexIndices[1]];
    if (!v1 || !v2) return [];
    return [v1.position, v2.position] as [[number, number, number], [number, number, number]];
  }, [edge.vertexIndices, vertices]);

  const edgeCenter = useMemo((): [number, number, number] => {
    const v1 = vertices[edge.vertexIndices[0]];
    const v2 = vertices[edge.vertexIndices[1]];
    if (!v1 || !v2) return [0, 0, 0];
    return [
      (v1.position[0] + v2.position[0]) / 2,
      (v1.position[1] + v2.position[1]) / 2,
      (v1.position[2] + v2.position[2]) / 2,
    ];
  }, [edge.vertexIndices, vertices]);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (isDragging) return;
      event.stopPropagation();
      onSelect?.(edge.index, event.shiftKey);
    },
    [edge.index, onSelect, isDragging]
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
      onMoveVertices?.(edge.vertexIndices as unknown as number[], delta);
    },
    [edge.vertexIndices, onMoveVertices]
  );

  const handleTransform = useCallback(
    (
      rotation: { x: number; y: number; z: number; w: number },
      scale: [number, number, number]
    ) => {
      onTransformVertices?.(
        edge.vertexIndices as unknown as number[],
        edgeCenter,
        rotation,
        scale
      );
    },
    [edge.vertexIndices, edgeCenter, onTransformVertices]
  );

  const handleCaptureInitialPositions = useCallback(() => {
    onCaptureInitialPositions?.(edge.vertexIndices as unknown as number[]);
  }, [edge.vertexIndices, onCaptureInitialPositions]);

  const color = selected ? selectedColor : hovered ? hoverColor : defaultColor;

  if (points.length < 2) return null;

  const lineElement = (
    <Line
      points={points}
      color={color}
      lineWidth={selected ? lineWidth * 1.5 : lineWidth}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    />
  );

  // If selected and renderControl is provided, render with custom control
  if (selected && renderControl) {
    return (
      <group>
        {lineElement}
        {renderControl({
          edge,
          vertices,
          center: edgeCenter,
          onMoveByDelta: handleMoveByDelta,
          onTransform: handleTransform,
          onCaptureInitialPositions: handleCaptureInitialPositions,
          onDragStart: handleDragStart,
          onDragEnd: handleDragEnd,
        })}
      </group>
    );
  }

  return lineElement;
}
