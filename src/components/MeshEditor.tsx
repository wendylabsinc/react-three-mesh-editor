import { useCallback } from 'react';
import type { BufferGeometry } from 'three';
import type { EditorMode, EditMode } from '../types';
import { useMeshEditor } from '../hooks/useMeshEditor';
import { VertexHandle } from './VertexHandle';
import { EdgeLine } from './EdgeLine';
import { FaceHighlight } from './FaceHighlight';
import { EditModeOverlay } from './EditModeOverlay';

export interface MeshEditorProps {
  geometry: BufferGeometry;
  mode?: EditorMode;
  editMode?: EditMode;
  onModeChange?: (mode: EditorMode) => void;
  onEditModeChange?: (editMode: EditMode) => void;
  onGeometryChange?: (geometry: BufferGeometry) => void;
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
}

export function MeshEditor({
  geometry,
  mode: externalMode,
  editMode: externalEditMode,
  onModeChange: _onModeChange,
  onEditModeChange: _onEditModeChange,
  onGeometryChange,
  vertexSize = 0.05,
  edgeLineWidth = 2,
  selectedColor = '#ff6b00',
  defaultVertexColor = '#4a90d9',
  defaultEdgeColor = '#ffffff',
  defaultFaceColor = '#4a90d9',
  hoverColor = '#7bb3e0',
  transparentOpacity = 0.3,
  overlayColor = '#6699cc',
  wireframeColor = '#ffffff',
}: MeshEditorProps) {
  const editor = useMeshEditor({
    geometry,
    initialMode: externalMode ?? 'object',
    initialEditMode: externalEditMode ?? 'vertex',
    onGeometryChange,
  });

  const mode = externalMode ?? editor.state.mode;
  const editMode = externalEditMode ?? editor.state.editMode;

  const handleVertexMove = useCallback(
    (index: number, position: [number, number, number]) => {
      editor.updateVertexPosition(index, position);
    },
    [editor]
  );

  // Real-time vertex movement during drag (updates geometry without triggering re-render)
  const handleVertexMoveRealtime = useCallback(
    (index: number, position: [number, number, number]) => {
      editor.updateVertexPosition(index, position);
    },
    [editor]
  );

  // Object mode - render solid mesh
  if (mode === 'object') {
    return (
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#cccccc" />
      </mesh>
    );
  }

  // Edit mode
  return (
    <group>
      {/* Semi-transparent base mesh with wireframe */}
      <EditModeOverlay
        geometry={geometry}
        opacity={transparentOpacity}
        color={overlayColor}
        wireframeColor={wireframeColor}
      />

      {/* Vertex handles - shown in vertex mode */}
      {editMode === 'vertex' &&
        editor.vertices.map((vertex) => (
          <VertexHandle
            key={`vertex-${vertex.index}`}
            vertex={vertex}
            size={vertexSize}
            selected={editor.state.selectedVertices.has(vertex.index)}
            selectedColor={selectedColor}
            defaultColor={defaultVertexColor}
            hoverColor={hoverColor}
            onSelect={editor.selectVertex}
            onMove={handleVertexMove}
            onMoveRealtime={handleVertexMoveRealtime}
          />
        ))}

      {/* Edge lines - shown in edge mode */}
      {editMode === 'edge' &&
        editor.edges.map((edge) => (
          <EdgeLine
            key={`edge-${edge.index}`}
            edge={edge}
            vertices={editor.vertices}
            selected={editor.state.selectedEdges.has(edge.index)}
            selectedColor={selectedColor}
            defaultColor={defaultEdgeColor}
            hoverColor={hoverColor}
            lineWidth={edgeLineWidth}
            onSelect={editor.selectEdge}
            onMoveVertices={editor.moveVerticesByDelta}
            onTransformVertices={editor.transformVertices}
            onCaptureInitialPositions={editor.captureInitialPositions}
          />
        ))}

      {/* Face highlights - shown in face mode */}
      {editMode === 'face' &&
        editor.faces.map((face) => (
          <FaceHighlight
            key={`face-${face.index}`}
            face={face}
            vertices={editor.vertices}
            selected={editor.state.selectedFaces.has(face.index)}
            selectedColor={selectedColor}
            defaultColor={defaultFaceColor}
            hoverColor={hoverColor}
            opacity={transparentOpacity}
            onSelect={editor.selectFace}
            onMoveVertices={editor.moveVerticesByDelta}
          />
        ))}
    </group>
  );
}
