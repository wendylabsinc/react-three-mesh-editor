# Face Extrusion Guide

This guide explains how to use the face extrusion feature in `@wendylabsinc/react-three-mesh-editor`.

## Overview

Face extrusion allows you to push a selected face outward along its normal, creating new geometry. This is similar to the extrude operation in Blender and other 3D modeling software.

When you extrude a face:
- The face vertices are duplicated and moved along the face normal
- Three side faces (quads) are created connecting the original and extruded faces
- The extruded face is automatically selected for immediate manipulation

## Basic Usage

### Using the useMeshEditor Hook

The `useMeshEditor` hook provides the `extrudeFace` method:

```tsx
import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { BoxGeometry } from 'three';
import { useMeshEditor, MeshEditor } from '@wendylabsinc/react-three-mesh-editor';

function ExtrudableEditor() {
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);

  const editor = useMeshEditor({
    geometry,
    initialMode: 'edit',
    initialEditMode: 'face',
  });

  const handleExtrude = () => {
    // Get the first selected face
    const selectedFaces = Array.from(editor.state.selectedFaces);
    if (selectedFaces.length === 1) {
      // Extrude by 0.3 units along the face normal
      editor.extrudeFace(selectedFaces[0], 0.3);
    }
  };

  return (
    <>
      <button onClick={handleExtrude}>Extrude</button>
      <Canvas>
        <MeshEditor
          geometry={geometry}
          mode="edit"
          editMode="face"
          editor={editor}
        />
      </Canvas>
    </>
  );
}
```

## API Reference

### extrudeFace Method

```typescript
editor.extrudeFace(faceIndex: number, distance: number): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `faceIndex` | `number` | Index of the face to extrude |
| `distance` | `number` | Distance to extrude. Positive values extrude outward along the face normal. |

### ExtrudeFaceResult (Internal)

The underlying `extrudeFace` utility function returns:

```typescript
interface ExtrudeFaceResult {
  geometry: BufferGeometry;        // New geometry with extruded face
  extrudedVertexBufferIndices: number[];  // Buffer indices of new vertices
  extrudedFaceIndex: number;       // Face index of the extruded top face
}
```

## Complete Example

Here is a complete example with PivotControls for manipulating the extruded face:

```tsx
import { useState, useMemo, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PivotControls } from '@react-three/drei';
import { BoxGeometry, BufferGeometry, Matrix4, Vector3, Quaternion } from 'three';
import { useMeshEditor, MeshEditor } from '@wendylabsinc/react-three-mesh-editor';
import type { FaceControlRenderProps } from '@wendylabsinc/react-three-mesh-editor';

// Reusable face control component
function FacePivotControl({
  center,
  onMoveByDelta,
  onTransform,
  onCaptureInitialPositions,
}: FaceControlRenderProps) {
  const initialMatrixRef = useRef<Matrix4 | null>(null);
  const appliedDeltaRef = useRef<[number, number, number]>([0, 0, 0]);

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
        onTransform(
          { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
          [scale.x, scale.y, scale.z]
        );
      } else {
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

// Main editor component with extrusion
function ExtrudableMeshEditor({ geometry }: { geometry: BufferGeometry }) {
  const editor = useMeshEditor({
    geometry,
    initialMode: 'edit',
    initialEditMode: 'face',
  });

  return (
    <MeshEditor
      geometry={geometry}
      mode="edit"
      editMode="face"
      editor={editor}
      renderFaceControl={(props) => <FacePivotControl {...props} />}
    />
  );
}

// App with extrusion UI
function App() {
  const [extrudeDistance, setExtrudeDistance] = useState(0.3);
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div style={{ padding: '10px' }}>
        <label>
          Extrude Distance:
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={extrudeDistance}
            onChange={(e) => setExtrudeDistance(parseFloat(e.target.value))}
          />
          {extrudeDistance.toFixed(2)}
        </label>
      </div>
      <Canvas camera={{ position: [3, 3, 3] }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />
        <ExtrudableMeshEditor geometry={geometry} />
        <OrbitControls />
        <gridHelper args={[10, 10]} />
      </Canvas>
    </div>
  );
}
```

## How Extrusion Works

The extrusion algorithm performs these steps:

1. **Calculate Face Normal**: Compute the outward-facing normal of the selected face using the cross product of two edge vectors.

2. **Create New Vertices**: Duplicate the three face vertices and offset them by `distance * normal`.

3. **Create Top Face**: Add a new triangle using the three new vertices.

4. **Create Side Faces**: For each edge of the original face, create a quad (two triangles) connecting the original edge to the corresponding extruded edge.

5. **Build New Geometry**: Create a new BufferGeometry with all original triangles plus the new faces.

6. **Auto-Select**: The extruded top face is automatically selected so you can immediately transform it.

## Chaining Extrusions

You can extrude multiple times in sequence. After each extrusion, the new face is selected:

```tsx
// First extrusion
editor.extrudeFace(0, 0.3);

// At this point, the extruded face is selected
// Get its index and extrude again
const newSelectedFace = Array.from(editor.state.selectedFaces)[0];
editor.extrudeFace(newSelectedFace, 0.2);
```

## Controlled Mode

When using extrusion, you must pass the `editor` prop to `MeshEditor` so that the selection state and geometry are synchronized:

```tsx
const editor = useMeshEditor({ geometry });

// The editor prop connects the external editor state to MeshEditor
<MeshEditor
  geometry={geometry}
  editor={editor}  // Required for extrusion to work
  // ...
/>
```

Without the `editor` prop, MeshEditor creates its own internal editor instance, and extrusion will not be connected to the visible selection state.

## Key Points

1. **Face Mode Only**: Extrusion only works in face edit mode
2. **Single Face**: Select exactly one face before extruding
3. **Positive Distance**: Use positive values to extrude outward along the normal
4. **Auto-Selection**: The new face is automatically selected after extrusion
5. **Controlled Mode**: Use the `editor` prop for extrusion to work correctly

See the [Storybook ExtrudeFace example](http://localhost:6009/?path=/story/components-mesheditor--extrude-face) for a live demonstration.
