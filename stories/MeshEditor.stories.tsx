import { useState, useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { BoxGeometry, SphereGeometry, TorusGeometry } from 'three';
import { MeshEditor } from '../src/components/MeshEditor';
import { MeshEditorMenuBar } from '../src/components/MeshEditorMenuBar';
import type { EditorMode, EditMode } from '../src/types';
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

This demo shows the mesh editor with the shadcn-based menu bar for switching between modes.

## Controls
- Use the **Mode** dropdown to switch between Object Mode and Edit Mode
- In Edit Mode, use the **Selection** toggle group to switch between Vertex, Edge, and Face selection
- Click vertices/edges/faces to select them
- Shift+Click to add to selection
- In vertex mode, drag the PivotControls gizmo to move selected vertices
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
      <MeshEditor geometry={geometry} mode="edit" editMode="vertex" vertexSize={0.06} />
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
};

function EdgeModeDemo() {
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  return (
    <Canvas camera={{ position: [3, 3, 3], fov: 50 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <MeshEditor geometry={geometry} mode="edit" editMode="edge" />
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
      <MeshEditor geometry={geometry} mode="edit" editMode="face" />
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
          <MeshEditor geometry={geometry} mode={mode} editMode={editMode} vertexSize={0.08} />
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
          <MeshEditor geometry={geometry} mode={mode} editMode={editMode} vertexSize={0.06} />
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
