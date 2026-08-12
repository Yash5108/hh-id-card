'use client';

import type { RefObject } from 'react';
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {
  Canvas as FabricCanvas,
  Circle,
  FabricImage,
  FabricObject,
  Gradient,
  IText,
  Rect,
  Shadow,
} from 'fabric';

import { THEME_STYLES, type ThemeName } from '../lib/themes';

type ColorProp = 'fill' | 'stroke';

export interface SelectedElementInfo {
  label: string;
  color: string;
}

export interface IdCanvasHandle {
  /** Apply a color to whichever element is currently selected on the canvas. */
  setSelectedColor: (color: string) => void;
  /** Push a new value into one of the four editable text fields. */
  setFieldText: (field: 'header' | 'name' | 'stack' | 'role', value: string) => void;
}

interface IdCanvasProps {
  uploadedImage: string | null;
  theme: ThemeName;
  textColor?: string;
  /** Fired whenever the selected element (or lack thereof) changes. */
  onSelectObject?: (info: SelectedElementInfo | null) => void;
}

// Locks movement/scale/rotation on a shape so it can be clicked & recolored
// without a user accidentally dragging it out of place.
const LOCK_TRANSFORM = {
  hasControls: false,
  hasBorders: true,
  lockMovementX: true,
  lockMovementY: true,
  lockScalingX: true,
  lockScalingY: true,
  lockRotation: true,
};

const IdCanvas = forwardRef<IdCanvasHandle, IdCanvasProps>(function IdCanvas(
  { uploadedImage, theme, textColor, onSelectObject },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoRef = useRef<FabricImage | null>(null);
  const headerTextRef = useRef<IText | null>(null);
  const nameInputRef = useRef<IText | null>(null);
  const stackInputRef = useRef<IText | null>(null);
  const roleInputRef = useRef<IText | null>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);

  // Maps every colorable fabric object -> a human label + which property
  // ("fill" or "stroke") actually carries its visible color.
  const objLabelMapRef = useRef<Map<FabricObject, { label: string; colorProp: ColorProp }>>(new Map());
  // Persists user-picked colors (keyed by label) across theme rebuilds,
  // since switching theme recreates every canvas object from scratch.
  const customColorsRef = useRef<Record<string, string>>({});
  // Same idea, but for the editable text fields (header/name/stack/role) —
  // populated either by typing in the sidebar or double-clicking the canvas.
  const customTextRef = useRef<Record<string, string>>({});
  // Tracks the previous theme so we can tell "user picked a new theme"
  // (colors should reset to that theme's palette) apart from "first mount"
  // (nothing to reset).
  const prevThemeRef = useRef<ThemeName | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      setSelectedColor: (color: string) => {
        if (!fabricCanvas) return;
        const obj = fabricCanvas.getActiveObject();
        if (!obj) return;
        const info = objLabelMapRef.current.get(obj);
        if (!info) return;
        obj.set(info.colorProp, color);
        customColorsRef.current[info.label] = color;
        fabricCanvas.requestRenderAll();
        onSelectObject?.({ label: info.label, color });
      },
      setFieldText: (field, value) => {
        if (!fabricCanvas) return;
        const fieldMap: Record<string, { ref: RefObject<IText | null>; label: string }> = {
          header: { ref: headerTextRef, label: 'Header Text' },
          name: { ref: nameInputRef, label: 'Name Text' },
          stack: { ref: stackInputRef, label: 'Stack Text' },
          role: { ref: roleInputRef, label: 'Role Text' },
        };
        const entry = fieldMap[field];
        if (!entry?.ref.current) return;
        entry.ref.current.set('text', value);
        customTextRef.current[entry.label] = value;
        fabricCanvas.requestRenderAll();
      },
    }),
    [fabricCanvas, onSelectObject],
  );

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Canvas
    const canvas = new FabricCanvas(canvasRef.current, {
      width: 450,
      height: 650,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
      selection: true,
    });

    setFabricCanvas(canvas);

    // Picking a new theme should apply that theme's palette everywhere —
    // it shouldn't be fighting with colors you picked under a previous
    // theme. Only clear on an actual switch, not on first mount.
    if (prevThemeRef.current !== null && prevThemeRef.current !== theme) {
      customColorsRef.current = {};
    }
    prevThemeRef.current = theme;

    const styles = THEME_STYLES[theme];
    const labelMap = new Map<FabricObject, { label: string; colorProp: ColorProp }>();

    // Registers an object as colorable: tags it selectable/locked-in-place
    // and remembers its label + which property drives its visible color.
    const registerColorable = (obj: FabricObject, label: string, colorProp: ColorProp = 'fill') => {
      obj.set({ selectable: true, evented: true, ...LOCK_TRANSFORM });
      labelMap.set(obj, { label, colorProp });
      const override = customColorsRef.current[label];
      if (override) obj.set(colorProp, override);
    };

    // ==========================================
    // ALL COORDINATES ARE BASED ON X=225 (Center)
    // ==========================================
    const centerX = 225;

    // 1. Outer Green Background
    const cardBg = new Rect({
      left: centerX, top: 345, width: 360, height: 550,
      fill: styles.bg, rx: 15, ry: 15,
      stroke: '#000000', strokeWidth: 4,
      originX: 'center', originY: 'center',
      shadow: new Shadow({ color: 'rgba(0,0,0,0.5)', blur: 15, offsetX: 10, offsetY: 10 }),
      selectable: false, evented: false,
    });
    registerColorable(cardBg, 'Card Background');

    // 2. Inner White Body (for text area)
    const cardBody = new Rect({
      left: centerX, top: 460, width: 320, height: 280,
      fill: styles.cardBody, rx: 10, ry: 10,
      stroke: '#000000', strokeWidth: 3,
      originX: 'center', originY: 'center',
      selectable: false, evented: false,
    });
    registerColorable(cardBody, 'Inner Card Body');

    // 3. Lanyard Hardware (Top Clip)
    const lanyardStrap = new Rect({ left: centerX, top: 20, width: 30, height: 40, fill: '#FFE600', stroke: '#000', strokeWidth: 2, originX: 'center', originY: 'center', selectable: false, evented: false });
    registerColorable(lanyardStrap, 'Lanyard Strap');
    const metalRing = new Circle({ left: centerX, top: 60, radius: 25, fill: 'transparent', stroke: '#A0A0A0', strokeWidth: 6, originX: 'center', originY: 'center', selectable: false, evented: false });
    registerColorable(metalRing, 'Metal Ring', 'stroke');
    const clipBase = new Rect({ left: centerX, top: 85, width: 60, height: 25, fill: '#E0E0E0', rx: 5, ry: 5, stroke: '#666', strokeWidth: 2, originX: 'center', originY: 'center', selectable: false, evented: false });
    registerColorable(clipBase, 'Clip Base');
    const cardHole = new Rect({ left: centerX, top: 95, width: 60, height: 15, fill: '#FFFDE8', rx: 7, ry: 7, stroke: '#000', strokeWidth: 3, originX: 'center', originY: 'center', selectable: false, evented: false });
    registerColorable(cardHole, 'Card Hole');

    // 4. Header Text
    const headerText = new IText("HACKER HOUSE GOA '26", {
      left: centerX, top: 145,
      fontFamily: 'serif', fontSize: 22, fontWeight: 'bold',
      fill: styles.text, originX: 'center', originY: 'center',
      selectable: true, editable: true,
    });
    headerTextRef.current = headerText;
    registerColorable(headerText, 'Header Text');
    if (customTextRef.current['Header Text']) headerText.set('text', customTextRef.current['Header Text']);

    // 5. Polaroid Photo Frame
    const polaroidFrame = new Rect({
      left: centerX, top: 265, width: 180, height: 210,
      fill: '#EEEEEE', stroke: '#000', strokeWidth: 2,
      originX: 'center', originY: 'center',
      shadow: new Shadow({ color: 'rgba(0,0,0,0.3)', blur: 5, offsetX: 3, offsetY: 3 }),
      selectable: false, evented: false,
    });
    registerColorable(polaroidFrame, 'Photo Frame');
    const photoMaskRect = new Rect({
      left: centerX, top: 255, width: 160, height: 160,
      fill: '#CCCCCC', stroke: '#000', strokeWidth: 2,
      originX: 'center', originY: 'center',
      selectable: false, evented: false,
    });
    registerColorable(photoMaskRect, 'Photo Mask');

    // --- EDITABLE DATA FIELDS ---
    // Anchoring these to the left side of the inner card for clean alignment
    const labelX = 85;
    const inputX = 145;
    const labelProps = { originX: 'left' as const, originY: 'center' as const, fontFamily: 'monospace', fontSize: 14, fill: '#555', selectable: false, evented: false };
    const inputProps = { originX: 'left' as const, originY: 'center' as const, fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold', fill: styles.inputText, selectable: true, editable: true, cursorColor: styles.accent };
    const lineProps = { originX: 'left' as const, originY: 'center' as const, left: 140, width: 220, height: 2, fill: '#000', selectable: false, evented: false };

    // Name
    const nameLabel = new IText("NAME", { left: labelX, top: 415, ...labelProps });
    registerColorable(nameLabel, 'Name Label');
    const nameInput = new IText("YASH JAIN", { left: inputX, top: 415, ...inputProps });
    nameInputRef.current = nameInput;
    registerColorable(nameInput, 'Name Text');
    if (customTextRef.current['Name Text']) nameInput.set('text', customTextRef.current['Name Text']);
    const nameLine = new Rect({ top: 430, ...lineProps });
    registerColorable(nameLine, 'Name Divider');

    // Stack
    const stackLabel = new IText("STACK", { left: labelX, top: 460, ...labelProps });
    registerColorable(stackLabel, 'Stack Label');
    const stackInput = new IText("NEXT.JS / TS", { left: inputX, top: 460, ...inputProps });
    stackInputRef.current = stackInput;
    registerColorable(stackInput, 'Stack Text');
    if (customTextRef.current['Stack Text']) stackInput.set('text', customTextRef.current['Stack Text']);
    const stackLine = new Rect({ top: 475, ...lineProps });
    registerColorable(stackLine, 'Stack Divider');

    // Role
    const roleLabel = new IText("ROLE", { left: labelX, top: 505, ...labelProps });
    registerColorable(roleLabel, 'Role Label');
    const roleInput = new IText("FULL-STACK BUILDER", { left: inputX, top: 505, ...inputProps });
    roleInputRef.current = roleInput;
    registerColorable(roleInput, 'Role Text');
    if (customTextRef.current['Role Text']) roleInput.set('text', customTextRef.current['Role Text']);
    const roleLine = new Rect({ top: 520, ...lineProps });
    registerColorable(roleLine, 'Role Divider');

    // --- HOLOGRAPHIC FOIL OVERLAY ---
    const foilGradient = new Gradient({
      type: 'linear',
      coords: { x1: 0, y1: 0, x2: 280, y2: 0 },
      colorStops: [
        { offset: 0, color: 'rgba(255, 105, 180, 0.7)' },
        { offset: 0.2, color: 'rgba(255, 215, 0, 0.7)' },
        { offset: 0.4, color: 'rgba(0, 255, 127, 0.7)' },
        { offset: 0.6, color: 'rgba(0, 255, 255, 0.7)' },
        { offset: 0.8, color: 'rgba(30, 144, 255, 0.7)' },
        { offset: 1, color: 'rgba(138, 43, 226, 0.7)' },
      ],
    });
    const holoFoil = new Rect({
      left: centerX, top: 565, width: 280, height: 40, rx: 5, ry: 5,
      fill: foilGradient, stroke: '#000', strokeWidth: 1,
      originX: 'center', originY: 'center',
      selectable: false, evented: false,
    });
    const foilText = new IText("HH 2026 VERIFIED", {
      left: centerX, top: 565, originX: 'center', originY: 'center',
      fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold',
      fill: '#000000', selectable: false, evented: false,
    });
    registerColorable(foilText, 'Foil Text');

    // --- PLASTIC GLOSS OVERLAY ---
    const gloss = new Rect({
      left: centerX, top: 345, width: 360, height: 550, rx: 15, ry: 15,
      originX: 'center', originY: 'center',
      fill: new Gradient({
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: 360, y2: 550 },
        colorStops: [
          { offset: 0, color: 'rgba(255,255,255,0.45)' },
          { offset: 0.3, color: 'rgba(255,255,255,0.1)' },
          { offset: 0.5, color: 'rgba(255,255,255,0)' },
          { offset: 1, color: 'rgba(255,255,255,0.1)' },
        ],
      }),
      selectable: false, evented: false,
    });

    // Add all elements in Z-index order
    canvas.add(
      cardBg, cardBody, cardHole, lanyardStrap, metalRing, clipBase, // Hardware
      polaroidFrame, photoMaskRect, // Photo areas
      headerText, // Header
      nameLabel, nameInput, nameLine, // Name
      stackLabel, stackInput, stackLine, // Stack
      roleLabel, roleInput, roleLine, // Role
      holoFoil, foilText, // Foil
      gloss // Top Gloss
    );

    objLabelMapRef.current = labelMap;

    // Apply initial textColor override if provided
    if (textColor) {
      if (nameInputRef.current) nameInputRef.current.set('fill', textColor);
      if (stackInputRef.current) stackInputRef.current.set('fill', textColor);
      if (roleInputRef.current) roleInputRef.current.set('fill', textColor);
      canvas.requestRenderAll();
    }

    // --- SELECTION -> "click any component to recolor it" ---
    const reportSelection = () => {
      const obj = canvas.getActiveObject();
      if (!obj) {
        onSelectObject?.(null);
        return;
      }
      const info = objLabelMapRef.current.get(obj);
      if (!info) {
        onSelectObject?.(null);
        return;
      }
      const raw = obj.get(info.colorProp);
      const color = typeof raw === 'string' ? raw : '#000000';
      onSelectObject?.({ label: info.label, color });
    };
    canvas.on('selection:created', reportSelection);
    canvas.on('selection:updated', reportSelection);
    canvas.on('selection:cleared', () => onSelectObject?.(null));

    // Double-click-to-edit on the canvas should survive theme switches too.
    canvas.on('text:changed', (e) => {
      const obj = e.target as FabricObject | undefined;
      if (!obj) return;
      const info = objLabelMapRef.current.get(obj);
      const text = (obj as unknown as { text?: string }).text;
      if (info && typeof text === 'string') {
        customTextRef.current[info.label] = text;
      }
    });

    canvas.requestRenderAll();

    return () => {
      photoRef.current = null;
      setFabricCanvas(null);
      onSelectObject?.(null);
      canvas.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // Handle Image Injection
  useEffect(() => {
    if (!fabricCanvas) return;

    if (photoRef.current) {
      fabricCanvas.remove(photoRef.current);
      photoRef.current = null;
    }

    if (!uploadedImage) return;

    const imageElement = new window.Image();
    imageElement.onload = () => {
      // Must exactly match the polaroid mask coordinates
      const photoClip = new Rect({
        left: 225, top: 255, width: 160, height: 160,
        originX: 'center', originY: 'center',
        absolutePositioned: true,
      });

      const image = new FabricImage(imageElement, {
        left: 225, top: 255, 
        originX: 'center', originY: 'center',
        selectable: true, 
        clipPath: photoClip,
      });

      image.scaleToWidth(160);
      
      photoRef.current = image;
      
      // Insert dynamically behind the text and gloss
      fabricCanvas.insertAt(8, image);
      fabricCanvas.setActiveObject(image);
      fabricCanvas.requestRenderAll();
    };

    imageElement.src = uploadedImage;
  }, [fabricCanvas, uploadedImage]);

  // Update editable text fills when `textColor` prop changes
  useEffect(() => {
    if (!fabricCanvas || !textColor) return;
    if (nameInputRef.current) nameInputRef.current.set('fill', textColor);
    if (stackInputRef.current) stackInputRef.current.set('fill', textColor);
    if (roleInputRef.current) roleInputRef.current.set('fill', textColor);
    fabricCanvas.requestRenderAll();
  }, [fabricCanvas, textColor]);

  return (
    <div id="badge-canvas" className="relative cursor-crosshair drop-shadow-2xl">
      {/* Explicit HTML attributes are MANDATORY for fabric to map coordinates correctly */}
      <canvas ref={canvasRef} width={450} height={650} />
    </div>
  );
});

export default IdCanvas;