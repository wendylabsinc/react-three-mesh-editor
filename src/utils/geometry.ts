import { BufferGeometry, BufferAttribute, Vector3 } from 'three';
import type { VertexData, EdgeData, FaceData } from '../types';

/**
 * Round to 6 decimal places to handle floating point precision issues.
 * @internal
 */
function roundPosition(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

/**
 * Create a unique key for a 3D position.
 * @internal
 */
function positionKey(x: number, y: number, z: number): string {
  return `${roundPosition(x)},${roundPosition(y)},${roundPosition(z)}`;
}

/**
 * Result of extracting vertices with position deduplication mappings.
 */
export interface GeometryMappings {
  /** Array of unique vertices (deduplicated by position) */
  uniqueVertices: VertexData[];
  /** Maps original buffer index to unique vertex index */
  vertexIndexMap: Map<number, number>;
}

/**
 * Extract vertices from a BufferGeometry with position deduplication.
 *
 * Vertices at the same position are merged into a single VertexData entry,
 * with originalIndices tracking all buffer indices that share that position.
 *
 * @param geometry - The Three.js BufferGeometry to extract from
 * @returns Mappings containing unique vertices and index mapping
 */
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

/**
 * Extract unique vertices from a BufferGeometry.
 *
 * @param geometry - The Three.js BufferGeometry to extract from
 * @returns Array of deduplicated vertices
 */
export function extractVertices(geometry: BufferGeometry): VertexData[] {
  return extractVerticesWithMappings(geometry).uniqueVertices;
}

/**
 * Extract edges from a BufferGeometry.
 *
 * Edges are deduplicated and reference unique vertex indices.
 *
 * @param geometry - The Three.js BufferGeometry to extract from
 * @returns Array of unique edges
 */
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

/**
 * Extract faces (triangles) from a BufferGeometry.
 *
 * Faces are deduplicated and reference unique vertex indices.
 *
 * @param geometry - The Three.js BufferGeometry to extract from
 * @returns Array of unique faces
 */
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

/**
 * Update a vertex to an absolute position.
 *
 * Handles deduplicated vertices by updating all original buffer indices.
 *
 * @param geometry - The BufferGeometry to modify
 * @param vertexIndex - Index of the unique vertex
 * @param position - New absolute position [x, y, z]
 * @param vertices - Optional vertex data for deduplication mapping
 */
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

/**
 * Move multiple vertices by a delta offset.
 *
 * Handles deduplicated vertices by updating all original buffer indices.
 *
 * @param geometry - The BufferGeometry to modify
 * @param vertexIndices - Array of unique vertex indices to move
 * @param delta - Offset to apply [dx, dy, dz]
 * @param vertices - Optional vertex data for deduplication mapping
 */
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

/**
 * Calculate the center point of a face.
 *
 * @param face - The face data
 * @param vertices - Array of vertices for position lookup
 * @returns Center position [x, y, z]
 */
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

/**
 * Calculate the center point of an edge.
 *
 * @param edge - The edge data
 * @param vertices - Array of vertices for position lookup
 * @returns Center position [x, y, z]
 */
export function getEdgeCenter(edge: EdgeData, vertices: VertexData[]): [number, number, number] {
  const v1 = vertices[edge.vertexIndices[0]];
  const v2 = vertices[edge.vertexIndices[1]];

  return [
    (v1.position[0] + v2.position[0]) / 2,
    (v1.position[1] + v2.position[1]) / 2,
    (v1.position[2] + v2.position[2]) / 2,
  ];
}

/**
 * Apply rotation and scale transformation to vertices around a center point.
 *
 * Uses quaternion rotation and scales vertices relative to the center.
 * Uses initial positions if provided to prevent cumulative drift during dragging.
 *
 * @param geometry - The BufferGeometry to modify
 * @param vertexIndices - Array of unique vertex indices to transform
 * @param center - Center point for the transformation
 * @param rotation - Quaternion rotation as {x, y, z, w}
 * @param scale - Scale factors [sx, sy, sz]
 * @param vertices - Optional vertex data for deduplication mapping
 * @param initialPositions - Optional captured initial positions
 */
export function transformVerticesAroundCenter(
  geometry: BufferGeometry,
  vertexIndices: number[],
  center: [number, number, number],
  rotation: { x: number; y: number; z: number; w: number },
  scale: [number, number, number],
  vertices?: VertexData[],
  initialPositions?: Map<number, [number, number, number]>
): void {
  const positionAttribute = geometry.getAttribute('position');
  if (!positionAttribute) return;

  // Collect all original buffer indices to update
  const indicesToUpdate = new Map<number, number>(); // originalIndex -> uniqueIndex

  for (const index of vertexIndices) {
    if (vertices && vertices[index]?.originalIndices) {
      for (const origIndex of vertices[index].originalIndices!) {
        indicesToUpdate.set(origIndex, index);
      }
    } else {
      indicesToUpdate.set(index, index);
    }
  }

  // Apply transformation to each vertex
  for (const [origIndex, uniqueIndex] of indicesToUpdate) {
    // Get initial position (from captured positions or current)
    let initialX: number, initialY: number, initialZ: number;
    if (initialPositions && initialPositions.has(uniqueIndex)) {
      const pos = initialPositions.get(uniqueIndex)!;
      initialX = pos[0];
      initialY = pos[1];
      initialZ = pos[2];
    } else {
      initialX = positionAttribute.getX(origIndex);
      initialY = positionAttribute.getY(origIndex);
      initialZ = positionAttribute.getZ(origIndex);
    }

    // Translate to origin (relative to center)
    let x = initialX - center[0];
    let y = initialY - center[1];
    let z = initialZ - center[2];

    // Apply scale
    x *= scale[0];
    y *= scale[1];
    z *= scale[2];

    // Apply rotation (quaternion rotation)
    const qx = rotation.x;
    const qy = rotation.y;
    const qz = rotation.z;
    const qw = rotation.w;

    // Rotate point by quaternion: p' = q * p * q^-1
    // Optimized formula for rotating a vector by a quaternion
    const ix = qw * x + qy * z - qz * y;
    const iy = qw * y + qz * x - qx * z;
    const iz = qw * z + qx * y - qy * x;
    const iw = -qx * x - qy * y - qz * z;

    const rx = ix * qw + iw * -qx + iy * -qz - iz * -qy;
    const ry = iy * qw + iw * -qy + iz * -qx - ix * -qz;
    const rz = iz * qw + iw * -qz + ix * -qy - iy * -qx;

    // Translate back from origin
    const finalX = rx + center[0];
    const finalY = ry + center[1];
    const finalZ = rz + center[2];

    positionAttribute.setXYZ(origIndex, finalX, finalY, finalZ);
  }

  positionAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
}

/**
 * Result of a face extrusion operation.
 */
export interface ExtrudeFaceResult {
  /** The new geometry with extruded face */
  geometry: BufferGeometry;
  /** Buffer indices of the new vertices created for the extruded face */
  extrudedVertexBufferIndices: number[];
  /** Face index of the extruded top face in the new geometry */
  extrudedFaceIndex: number;
}

/**
 * Calculate the normal vector of a face.
 * @internal
 */
function calculateFaceNormal(
  v1: [number, number, number],
  v2: [number, number, number],
  v3: [number, number, number]
): Vector3 {
  const a = new Vector3(v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]);
  const b = new Vector3(v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]);
  return a.cross(b).normalize();
}

/**
 * Extrude a face from a BufferGeometry.
 *
 * Creates a new geometry with the face extruded by the specified distance.
 * The original face vertices are duplicated and moved along the face normal,
 * and new side faces are created to connect the original and extruded faces.
 *
 * @param geometry - The original BufferGeometry
 * @param faceIndex - Index of the face to extrude
 * @param distance - Distance to extrude (positive = outward along normal)
 * @param vertices - Vertex data for position lookup
 * @param faces - Face data for the geometry
 * @returns Result containing the new geometry and indices of new vertices
 */
export function extrudeFace(
  geometry: BufferGeometry,
  faceIndex: number,
  distance: number,
  vertices: VertexData[],
  faces: FaceData[]
): ExtrudeFaceResult {
  const face = faces[faceIndex];
  if (!face) {
    throw new Error(`Face index ${faceIndex} not found`);
  }

  const positionAttribute = geometry.getAttribute('position');
  const indexAttribute = geometry.getIndex();

  if (!positionAttribute) {
    throw new Error('Geometry has no position attribute');
  }

  // Get the original face vertices
  const v1 = vertices[face.vertexIndices[0]];
  const v2 = vertices[face.vertexIndices[1]];
  const v3 = vertices[face.vertexIndices[2]];

  // Calculate face normal
  const normal = calculateFaceNormal(v1.position, v2.position, v3.position);

  // Calculate new vertex positions (extruded along normal)
  const newV1: [number, number, number] = [
    v1.position[0] + normal.x * distance,
    v1.position[1] + normal.y * distance,
    v1.position[2] + normal.z * distance,
  ];
  const newV2: [number, number, number] = [
    v2.position[0] + normal.x * distance,
    v2.position[1] + normal.y * distance,
    v2.position[2] + normal.z * distance,
  ];
  const newV3: [number, number, number] = [
    v3.position[0] + normal.x * distance,
    v3.position[1] + normal.y * distance,
    v3.position[2] + normal.z * distance,
  ];

  // Create new position array with additional vertices
  const oldPositions = positionAttribute.array as Float32Array;
  const oldVertexCount = positionAttribute.count;
  const newVertexCount = oldVertexCount + 3;
  const newPositions = new Float32Array(newVertexCount * 3);

  // Copy old positions
  newPositions.set(oldPositions);

  // Add new vertices at the end
  const newVertexStartIndex = oldVertexCount;
  newPositions[newVertexStartIndex * 3] = newV1[0];
  newPositions[newVertexStartIndex * 3 + 1] = newV1[1];
  newPositions[newVertexStartIndex * 3 + 2] = newV1[2];

  newPositions[(newVertexStartIndex + 1) * 3] = newV2[0];
  newPositions[(newVertexStartIndex + 1) * 3 + 1] = newV2[1];
  newPositions[(newVertexStartIndex + 1) * 3 + 2] = newV2[2];

  newPositions[(newVertexStartIndex + 2) * 3] = newV3[0];
  newPositions[(newVertexStartIndex + 2) * 3 + 1] = newV3[1];
  newPositions[(newVertexStartIndex + 2) * 3 + 2] = newV3[2];

  // Get original vertex buffer indices for the face
  let origIdx1: number, origIdx2: number, origIdx3: number;

  if (v1.originalIndices && v1.originalIndices.length > 0) {
    origIdx1 = v1.originalIndices[0];
  } else {
    origIdx1 = face.vertexIndices[0];
  }

  if (v2.originalIndices && v2.originalIndices.length > 0) {
    origIdx2 = v2.originalIndices[0];
  } else {
    origIdx2 = face.vertexIndices[1];
  }

  if (v3.originalIndices && v3.originalIndices.length > 0) {
    origIdx3 = v3.originalIndices[0];
  } else {
    origIdx3 = face.vertexIndices[2];
  }

  // New vertex buffer indices
  const nv1 = newVertexStartIndex;
  const nv2 = newVertexStartIndex + 1;
  const nv3 = newVertexStartIndex + 2;

  // Create new index array
  let oldIndices: Uint16Array | Uint32Array;
  if (indexAttribute) {
    oldIndices = indexAttribute.array as Uint16Array | Uint32Array;
  } else {
    // Create indices for non-indexed geometry
    oldIndices = new Uint16Array(oldVertexCount);
    for (let i = 0; i < oldVertexCount; i++) {
      oldIndices[i] = i;
    }
  }

  // New indices: old triangles + top face (3) + 6 side triangles (18)
  const newIndicesCount = oldIndices.length + 3 + 18;
  const newIndices = new Uint32Array(newIndicesCount);

  // Copy old indices
  newIndices.set(oldIndices);

  let idx = oldIndices.length;

  // Add top face (the extruded face)
  newIndices[idx++] = nv1;
  newIndices[idx++] = nv2;
  newIndices[idx++] = nv3;

  // Add side faces (3 quads, each made of 2 triangles)
  // Side 1: origIdx1-origIdx2-nv2-nv1
  newIndices[idx++] = origIdx1;
  newIndices[idx++] = origIdx2;
  newIndices[idx++] = nv2;

  newIndices[idx++] = origIdx1;
  newIndices[idx++] = nv2;
  newIndices[idx++] = nv1;

  // Side 2: origIdx2-origIdx3-nv3-nv2
  newIndices[idx++] = origIdx2;
  newIndices[idx++] = origIdx3;
  newIndices[idx++] = nv3;

  newIndices[idx++] = origIdx2;
  newIndices[idx++] = nv3;
  newIndices[idx++] = nv2;

  // Side 3: origIdx3-origIdx1-nv1-nv3
  newIndices[idx++] = origIdx3;
  newIndices[idx++] = origIdx1;
  newIndices[idx++] = nv1;

  newIndices[idx++] = origIdx3;
  newIndices[idx++] = nv1;
  newIndices[idx++] = nv3;

  // Create new geometry
  const newGeometry = new BufferGeometry();
  newGeometry.setAttribute('position', new BufferAttribute(newPositions, 3));
  newGeometry.setIndex(new BufferAttribute(newIndices, 1));
  newGeometry.computeVertexNormals();
  newGeometry.computeBoundingSphere();

  // The extruded top face is the first new triangle added after the original indices
  // Its face index in the extracted faces will be oldIndices.length / 3
  const extrudedFaceIndex = oldIndices.length / 3;

  return {
    geometry: newGeometry,
    extrudedVertexBufferIndices: [nv1, nv2, nv3],
    extrudedFaceIndex,
  };
}
