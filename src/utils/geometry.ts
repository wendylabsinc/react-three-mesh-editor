import type { BufferGeometry } from 'three';
import type { VertexData, EdgeData, FaceData } from '../types';

// Round to 6 decimal places to handle floating point precision issues
function roundPosition(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

function positionKey(x: number, y: number, z: number): string {
  return `${roundPosition(x)},${roundPosition(y)},${roundPosition(z)}`;
}

export interface GeometryMappings {
  uniqueVertices: VertexData[];
  // Maps original vertex index to unique vertex index
  vertexIndexMap: Map<number, number>;
}

export function extractVerticesWithMappings(geometry: BufferGeometry): GeometryMappings {
  const positionAttribute = geometry.getAttribute('position');
  if (!positionAttribute) return { uniqueVertices: [], vertexIndexMap: new Map() };

  const uniqueVertices: VertexData[] = [];
  const vertexIndexMap = new Map<number, number>();
  const positionToIndex = new Map<string, number>();
  const vertexCount = positionAttribute.count;

  for (let i = 0; i < vertexCount; i++) {
    const x = positionAttribute.getX(i);
    const y = positionAttribute.getY(i);
    const z = positionAttribute.getZ(i);
    const key = positionKey(x, y, z);

    if (positionToIndex.has(key)) {
      // This position already exists, map to existing unique vertex
      vertexIndexMap.set(i, positionToIndex.get(key)!);
    } else {
      // New unique position
      const uniqueIndex = uniqueVertices.length;
      positionToIndex.set(key, uniqueIndex);
      vertexIndexMap.set(i, uniqueIndex);
      uniqueVertices.push({
        index: uniqueIndex,
        position: [x, y, z],
        selected: false,
        // Store all original indices that map to this unique vertex
        originalIndices: [i],
      });
    }
  }

  // Update originalIndices for vertices that have duplicates
  for (let i = 0; i < vertexCount; i++) {
    const uniqueIndex = vertexIndexMap.get(i)!;
    const vertex = uniqueVertices[uniqueIndex];
    if (!vertex.originalIndices!.includes(i)) {
      vertex.originalIndices!.push(i);
    }
  }

  return { uniqueVertices, vertexIndexMap };
}

export function extractVertices(geometry: BufferGeometry): VertexData[] {
  return extractVerticesWithMappings(geometry).uniqueVertices;
}

export function extractEdges(geometry: BufferGeometry): EdgeData[] {
  const { vertexIndexMap } = extractVerticesWithMappings(geometry);
  const index = geometry.getIndex();
  const edges: EdgeData[] = [];
  const edgeSet = new Set<string>();

  const addEdge = (origV1: number, origV2: number) => {
    // Map to unique vertex indices
    const v1 = vertexIndexMap.get(origV1) ?? origV1;
    const v2 = vertexIndexMap.get(origV2) ?? origV2;

    // Skip degenerate edges (same vertex)
    if (v1 === v2) return;

    const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push({
        index: edges.length,
        vertexIndices: [v1, v2],
        selected: false,
      });
    }
  };

  if (index) {
    const indices = index.array;
    for (let i = 0; i < indices.length; i += 3) {
      addEdge(indices[i], indices[i + 1]);
      addEdge(indices[i + 1], indices[i + 2]);
      addEdge(indices[i + 2], indices[i]);
    }
  } else {
    const positionAttribute = geometry.getAttribute('position');
    if (positionAttribute) {
      const vertexCount = positionAttribute.count;
      for (let i = 0; i < vertexCount; i += 3) {
        addEdge(i, i + 1);
        addEdge(i + 1, i + 2);
        addEdge(i + 2, i);
      }
    }
  }

  return edges;
}

export function extractFaces(geometry: BufferGeometry): FaceData[] {
  const { vertexIndexMap } = extractVerticesWithMappings(geometry);
  const index = geometry.getIndex();
  const faces: FaceData[] = [];
  const faceSet = new Set<string>();

  const addFace = (origV1: number, origV2: number, origV3: number) => {
    // Map to unique vertex indices
    const v1 = vertexIndexMap.get(origV1) ?? origV1;
    const v2 = vertexIndexMap.get(origV2) ?? origV2;
    const v3 = vertexIndexMap.get(origV3) ?? origV3;

    // Create a canonical key for the face (sorted vertex indices)
    const sorted = [v1, v2, v3].sort((a, b) => a - b);
    const key = sorted.join('-');

    if (!faceSet.has(key)) {
      faceSet.add(key);
      faces.push({
        index: faces.length,
        vertexIndices: [v1, v2, v3],
        selected: false,
      });
    }
  };

  if (index) {
    const indices = index.array;
    for (let i = 0; i < indices.length; i += 3) {
      addFace(indices[i], indices[i + 1], indices[i + 2]);
    }
  } else {
    const positionAttribute = geometry.getAttribute('position');
    if (positionAttribute) {
      const vertexCount = positionAttribute.count;
      for (let i = 0; i < vertexCount; i += 3) {
        addFace(i, i + 1, i + 2);
      }
    }
  }

  return faces;
}

export function updateVertexPosition(
  geometry: BufferGeometry,
  vertexIndex: number,
  position: [number, number, number],
  vertices?: VertexData[]
): void {
  const positionAttribute = geometry.getAttribute('position');
  if (!positionAttribute) return;

  // If we have vertex data with original indices, update all of them
  if (vertices && vertices[vertexIndex]?.originalIndices) {
    for (const origIndex of vertices[vertexIndex].originalIndices!) {
      positionAttribute.setXYZ(origIndex, position[0], position[1], position[2]);
    }
  } else {
    positionAttribute.setXYZ(vertexIndex, position[0], position[1], position[2]);
  }

  positionAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

export function moveVertices(
  geometry: BufferGeometry,
  vertexIndices: number[],
  delta: [number, number, number],
  vertices?: VertexData[]
): void {
  const positionAttribute = geometry.getAttribute('position');
  if (!positionAttribute) return;

  // Collect all original buffer indices to update
  const indicesToUpdate = new Set<number>();

  for (const index of vertexIndices) {
    if (vertices && vertices[index]?.originalIndices) {
      for (const origIndex of vertices[index].originalIndices!) {
        indicesToUpdate.add(origIndex);
      }
    } else {
      indicesToUpdate.add(index);
    }
  }

  for (const index of indicesToUpdate) {
    const x = positionAttribute.getX(index) + delta[0];
    const y = positionAttribute.getY(index) + delta[1];
    const z = positionAttribute.getZ(index) + delta[2];
    positionAttribute.setXYZ(index, x, y, z);
  }

  positionAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

export function getFaceCenter(face: FaceData, vertices: VertexData[]): [number, number, number] {
  const v1 = vertices[face.vertexIndices[0]];
  const v2 = vertices[face.vertexIndices[1]];
  const v3 = vertices[face.vertexIndices[2]];

  return [
    (v1.position[0] + v2.position[0] + v3.position[0]) / 3,
    (v1.position[1] + v2.position[1] + v3.position[1]) / 3,
    (v1.position[2] + v2.position[2] + v3.position[2]) / 3,
  ];
}

export function getEdgeCenter(edge: EdgeData, vertices: VertexData[]): [number, number, number] {
  const v1 = vertices[edge.vertexIndices[0]];
  const v2 = vertices[edge.vertexIndices[1]];

  return [
    (v1.position[0] + v2.position[0]) / 2,
    (v1.position[1] + v2.position[1]) / 2,
    (v1.position[2] + v2.position[2]) / 2,
  ];
}
