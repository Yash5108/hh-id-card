'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

type WireframeShapeProps = {
  geometry: THREE.BufferGeometry;
  position: [number, number, number];
  speed: number;
  color: string;
};

const geometries = [
  new THREE.IcosahedronGeometry(2, 0),
  new THREE.TorusGeometry(1.5, 0.4, 8, 20),
  new THREE.CylinderGeometry(1, 1, 3, 10),
  new THREE.OctahedronGeometry(1.5, 0),
];

function RotatingWireframe({ geometry, position, speed, color }: WireframeShapeProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!meshRef.current) {
      return;
    }

    meshRef.current.rotation.x += speed * delta;
    meshRef.current.rotation.y += speed * delta * 0.8;
    meshRef.current.rotation.z += speed * delta * 1.2;
  });

  return (
    <mesh ref={meshRef} position={position} geometry={geometry}>
      <meshBasicMaterial
        color={color}
        wireframe
        transparent
        opacity={0.28}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function Background3D() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 bg-[#0B5B33]">
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }} dpr={[1, 1.5]}>
        <RotatingWireframe
          geometry={geometries[0]}
          position={[-5, 3, -5]}
          speed={0.2}
          color="#FFE600"
        />
        <RotatingWireframe
          geometry={geometries[1]}
          position={[6, -4, -2]}
          speed={0.15}
          color="#FF007A"
        />
        <RotatingWireframe
          geometry={geometries[2]}
          position={[-6, -3, -4]}
          speed={0.25}
          color="#FFE600"
        />
        <RotatingWireframe
          geometry={geometries[3]}
          position={[5, 4, -6]}
          speed={0.1}
          color="#FF007A"
        />
      </Canvas>
    </div>
  );
}