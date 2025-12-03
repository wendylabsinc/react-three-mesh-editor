import type { BufferGeometry } from 'three';

export type EditorMode = 'object' | 'edit';

export type EditMode = 'vertex' | 'edge' | 'face';

export interface VertexData {
  index: number;
  position: [number, number, number];
  selected: boolean;
  // Original buffer indices that share this position (for non-indexed geometries)
  originalIndices?: number[];
}

export interface EdgeData {
  index: number;
  vertexIndices: [number, number];
  selected: boolean;
}

export interface FaceData {
  index: number;
  vertexIndices: [number, number, number];
  selected: boolean;
}

export interface MeshEditorState {
  mode: EditorMode;
  editMode: EditMode;
  selectedVertices: Set<number>;
  selectedEdges: Set<number>;
  selectedFaces: Set<number>;
}

export interface MeshEditorProviderOptions {
  geometry: BufferGeometry;
  onGeometryChange?: (geometry: BufferGeometry) => void;
  initialMode?: EditorMode;
  initialEditMode?: EditMode;
  vertexSize?: number;
  edgeColor?: string;
  selectedColor?: string;
  hoverColor?: string;
  transparentOpacity?: number;
}

export interface MeshEditorContextValue {
  state: MeshEditorState;
  setMode: (mode: EditorMode) => void;
  setEditMode: (editMode: EditMode) => void;
  selectVertex: (index: number, addToSelection?: boolean) => void;
  selectEdge: (index: number, addToSelection?: boolean) => void;
  selectFace: (index: number, addToSelection?: boolean) => void;
  deselectAll: () => void;
  moveSelectedVertices: (delta: [number, number, number]) => void;
  geometry: BufferGeometry;
  vertices: VertexData[];
  edges: EdgeData[];
  faces: FaceData[];
}
