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
  Path,
  Rect,
  Shadow,
} from 'fabric';
import QRCode from 'qrcode';

import { THEME_STYLES, type ThemeName } from '../lib/themes';

type ColorProp = 'fill' | 'stroke';

export interface SelectedElementInfo {
  label: string;
  color: string;
}

export type CardSide = 'front' | 'back';

export interface IdCanvasHandle {
  /** Apply a color to whichever element is currently selected on the canvas. */
  setSelectedColor: (color: string) => void;
  /** Push a new value into one of the four editable text fields. */
  setFieldText: (field: 'header' | 'name' | 'stack' | 'role', value: string) => void;
  /** Toggle which face of the card is visible on the canvas. */
  setViewSide: (side: CardSide) => void;
  /** Export both card faces as data URLs. */
  exportBoth: () => { front: string; back: string };
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
  const qrImageRef = useRef<FabricImage | null>(null);
  const backQrImageRef = useRef<FabricImage | null>(null);
  const glossRef = useRef<Rect | null>(null);
  const frontObjectsRef = useRef<FabricObject[]>([]);
  const backObjectsRef = useRef<FabricObject[]>([]);
  const viewSideRef = useRef<CardSide>('front');
  // Holds a debounced "regenerate the QR code" function created inside the
  // main effect, so setFieldText (defined outside that effect) can trigger
  // a refresh without needing its own copy of the canvas/refs logic.
  const regenerateQrRef = useRef<() => void>(() => { });
  const qrDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);

  const addFrontObject = (obj: FabricObject) => {
    if (!frontObjectsRef.current.includes(obj)) {
      frontObjectsRef.current.push(obj);
    }
    obj.set('visible', viewSideRef.current === 'front');
  };

  const addBackObject = (obj: FabricObject) => {
    if (!backObjectsRef.current.includes(obj)) {
      backObjectsRef.current.push(obj);
    }
    obj.set('visible', viewSideRef.current === 'back');
  };

  const setCanvasSide = (side: CardSide) => {
    viewSideRef.current = side;
    frontObjectsRef.current.forEach((obj) => {
      obj.set('visible', side === 'front');
    });
    backObjectsRef.current.forEach((obj) => {
      obj.set('visible', side === 'back');
    });
    fabricCanvas?.requestRenderAll();
  };

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
        regenerateQrRef.current();
      },
      setViewSide: (side) => setCanvasSide(side),
      exportBoth: () => {
        if (!fabricCanvas) {
          return { front: '', back: '' };
        }

        const previousSide = viewSideRef.current;
        const front = (() => {
          setCanvasSide('front');
          return fabricCanvas.toDataURL({ format: 'png', multiplier: 1 });
        })();
        const back = (() => {
          setCanvasSide('back');
          return fabricCanvas.toDataURL({ format: 'png', multiplier: 1 });
        })();
        setCanvasSide(previousSide);

        return { front, back };
      },
    }),
    [fabricCanvas, onSelectObject],
  );

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initialize Canvas
    const canvas = new FabricCanvas(canvasRef.current, {
      width: 450,
      height: 700,
      backgroundColor: 'transparent',
      preserveObjectStacking: true,
      selection: true,
    });

    setFabricCanvas(canvas);
    let disposed = false;

    // Picking a new theme should apply that theme's palette everywhere —
    // it shouldn't be fighting with colors you picked under a previous
    // theme. Only clear on an actual switch, not on first mount.
    if (prevThemeRef.current !== null && prevThemeRef.current !== theme) {
      customColorsRef.current = {};
    }
    prevThemeRef.current = theme;

    const styles = THEME_STYLES[theme];
    const labelMap = new Map<FabricObject, { label: string; colorProp: ColorProp }>();
    frontObjectsRef.current = [];
    backObjectsRef.current = [];

    // Registers an object as colorable: tags it selectable/locked-in-place
    // and remembers its label + which property drives its visible color.
    const registerColorable = (obj: FabricObject, label: string, colorProp: ColorProp = 'fill') => {
      obj.set({ selectable: true, evented: true, ...LOCK_TRANSFORM });
      labelMap.set(obj, { label, colorProp });
      const override = customColorsRef.current[label];
      if (override) obj.set(colorProp, override);
    };

    // ==========================================
    // CARD DIMENSIONS: 380w x 580h, centered at 225, starting at y=80
    // ==========================================
    const centerX = 225;
    const cardW = 380;
    const cardH = 580;
    const cardTop = 100;  // top of card body
    const cardCenterY = cardTop + cardH / 2;

    // ===== LANYARD HOOK AT TOP =====
    // Metal hook (curved clip at very top)
    const hookPath = new Path(
      'M 215,20 C 215,5 235,5 235,20 L 235,55 L 215,55 Z',
      {
        fill: '#888888',
        stroke: '#555555',
        strokeWidth: 2,
        originX: 'center',
        originY: 'center',
        left: centerX,
        top: 38,
        selectable: false,
        evented: false,
      }
    );
    addFrontObject(hookPath);
    registerColorable(hookPath, 'Lanyard Hook');

    // Small hole at top of card for the hook
    const cardHole = new Circle({
      left: centerX,
      top: cardTop + 15,
      radius: 8,
      fill: '#888888',
      stroke: '#666',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });
    addFrontObject(cardHole);
    registerColorable(cardHole, 'Card Hole');

    // ===== 1. MAIN CARD BACKGROUND (Dark Green) =====
    const cardBg = new Rect({
      left: centerX,
      top: cardCenterY,
      width: cardW,
      height: cardH,
      fill: styles.bg,
      rx: 20,
      ry: 20,
      stroke: '#000000',
      strokeWidth: 3,
      originX: 'center',
      originY: 'center',
      shadow: new Shadow({ color: 'rgba(0,0,0,0.5)', blur: 20, offsetX: 8, offsetY: 8 }),
      selectable: false,
      evented: false,
    });
    addFrontObject(cardBg);
    registerColorable(cardBg, 'Card Background');

    // ===== 2. HEADER TEXT (e.g. "GOA HACKATHON 2024") =====
    const headerText = new IText("HACKER HOUSE GOA '26", {
      left: centerX,
      top: cardTop + 50,
      fontFamily: "'Bebas Neue', 'Impact', 'Arial Black', sans-serif",
      fontSize: 32,
      fontWeight: 'bold',
      fill: '#FFD700',
      originX: 'center',
      originY: 'center',
      selectable: true,
      editable: true,
      textAlign: 'center',
    });
    addFrontObject(headerText);
    headerTextRef.current = headerText;
    registerColorable(headerText, 'Header Text');
    if (customTextRef.current['Header Text']) headerText.set('text', customTextRef.current['Header Text']);

    // ===== 3. LOGO AREA (Palm trees + code symbol + waves) =====
    // Left palm tree
    const palmLeft = new Path(
      [
        'M 30,95 C 28,70 35,40 38,15 L 42,15 C 45,40 40,70 36,95 Z',
        'M 40,13 C 28,7 14,10 4,24 C 18,20 32,17 40,13 Z',
        'M 40,13 C 30,3 14,-3 2,4 C 16,8 32,12 40,13 Z',
        'M 40,13 C 38,-2 40,-12 42,-18 C 46,-7 44,3 40,13 Z',
        'M 40,13 C 52,3 68,-3 78,4 C 64,8 48,12 40,13 Z',
        'M 40,13 C 55,7 68,10 76,24 C 62,20 48,17 40,13 Z',
      ].join(' '),
      {
        left: centerX - 90,
        top: cardTop + 190,
        originX: 'center',
        originY: 'center',
        scaleX: 1.6,
        scaleY: 1.6,
        fill: '#2E8B57',
        opacity: 0.85,
        selectable: false,
        evented: false,
      }
    );
    addFrontObject(palmLeft);
    registerColorable(palmLeft, 'Left Palm');

    // Right palm tree (mirrored)
    const palmRight = new Path(
      [
        'M 30,95 C 28,70 35,40 38,15 L 42,15 C 45,40 40,70 36,95 Z',
        'M 40,13 C 28,7 14,10 4,24 C 18,20 32,17 40,13 Z',
        'M 40,13 C 30,3 14,-3 2,4 C 16,8 32,12 40,13 Z',
        'M 40,13 C 38,-2 40,-12 42,-18 C 46,-7 44,3 40,13 Z',
        'M 40,13 C 52,3 68,-3 78,4 C 64,8 48,12 40,13 Z',
        'M 40,13 C 55,7 68,10 76,24 C 62,20 48,17 40,13 Z',
      ].join(' '),
      {
        left: centerX + 80,
        top: cardTop + 180,
        originX: 'center',
        originY: 'center',
        scaleX: 1.6,
        scaleY: 1.6,
        flipX: true,
        fill: '#2E8B57',
        opacity: 0.85,
        selectable: false,
        evented: false,
      }
    );
    addFrontObject(palmRight);
    registerColorable(palmRight, 'Right Palm');

    // Code symbol </> in the center
    const codeSymbol = new IText('</>', {
      left: centerX,
      top: cardTop + 125,
      fontFamily: "'Fira Code', 'Courier New', monospace",
      fontSize: 36,
      fontWeight: 'bold',
      fill: '#FFFFFF',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });
    addFrontObject(codeSymbol);
    registerColorable(codeSymbol, 'Code Symbol');

    // Waves below the palm trees
    const wavePath = new Path(
      'M 0,10 C 20,0 40,20 60,10 C 80,0 100,20 120,10 C 140,0 160,20 180,10 L 180,20 C 160,30 140,10 120,20 C 100,30 80,10 60,20 C 40,30 20,10 0,20 Z',
      {
        left: centerX,
        top: cardTop + 100,
        originX: 'center',
        originY: 'center',
        scaleX: 1.0,
        scaleY: 0.7,
        fill: '#FFD700',
        opacity: 0.6,
        selectable: false,
        evented: false,
      }
    );
    addFrontObject(wavePath);
    registerColorable(wavePath, 'Waves');

    // Hindi text "हैकाथॉन गोवा"
    const hindiText = new IText('हैकर हाउस गोवा 26', {
      left: centerX,
      top: cardTop + 80,
      fontFamily: "'Noto Sans Devanagari', 'Mangal', sans-serif",
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#FF6B6B',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });
    addFrontObject(hindiText);
    registerColorable(hindiText, 'Hindi Text');




    // ===== 4. PHOTO AREA (Circle) =====
    const photoCircle = new Circle({
      left: centerX,
      top: cardTop + 235,
      radius: 80,
      fill: '#D3D3D3',
      stroke: '#FFFFFF',
      strokeWidth: 4,
      originX: 'center',
      originY: 'center',
      shadow: new Shadow({ color: 'rgba(0,0,0,0.3)', blur: 8, offsetX: 0, offsetY: 4 }),
      selectable: false,
      evented: false,
    });
    addFrontObject(photoCircle);
    registerColorable(photoCircle, 'Photo Circle');

    // ===== 5. CREAM/BEIGE INFO SECTION =====
    const infoSectionY = cardTop + 340;
    const infoSectionH = 200;
    const infoSection = new Rect({
      left: centerX,
      top: infoSectionY + infoSectionH / 2,
      width: cardW - 30,
      height: infoSectionH,
      fill: styles.cardBody,
      rx: 10,
      ry: 10,
      stroke: '#C0B896',
      strokeWidth: 1,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });
    addFrontObject(infoSection);
    registerColorable(infoSection, 'Inner Card Body');

    // --- EDITABLE DATA FIELDS ---
    const labelX = 65;
    const inputX = 155;
    const labelProps = {
      originX: 'left' as const,
      originY: 'center' as const,
      fontFamily: "'Inter', 'Helvetica', sans-serif",
      fontSize: 13,
      fontWeight: 'bold',
      fill: '#555555',
      selectable: false,
      evented: false,
    };
    const inputProps = {
      originX: 'left' as const,
      originY: 'center' as const,
      fontFamily: "'Inter', 'Helvetica', sans-serif",
      fontSize: 16,
      fontWeight: 'bold',
      fill: styles.inputText,
      selectable: true,
      editable: true,
      cursorColor: styles.accent,
    };
    const lineProps = {
      originX: 'left' as const,
      originY: 'center' as const,
      left: 60,
      width: 310,
      height: 1.5,
      fill: '#C0B896',
      selectable: false,
      evented: false,
    };

    // NAME:
    const nameFieldY = infoSectionY + 35;
    const nameLabel = new IText('NAME:', { left: labelX, top: nameFieldY, ...labelProps });
    addFrontObject(nameLabel);
    registerColorable(nameLabel, 'Name Label');
    const nameLine = new Rect({ top: nameFieldY + 18, ...lineProps });
    addFrontObject(nameLine);
    registerColorable(nameLine, 'Name Divider');
    const nameInput = new IText('YASH JAIN', { left: inputX, top: nameFieldY, ...inputProps });
    addFrontObject(nameInput);
    nameInputRef.current = nameInput;
    registerColorable(nameInput, 'Name Text');
    if (customTextRef.current['Name Text']) nameInput.set('text', customTextRef.current['Name Text']);

    // ROLE: (mapped to "stack" field internally for compatibility)
    const roleFieldY = infoSectionY + 80;
    const roleLabel = new IText('ROLE:', { left: labelX, top: roleFieldY, ...labelProps });
    addFrontObject(roleLabel);
    registerColorable(roleLabel, 'Stack Label');
    const roleLine = new Rect({ top: roleFieldY + 18, ...lineProps });
    addFrontObject(roleLine);
    registerColorable(roleLine, 'Stack Divider');
    const stackInput = new IText('FULL-STACK BUILDER', { left: inputX, top: roleFieldY, ...inputProps });
    addFrontObject(stackInput);
    stackInputRef.current = stackInput;
    registerColorable(stackInput, 'Stack Text');
    if (customTextRef.current['Stack Text']) stackInput.set('text', customTextRef.current['Stack Text']);

    // TEAM: (mapped to "role" field internally for compatibility)
    const teamFieldY = infoSectionY + 125;
    const teamLabel = new IText('TEAM:', { left: labelX, top: teamFieldY, ...labelProps });
    addFrontObject(teamLabel);
    registerColorable(teamLabel, 'Role Label');
    const teamLine = new Rect({ top: teamFieldY + 18, ...lineProps });
    addFrontObject(teamLine);
    registerColorable(teamLine, 'Role Divider');
    const roleInput = new IText('TEAM GOA', { left: inputX, top: teamFieldY, ...inputProps });
    addFrontObject(roleInput);
    roleInputRef.current = roleInput;
    registerColorable(roleInput, 'Role Text');
    if (customTextRef.current['Role Text']) roleInput.set('text', customTextRef.current['Role Text']);

    // "TEAM" highlight badge (the red "TEAM" text effect from the reference)
    const teamHighlight = new Rect({
      left: inputX,
      top: teamFieldY,
      width: 50,
      height: 20,
      fill: styles.accent,
      opacity: 0.2,
      rx: 3,
      ry: 3,
      originX: 'left',
      originY: 'center',
      selectable: false,
      evented: false,
    });
    addFrontObject(teamHighlight);

    // ===== 6. BOTTOM BANNER ("DEV • DESIGN • BUILD") =====
    const bannerY = cardTop + cardH - 30;
    const bannerBg = new Rect({
      left: centerX,
      top: bannerY,
      width: cardW,
      height: 45,
      fill: styles.bg,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });
    addFrontObject(bannerBg);
    registerColorable(bannerBg, 'Banner Background');

    // Bottom rounded corners overlay (clip the banner to card shape)
    const bannerRoundedClip = new Rect({
      left: centerX,
      top: bannerY + 5,
      width: cardW - 3,
      height: 40,
      fill: styles.bg,
      rx: 20,
      ry: 20,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });
    addFrontObject(bannerRoundedClip);

    const bannerText = new IText('DEV  •  DESIGN  •  BUILD', {
      left: centerX,
      top: bannerY,
      fontFamily: "'Bebas Neue', 'Impact', 'Arial Black', sans-serif",
      fontSize: 20,
      fontWeight: 'bold',
      fill: '#FFD700',
      letterSpacing: 200,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });
    addFrontObject(bannerText);
    registerColorable(bannerText, 'Foil Text');

    // Separator line above banner
    const bannerSepLine = new Rect({
      left: centerX,
      top: bannerY - 22,
      width: cardW - 20,
      height: 2,
      fill: '#FFD700',
      opacity: 0.5,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });
    addFrontObject(bannerSepLine);

    // ===== PLASTIC GLOSS OVERLAY =====
    const gloss = new Rect({
      left: centerX,
      top: cardCenterY,
      width: cardW,
      height: cardH,
      rx: 20,
      ry: 20,
      originX: 'center',
      originY: 'center',
      fill: new Gradient({
        type: 'linear',
        coords: { x1: 0, y1: 0, x2: cardW, y2: cardH },
        colorStops: [
          { offset: 0, color: 'rgba(255,255,255,0.25)' },
          { offset: 0.3, color: 'rgba(255,255,255,0.05)' },
          { offset: 0.5, color: 'rgba(255,255,255,0)' },
          { offset: 1, color: 'rgba(255,255,255,0.05)' },
        ],
      }),
      selectable: false,
      evented: false,
    });
    addFrontObject(gloss);
    glossRef.current = gloss;

    // ===== BACK SIDE =====
    const detailsBackBg = new Rect({
      left: centerX,
      top: cardCenterY,
      width: cardW,
      height: cardH,
      fill: styles.bg,
      stroke: '#000000',
      strokeWidth: 3,
      rx: 20,
      ry: 20,
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
    });
    addBackObject(detailsBackBg);
    registerColorable(detailsBackBg, 'Back Card Background');

    const backQrTitle = new IText('CARRIER DETAILS', {
      left: centerX,
      top: cardCenterY - 80,
      fontFamily: "'Inter', monospace",
      fontSize: 18,
      fontWeight: 'bold',
      fill: styles.text,
      originX: 'center',
      originY: 'center',
      selectable: true,
      evented: true,
    });
    addBackObject(backQrTitle);
    registerColorable(backQrTitle, 'Back Title');

    // Add all elements in Z-index order
    canvas.add(
      // Back side
      detailsBackBg, backQrTitle,
      // Front side - base
      cardBg,
      // Logo area
      palmLeft, palmRight, wavePath, codeSymbol, hindiText,
      // Photo
      photoCircle,
      // Header
      headerText,
      // Lanyard
      hookPath, cardHole,
      // Info section
      infoSection,
      nameLabel, nameLine, nameInput,
      roleLabel, roleLine, stackInput,
      teamLabel, teamLine, roleInput, teamHighlight,
      // Banner
      bannerBg, bannerRoundedClip, bannerSepLine, bannerText,
      // Gloss
      gloss
    );

    objLabelMapRef.current = labelMap;
    setCanvasSide(viewSideRef.current);

    // Apply initial textColor override if provided
    if (textColor) {
      if (nameInputRef.current) nameInputRef.current.set('fill', textColor);
      if (stackInputRef.current) stackInputRef.current.set('fill', textColor);
      if (roleInputRef.current) roleInputRef.current.set('fill', textColor);
      canvas.requestRenderAll();
    }

    // --- QR CODE — encodes whatever is currently in Header/Name/Role/Stack ---
    const regenerateQr = async () => {
      const name = (nameInputRef.current as unknown as { text?: string })?.text ?? '';
      const role = (roleInputRef.current as unknown as { text?: string })?.text ?? '';
      const stack = (stackInputRef.current as unknown as { text?: string })?.text ?? '';
      const header = (headerTextRef.current as unknown as { text?: string })?.text ?? '';
      const qrText = [header, name, role, stack].filter(Boolean).join('\n');
      if (!qrText) return;

      try {
        const dataUrl = await QRCode.toDataURL(qrText, {
          margin: 0,
          width: 200,
          color: { dark: styles.accent, light: '#FFFFFF00' },
        });
        if (disposed) return;

        const renderQr = (side: 'front' | 'back') => {
          const imgEl = new window.Image();
          imgEl.onload = () => {
            if (disposed) return;

            if (side === 'front') {
              // No QR on front side
              return;
            } else {
              const qrImg = new FabricImage(imgEl, {
                left: centerX,
                top: cardCenterY + 20,
                originX: 'center',
                originY: 'center',
                selectable: false,
                evented: false,
              });
              qrImg.scaleToWidth(180);

              if (backQrImageRef.current) canvas.remove(backQrImageRef.current);
              backQrImageRef.current = qrImg;
              addBackObject(qrImg);
              canvas.add(qrImg);
            }

            canvas.requestRenderAll();
          };
          imgEl.src = dataUrl;
        };

        renderQr('back');
      } catch (err) {
        console.error('QR generation failed', err);
      }
    };

    const scheduleQrUpdate = () => {
      if (qrDebounceRef.current) clearTimeout(qrDebounceRef.current);
      qrDebounceRef.current = setTimeout(regenerateQr, 250);
    };
    regenerateQrRef.current = scheduleQrUpdate;
    regenerateQr();

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
        scheduleQrUpdate();
      }
    });

    canvas.requestRenderAll();

    return () => {
      disposed = true;
      if (qrDebounceRef.current) clearTimeout(qrDebounceRef.current);
      photoRef.current = null;
      qrImageRef.current = null;
      glossRef.current = null;
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
      // Circular clip path matching the photo circle
      const photoClip = new Circle({
        radius: 80,
        left: 225,
        top: 100 + 235,
        originX: 'center',
        originY: 'center',
        absolutePositioned: true,
      });

      const image = new FabricImage(imageElement, {
        left: 225,
        top: 100 + 235,
        originX: 'center',
        originY: 'center',
        selectable: true,
        clipPath: photoClip,
      });

      addFrontObject(image);
      image.scaleToWidth(200);

      photoRef.current = image;

      // Insert dynamically, just behind the header text
      const headerIndex = headerTextRef.current
        ? fabricCanvas.getObjects().indexOf(headerTextRef.current)
        : -1;
      if (headerIndex >= 0) {
        fabricCanvas.insertAt(headerIndex, image);
      } else {
        fabricCanvas.add(image);
      }
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
      <canvas ref={canvasRef} width={450} height={700} />
    </div>
  );
});

export default IdCanvas;
