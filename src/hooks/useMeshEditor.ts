import { useState, useCallback, useMemo, useRef } from 'react';
import type { BufferGeometry } from 'three';
import type { EditorMode, EditMode, MeshEditorState, VertexData, EdgeData, FaceData } from '../types';
import { extractVertices, extractEdges, extractFaces, moveVertices, updateVertexPosition, transformVerticesAroundCenter } from '../utils/geometry';

export interface UseMeshEditorOptions {
  geometry: BufferGeometry;
  initialMode?: EditorMode;
  initialEditMode?: EditMode;
  onGeometryChange?: (geometry: BufferGeometry) => void;
}

export interface UseMeshEditorReturn {
  state: MeshEditorState;
  vertices: VertexData[];
  edges: EdgeData[];
  faces: FaceData[];
  setMode: (mode: EditorMode) => void;
  setEditMode: (editMode: EditMode) => void;
  selectVertex: (index: number, addToSelection?: boolean) => void;
  selectEdge: (index: number, addToSelection?: boolean) => void;
  selectFace: (index: number, addToSelection?: boolean) => void;
  deselectAll: () => void;
  moveSelectedVertices: (delta: [number, number, number]) => void;
  moveVerticesByDelta: (vertexIndices: number[], delta: [number, number, number]) => void;
  updateVertexPosition: (index: number, position: [number, number, number]) => void;
  transformVertices: (
    vertexIndices: number[],
    center: [number, number, number],
    rotation: { x: number; y: number; z: number; w: number },
    scale: [number, number, number]
  ) => void;
  captureInitialPositions: (vertexIndices: number[]) => void;
  refreshGeometry: () => void;
}

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
