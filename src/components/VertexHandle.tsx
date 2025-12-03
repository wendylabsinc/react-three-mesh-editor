import { useRef, useState, useCallback, useMemo } from 'react';
import { PivotControls } from '@react-three/drei';
import type { Mesh } from 'three';
import { Matrix4, Vector3 } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import type { VertexData } from '../types';

export interface VertexHandleProps {
  vertex: VertexData;
  size?: number;
  selected?: boolean;
  selectedColor?: string;
  defaultColor?: string;
  hoverColor?: string;
  onSelect?: (index: number, addToSelection: boolean) => void;
  onMove?: (index: number, position: [number, number, number]) => void;
  onMoveRealtime?: (index: number, position: [number, number, number]) => void;
}

export function VertexHandle({
  vertex,
  size = 0.05,
  selected = false,
  selectedColor = '#ff6b00',
  defaultColor = '#4a90d9',
  hoverColor = '#7bb3e0',
  onSelect,
  onMove,
  onMoveRealtime,
}: VertexHandleProps) {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const finalPositionRef = useRef<[number, number, number]>([0, 0, 0]);

  // Create a matrix that positions the PivotControls at the vertex position
  const initialMatrix = useMemo(() => {
    const matrix = new Matrix4();
    matrix.setPosition(vertex.position[0], vertex.position[1], vertex.position[2]);
    return matrix;
  }, [vertex.position]);

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

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDrag = useCallback(
    (_localMatrix: Matrix4, _deltaLocalMatrix: Matrix4, worldMatrix: Matrix4) => {
      // worldMatrix gives the absolute world position
      const position = new Vector3();
      position.setFromMatrixPosition(worldMatrix);

      // Store final position for use in onDragEnd
      finalPositionRef.current = [position.x, position.y, position.z];

      // Update geometry in real-time during drag
      onMoveRealtime?.(vertex.index, finalPositionRef.current);
    },
    [vertex.index, onMoveRealtime]
  );

  const handleDragEnd = useCallback(() => {
    // Only update geometry when drag ends
    onMove?.(vertex.index, finalPositionRef.current);
    setTimeout(() => {
      setIsDragging(false);
    }, 100);
  }, [vertex.index, onMove]);

  const color = selected ? selectedColor : hovered ? hoverColor : defaultColor;

  // When selected, use PivotControls with matrix prop for positioning
  if (selected) {
    return (
      <PivotControls
        matrix={initialMatrix}
        anchor={[0, 0, 0]}
        depthTest={false}
        scale={size * 3}
        autoTransform={true}
        onDragStart={handleDragStart}
        onDrag={handleDrag as (matrix: Matrix4, deltaLocalMatrix: Matrix4, world: Matrix4, deltaWorld: Matrix4) => void}
        onDragEnd={handleDragEnd}
      >
        <mesh
          ref={meshRef}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
          <boxGeometry args={[size, size, size]} />
          <meshStandardMaterial
            color={color}
            emissive={selectedColor}
            emissiveIntensity={0.3}
          />
        </mesh>
      </PivotControls>
    );
  }

  return (
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
        emissive={undefined}
        emissiveIntensity={0}
      />
    </mesh>
  );
}
