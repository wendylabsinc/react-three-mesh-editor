import { createContext, useContext, type ReactNode } from 'react';
import type { MeshEditorContextValue, MeshEditorProviderOptions } from '../types';
import { useMeshEditor } from '../hooks/useMeshEditor';

const MeshEditorContext = createContext<MeshEditorContextValue | null>(null);

export interface MeshEditorProviderProps extends MeshEditorProviderOptions {
  children: ReactNode;
}

export function MeshEditorProvider({
  geometry,
  onGeometryChange,
  initialMode = 'object',
  initialEditMode = 'vertex',
  children,
}: MeshEditorProviderProps) {
  const editor = useMeshEditor({
    geometry,
    initialMode,
    initialEditMode,
    onGeometryChange,
  });

  const contextValue: MeshEditorContextValue = {
    state: editor.state,
    setMode: editor.setMode,
    setEditMode: editor.setEditMode,
    selectVertex: editor.selectVertex,
    selectEdge: editor.selectEdge,
    selectFace: editor.selectFace,
    deselectAll: editor.deselectAll,
    moveSelectedVertices: editor.moveSelectedVertices,
    geometry,
    vertices: editor.vertices,
    edges: editor.edges,
    faces: editor.faces,
  };

  return (
    <MeshEditorContext.Provider value={contextValue}>
      {children}
    </MeshEditorContext.Provider>
  );
}

export function useMeshEditorContext(): MeshEditorContextValue {
  const context = useContext(MeshEditorContext);
  if (!context) {
    throw new Error('useMeshEditorContext must be used within a MeshEditorProvider');
  }
  return context;
}

export { MeshEditorContext };
