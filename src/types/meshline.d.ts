// meshline extends the R3F element catalog with custom geometry/material
// tags via extend(). These aren't part of three's built-in catalog, so we
// declare them loosely here rather than fight R3F's generated types across
// versions.
declare module '@react-three/fiber' {
  interface ThreeElements {
    meshLineGeometry: any;
    meshLineMaterial: any;
    roundedBoxGeometry: any;
  }
}

export {};
