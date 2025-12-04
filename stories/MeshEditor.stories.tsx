import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PivotControls, Line, Html } from '@react-three/drei';
import { BoxGeometry, SphereGeometry, TorusGeometry, Matrix4, Vector3, Quaternion, BufferGeometry, DoubleSide, Raycaster, Mesh } from 'three';
import { MeshEditor } from '../src/components/MeshEditor';
import { MeshEditorMenuBar } from '../src/components/MeshEditorMenuBar';
import { LoopCutPreview } from '../src/components/LoopCutPreview';
import { useMeshEditor } from '../src/hooks/useMeshEditor';
import type { EditorMode, EditMode } from '../src/types';
import type { VertexControlRenderProps } from '../src/components/VertexHandle';
import type { EdgeControlRenderProps } from '../src/components/EdgeLine';
import type { FaceControlRenderProps } from '../src/components/FaceHighlight';
import type { LoopCutPath } from '../src/utils/geometry';
import '../src/styles/globals.css';

const meta: Meta<typeof MeshEditor> = {
  title: 'Components/MeshEditor',
  component: MeshEditor,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof MeshEditor>;

/**
 * Helper component for vertex PivotControls.
 * Only shows translation controls (no rotation/scale for single vertices).
 */
function VertexPivotControl({ vertex, onMove }: VertexControlRenderProps) {
  const matrixRef = useRef(new Matrix4());

  // Update matrix when vertex position changes
  matrixRef.current.setPosition(vertex.position[0], vertex.position[1], vertex.position[2]);

  return (
    <PivotControls
      matrix={matrixRef.current}
      anchor={[0, 0, 0]}
      depthTest={false}
      scale={0.4}
      autoTransform={false}
      activeAxes={[true, true, true]}
      disableRotations
      disableScaling
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

/**
 * Helper component for edge/face PivotControls.
 * Supports translation, rotation, and scale.
 */
function TransformPivotControl({
  center,
  onMoveByDelta,
  onTransform,
  onCaptureInitialPositions,
}: EdgeControlRenderProps | FaceControlRenderProps) {
  const initialMatrixRef = useRef<Matrix4 | null>(null);
  const appliedDeltaRef = useRef<[number, number, number]>([0, 0, 0]);

  // Create initial matrix at center
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
        onTransform(
          { x: quaternion.x, y: quaternion.y, z: quaternion.z, w: quaternion.w },
          [scale.x, scale.y, scale.z]
        );
      } else {
        // Translation only
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

function MeshEditorWithMenuBar() {
  const [mode, setMode] = useState<EditorMode>('edit');
  const [editMode, setEditMode] = useState<EditMode>('vertex');

  const geometry = useMemo(() => {
    const geo = new BoxGeometry(1, 1, 1);
    return geo;
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MeshEditorMenuBar
        mode={mode}
        editMode={editMode}
        onModeChange={setMode}
        onEditModeChange={setEditMode}
        className="m-2"
      />
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <MeshEditor
            geometry={geometry}
            mode={mode}
            editMode={editMode}
            onModeChange={setMode}
            onEditModeChange={setEditMode}
            vertexSize={0.06}
            renderVertexControl={(props) => <VertexPivotControl {...props} />}
            renderEdgeControl={(props) => <TransformPivotControl {...props} />}
            renderFaceControl={(props) => <TransformPivotControl {...props} />}
          />
          <OrbitControls makeDefault />
          <gridHelper args={[10, 10]} />
        </Canvas>
      </div>
    </div>
  );
}

export const WithMenuBar: Story = {
  render: () => <MeshEditorWithMenuBar />,
  parameters: {
    docs: {
      description: {
        story: `
# Mesh Editor with Menu Bar

This demo shows the mesh editor with PivotControls from @react-three/drei.

## Features
- **Vertex mode**: Translation only (no rotation/scale for single vertices)
- **Edge mode**: Translation, rotation, and scale around edge center
- **Face mode**: Translation, rotation, and scale around face center

## Controls
- Use the **Mode** dropdown to switch between Object Mode and Edit Mode
- In Edit Mode, use the **Selection** buttons to switch between Vertex, Edge, and Face
- Click elements to select them
- Shift+Click to add to selection
- Drag the PivotControls gizmo to transform selected elements
        `,
      },
    },
  },
};

function MeshEditorWithControls() {
  const [mode, setMode] = useState<EditorMode>('edit');
  const [editMode, setEditMode] = useState<EditMode>('vertex');

  const geometry = useMemo(() => {
    const geo = new BoxGeometry(1, 1, 1);
    return geo;
  }, []);

  return (
    <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <MeshEditor
        geometry={geometry}
        mode={mode}
        editMode={editMode}
        onModeChange={setMode}
        onEditModeChange={setEditMode}
        vertexSize={0.06}
        renderVertexControl={(props) => <VertexPivotControl {...props} />}
        renderEdgeControl={(props) => <TransformPivotControl {...props} />}
        renderFaceControl={(props) => <TransformPivotControl {...props} />}
      />
      <OrbitControls makeDefault />
      <gridHelper args={[10, 10]} />
    </Canvas>
  );
}

export const Default: Story = {
  render: () => (
    <div style={{ width: '100vw', height: '100vh' }}>
      <MeshEditorWithControls />
    </div>
  ),
};

function ObjectModeDemo() {
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  return (
    <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <MeshEditor geometry={geometry} mode="object" />
      <OrbitControls makeDefault />
      <gridHelper args={[10, 10]} />
    </Canvas>
  );
}

export const ObjectMode: Story = {
  render: () => (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ObjectModeDemo />
    </div>
  ),
};

function VertexModeDemo() {
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  return (
    <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <MeshEditor
        geometry={geometry}
        mode="edit"
        editMode="vertex"
        vertexSize={0.06}
        renderVertexControl={(props) => <VertexPivotControl {...props} />}
      />
      <OrbitControls makeDefault />
      <gridHelper args={[10, 10]} />
    </Canvas>
  );
}

export const VertexMode: Story = {
  render: () => (
    <div style={{ width: '100vw', height: '100vh' }}>
      <VertexModeDemo />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: `
# Vertex Mode

In vertex mode, only translation is supported (no rotation/scale).
This makes sense because a single point cannot be rotated or scaled.

Click a vertex to select it, then drag the axes to move it.
        `,
      },
    },
  },
};

function EdgeModeDemo() {
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  return (
    <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <MeshEditor
        geometry={geometry}
        mode="edit"
        editMode="edge"
        renderEdgeControl={(props) => <TransformPivotControl {...props} />}
      />
      <OrbitControls makeDefault />
      <gridHelper args={[10, 10]} />
    </Canvas>
  );
}

export const EdgeMode: Story = {
  render: () => (
    <div style={{ width: '100vw', height: '100vh' }}>
      <EdgeModeDemo />
    </div>
  ),
};

function FaceModeDemo() {
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  return (
    <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <MeshEditor
        geometry={geometry}
        mode="edit"
        editMode="face"
        renderFaceControl={(props) => <TransformPivotControl {...props} />}
      />
      <OrbitControls makeDefault />
      <gridHelper args={[10, 10]} />
    </Canvas>
  );
}

export const FaceMode: Story = {
  render: () => (
    <div style={{ width: '100vw', height: '100vh' }}>
      <FaceModeDemo />
    </div>
  ),
};

function SphereMeshDemo() {
  const [mode, setMode] = useState<EditorMode>('edit');
  const [editMode, setEditMode] = useState<EditMode>('vertex');
  const geometry = useMemo(() => new SphereGeometry(1, 8, 6), []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MeshEditorMenuBar
        mode={mode}
        editMode={editMode}
        onModeChange={setMode}
        onEditModeChange={setEditMode}
        className="m-2"
      />
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <MeshEditor
            geometry={geometry}
            mode={mode}
            editMode={editMode}
            vertexSize={0.08}
            renderVertexControl={(props) => <VertexPivotControl {...props} />}
            renderEdgeControl={(props) => <TransformPivotControl {...props} />}
            renderFaceControl={(props) => <TransformPivotControl {...props} />}
          />
          <OrbitControls makeDefault />
          <gridHelper args={[10, 10]} />
        </Canvas>
      </div>
    </div>
  );
}

export const SphereMesh: Story = {
  render: () => <SphereMeshDemo />,
};

function TorusMeshDemo() {
  const [mode, setMode] = useState<EditorMode>('edit');
  const [editMode, setEditMode] = useState<EditMode>('vertex');
  const geometry = useMemo(() => new TorusGeometry(1, 0.4, 8, 12), []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MeshEditorMenuBar
        mode={mode}
        editMode={editMode}
        onModeChange={setMode}
        onEditModeChange={setEditMode}
        className="m-2"
      />
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <MeshEditor
            geometry={geometry}
            mode={mode}
            editMode={editMode}
            vertexSize={0.06}
            renderVertexControl={(props) => <VertexPivotControl {...props} />}
            renderEdgeControl={(props) => <TransformPivotControl {...props} />}
            renderFaceControl={(props) => <TransformPivotControl {...props} />}
          />
          <OrbitControls makeDefault />
          <gridHelper args={[10, 10]} />
        </Canvas>
      </div>
    </div>
  );
}

export const TorusMesh: Story = {
  render: () => <TorusMeshDemo />,
};

function SelectionOutlineDemo() {
  const [selected, setSelected] = useState(true);
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="m-2 flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => setSelected(e.target.checked)}
            className="h-4 w-4"
          />
          Selected (show outline)
        </label>
      </div>
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <MeshEditor
            geometry={geometry}
            mode="object"
            selected={selected}
            outlineColor="#ff6b00"
            outlineThickness={0.03}
          />
          <OrbitControls makeDefault />
          <gridHelper args={[10, 10]} />
        </Canvas>
      </div>
    </div>
  );
}

export const SelectionOutline: Story = {
  render: () => <SelectionOutlineDemo />,
  parameters: {
    docs: {
      description: {
        story: `
# Selection Outline

Demonstrates the selection outline feature in Object Mode.

## Props
- \`selected\`: Whether the object is selected (shows outline)
- \`showOutline\`: Whether to show the outline (default: true)
- \`outlineColor\`: Color of the outline (defaults to selectedColor)
- \`outlineThickness\`: Thickness of the outline (default: 0.03)

Toggle the checkbox to show/hide the selection outline.
        `,
      },
    },
  },
};

function CustomizationDemo() {
  const [mode, setMode] = useState<EditorMode>('edit');
  const [editMode, setEditMode] = useState<EditMode>('vertex');
  const [vertexSize, setVertexSize] = useState(0.05);
  const [edgeLineWidth, setEdgeLineWidth] = useState(2);
  const [selectedColor, setSelectedColor] = useState('#ff6b00');
  const [outlineThickness, setOutlineThickness] = useState(0.03);

  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="m-2 flex flex-wrap items-center gap-4 rounded-md border bg-background p-3">
        <MeshEditorMenuBar
          mode={mode}
          editMode={editMode}
          onModeChange={setMode}
          onEditModeChange={setEditMode}
        />
        <div className="h-6 w-px bg-border" />
        <label className="flex items-center gap-2 text-sm">
          Vertex Size:
          <input
            type="range"
            min="0.02"
            max="0.15"
            step="0.01"
            value={vertexSize}
            onChange={(e) => setVertexSize(parseFloat(e.target.value))}
            className="w-24"
          />
          <span className="w-12 text-muted-foreground">{vertexSize.toFixed(2)}</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Edge Width:
          <input
            type="range"
            min="1"
            max="6"
            step="0.5"
            value={edgeLineWidth}
            onChange={(e) => setEdgeLineWidth(parseFloat(e.target.value))}
            className="w-24"
          />
          <span className="w-12 text-muted-foreground">{edgeLineWidth.toFixed(1)}px</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          Selection Color:
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="h-6 w-10 cursor-pointer"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          Outline Thickness:
          <input
            type="range"
            min="0.01"
            max="0.1"
            step="0.005"
            value={outlineThickness}
            onChange={(e) => setOutlineThickness(parseFloat(e.target.value))}
            className="w-24"
          />
          <span className="w-12 text-muted-foreground">{outlineThickness.toFixed(3)}</span>
        </label>
      </div>
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <MeshEditor
            geometry={geometry}
            mode={mode}
            editMode={editMode}
            onModeChange={setMode}
            onEditModeChange={setEditMode}
            vertexSize={vertexSize}
            edgeLineWidth={edgeLineWidth}
            selectedColor={selectedColor}
            selected={mode === 'object'}
            outlineColor={selectedColor}
            outlineThickness={outlineThickness}
            renderVertexControl={(props) => <VertexPivotControl {...props} />}
            renderEdgeControl={(props) => <TransformPivotControl {...props} />}
            renderFaceControl={(props) => <TransformPivotControl {...props} />}
          />
          <OrbitControls makeDefault />
          <gridHelper args={[10, 10]} />
        </Canvas>
      </div>
    </div>
  );
}

export const Customization: Story = {
  render: () => <CustomizationDemo />,
  parameters: {
    docs: {
      description: {
        story: `
# Customization Options

Interactive demo showing all customization options:

## Appearance Props
- \`vertexSize\`: Size of vertex handle cubes (default: 0.05)
- \`edgeLineWidth\`: Width of edge lines in pixels (default: 2)
- \`selectedColor\`: Color of selected elements (default: '#ff6b00')
- \`outlineColor\`: Color of selection outline (defaults to selectedColor)
- \`outlineThickness\`: Thickness of selection outline (default: 0.03)

## Color Props
- \`defaultVertexColor\`: Unselected vertex color (default: '#4a90d9')
- \`defaultEdgeColor\`: Unselected edge color (default: '#ffffff')
- \`defaultFaceColor\`: Unselected face color (default: '#4a90d9')
- \`hoverColor\`: Hovered element color (default: '#7bb3e0')
- \`overlayColor\`: Edit mode mesh overlay color (default: '#6699cc')
- \`wireframeColor\`: Edit mode wireframe color (default: '#ffffff')

Use the controls above to adjust settings in real-time.
        `,
      },
    },
  },
};

/**
 * Story showing how to use MeshEditor without any controls.
 * This is useful when you want selection-only behavior.
 */
function SelectionOnlyDemo() {
  const [mode, setMode] = useState<EditorMode>('edit');
  const [editMode, setEditMode] = useState<EditMode>('vertex');
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <MeshEditorMenuBar
        mode={mode}
        editMode={editMode}
        onModeChange={setMode}
        onEditModeChange={setEditMode}
        className="m-2"
      />
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <MeshEditor
            geometry={geometry}
            mode={mode}
            editMode={editMode}
            vertexSize={0.06}
            // No renderControl props = no transform controls
          />
          <OrbitControls makeDefault />
          <gridHelper args={[10, 10]} />
        </Canvas>
      </div>
    </div>
  );
}

export const SelectionOnly: Story = {
  render: () => <SelectionOnlyDemo />,
  parameters: {
    docs: {
      description: {
        story: `
# Selection Only (No Controls)

This demo shows MeshEditor without any transform controls.
Elements can be selected but not transformed.

This is useful when you want to:
- Implement your own control system (keyboard shortcuts, external UI, etc.)
- Use selection state for other purposes (highlighting, info display, etc.)
- Integrate with a different transform control library
        `,
      },
    },
  },
};

/**
 * Inner component that uses useMeshEditor and passes it to MeshEditor.
 * This allows us to access editor.extrudeFace while keeping selection state synchronized.
 */
function ExtrudableMeshInner({
  geometry,
  extrudeDistance,
  onSelectionChange,
  extrudeTrigger,
}: {
  geometry: BufferGeometry;
  extrudeDistance: number;
  onSelectionChange: (hasSelection: boolean) => void;
  extrudeTrigger: number;
}) {
  const editor = useMeshEditor({
    geometry,
    initialMode: 'edit',
    initialEditMode: 'face',
  });

  const selectedFaceIndex = useMemo(() => {
    const selected = Array.from(editor.state.selectedFaces);
    return selected.length === 1 ? selected[0] : null;
  }, [editor.state.selectedFaces]);

  // Notify parent of selection changes
  useMemo(() => {
    onSelectionChange(selectedFaceIndex !== null);
  }, [selectedFaceIndex, onSelectionChange]);

  // Track the last extrudeTrigger value to detect changes
  const lastTriggerRef = useRef(extrudeTrigger);

  // Handle extrude when trigger changes
  useMemo(() => {
    if (extrudeTrigger !== lastTriggerRef.current && selectedFaceIndex !== null) {
      lastTriggerRef.current = extrudeTrigger;
      editor.extrudeFace(selectedFaceIndex, extrudeDistance);
      // The new extruded face is automatically selected by extrudeFace
    }
  }, [extrudeTrigger, selectedFaceIndex, extrudeDistance, editor]);

  return (
    <MeshEditor
      geometry={geometry}
      mode="edit"
      editMode="face"
      editor={editor}
      renderFaceControl={(props) => <TransformPivotControl {...props} />}
    />
  );
}

function ExtrudeFaceDemo() {
  const [extrudeDistance, setExtrudeDistance] = useState(0.3);
  const [key, setKey] = useState(0);
  const [extrudeTrigger, setExtrudeTrigger] = useState(0);
  const [hasSelection, setHasSelection] = useState(false);
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);

  const handleSelectionChange = useCallback((selected: boolean) => {
    setHasSelection(selected);
  }, []);

  const handleExtrude = useCallback(() => {
    if (hasSelection) {
      setExtrudeTrigger((t) => t + 1);
    }
  }, [hasSelection]);

  const handleReset = useCallback(() => {
    setKey((k) => k + 1);
    setExtrudeTrigger(0);
    setHasSelection(false);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="m-2 flex flex-wrap items-center gap-4 rounded-md border bg-background p-3">
        <span className="text-sm font-medium">Face Extrusion Demo</span>
        <div className="h-6 w-px bg-border" />
        <label className="flex items-center gap-2 text-sm">
          Extrude Distance:
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={extrudeDistance}
            onChange={(e) => setExtrudeDistance(parseFloat(e.target.value))}
            className="w-24"
          />
          <span className="w-12 text-muted-foreground">{extrudeDistance.toFixed(2)}</span>
        </label>
        <button
          onClick={handleExtrude}
          disabled={!hasSelection}
          className="rounded bg-orange-500 px-3 py-1 text-sm text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Extrude Selected Face
        </button>
        <button
          onClick={handleReset}
          className="rounded bg-gray-500 px-3 py-1 text-sm text-white hover:bg-gray-600"
        >
          Reset
        </button>
        {!hasSelection && (
          <span className="text-sm text-muted-foreground">Click a face to select it first</span>
        )}
      </div>
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <ExtrudableMeshInner
            key={key}
            geometry={geometry}
            extrudeDistance={extrudeDistance}
            onSelectionChange={handleSelectionChange}
            extrudeTrigger={extrudeTrigger}
          />
          <OrbitControls makeDefault />
          <gridHelper args={[10, 10]} />
        </Canvas>
      </div>
    </div>
  );
}

export const ExtrudeFace: Story = {
  render: () => <ExtrudeFaceDemo />,
  parameters: {
    docs: {
      description: {
        story: `
# Face Extrusion

This demo shows the face extrusion feature.

## How to use
1. Click on a face to select it
2. Adjust the extrusion distance with the slider
3. Click "Extrude Selected Face" to extrude
4. The new geometry will have the extruded face with side faces connecting to the original

## Technical Details
- Extrusion creates 3 new vertices at the face position offset by the normal
- 7 new triangles are created: 1 for the extruded face top + 6 for the 3 side quads
- After extrusion, you can continue editing the mesh, including selecting and transforming the new faces

## API
\`\`\`tsx
const editor = useMeshEditor({ geometry });
editor.extrudeFace(faceIndex, distance);
// Returns new geometry with extruded face
\`\`\`
        `,
      },
    },
  },
};

/**
 * Find the nearest edge to a point on a face.
 * Returns the edge index that is closest to the intersection point.
 */
function findNearestEdge(
  intersectionPoint: Vector3,
  faceIndex: number,
  faces: { index: number; vertexIndices: [number, number, number] }[],
  edges: { index: number; vertexIndices: [number, number] }[],
  vertices: { position: [number, number, number] }[]
): number | null {
  // Find which triangle was hit (faceIndex is the triangle index from raycaster)
  const face = faces[faceIndex];
  if (!face) return null;

  // Get the edges of this face
  const faceEdges: [number, number][] = [
    [face.vertexIndices[0], face.vertexIndices[1]],
    [face.vertexIndices[1], face.vertexIndices[2]],
    [face.vertexIndices[2], face.vertexIndices[0]],
  ];

  // Find the closest edge
  let nearestEdgeIndex: number | null = null;
  let minDistance = Infinity;

  for (const [v1Idx, v2Idx] of faceEdges) {
    const v1 = vertices[v1Idx]?.position;
    const v2 = vertices[v2Idx]?.position;
    if (!v1 || !v2) continue;

    // Calculate distance from point to line segment
    const p1 = new Vector3(v1[0], v1[1], v1[2]);
    const p2 = new Vector3(v2[0], v2[1], v2[2]);
    const lineDir = p2.clone().sub(p1);
    const lineLength = lineDir.length();
    lineDir.normalize();

    const toPoint = intersectionPoint.clone().sub(p1);
    let t = toPoint.dot(lineDir) / lineLength;
    t = Math.max(0, Math.min(1, t));

    const closestPoint = p1.clone().add(lineDir.multiplyScalar(t * lineLength));
    const distance = intersectionPoint.distanceTo(closestPoint);

    if (distance < minDistance) {
      minDistance = distance;
      // Find the edge index
      for (const edge of edges) {
        const [a, b] = edge.vertexIndices;
        if ((a === v1Idx && b === v2Idx) || (a === v2Idx && b === v1Idx)) {
          nearestEdgeIndex = edge.index;
          break;
        }
      }
    }
  }

  return nearestEdgeIndex;
}

/**
 * Inner component for the Loop Cut demo that uses useMeshEditor.
 * Uses face-based hover detection like Blender - hovering anywhere on a face
 * shows the loop cut preview for the nearest edge.
 */
function LoopCutMeshInner({
  geometry,
  onCutComplete,
}: {
  geometry: BufferGeometry;
  onCutComplete: () => void;
}) {
  const editor = useMeshEditor({
    geometry,
    initialMode: 'edit',
    initialEditMode: 'edge',
  });

  const [hoveredEdgeIndex, setHoveredEdgeIndex] = useState<number | null>(null);

  // Calculate loop cut path when hovering over an edge
  const loopCutPath = useMemo(() => {
    if (hoveredEdgeIndex !== null) {
      return editor.getLoopCutPath(hoveredEdgeIndex);
    }
    return null;
  }, [hoveredEdgeIndex, editor]);

  // Handle pointer move over mesh - find nearest edge to intersection point
  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      if (event.faceIndex !== undefined && event.point) {
        const nearestEdge = findNearestEdge(
          event.point,
          event.faceIndex,
          editor.faces,
          editor.edges,
          editor.vertices
        );
        setHoveredEdgeIndex(nearestEdge);
      }
    },
    [editor.faces, editor.edges, editor.vertices]
  );

  const handlePointerOut = useCallback(() => {
    setHoveredEdgeIndex(null);
  }, []);

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      if (hoveredEdgeIndex !== null) {
        const path = editor.getLoopCutPath(hoveredEdgeIndex);
        if (path && path.points.length > 0) {
          editor.executeLoopCut(path);
          setHoveredEdgeIndex(null);
          onCutComplete();
        }
      }
    },
    [editor, hoveredEdgeIndex, onCutComplete]
  );

  return (
    <group>
      {/* Interactive mesh - responds to pointer events */}
      <mesh
        geometry={editor.currentGeometry}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <meshStandardMaterial color="#6699cc" transparent opacity={0.3} side={DoubleSide} />
      </mesh>
      {/* Wireframe overlay */}
      <mesh geometry={editor.currentGeometry}>
        <meshBasicMaterial wireframe color="#ffffff" transparent opacity={0.5} />
      </mesh>
      {/* Loop cut preview */}
      <LoopCutPreview path={loopCutPath} color="#ffff00" lineWidth={4} />
    </group>
  );
}

function LoopCutDemo() {
  const [key, setKey] = useState(0);
  const [cutCount, setCutCount] = useState(0);
  // Use a simple box - each face is 2 triangles, good for testing loop cut
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);

  const handleCutComplete = useCallback(() => {
    setCutCount((c) => c + 1);
  }, []);

  const handleReset = useCallback(() => {
    setKey((k) => k + 1);
    setCutCount(0);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="m-2 flex flex-wrap items-center gap-4 rounded-md border bg-background p-3">
        <span className="text-sm font-medium">Loop Cut Demo</span>
        <div className="h-6 w-px bg-border" />
        <span className="text-sm text-muted-foreground">
          Hover over an edge to see the loop cut preview. Click to cut.
        </span>
        <span className="text-sm">
          Cuts made: <span className="font-mono">{cutCount}</span>
        </span>
        <button
          onClick={handleReset}
          className="rounded bg-gray-500 px-3 py-1 text-sm text-white hover:bg-gray-600"
        >
          Reset
        </button>
      </div>
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <LoopCutMeshInner key={key} geometry={geometry} onCutComplete={handleCutComplete} />
          <OrbitControls makeDefault />
          <gridHelper args={[10, 10]} />
        </Canvas>
      </div>
    </div>
  );
}

export const LoopCut: Story = {
  render: () => <LoopCutDemo />,
  parameters: {
    docs: {
      description: {
        story: `
# Loop Cut

This demo shows the loop cut feature, similar to Blender's Ctrl+R tool.

## How to use
1. Hover over any edge to see the animated loop cut preview (yellow dashed line)
2. The preview shows where new vertices will be created
3. Click on an edge to execute the loop cut
4. New vertices and edges will be added to subdivide the mesh

## Technical Details
- The loop cut algorithm traverses perpendicular to the hovered edge
- It finds all edges that form a ring around the mesh
- Clicking commits the cut, creating new vertices at the midpoints
- Affected faces are split to incorporate the new edges

## API
\`\`\`tsx
const editor = useMeshEditor({ geometry });

// Get the loop cut path for an edge
const path = editor.getLoopCutPath(edgeIndex, t); // t = position along edge (0.5 = midpoint)

// Execute the loop cut
editor.executeLoopCut(path);
\`\`\`
        `,
      },
    },
  },
};

/**
 * Interactive edge component for edge loop selection.
 */
function SelectableEdge({
  edge,
  vertices,
  isSelected,
  onSelect,
}: {
  edge: { index: number; vertexIndices: [number, number] };
  vertices: { position: [number, number, number] }[];
  isSelected: boolean;
  onSelect: (edgeIndex: number, addToSelection: boolean) => void;
}) {
  const points = useMemo(() => {
    const v1 = vertices[edge.vertexIndices[0]];
    const v2 = vertices[edge.vertexIndices[1]];
    if (!v1 || !v2) return [];
    return [v1.position, v2.position] as [[number, number, number], [number, number, number]];
  }, [edge.vertexIndices, vertices]);

  if (points.length < 2) return null;

  return (
    <Line
      points={points}
      color={isSelected ? '#ff6b00' : '#ffffff'}
      lineWidth={isSelected ? 4 : 2}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(edge.index, e.shiftKey);
      }}
    />
  );
}

/**
 * Inner component for Edge Loop to Face demo.
 */
function EdgeLoopToFaceMeshInner({
  geometry,
  onFaceCreated,
}: {
  geometry: BufferGeometry;
  onFaceCreated: () => void;
}) {
  const editor = useMeshEditor({
    geometry,
    initialMode: 'edit',
    initialEditMode: 'edge',
  });

  // Validate selected edges on each render
  const validation = editor.validateSelectedEdgeLoop();
  const hasFace = validation.isValid ? editor.selectedEdgeLoopHasFace() : false;

  const handleSelectEdge = useCallback(
    (edgeIndex: number, addToSelection: boolean) => {
      editor.selectEdge(edgeIndex, addToSelection);
    },
    [editor]
  );

  const handleCreateFace = useCallback(() => {
    const success = editor.createFaceFromSelectedEdges();
    if (success) {
      onFaceCreated();
    }
  }, [editor, onFaceCreated]);

  const selectedCount = editor.state.selectedEdges.size;

  return (
    <group>
      {/* Semi-transparent mesh */}
      <mesh geometry={editor.currentGeometry}>
        <meshStandardMaterial color="#6699cc" transparent opacity={0.3} side={DoubleSide} />
      </mesh>
      {/* Wireframe overlay */}
      <mesh geometry={editor.currentGeometry}>
        <meshBasicMaterial wireframe color="#888888" transparent opacity={0.3} />
      </mesh>
      {/* Selectable edges */}
      {editor.edges.map((edge) => (
        <SelectableEdge
          key={edge.index}
          edge={edge}
          vertices={editor.vertices}
          isSelected={editor.state.selectedEdges.has(edge.index)}
          onSelect={handleSelectEdge}
        />
      ))}
      {/* Status display as HTML overlay */}
      <Html position={[0, 1.5, 0]} center>
        <div
          style={{
            background: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
          }}
        >
          <div>Selected edges: {selectedCount}</div>
          {selectedCount >= 3 && (
            <>
              <div style={{ color: validation.isValid ? '#4ade80' : '#f87171' }}>
                {validation.isValid ? 'Valid loop' : validation.error}
              </div>
              {validation.isValid && (
                <div style={{ color: hasFace ? '#fbbf24' : '#4ade80' }}>
                  {hasFace ? 'Face already exists' : 'Can create face'}
                </div>
              )}
              {validation.isValid && !hasFace && (
                <button
                  onClick={handleCreateFace}
                  style={{
                    marginTop: '4px',
                    padding: '4px 8px',
                    background: '#ff6b00',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                >
                  Create Face
                </button>
              )}
            </>
          )}
        </div>
      </Html>
    </group>
  );
}

function EdgeLoopToFaceDemo() {
  const [key, setKey] = useState(0);
  const [faceCount, setFaceCount] = useState(0);

  // Create an open box (5 faces instead of 6) to demonstrate creating the missing face
  const geometry = useMemo(() => {
    const geo = new BoxGeometry(1, 1, 1);
    // Remove top face (last 2 triangles = 6 indices)
    const indices = geo.getIndex();
    if (indices) {
      const newIndices = Array.from(indices.array).slice(0, -6);
      geo.setIndex(newIndices);
    }
    return geo;
  }, []);

  const handleFaceCreated = useCallback(() => {
    setFaceCount((c) => c + 1);
  }, []);

  const handleReset = useCallback(() => {
    setKey((k) => k + 1);
    setFaceCount(0);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div className="m-2 flex flex-wrap items-center gap-4 rounded-md border bg-background p-3">
        <span className="text-sm font-medium">Edge Loop to Face Demo</span>
        <div className="h-6 w-px bg-border" />
        <span className="text-sm text-muted-foreground">
          Shift+Click edges to select multiple. Select 3+ edges forming a closed loop, then create a face.
        </span>
        <span className="text-sm">
          Faces created: <span className="font-mono">{faceCount}</span>
        </span>
        <button
          onClick={handleReset}
          className="rounded bg-gray-500 px-3 py-1 text-sm text-white hover:bg-gray-600"
        >
          Reset
        </button>
      </div>
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <EdgeLoopToFaceMeshInner key={key} geometry={geometry} onFaceCreated={handleFaceCreated} />
          <OrbitControls makeDefault />
          <gridHelper args={[10, 10]} />
        </Canvas>
      </div>
    </div>
  );
}

export const EdgeLoopToFace: Story = {
  render: () => <EdgeLoopToFaceDemo />,
  parameters: {
    docs: {
      description: {
        story: `
# Edge Loop to Face

This demo shows how to select multiple edges to form an edge loop and create a face from it.

## How to use
1. **Shift+Click** on edges to select multiple edges
2. Select at least 3 edges that form a closed loop (each vertex connects exactly 2 edges)
3. The overlay shows validation status
4. Click "Create Face" to fill the loop with a face

## Features
- Multi-edge selection with Shift+Click
- Real-time validation of edge loop
- Detection of existing faces
- Automatic triangulation for polygons with 4+ vertices

## API
\`\`\`tsx
const editor = useMeshEditor({ geometry });

// Select edges (Shift for multi-select)
editor.selectEdge(edgeIndex, true);

// Validate if selected edges form a closed loop
const validation = editor.validateSelectedEdgeLoop();
// { isValid: boolean, orderedVertices: number[], error?: string }

// Check if face already exists
const hasFace = editor.selectedEdgeLoopHasFace();

// Create face from selected edges
const success = editor.createFaceFromSelectedEdges();
\`\`\`
        `,
      },
    },
  },
};
