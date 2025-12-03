import { useState, useCallback, useMemo, useRef } from 'react';
import { Line, PivotControls } from '@react-three/drei';
import { Matrix4, Vector3, Quaternion } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { EdgeData, VertexData } from '../types';

export interface EdgeLineProps {
  edge: EdgeData;
  vertices: VertexData[];
  selected?: boolean;
  selectedColor?: string;
  defaultColor?: string;
  hoverColor?: string;
  lineWidth?: number;
  onSelect?: (index: number, addToSelection: boolean) => void;
  onMoveVertices?: (vertexIndices: number[], delta: [number, number, number]) => void;
  onTransformVertices?: (
    vertexIndices: number[],
    center: [number, number, number],
    rotation: { x: number; y: number; z: number; w: number },
    scale: [number, number, number]
  ) => void;
  onCaptureInitialPositions?: (vertexIndices: number[]) => void;
}

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
}: EdgeLineProps) {
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  // Store cumulative delta applied so far during this drag session
  const appliedDeltaRef = useRef<[number, number, number]>([0, 0, 0]);
  // Store initial vertex positions for rotation/scale operations
  const initialVertexPositionsRef = useRef<Map<number, [number, number, number]>>(new Map());
  // Track previous selected state to detect selection changes
  const prevSelectedRef = useRef(selected);

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

  // Use state for initialMatrix so it triggers immediate re-render
  const [initialMatrix, setInitialMatrix] = useState<Matrix4 | null>(null);
  // Keep a ref in sync for use in callbacks
  const initialMatrixRef = useRef<Matrix4 | null>(null);

  // Synchronously update matrix when selection changes
  if (selected && !prevSelectedRef.current) {
    // Just became selected - capture the initial center position immediately
    const matrix = new Matrix4();
    matrix.setPosition(edgeCenter[0], edgeCenter[1], edgeCenter[2]);
    initialMatrixRef.current = matrix;
    setInitialMatrix(matrix);
  } else if (!selected && prevSelectedRef.current) {
    // Just became deselected
    initialMatrixRef.current = null;
    setInitialMatrix(null);
  }
  prevSelectedRef.current = selected;

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
    // Reset the applied delta when starting a new drag
    appliedDeltaRef.current = [0, 0, 0];

    // Capture initial vertex positions for rotation/scale operations
    initialVertexPositionsRef.current.clear();
    for (const idx of edge.vertexIndices) {
      const v = vertices[idx];
      if (v) {
        initialVertexPositionsRef.current.set(idx, [...v.position]);
      }
    }

    // Also capture in the hook for geometry transformations
    onCaptureInitialPositions?.(edge.vertexIndices as unknown as number[]);
  }, [edge.vertexIndices, vertices, onCaptureInitialPositions]);

  const handleDrag = useCallback(
    (localMatrix: Matrix4) => {
      // Extract position, rotation, and scale from the matrix
      const position = new Vector3();
      const quaternion = new Quaternion();
      const scale = new Vector3();
      localMatrix.decompose(position, quaternion, scale);

      const initialPos = new Vector3();
      if (initialMatrixRef.current) {
        initialPos.setFromMatrixPosition(initialMatrixRef.current);
      }

      // Check if there's rotation or non-uniform scale
      const hasRotation = Math.abs(quaternion.x) > 0.0001 ||
                          Math.abs(quaternion.y) > 0.0001 ||
                          Math.abs(quaternion.z) > 0.0001 ||
                          Math.abs(quaternion.w - 1) > 0.0001;
      const hasScale = Math.abs(scale.x - 1) > 0.0001 ||
                       Math.abs(scale.y - 1) > 0.0001 ||
                       Math.abs(scale.z - 1) > 0.0001;

      if ((hasRotation || hasScale) && onTransformVertices) {
        // Apply rotation/scale transformation around the center
        onTransformVertices(
          edge.vertexIndices as unknown as number[],
          [initialPos.x, initialPos.y, initialPos.z],
          { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
          [scale.x, scale.y, scale.z]
        );
      } else if (onMoveVertices) {
        // Handle translation only
        const totalDelta: [number, number, number] = [
          position.x - initialPos.x,
          position.y - initialPos.y,
          position.z - initialPos.z,
        ];

        // Calculate incremental delta (what we need to apply this frame)
        const incrementalDelta: [number, number, number] = [
          totalDelta[0] - appliedDeltaRef.current[0],
          totalDelta[1] - appliedDeltaRef.current[1],
          totalDelta[2] - appliedDeltaRef.current[2],
        ];

        // Update what we've applied
        appliedDeltaRef.current = totalDelta;

        // Only apply if there's actual movement
        if (Math.abs(incrementalDelta[0]) > 0.0001 || Math.abs(incrementalDelta[1]) > 0.0001 || Math.abs(incrementalDelta[2]) > 0.0001) {
          onMoveVertices(edge.vertexIndices as unknown as number[], incrementalDelta);

          // Update the initial matrix to the current position so gizmo follows
          const newMatrix = new Matrix4();
          newMatrix.setPosition(position.x, position.y, position.z);
          initialMatrixRef.current = newMatrix;
          setInitialMatrix(newMatrix);

          // Reset applied delta since we're resetting the reference point
          appliedDeltaRef.current = [0, 0, 0];
        }
      }
    },
    [edge.vertexIndices, onMoveVertices, onTransformVertices]
  );

  const handleDragEnd = useCallback(() => {
    setTimeout(() => {
      setIsDragging(false);
    }, 100);
  }, []);

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

  if (selected && onMoveVertices && initialMatrix) {
    return (
      <group>
        {lineElement}
        <PivotControls
          matrix={initialMatrix}
          anchor={[0, 0, 0]}
          depthTest={false}
          scale={0.3}
          autoTransform={false}
          onDragStart={handleDragStart}
          onDrag={handleDrag as (matrix: Matrix4, deltaLocalMatrix: Matrix4, world: Matrix4, deltaWorld: Matrix4) => void}
          onDragEnd={handleDragEnd}
        >
          <mesh visible={false}>
            <sphereGeometry args={[0.01]} />
          </mesh>
        </PivotControls>
      </group>
    );
  }

  return lineElement;
}
