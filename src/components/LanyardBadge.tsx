/* eslint-disable react/no-unknown-property */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer, Text } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

import { THEME_STYLES, type ThemeName } from '../lib/themes';

// Register custom geometries/materials with the R3F catalog.
extend({ MeshLineGeometry, MeshLineMaterial, RoundedBoxGeometry });

interface LanyardBadgeProps {
  /** PNG data URL of the exported card design, shown as the badge's front face. */
  imageUrl: string | null;
  theme: ThemeName;
}

// Draws a repeating, on-brand lanyard-strap pattern to a canvas and hands
// back a THREE texture. Generated at runtime so we never ship or depend on
// any third-party/found strap artwork.
function useStrapTexture(theme: ThemeName) {
  return useMemo(() => {
    const styles = THEME_STYLES[theme];
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = styles.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pick a light or dark stripe based on the background's luminance so
    // this reads well across every theme, not just the original three.
    const bgLuminance = (() => {
      const hex = styles.bg.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    })();
    ctx.strokeStyle = bgLuminance > 0.6 ? '#000000' : '#FFFFFF';
    ctx.lineWidth = 9;
    for (let y = -canvas.width; y < canvas.height; y += 26) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y + canvas.width);
      ctx.stroke();
    }

    ctx.fillStyle = styles.accent;
    ctx.fillRect(0, 0, 5, canvas.height);
    ctx.fillRect(canvas.width - 5, 0, 5, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 6);
    texture.needsUpdate = true;
    return texture;
  }, [theme]);
}

// Loads the exported card PNG as a texture. Plain TextureLoader (not drei's
// suspense-based useTexture) since imageUrl changes every time the user
// re-exports their design and we don't want to suspend the whole canvas.
function useCardTexture(imageUrl: string | null) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setTexture(null);
      return;
    }
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(imageUrl, (tex) => {
      if (cancelled) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      setTexture(tex);
    });
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  useEffect(() => () => texture?.dispose(), [texture]);

  return texture;
}

export default function LanyardBadge({ imageUrl, theme }: LanyardBadgeProps) {
  const styles = THEME_STYLES[theme];

  return (
    <div className="lanyard-badge-wrapper" style={{ width: '100%', height: '100%' }}>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        camera={{ position: [0, 0, 13], fov: 25 }}
        shadows
      >
        <ambientLight intensity={Math.PI} />
        <Physics interpolate gravity={[0, -40, 0]} timeStep={1 / 60}>
          <Band imageUrl={imageUrl} theme={theme} />
        </Physics>
        <Environment blur={0.75}>
          <color attach="background" args={[styles.bg]} />
          <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={3} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
          <Lightformer intensity={10} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
        </Environment>
      </Canvas>
    </div>
  );
}

function Band({ maxSpeed = 50, minSpeed = 10, imageUrl, theme }: { maxSpeed?: number; minSpeed?: number; imageUrl: string | null; theme: ThemeName }) {
  const styles = THEME_STYLES[theme];
  const band = useRef<THREE.Mesh>(null);
  const fixed = useRef(null);
  const j1 = useRef(null);
  const j2 = useRef(null);
  const j3 = useRef(null);
  const card = useRef(null);

  const vec = new THREE.Vector3();
  const ang = new THREE.Vector3();
  const rot = new THREE.Vector3();
  const dir = new THREE.Vector3();

  const segmentProps = { type: 'dynamic' as const, canSleep: true, colliders: false as const, angularDamping: 2, linearDamping: 2 };

  const strapTexture = useStrapTexture(theme);
  const cardTexture = useCardTexture(imageUrl);

  const [curve] = useState(
    () => new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]),
  );
  const [dragged, drag] = useState<THREE.Vector3 | false>(false);
  const [hovered, hover] = useState(false);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.45, 0]]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab';
      return () => void (document.body.style.cursor = 'auto');
    }
  }, [hovered, dragged]);

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach((ref) => (ref.current as any)?.wakeUp());
      (card.current as any)?.setNextKinematicTranslation({
        x: vec.x - (dragged as THREE.Vector3).x,
        y: vec.y - (dragged as THREE.Vector3).y,
        z: vec.z - (dragged as THREE.Vector3).z,
      });
    }
    if (fixed.current) {
      [j1, j2].forEach((ref) => {
        const current = ref.current as any;
        if (!current.lerped) current.lerped = new THREE.Vector3().copy(current.translation());
        const clampedDistance = Math.max(0.1, Math.min(1, current.lerped.distanceTo(current.translation())));
        current.lerped.lerp(current.translation(), delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed)));
      });
      curve.points[0].copy((j3.current as any).translation());
      curve.points[1].copy((j2.current as any).lerped);
      curve.points[2].copy((j1.current as any).lerped);
      curve.points[3].copy((fixed.current as any).translation());
      if (band.current) {
        (band.current.geometry as any).setPoints(curve.getPoints(32));
      }
      ang.copy((card.current as any).angvel());
      rot.copy((card.current as any).rotation());
      (card.current as any).setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z });
    }
  });

  curve.curveType = 'chordal';

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>

        <RigidBody
          position={[2, 0, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? 'kinematicPosition' : 'dynamic'}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group
            scale={2.25}
            position={[0, -1.2, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={(e) => {
              (e.target as any).releasePointerCapture(e.pointerId);
              drag(false);
            }}
            onPointerDown={(e) => {
              (e.target as any).setPointerCapture(e.pointerId);
              drag(new THREE.Vector3().copy(e.point).sub(vec.copy((card.current as any).translation())));
            }}
          >
            {/* Lanyard hole */}
            <mesh position={[0, 1.13, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.07, 0.02, 16, 100]} />
              <meshPhysicalMaterial color="#888" metalness={0.7} roughness={0.3} />
            </mesh>

            {/* Front face: shows the exported card design */}
            <mesh receiveShadow castShadow>
              <roundedBoxGeometry args={[1.6, 2.2, 0.1, 16, 8]} />
              <meshPhysicalMaterial
                map={cardTexture ?? undefined}
                color={cardTexture ? '#ffffff' : styles.cardBody}
                clearcoat={0.7}
                clearcoatRoughness={0.1}
                reflectivity={0.8}
                roughness={0.25}
                metalness={0.1}
              />
            </mesh>

            {!cardTexture && (
              <Text position={[0, 0, 0.06]} fontSize={0.14} color={styles.bg} maxWidth={1.3} anchorX="center" anchorY="middle" textAlign="center">
                Export your design to preview it here
              </Text>
            )}

            {/* Back face */}
            <mesh position={[0, 0, -0.055]} receiveShadow castShadow>
              <planeGeometry args={[1.6, 2.2]} />
              <meshPhysicalMaterial color={styles.bg} roughness={0.5} metalness={0} side={THREE.DoubleSide} />
            </mesh>
            <Text position={[0, 0, -0.05]} rotation={[0, Math.PI, 0]} fontSize={0.13} color={styles.text} anchorX="center" anchorY="middle">
              {"HH GOA '26"}
            </Text>
          </group>
        </RigidBody>
      </group>

      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          map={strapTexture ?? undefined}
          useMap={!!strapTexture}
          color={strapTexture ? 'white' : styles.bg}
          transparent
          toneMapped={false}
          depthTest={false}
          resolution={[1000, 1000]}
          repeat={[1, 6]}
          lineWidth={1}
        />
      </mesh>

      <ContactShadows position={[2, -1.5, 0]} opacity={0.4} scale={4} blur={1.8} far={4} />
    </>
  );
}
