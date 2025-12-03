import { useRef, useState, useCallback, useMemo, useEffect } from 'react';
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
  // Store cumulative delta applied so far during this drag session
  const appliedDeltaRef = useRef<[number, number, number]>([0, 0, 0]);
  // Store the initial matrix when selection starts - this prevents feedback loop
  const initialMatrixRef = useRef<Matrix4 | null>(null);
  const wasSelectedRef = useRef(false);

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

  // Capture initial position when face becomes selected
  useEffect(() => {
    if (selected && !wasSelectedRef.current) {
      // Just became selected - capture the initial center position
      const matrix = new Matrix4();
      matrix.setPosition(faceCenter[0], faceCenter[1], faceCenter[2]);
      initialMatrixRef.current = matrix;
    }
    if (!selected) {
      // Deselected - clear the matrix
      initialMatrixRef.current = null;
    }
    wasSelectedRef.current = selected;
  }, [selected, faceCenter]);

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
    // Reset the applied delta when starting a new drag
    appliedDeltaRef.current = [0, 0, 0];
  }, []);

  const handleDrag = useCallback(
    (localMatrix: Matrix4) => {
      // localMatrix contains the full current transformation
      // We need to subtract the initial position to get just the delta
      const currentPos = new Vector3();
      currentPos.setFromMatrixPosition(localMatrix);

      const initialPos = new Vector3();
      if (initialMatrixRef.current) {
        initialPos.setFromMatrixPosition(initialMatrixRef.current);
      }

      // Total delta from initial position
      const totalDelta: [number, number, number] = [
        currentPos.x - initialPos.x,
        currentPos.y - initialPos.y,
        currentPos.z - initialPos.z,
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
        onMoveVertices?.(face.vertexIndices as unknown as number[], incrementalDelta);

        // Update the initial matrix to the current position so gizmo follows
        const newMatrix = new Matrix4();
        newMatrix.setPosition(currentPos.x, currentPos.y, currentPos.z);
        initialMatrixRef.current = newMatrix;

        // Reset applied delta since we're resetting the reference point
        appliedDeltaRef.current = [0, 0, 0];
      }
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

  if (selected && onMoveVertices && initialMatrixRef.current) {
    return (
      <group>
        {meshElement}
        <PivotControls
          matrix={initialMatrixRef.current}
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

  return meshElement;
}
