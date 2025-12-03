import type { BufferGeometry } from 'three';
import type { EditorMode, EditMode } from '../types';
import { useMeshEditor, type UseMeshEditorReturn } from '../hooks/useMeshEditor';
import { VertexHandle, type VertexControlRenderProps } from './VertexHandle';
import { EdgeLine, type EdgeControlRenderProps } from './EdgeLine';
import { FaceHighlight, type FaceControlRenderProps } from './FaceHighlight';
import { EditModeOverlay } from './EditModeOverlay';
import { MeshOutline } from './MeshOutline';

/**
 * Props for the MeshEditor component.
 */
export interface MeshEditorProps {
  /** The Three.js BufferGeometry to edit (modified by reference) */
  geometry: BufferGeometry;
  /** Current editor mode. When provided, component is controlled. */
  mode?: EditorMode;
  /** Current edit sub-mode. When provided, component is controlled. */
  editMode?: EditMode;
  /** Callback fired when mode changes (for controlled usage) */
  onModeChange?: (mode: EditorMode) => void;
  /** Callback fired when edit mode changes (for controlled usage) */
  onEditModeChange?: (editMode: EditMode) => void;
  /** Callback fired when geometry vertices are modified */
  onGeometryChange?: (geometry: BufferGeometry) => void;
  /** Size of vertex handle cubes in world units @default 0.05 */
  vertexSize?: number;
  /** Width of edge lines in pixels @default 2 */
  edgeLineWidth?: number;
  /** Color of selected elements @default '#ff6b00' */
  selectedColor?: string;
  /** Default color of unselected vertices @default '#4a90d9' */
  defaultVertexColor?: string;
  /** Default color of unselected edges @default '#ffffff' */
  defaultEdgeColor?: string;
  /** Default color of unselected faces @default '#4a90d9' */
  defaultFaceColor?: string;
  /** Color of hovered elements @default '#7bb3e0' */
  hoverColor?: string;
  /** Opacity of semi-transparent elements @default 0.3 */
  transparentOpacity?: number;
  /** Color of the mesh overlay in edit mode @default '#6699cc' */
  overlayColor?: string;
  /** Color of the wireframe in edit mode @default '#ffffff' */
  wireframeColor?: string;
  /** Whether the object is selected (shows outline in object mode) @default false */
  selected?: boolean;
  /** Whether to show the selection outline @default true */
  showOutline?: boolean;
  /** Color of the selection outline (defaults to selectedColor) */
  outlineColor?: string;
  /** Thickness of the selection outline @default 0.03 */
  outlineThickness?: number;
  /**
   * Render function for custom vertex controls.
   * For vertices, only translation makes sense (no rotation/scale).
   */
  renderVertexControl?: (props: VertexControlRenderProps) => React.ReactNode;
  /**
   * Render function for custom edge controls.
   * Supports translation, rotation, and scale.
   */
  renderEdgeControl?: (props: EdgeControlRenderProps) => React.ReactNode;
  /**
   * Render function for custom face controls.
   * Supports translation, rotation, and scale.
   */
  renderFaceControl?: (props: FaceControlRenderProps) => React.ReactNode;
  /**
   * External editor instance for controlled mode.
   * When provided, the component uses this editor instead of creating its own.
   * This is useful for accessing editor methods like extrudeFace from parent components.
   */
  editor?: UseMeshEditorReturn;
}

/**
 * Main mesh editor component for React Three Fiber.
 *
 * Provides Blender-like mesh editing with object and edit modes.
 * In edit mode, supports vertex, edge, and face selection/manipulation.
 *
 * **Important:** Use one MeshEditor per Canvas. The component modifies
 * the BufferGeometry by reference.
 *
 * **Bring Your Own Controls:** Use the `renderVertexControl`, `renderEdgeControl`,
 * and `renderFaceControl` props to provide custom transform controls.
 * See the Storybook examples for PivotControls integration.
 *
 * @example
 * ```tsx
 * import { Canvas } from '@react-three/fiber';
 * import { PivotControls } from '@react-three/drei';
 * import { MeshEditor } from 'react-three-mesh-editor';
 * import { BoxGeometry, Vector3, Matrix4 } from 'three';
 *
 * function App() {
 *   const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
 *
 *   return (
 *     <Canvas>
 *       <MeshEditor
 *         geometry={geometry}
 *         mode="edit"
 *         editMode="vertex"
 *         renderVertexControl={({ vertex, onMove }) => (
 *           <PivotControls
 *             matrix={new Matrix4().setPosition(...vertex.position)}
 *             onDrag={(matrix) => {
 *               const pos = new Vector3().setFromMatrixPosition(matrix);
 *               onMove([pos.x, pos.y, pos.z]);
 *             }}
 *           />
 *         )}
 *       />
 *     </Canvas>
 *   );
 * }
 * ```
 */
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
  selected = false,
  showOutline = true,
  outlineColor,
  outlineThickness = 0.03,
  renderVertexControl,
  renderEdgeControl,
  renderFaceControl,
  editor: externalEditor,
}: MeshEditorProps) {
  const internalEditor = useMeshEditor({
    geometry,
    initialMode: externalMode ?? 'object',
    initialEditMode: externalEditMode ?? 'vertex',
    onGeometryChange,
  });

  // Use external editor if provided, otherwise use internal
  const editor = externalEditor ?? internalEditor;

  const mode = externalMode ?? editor.state.mode;
  const editMode = externalEditMode ?? editor.state.editMode;

  // Use currentGeometry from editor (supports extrusion), fall back to prop
  const activeGeometry = editor.currentGeometry ?? geometry;

  // Compute the actual outline color (default to selectedColor)
  const actualOutlineColor = outlineColor ?? selectedColor;

  // Object mode - render solid mesh with optional selection outline
  if (mode === 'object') {
    return (
      <group>
        <mesh geometry={activeGeometry}>
          <meshStandardMaterial color="#cccccc" />
        </mesh>
        {selected && showOutline && (
          <MeshOutline
            geometry={activeGeometry}
            color={actualOutlineColor}
            thickness={outlineThickness}
          />
        )}
      </group>
    );
  }

  // Edit mode
  return (
    <group>
      {/* Semi-transparent base mesh with wireframe */}
      <EditModeOverlay
        geometry={activeGeometry}
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
            onMove={editor.updateVertexPosition}
            renderControl={renderVertexControl}
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
            renderControl={renderEdgeControl}
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
            onTransformVertices={editor.transformVertices}
            onCaptureInitialPositions={editor.captureInitialPositions}
            renderControl={renderFaceControl}
          />
        ))}
    </group>
  );
}
