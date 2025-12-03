import { useRef, useState, useCallback, useMemo } from 'react';
import { PivotControls } from '@react-three/drei';
import type { Mesh } from 'three';
import { BufferGeometry, Float32BufferAttribute, DoubleSide, Matrix4, Vector3 } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { FaceData, VertexData } from '../types';

export interface FaceHighlightProps {
  face: FaceData;
  vertices: VertexData[];
  selected?: boolean;
  selectedColor?: string;
  defaultColor?: string;
  hoverColor?: string;
  opacity?: number;
  onSelect?: (index: number, addToSelection: boolean) => void;
  onMoveVertices?: (vertexIndices: number[], delta: [number, number, number]) => void;
}

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
}: FaceHighlightProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const lastDeltaRef = useRef<[number, number, number]>([0, 0, 0]);

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

      onMoveVertices?.(face.vertexIndices as unknown as number[], incrementalDelta);
    },
    [face.vertexIndices, onMoveVertices]
  );

  const handleDragEnd = useCallback(() => {
    setTimeout(() => {
      setIsDragging(false);
    }, 100);
  }, []);

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

  if (selected && onMoveVertices) {
    return (
      <group>
        {meshElement}
        <PivotControls
          anchor={[0, 0, 0]}
          offset={faceCenter}
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

  return meshElement;
}
