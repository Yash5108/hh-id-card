'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Canvas as FabricCanvas,
  Circle,
  FabricImage,
  Gradient,
  IText,
  Rect,
  Shadow,
} from 'fabric';

type ThemeName = 'classic' | 'sunset' | 'neon';

interface IdCanvasProps {
  uploadedImage: string | null;
  theme: ThemeName;
  textColor?: string;
}

const THEME_STYLES: Record<ThemeName, { bg: string; text: string; accent: string; cardBody: string }> = {
  classic: { bg: '#0B5B33', text: '#FFFFFF', accent: '#FF007A', cardBody: '#FFFDE8' },
  sunset: { bg: '#FFE600', text: '#0B5B33', accent: '#FF007A', cardBody: '#FFFFFF' },
  neon: { bg: '#0b0b0f', text: '#39ff14', accent: '#ff00ff', cardBody: '#070707' },
};

export default function IdCanvas({ uploadedImage, theme, textColor }: IdCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoRef = useRef<FabricImage | null>(null);
  const headerTextRef = useRef<IText | null>(null);
  const nameInputRef = useRef<IText | null>(null);
  const stackInputRef = useRef<IText | null>(null);
  const roleInputRef = useRef<IText | null>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);

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
    const styles = THEME_STYLES[theme];

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

    // 2. Inner White Body (for text area)
    const cardBody = new Rect({
      left: centerX, top: 460, width: 320, height: 280,
      fill: styles.cardBody, rx: 10, ry: 10,
      stroke: '#000000', strokeWidth: 3,
      originX: 'center', originY: 'center',
      selectable: false, evented: false,
    });

    // 3. Lanyard Hardware (Top Clip)
    const lanyardStrap = new Rect({ left: centerX, top: 20, width: 30, height: 40, fill: '#FFE600', stroke: '#000', strokeWidth: 2, originX: 'center', originY: 'center', selectable: false, evented: false });
    const metalRing = new Circle({ left: centerX, top: 60, radius: 25, fill: 'transparent', stroke: '#A0A0A0', strokeWidth: 6, originX: 'center', originY: 'center', selectable: false, evented: false });
    const clipBase = new Rect({ left: centerX, top: 85, width: 60, height: 25, fill: '#E0E0E0', rx: 5, ry: 5, stroke: '#666', strokeWidth: 2, originX: 'center', originY: 'center', selectable: false, evented: false });
    const cardHole = new Rect({ left: centerX, top: 95, width: 60, height: 15, fill: '#FFFDE8', rx: 7, ry: 7, stroke: '#000', strokeWidth: 3, originX: 'center', originY: 'center', selectable: false, evented: false });

    // 4. Header Text
    const headerText = new IText("HACKER HOUSE GOA '26", {
      left: centerX, top: 145,
      fontFamily: 'serif', fontSize: 22, fontWeight: 'bold',
      fill: styles.text, originX: 'center', originY: 'center',
      selectable: true, editable: true,
    });
    headerTextRef.current = headerText;

    // 5. Polaroid Photo Frame
    const polaroidFrame = new Rect({
      left: centerX, top: 265, width: 180, height: 210,
      fill: '#EEEEEE', stroke: '#000', strokeWidth: 2,
      originX: 'center', originY: 'center',
      shadow: new Shadow({ color: 'rgba(0,0,0,0.3)', blur: 5, offsetX: 3, offsetY: 3 }),
      selectable: false, evented: false,
    });
    const photoMaskRect = new Rect({
      left: centerX, top: 255, width: 160, height: 160,
      fill: '#CCCCCC', stroke: '#000', strokeWidth: 2,
      originX: 'center', originY: 'center',
      selectable: false, evented: false,
    });

    // --- EDITABLE DATA FIELDS ---
    // Anchoring these to the left side of the inner card for clean alignment
    const labelX = 85;
    const inputX = 145;
    const labelProps = { originX: 'left' as const, originY: 'center' as const, fontFamily: 'monospace', fontSize: 14, fill: '#555', selectable: false, evented: false };
    const inputProps = { originX: 'left' as const, originY: 'center' as const, fontFamily: 'monospace', fontSize: 18, fontWeight: 'bold', fill: '#000', selectable: true, editable: true, cursorColor: styles.accent };
    const lineProps = { originX: 'left' as const, originY: 'center' as const, left: 140, width: 220, height: 2, fill: '#000', selectable: false, evented: false };

    // Name
    const nameLabel = new IText("NAME", { left: labelX, top: 415, ...labelProps });
    const nameInput = new IText("YASH JAIN", { left: inputX, top: 415, ...inputProps });
    nameInputRef.current = nameInput;
    const nameLine = new Rect({ top: 430, ...lineProps });

    // Stack
    const stackLabel = new IText("STACK", { left: labelX, top: 460, ...labelProps });
    const stackInput = new IText("NEXT.JS / TS", { left: inputX, top: 460, ...inputProps });
    stackInputRef.current = stackInput;
    const stackLine = new Rect({ top: 475, ...lineProps });

    // Role
    const roleLabel = new IText("ROLE", { left: labelX, top: 505, ...labelProps });
    const roleInput = new IText("FULL-STACK BUILDER", { left: inputX, top: 505, ...inputProps });
    roleInputRef.current = roleInput;
    const roleLine = new Rect({ top: 520, ...lineProps });

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
      fill: 'rgba(255,255,255,0.9)', selectable: false, evented: false,
    });

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

    // Apply initial textColor override if provided
    if (textColor) {
      if (nameInputRef.current) nameInputRef.current.set('fill', textColor);
      if (stackInputRef.current) stackInputRef.current.set('fill', textColor);
      if (roleInputRef.current) roleInputRef.current.set('fill', textColor);
      canvas.requestRenderAll();
    }

    return () => {
      photoRef.current = null;
      setFabricCanvas(null);
      canvas.dispose();
    };
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
}