# Custom Controls Guide

This guide explains how to use the "Bring Your Own Controls" (BYOC) pattern to integrate custom transform controls with `@wendylabsinc/react-three-mesh-editor`.

## Overview

The MeshEditor component uses render props to allow you to provide your own transform controls. This gives you full flexibility to:

- Use any transform control library (PivotControls, TransformControls, etc.)
- Implement custom controls (keyboard-based, slider-based, etc.)
- Skip controls entirely for selection-only behavior

## Render Props

MeshEditor provides three render props for custom controls:

| Prop | Mode | Description |
|------|------|-------------|
| `renderVertexControl` | Vertex | Called for each selected vertex |
| `renderEdgeControl` | Edge | Called for each selected edge |
| `renderFaceControl` | Face | Called for each selected face |

## Vertex Controls

For vertices, only **translation** makes sense. A single point cannot be rotated or scaled.

### VertexControlRenderProps

```typescript
interface VertexControlRenderProps {
  /** The vertex data */
  vertex: VertexData;
  /** Callback when vertex position changes (absolute position) */
  onMove: (position: [number, number, number]) => void;
  /** Callback when drag starts */
  onDragStart?: () => void;
  /** Callback when drag ends */
  onDragEnd?: () => void;
}
```

### Example: Vertex with PivotControls

```tsx
import { useRef } from 'react';
import { PivotControls } from '@react-three/drei';
import { Matrix4, Vector3 } from 'three';
import { MeshEditor } from '@wendylabsinc/react-three-mesh-editor';
import type { VertexControlRenderProps } from '@wendylabsinc/react-three-mesh-editor';

function VertexPivotControl({ vertex, onMove }: VertexControlRenderProps) {
  const matrixRef = useRef(new Matrix4());

  // Update matrix to vertex position
  matrixRef.current.setPosition(
    vertex.position[0],
    vertex.position[1],
    vertex.position[2]
  );

  return (
    <PivotControls
      matrix={matrixRef.current}
      anchor={[0, 0, 0]}
      depthTest={false}
      scale={0.4}
      autoTransform={false}
      disableRotations  // No rotation for single vertices
      disableScaling    // No scaling for single vertices
      onDrag={(matrix) => {
        const position = new Vector3();
        position.setFromMatrixPosition(matrix);
        onMove([position.x, position.y, position.z]);
      }}
    >
      <mesh visible={false}>
        <sphereGeometry args={[0.01]} />
      </mesh>
    </PivotControls>
  );
}

// Usage
<MeshEditor
  geometry={geometry}
  mode="edit"
  editMode="vertex"
  renderVertexControl={(props) => <VertexPivotControl {...props} />}
/>
```

## Edge & Face Controls

Edges and faces support **translation, rotation, and scale** since they involve multiple vertices that can be transformed relative to their center.

### EdgeControlRenderProps / FaceControlRenderProps

```typescript
interface EdgeControlRenderProps {
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

// FaceControlRenderProps is similar, with 'face' instead of 'edge'
```

### Example: Edge/Face with PivotControls

```tsx
import { useRef, useCallback, useMemo } from 'react';
import { PivotControls } from '@react-three/drei';
import { Matrix4, Vector3, Quaternion } from 'three';
import type { EdgeControlRenderProps, FaceControlRenderProps } from '@wendylabsinc/react-three-mesh-editor';

function TransformPivotControl({
  center,
  onMoveByDelta,
  onTransform,
  onCaptureInitialPositions,
}: EdgeControlRenderProps | FaceControlRenderProps) {
  const initialMatrixRef = useRef<Matrix4 | null>(null);
  const appliedDeltaRef = useRef<[number, number, number]>([0, 0, 0]);

  // Create matrix at center position
  const matrix = useMemo(() => {
    const m = new Matrix4();
    m.setPosition(center[0], center[1], center[2]);
    return m;
  }, [center]);

  const handleDragStart = useCallback(() => {
    initialMatrixRef.current = matrix.clone();
    appliedDeltaRef.current = [0, 0, 0];
    onCaptureInitialPositions();
  }, [matrix, onCaptureInitialPositions]);

  const handleDrag = useCallback(
    (localMatrix: Matrix4) => {
      const position = new Vector3();
      const quaternion = new Quaternion();
      const scale = new Vector3();
      localMatrix.decompose(position, quaternion, scale);

      const initialPos = new Vector3();
      if (initialMatrixRef.current) {
        initialPos.setFromMatrixPosition(initialMatrixRef.current);
      }

      // Check if there's rotation or scale
      const hasRotation =
        Math.abs(quaternion.x) > 0.0001 ||
        Math.abs(quaternion.y) > 0.0001 ||
        Math.abs(quaternion.z) > 0.0001 ||
        Math.abs(quaternion.w - 1) > 0.0001;
      const hasScale =
        Math.abs(scale.x - 1) > 0.0001 ||
        Math.abs(scale.y - 1) > 0.0001 ||
        Math.abs(scale.z - 1) > 0.0001;

      if (hasRotation || hasScale) {
        // Apply rotation/scale transformation
        onTransform(
          { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
          [scale.x, scale.y, scale.z]
        );
      } else {
        // Apply incremental translation
        const totalDelta: [number, number, number] = [
          position.x - initialPos.x,
          position.y - initialPos.y,
          position.z - initialPos.z,
        ];

        const incrementalDelta: [number, number, number] = [
          totalDelta[0] - appliedDeltaRef.current[0],
          totalDelta[1] - appliedDeltaRef.current[1],
          totalDelta[2] - appliedDeltaRef.current[2],
        ];

        appliedDeltaRef.current = totalDelta;

        if (
          Math.abs(incrementalDelta[0]) > 0.0001 ||
          Math.abs(incrementalDelta[1]) > 0.0001 ||
          Math.abs(incrementalDelta[2]) > 0.0001
        ) {
          onMoveByDelta(incrementalDelta);
        }
      }
    },
    [onMoveByDelta, onTransform]
  );

  return (
    <PivotControls
      matrix={matrix}
      anchor={[0, 0, 0]}
      depthTest={false}
      scale={0.3}
      autoTransform={false}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
    >
      <mesh visible={false}>
        <sphereGeometry args={[0.01]} />
      </mesh>
    </PivotControls>
  );
}

// Usage
<MeshEditor
  geometry={geometry}
  mode="edit"
  editMode="edge"
  renderEdgeControl={(props) => <TransformPivotControl {...props} />}
  renderFaceControl={(props) => <TransformPivotControl {...props} />}
/>
```

## Selection Only (No Controls)

If you want selection behavior without any transform controls, simply omit the render props:

```tsx
<MeshEditor
  geometry={geometry}
  mode="edit"
  editMode="vertex"
  // No renderVertexControl = no transform controls
/>
```

This is useful when you want to:
- Implement your own control system (keyboard shortcuts, external UI, etc.)
- Use selection state for other purposes (highlighting, info display, etc.)
- Integrate with a different transform control library

## Using Other Control Libraries

You can use any Three.js transform control library. Here's an example structure:

```tsx
function MyCustomControl({ center, onMoveByDelta }) {
  // Your control implementation
  return (
    <MyControlLibrary
      position={center}
      onChange={(newPosition) => {
        const delta = [
          newPosition.x - center[0],
          newPosition.y - center[1],
          newPosition.z - center[2],
        ];
        onMoveByDelta(delta);
      }}
    />
  );
}
```

## Key Points

1. **Vertex mode**: Only translation (disable rotation/scale)
2. **Edge/Face modes**: Full transform support (translation, rotation, scale)
3. **onCaptureInitialPositions**: Must be called at drag start for rotation/scale to work correctly
4. **onTransform**: Applies rotation and scale relative to captured initial positions
5. **onMoveByDelta**: Applies incremental translation (use for translation-only transforms)

## Architecture Notes

- **One MeshEditor per Canvas**: The MeshEditor modifies the BufferGeometry by reference
- **Geometry ownership**: The geometry should be created once and passed to MeshEditor
- **No built-in controls**: This library doesn't include any transform controls - you bring your own

See the [Storybook examples](http://localhost:6009) for live demonstrations.
