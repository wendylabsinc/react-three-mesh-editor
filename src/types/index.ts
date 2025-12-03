import type { BufferGeometry } from 'three';

/**
 * The main mode of the mesh editor.
 * - `'object'`: View-only mode with solid mesh rendering
 * - `'edit'`: Interactive editing mode with vertex/edge/face selection
 */
export type EditorMode = 'object' | 'edit';

/**
 * The sub-mode when in edit mode, determining what elements can be selected.
 * - `'vertex'`: Select and manipulate individual vertices
 * - `'edge'`: Select and manipulate edges (pairs of vertices)
 * - `'face'`: Select and manipulate faces (triangles)
 */
export type EditMode = 'vertex' | 'edge' | 'face';

/**
 * Represents a unique vertex in the mesh geometry.
 * Vertices at the same position are deduplicated and share the same VertexData.
 */
export interface VertexData {
  /** Unique index of this vertex in the deduplicated vertex array */
  index: number;
  /** 3D position as [x, y, z] tuple */
  position: [number, number, number];
  /** Whether this vertex is currently selected */
  selected: boolean;
  /** Original buffer attribute indices that map to this unique vertex position */
  originalIndices?: number[];
}

/**
 * Represents an edge connecting two vertices.
 */
export interface EdgeData {
  /** Unique index of this edge */
  index: number;
  /** Indices of the two vertices that form this edge */
  vertexIndices: [number, number];
  /** Whether this edge is currently selected */
  selected: boolean;
}

/**
 * Represents a triangular face defined by three vertices.
 */
export interface FaceData {
  /** Unique index of this face */
  index: number;
  /** Indices of the three vertices that form this face */
  vertexIndices: [number, number, number];
  /** Whether this face is currently selected */
  selected: boolean;
}

/**
 * Internal state of the mesh editor.
 */
export interface MeshEditorState {
  /** Current editor mode (object or edit) */
  mode: EditorMode;
  /** Current edit sub-mode (vertex, edge, or face) */
  editMode: EditMode;
  /** Set of selected vertex indices */
  selectedVertices: Set<number>;
  /** Set of selected edge indices */
  selectedEdges: Set<number>;
  /** Set of selected face indices */
  selectedFaces: Set<number>;
}

/**
 * Configuration options for the MeshEditorProvider.
 */
export interface MeshEditorProviderOptions {
  /** The Three.js BufferGeometry to edit */
  geometry: BufferGeometry;
  /** Callback fired when the geometry is modified */
  onGeometryChange?: (geometry: BufferGeometry) => void;
  /** Initial editor mode */
  initialMode?: EditorMode;
  /** Initial edit sub-mode */
  initialEditMode?: EditMode;
  /** Size of vertex handle spheres */
  vertexSize?: number;
  /** Color of unselected edges */
  edgeColor?: string;
  /** Color of selected elements */
  selectedColor?: string;
  /** Color of hovered elements */
  hoverColor?: string;
  /** Opacity of the semi-transparent mesh overlay in edit mode */
  transparentOpacity?: number;
}

/**
 * Context value provided by MeshEditorProvider.
 * Contains state and methods for controlling the mesh editor.
 */
export interface MeshEditorContextValue {
  /** Current editor state */
  state: MeshEditorState;
  /** Set the editor mode (object or edit) */
  setMode: (mode: EditorMode) => void;
  /** Set the edit sub-mode (vertex, edge, or face) */
  setEditMode: (editMode: EditMode) => void;
  /** Select or toggle selection of a vertex */
  selectVertex: (index: number, addToSelection?: boolean) => void;
  /** Select or toggle selection of an edge */
  selectEdge: (index: number, addToSelection?: boolean) => void;
  /** Select or toggle selection of a face */
  selectFace: (index: number, addToSelection?: boolean) => void;
  /** Clear all selections */
  deselectAll: () => void;
  /** Move all selected vertices by a delta */
  moveSelectedVertices: (delta: [number, number, number]) => void;
  /** The geometry being edited */
  geometry: BufferGeometry;
  /** Array of all vertices extracted from the geometry */
  vertices: VertexData[];
  /** Array of all edges extracted from the geometry */
  edges: EdgeData[];
  /** Array of all faces extracted from the geometry */
  faces: FaceData[];
}
