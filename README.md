# react-three-mesh-editor

A React Three Fiber library for mesh editing similar to Blender, with object/edit modes and vertex/edge/face selection.

[![npm version](https://img.shields.io/npm/v/react-three-mesh-editor)](https://www.npmjs.com/package/react-three-mesh-editor)
[![license](https://img.shields.io/npm/l/react-three-mesh-editor)](https://github.com/wendylabsinc/react-three-mesh-editor/blob/main/LICENSE)

**[Documentation](https://wendylabsinc.github.io/react-three-mesh-editor/)** | **[Storybook](https://wendylabsinc.github.io/react-three-mesh-editor/stories)** | **[API Reference](https://wendylabsinc.github.io/react-three-mesh-editor/docs)**

## Installation

```bash
npm install react-three-mesh-editor
```

### Peer Dependencies

This library requires the following peer dependencies:

```bash
npm install react react-dom three @react-three/fiber @react-three/drei
```

## Basic Usage

The core `MeshEditor` component can be used standalone without any UI dependencies:

```tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { MeshEditor } from 'react-three-mesh-editor';
import { BoxGeometry } from 'three';
import { useMemo, useState } from 'react';

function App() {
  const [mode, setMode] = useState<'object' | 'edit'>('edit');
  const [editMode, setEditMode] = useState<'vertex' | 'edge' | 'face'>('vertex');
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1, 2, 2, 2), []);

  return (
    <Canvas camera={{ position: [3, 3, 3] }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} />
      <MeshEditor
        geometry={geometry}
        mode={mode}
        editMode={editMode}
      />
      <OrbitControls />
    </Canvas>
  );
}
```

## Features

- **Object Mode**: Solid mesh rendering with optional selection outline
- **Edit Mode**: Semi-transparent mesh with wireframe overlay
  - **Vertex Mode**: Small cubes at each vertex that can be selected and moved
  - **Edge Mode**: Lines connecting vertices that can be selected and transformed
  - **Face Mode**: Triangular faces that can be selected and transformed

### Controls

- Click a vertex/edge/face to select it
- Shift+Click to add to selection
- Use custom transform controls (see [Custom Controls Guide](./docs/custom-controls.md))

### Bring Your Own Controls (BYOC)

This library uses a **render props pattern** for transform controls. You provide your own controls (e.g., PivotControls from @react-three/drei):

```tsx
import { PivotControls } from '@react-three/drei';
import { Matrix4, Vector3 } from 'three';

<MeshEditor
  geometry={geometry}
  mode="edit"
  editMode="vertex"
  renderVertexControl={({ vertex, onMove }) => (
    <PivotControls
      matrix={new Matrix4().setPosition(...vertex.position)}
      disableRotations
      disableScaling
      onDrag={(matrix) => {
        const pos = new Vector3().setFromMatrixPosition(matrix);
        onMove([pos.x, pos.y, pos.z]);
      }}
    />
  )}
/>
```

See the full [Custom Controls Guide](./docs/custom-controls.md) for detailed examples.

## Components

### MeshEditor

The main 3D editor component (used inside R3F Canvas).

```tsx
interface MeshEditorProps {
  geometry: BufferGeometry;
  mode?: 'object' | 'edit';
  editMode?: 'vertex' | 'edge' | 'face';
  onModeChange?: (mode: EditorMode) => void;
  onEditModeChange?: (editMode: EditMode) => void;
  onGeometryChange?: (geometry: BufferGeometry) => void;

  // Appearance
  vertexSize?: number;
  edgeLineWidth?: number;
  selectedColor?: string;
  defaultVertexColor?: string;
  defaultEdgeColor?: string;
  defaultFaceColor?: string;
  hoverColor?: string;
  transparentOpacity?: number;
  overlayColor?: string;
  wireframeColor?: string;

  // Selection outline (object mode)
  selected?: boolean;
  showOutline?: boolean;
  outlineColor?: string;
  outlineThickness?: number;

  // Custom controls (BYOC)
  renderVertexControl?: (props: VertexControlRenderProps) => React.ReactNode;
  renderEdgeControl?: (props: EdgeControlRenderProps) => React.ReactNode;
  renderFaceControl?: (props: FaceControlRenderProps) => React.ReactNode;
}
```

### MeshEditorMenuBar (Optional)

A pre-built UI component for controlling the editor modes. This component uses Tailwind CSS and shadcn/ui components.

```tsx
import { MeshEditorMenuBar } from 'react-three-mesh-editor';

<MeshEditorMenuBar
  mode={mode}
  editMode={editMode}
  onModeChange={setMode}
  onEditModeChange={setEditMode}
/>
```

## Using the Optional UI Components

The `MeshEditorMenuBar` and other UI components are built with Tailwind CSS v4. If you want to use them, you'll need to configure your project to include the library's styles.

### Tailwind CSS v4

Add the library to your CSS sources using the `@source` directive:

```css
/* app.css */
@import "tailwindcss";
@source "../node_modules/react-three-mesh-editor/dist";
```

### Build Your Own UI

You can skip the UI components entirely and build your own controls using the exported types and hooks:

```tsx
import { useMeshEditor } from 'react-three-mesh-editor';
import type { EditorMode, EditMode } from 'react-three-mesh-editor';

function MyCustomControls({ geometry }) {
  const editor = useMeshEditor({ geometry });

  return (
    <div>
      <button onClick={() => editor.setMode('object')}>Object</button>
      <button onClick={() => editor.setMode('edit')}>Edit</button>
      {editor.state.mode === 'edit' && (
        <>
          <button onClick={() => editor.setEditMode('vertex')}>Vertex</button>
          <button onClick={() => editor.setEditMode('edge')}>Edge</button>
          <button onClick={() => editor.setEditMode('face')}>Face</button>
        </>
      )}
    </div>
  );
}
```

## Hooks

### useMeshEditor

A hook for managing mesh editor state:

```tsx
const editor = useMeshEditor({
  geometry: BufferGeometry,
  initialMode?: 'object' | 'edit',
  initialEditMode?: 'vertex' | 'edge' | 'face',
  onGeometryChange?: (geometry: BufferGeometry) => void,
});

// Returns:
// - state: { mode, editMode, selectedVertices, selectedEdges, selectedFaces }
// - vertices: VertexData[]
// - edges: EdgeData[]
// - faces: FaceData[]
// - setMode: (mode) => void
// - setEditMode: (editMode) => void
// - selectVertex: (index, addToSelection?) => void
// - selectEdge: (index, addToSelection?) => void
// - selectFace: (index, addToSelection?) => void
// - deselectAll: () => void
// - moveSelectedVertices: (delta) => void
// - moveVerticesByDelta: (indices, delta) => void
// - updateVertexPosition: (index, position) => void
// - transformVertices: (indices, center, rotation, scale) => void
// - captureInitialPositions: (indices) => void
// - refreshGeometry: () => void
```

## Types

```tsx
type EditorMode = 'object' | 'edit';
type EditMode = 'vertex' | 'edge' | 'face';

interface VertexData {
  index: number;
  position: [number, number, number];
  selected: boolean;
}

interface EdgeData {
  index: number;
  vertexIndices: [number, number];
  selected: boolean;
}

interface FaceData {
  index: number;
  vertexIndices: [number, number, number];
  selected: boolean;
}

// Render props for custom controls
interface VertexControlRenderProps {
  vertex: VertexData;
  onMove: (position: [number, number, number]) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

interface EdgeControlRenderProps {
  edge: EdgeData;
  vertices: VertexData[];
  center: [number, number, number];
  onMoveByDelta: (delta: [number, number, number]) => void;
  onTransform: (rotation: Quaternion, scale: [number, number, number]) => void;
  onCaptureInitialPositions: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

interface FaceControlRenderProps {
  face: FaceData;
  vertices: VertexData[];
  center: [number, number, number];
  onMoveByDelta: (delta: [number, number, number]) => void;
  onTransform: (rotation: Quaternion, scale: [number, number, number]) => void;
  onCaptureInitialPositions: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}
```

## Development

```bash
# Install dependencies
npm install

# Build the library
npm run build

# Run Storybook for development
npm run storybook
# Storybook runs at http://localhost:6009

# Type check
npm run typecheck

# Lint
npm run lint
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build the library with tsup (outputs to `dist/`) |
| `npm run docs` | Generate TypeDoc API documentation |
| `npm run storybook` | Start Storybook dev server on port 6009 |
| `npm run build-storybook` | Build static Storybook |
| `npm run build-site` | Build complete documentation site (TypeDoc + Storybook) |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |

## GitHub Pages

This project automatically deploys documentation to GitHub Pages on push to `main`:

- **`/`** - Landing page with navigation
- **`/docs`** - TypeDoc API documentation
- **`/stories`** - Interactive Storybook demos

To enable, go to your repository Settings > Pages and set source to "GitHub Actions".

## License

MIT
