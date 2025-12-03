import type { BufferGeometry } from 'three';
import { DoubleSide } from 'three';

export interface EditModeOverlayProps {
  geometry: BufferGeometry;
  opacity?: number;
  color?: string;
  wireframeColor?: string;
}

export function EditModeOverlay({
  geometry,
  opacity = 0.3,
  color = '#6699cc',
  wireframeColor = '#ffffff',
}: EditModeOverlayProps) {
  return (
    <group>
      {/* Semi-transparent mesh */}
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Wireframe overlay */}
      <mesh geometry={geometry}>
        <meshBasicMaterial
          color={wireframeColor}
          wireframe
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  );
}
