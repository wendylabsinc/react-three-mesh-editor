import { useState, useCallback, useMemo, useRef } from 'react';
import type { BufferGeometry } from 'three';
import type { EditorMode, EditMode, MeshEditorState, VertexData, EdgeData, FaceData } from '../types';
import { extractVertices, extractEdges, extractFaces, moveVertices, updateVertexPosition, transformVerticesAroundCenter } from '../utils/geometry';

/**
 * Options for the useMeshEditor hook.
 */
export interface UseMeshEditorOptions {
  /** The Three.js BufferGeometry to edit */
  geometry: BufferGeometry;
  /** Initial editor mode @default 'object' */
  initialMode?: EditorMode;
  /** Initial edit sub-mode @default 'vertex' */
  initialEditMode?: EditMode;
  /** Callback fired when geometry is modified */
  onGeometryChange?: (geometry: BufferGeometry) => void;
}

/**
 * Return value of the useMeshEditor hook.
 */
export interface UseMeshEditorReturn {
  /** Current editor state including mode and selections */
  state: MeshEditorState;
  /** Array of deduplicated vertices extracted from geometry */
  vertices: VertexData[];
  /** Array of edges extracted from geometry */
  edges: EdgeData[];
  /** Array of faces extracted from geometry */
  faces: FaceData[];
  /** Set the editor mode (object or edit) */
  setMode: (mode: EditorMode) => void;
  /** Set the edit sub-mode (vertex, edge, or face) */
  setEditMode: (editMode: EditMode) => void;
  /** Select or toggle a vertex. Use addToSelection for multi-select. */
  selectVertex: (index: number, addToSelection?: boolean) => void;
  /** Select or toggle an edge. Use addToSelection for multi-select. */
  selectEdge: (index: number, addToSelection?: boolean) => void;
  /** Select or toggle a face. Use addToSelection for multi-select. */
  selectFace: (index: number, addToSelection?: boolean) => void;
  /** Clear all selections */
  deselectAll: () => void;
  /** Move all selected vertices by a delta [x, y, z] */
  moveSelectedVertices: (delta: [number, number, number]) => void;
  /** Move specific vertices by a delta [x, y, z] */
  moveVerticesByDelta: (vertexIndices: number[], delta: [number, number, number]) => void;
  /** Set a vertex to an absolute position */
  updateVertexPosition: (index: number, position: [number, number, number]) => void;
  /** Apply rotation and scale transformation around a center point */
  transformVertices: (
    vertexIndices: number[],
    center: [number, number, number],
    rotation: { x: number; y: number; z: number; w: number },
    scale: [number, number, number]
  ) => void;
  /** Capture vertex positions before a transform operation (for undo/accumulation) */
  captureInitialPositions: (vertexIndices: number[]) => void;
  /** Force re-extraction of geometry data */
  refreshGeometry: () => void;
}

/**
 * Hook for managing mesh editor state and operations.
 *
 * Provides all the state and methods needed to implement a mesh editor,
 * including selection management, vertex manipulation, and geometry updates.
 *
 * @example
 * ```tsx
 * const editor = useMeshEditor({
 *   geometry: myGeometry,
 *   onGeometryChange: (geo) => console.log('Geometry changed'),
 * });
 *
 * // Select a vertex
 * editor.selectVertex(0);
 *
 * // Move selected vertices
 * editor.moveSelectedVertices([0.1, 0, 0]);
 * ```
 */
export function useMeshEditor({
  geometry,
  initialMode = 'object',
  initialEditMode = 'vertex',
  onGeometryChange,
}: UseMeshEditorOptions): UseMeshEditorReturn {
  const [state, setState] = useState<MeshEditorState>({
    mode: initialMode,
    editMode: initialEditMode,
    selectedVertices: new Set(),
    selectedEdges: new Set(),
    selectedFaces: new Set(),
  });

  const [geometryVersion, setGeometryVersion] = useState(0);

  // Store initial positions for rotation/scale operations
  const initialPositionsRef = useRef<Map<number, [number, number, number]>>(new Map());

  // geometryVersion is used to force re-extraction when geometry buffer changes
  const vertices = useMemo(
    () => extractVertices(geometry),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geometry, geometryVersion]
  );

  const edges = useMemo(
    () => extractEdges(geometry),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geometry, geometryVersion]
  );

  const faces = useMemo(
    () => extractFaces(geometry),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [geometry, geometryVersion]
  );

  const setMode = useCallback((mode: EditorMode) => {
    setState((prev) => ({
      ...prev,
      mode,
      selectedVertices: new Set(),
      selectedEdges: new Set(),
      selectedFaces: new Set(),
    }));
  }, []);

  const setEditMode = useCallback((editMode: EditMode) => {
    setState((prev) => ({
      ...prev,
      editMode,
      selectedVertices: new Set(),
      selectedEdges: new Set(),
      selectedFaces: new Set(),
    }));
  }, []);

  const selectVertex = useCallback((index: number, addToSelection = false) => {
    setState((prev) => {
      const newSelected = addToSelection ? new Set(prev.selectedVertices) : new Set<number>();
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      return { ...prev, selectedVertices: newSelected };
    });
  }, []);

  const selectEdge = useCallback((index: number, addToSelection = false) => {
    setState((prev) => {
      const newSelected = addToSelection ? new Set(prev.selectedEdges) : new Set<number>();
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      return { ...prev, selectedEdges: newSelected };
    });
  }, []);

  const selectFace = useCallback((index: number, addToSelection = false) => {
    setState((prev) => {
      const newSelected = addToSelection ? new Set(prev.selectedFaces) : new Set<number>();
      if (newSelected.has(index)) {
        newSelected.delete(index);
      } else {
        newSelected.add(index);
      }
      return { ...prev, selectedFaces: newSelected };
    });
  }, []);

  const deselectAll = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedVertices: new Set(),
      selectedEdges: new Set(),
      selectedFaces: new Set(),
    }));
  }, []);

  const handleMoveSelectedVertices = useCallback(
    (delta: [number, number, number]) => {
      const indices = Array.from(state.selectedVertices);
      if (indices.length === 0) return;

      moveVertices(geometry, indices, delta, vertices);
      setGeometryVersion((v) => v + 1);
      onGeometryChange?.(geometry);
    },
    [geometry, state.selectedVertices, onGeometryChange, vertices]
  );

  const handleUpdateVertexPosition = useCallback(
    (index: number, position: [number, number, number]) => {
      updateVertexPosition(geometry, index, position, vertices);
      setGeometryVersion((v) => v + 1);
      onGeometryChange?.(geometry);
    },
    [geometry, onGeometryChange, vertices]
  );

  const handleMoveVerticesByDelta = useCallback(
    (vertexIndices: number[], delta: [number, number, number]) => {
      if (vertexIndices.length === 0) return;
      moveVertices(geometry, vertexIndices, delta, vertices);
      setGeometryVersion((v) => v + 1);
      onGeometryChange?.(geometry);
    },
    [geometry, onGeometryChange, vertices]
  );

  const refreshGeometry = useCallback(() => {
    setGeometryVersion((v) => v + 1);
  }, []);

  const handleCaptureInitialPositions = useCallback(
    (vertexIndices: number[]) => {
      initialPositionsRef.current.clear();
      for (const idx of vertexIndices) {
        const v = vertices[idx];
        if (v) {
          initialPositionsRef.current.set(idx, [...v.position]);
        }
      }
    },
    [vertices]
  );

  const handleTransformVertices = useCallback(
    (
      vertexIndices: number[],
      center: [number, number, number],
      rotation: { x: number; y: number; z: number; w: number },
      scale: [number, number, number]
    ) => {
      if (vertexIndices.length === 0) return;
      transformVerticesAroundCenter(
        geometry,
        vertexIndices,
        center,
        rotation,
        scale,
        vertices,
        initialPositionsRef.current
      );
      setGeometryVersion((v) => v + 1);
      onGeometryChange?.(geometry);
    },
    [geometry, onGeometryChange, vertices]
  );

  return {
    state,
    vertices,
    edges,
    faces,
    setMode,
    setEditMode,
    selectVertex,
    selectEdge,
    selectFace,
    deselectAll,
    moveSelectedVertices: handleMoveSelectedVertices,
    moveVerticesByDelta: handleMoveVerticesByDelta,
    updateVertexPosition: handleUpdateVertexPosition,
    transformVertices: handleTransformVertices,
    captureInitialPositions: handleCaptureInitialPositions,
    refreshGeometry,
  };
}
