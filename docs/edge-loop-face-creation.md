# Edge Loop Face Creation Guide

This guide explains how to select edges to form a loop and create a face from that loop in `react-three-mesh-editor`.

## Overview

Edge loop face creation allows you to:
- Select multiple edges that form a closed loop
- Validate that the selected edges form a valid loop
- Create a new face from the edge loop (if one doesn't already exist)

This is useful for filling holes in geometry or creating new faces from existing edges.

## Basic Usage

### Using the useMeshEditor Hook

The `useMeshEditor` hook provides three methods for edge loop operations:

```tsx
import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { BoxGeometry } from 'three';
import { useMeshEditor, MeshEditor } from 'react-three-mesh-editor';

function EdgeLoopEditor() {
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);

  const editor = useMeshEditor({
    geometry,
    initialMode: 'edit',
    initialEditMode: 'edge',
  });

  const handleCreateFace = () => {
    // Validate the selected edges form a loop
    const validation = editor.validateSelectedEdgeLoop();

    if (!validation.isValid) {
      console.log('Invalid loop:', validation.error);
      return;
    }

    // Check if face already exists
    if (editor.selectedEdgeLoopHasFace()) {
      console.log('Face already exists for this loop');
      return;
    }

    // Create the face
    const success = editor.createFaceFromSelectedEdges();
    if (success) {
      console.log('Face created!');
    }
  };

  return (
    <>
      <button onClick={handleCreateFace}>Create Face</button>
      <Canvas>
        <MeshEditor
          geometry={geometry}
          mode="edit"
          editMode="edge"
          editor={editor}
        />
      </Canvas>
    </>
  );
}
```

### Multi-Edge Selection

Edges can be selected with Shift+Click for multi-selection:

```tsx
// In your edge click handler
const handleEdgeClick = (edgeIndex: number, event: ThreeEvent<MouseEvent>) => {
  editor.selectEdge(edgeIndex, event.shiftKey);
};
```

## API Reference

### validateSelectedEdgeLoop Method

```typescript
editor.validateSelectedEdgeLoop(): EdgeLoopValidation
```

Returns validation information about the currently selected edges:

```typescript
interface EdgeLoopValidation {
  /** Whether the selected edges form a valid closed loop */
  isValid: boolean;
  /** Ordered vertex indices if valid */
  orderedVertices: number[];
  /** Error message if invalid */
  error?: string;
}
```

### createFaceFromSelectedEdges Method

```typescript
editor.createFaceFromSelectedEdges(): boolean
```

Creates a face from the selected edge loop. Returns `true` if successful, `false` if:
- The edges don't form a valid loop
- A face already exists for the loop

### selectedEdgeLoopHasFace Method

```typescript
editor.selectedEdgeLoopHasFace(): boolean
```

Checks if a face already exists for the selected edge loop.

## Complete Example

Here is a complete example with validation feedback:

```tsx
import { useState, useMemo, useCallback } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
import { BufferGeometry, DoubleSide } from 'three';
import { useMeshEditor } from 'react-three-mesh-editor';

// Create an open box (missing top face)
function createOpenBox(): BufferGeometry {
  const geometry = new BufferGeometry();

  const vertices = new Float32Array([
    // Bottom face
    -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5,  0.5,
    -0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,  0.5,
    // Front face
    -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5,
    -0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5,
    // Back face
     0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,
     0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5, -0.5,
    // Left face
    -0.5, -0.5, -0.5, -0.5, -0.5,  0.5, -0.5,  0.5,  0.5,
    -0.5, -0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5, -0.5,
    // Right face
     0.5, -0.5,  0.5,  0.5, -0.5, -0.5,  0.5,  0.5, -0.5,
     0.5, -0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,
    // Top face is missing - select edges to create it!
  ]);

  geometry.setAttribute('position', new BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  return geometry;
}

// Edge component with click handling
function SelectableEdge({
  edge,
  vertices,
  isSelected,
  onSelect
}) {
  const v1 = vertices[edge.vertexIndices[0]];
  const v2 = vertices[edge.vertexIndices[1]];

  if (!v1 || !v2) return null;

  return (
    <Line
      points={[v1.position, v2.position]}
      color={isSelected ? '#00ff00' : '#666666'}
      lineWidth={isSelected ? 4 : 2}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e.shiftKey);
      }}
    />
  );
}

// Main editor component
function EdgeLoopToFaceEditor() {
  const geometry = useMemo(() => createOpenBox(), []);

  const editor = useMeshEditor({
    geometry,
    initialMode: 'edit',
    initialEditMode: 'edge',
  });

  const validation = editor.validateSelectedEdgeLoop();
  const hasFace = editor.selectedEdgeLoopHasFace();

  return (
    <>
      {/* Render edges */}
      {editor.edges.map((edge, index) => (
        <SelectableEdge
          key={index}
          edge={edge}
          vertices={editor.vertices}
          isSelected={editor.state.selectedEdges.has(index)}
          onSelect={(addToSelection) => editor.selectEdge(index, addToSelection)}
        />
      ))}

      {/* Render mesh */}
      <mesh geometry={editor.currentGeometry}>
        <meshStandardMaterial color="#4488ff" side={DoubleSide} />
      </mesh>

      {/* UI overlay */}
      <Html position={[0, 1.5, 0]} center>
        <div style={{
          background: 'rgba(0,0,0,0.8)',
          padding: '10px',
          borderRadius: '8px',
          color: 'white'
        }}>
          <p>Selected: {editor.state.selectedEdges.size} edges</p>
          <p style={{ color: validation.isValid ? '#00ff00' : '#ff6666' }}>
            {validation.isValid
              ? `Valid loop with ${validation.orderedVertices.length} edges`
              : validation.error || 'Select edges to form a loop'}
          </p>
          {validation.isValid && !hasFace && (
            <button onClick={() => editor.createFaceFromSelectedEdges()}>
              Create Face
            </button>
          )}
          {hasFace && <p>Face already exists</p>}
        </div>
      </Html>
    </>
  );
}

// App
function App() {
  return (
    <Canvas camera={{ position: [2, 2, 2] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} />
      <EdgeLoopToFaceEditor />
      <OrbitControls />
    </Canvas>
  );
}
```

## How Edge Loop Validation Works

The validation algorithm:

1. **Count Vertex Connections**: For each unique vertex, count how many selected edges connect to it.

2. **Check Connection Count**: Each vertex must be connected to exactly 2 edges for a valid loop.

3. **Traverse Loop**: Starting from any vertex, traverse the edges to build an ordered list of vertices.

4. **Verify Closure**: The traversal must return to the starting vertex.

## How Face Creation Works

The face creation algorithm:

1. **Get Ordered Vertices**: Use the validated ordered vertex list.

2. **Fan Triangulation**: For polygons with 4+ vertices, create triangles by connecting vertex 0 to each consecutive pair:
   - Triangle 1: v0, v1, v2
   - Triangle 2: v0, v2, v3
   - Triangle 3: v0, v3, v4
   - etc.

3. **Build New Geometry**: Create a new BufferGeometry with all original triangles plus the new face triangles.

4. **Auto-Select**: The new face is automatically selected.

## Validation Error Messages

| Error | Meaning |
|-------|---------|
| "No edges selected" | Select at least 3 edges |
| "Need at least 3 edges" | A face requires minimum 3 edges |
| "Vertex X connected to Y edges" | Each vertex must connect to exactly 2 edges |
| "Edges do not form a closed loop" | The traversal didn't return to the start |

## Key Points

1. **Edge Mode Only**: Edge loop operations only work in edge edit mode
2. **Shift+Click**: Use Shift+Click to select multiple edges
3. **Minimum 3 Edges**: A valid face requires at least 3 edges
4. **Closed Loop**: Each vertex must connect to exactly 2 selected edges
5. **No Duplicates**: Cannot create a face if one already exists for the loop
6. **Auto-Selection**: The new face is automatically selected after creation
7. **Controlled Mode**: Use the `editor` prop for operations to work correctly

See the [Storybook EdgeLoopToFace example](http://localhost:6009/?path=/story/components-mesheditor--edge-loop-to-face) for a live demonstration.
