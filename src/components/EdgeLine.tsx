import { useState, useCallback, useMemo, useRef } from 'react';
import { Line, PivotControls } from '@react-three/drei';
import { Matrix4, Vector3 } from 'three';
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
}: EdgeLineProps) {
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const lastDeltaRef = useRef<[number, number, number]>([0, 0, 0]);

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
    lastDeltaRef.current = [0, 0, 0];
  }, []);

  const handleDrag = useCallback(
    (matrix: Matrix4) => {
      // Get the current total delta from origin
      const totalDelta = new Vector3();
      totalDelta.setFromMatrixPosition(matrix);

      // Calculate incremental delta since last drag event
      const incrementalDelta: [number, number, number] = [
        totalDelta.x - lastDeltaRef.current[0],
        totalDelta.y - lastDeltaRef.current[1],
        totalDelta.z - lastDeltaRef.current[2],
      ];

      // Update last delta
      lastDeltaRef.current = [totalDelta.x, totalDelta.y, totalDelta.z];

      onMoveVertices?.(edge.vertexIndices as unknown as number[], incrementalDelta);
    },
    [edge.vertexIndices, onMoveVertices]
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

  if (selected && onMoveVertices) {
    return (
      <group>
        {lineElement}
        <PivotControls
          anchor={[0, 0, 0]}
          offset={edgeCenter}
          depthTest={false}
          scale={0.4}
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
