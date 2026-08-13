"use client";

import dynamic from 'next/dynamic';
import { type ChangeEvent, useRef, useState } from 'react';
import { 
  Download, Image as ImageIcon, Layers, Share2, Settings2, Pipette, Eye, Menu, X
} from 'lucide-react';
import type { IdCanvasHandle, SelectedElementInfo, CardSide } from '../src/components/IdCanvas';
import { THEME_STYLES, THEME_ORDER, type ThemeName } from '../src/lib/themes';

const Background3D = dynamic(() => import('../src/components/Background3D'), { ssr: false });
const IdCanvas = dynamic(() => import('../src/components/IdCanvas'), { ssr: false });
const LanyardBadge = dynamic(() => import('../src/components/LanyardBadge'), { ssr: false });

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeName>('classic');
  const [textColor, setTextColor] = useState<string>('#000000');
  const [selected, setSelected] = useState<SelectedElementInfo | null>(null);
  const [cardSide, setCardSide] = useState<CardSide>('front');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState(false);
  const [fields, setFields] = useState({
    header: 'GOA HACKATHON 2026',
    name: 'YASH JAIN',
    stack: 'FULL-STACK BUILDER',
    role: 'TEAM GOA',
  });
  const idCanvasRef = useRef<IdCanvasHandle>(null);

  const handleFieldChange = (field: keyof typeof fields, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));
    idCanvasRef.current?.setFieldText(field, value);
  };

  const handleSelectedColorChange = (color: string) => {
    idCanvasRef.current?.setSelectedColor(color);
    setSelected((prev) => (prev ? { ...prev, color } : prev));
  };

  const handleThemeSelect = (key: ThemeName) => {
    setTheme(key);
    setTextColor('');
  };

  const getCardDataUrl = () => {
    const canvasElement = document.querySelector(
      '#badge-canvas canvas.lower-canvas',
    ) as HTMLCanvasElement | null;
    return canvasElement ? canvasElement.toDataURL('image/png') : null;
  };

  const handleFlipCard = (side: CardSide) => {
    setCardSide(side);
    idCanvasRef.current?.setViewSide(side);
  };

  const handleOpenPreview = () => {
    setPreviewImage(getCardDataUrl());
    setPreviewOpen(true);
  };

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (fileEvent) => {
      setImage(fileEvent.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDownload = () => {
    const exported = idCanvasRef.current?.exportBoth();
    if (!exported || !exported.front || !exported.back) return;

    const frontLink = document.createElement('a');
    frontLink.download = 'HHGoa2026-Front.png';
    frontLink.href = exported.front;
    frontLink.click();

    const backLink = document.createElement('a');
    backLink.download = 'HHGoa2026-Back.png';
    backLink.href = exported.back;
    backLink.click();
  };

  const handleShare = () => {
    const text = encodeURIComponent(
      'Just minted my official builder pass for @HackerHouseGoa 2026! 🌴🚀 See you in Goa! #FrameInGoa'
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  // Shared properties panel content (used in both desktop sidebar and mobile drawer)
  const PropertiesPanel = () => (
    <>
      {/* Layers Panel */}
      <div className="border-b-2 border-black p-4">
        <h3 className="font-mono text-sm font-bold uppercase mb-3 flex items-center gap-2"><Layers size={16}/> Layers</h3>
        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between bg-gray-100 p-2 border border-black"><span className="flex items-center gap-2">Text Fields</span></div>
          <div className="flex items-center justify-between bg-[#FFE600] p-2 border border-black font-bold"><span className="flex items-center gap-2">Uploaded Photo</span></div>
          <div className="flex items-center justify-between bg-gray-100 p-2 border border-black"><span className="flex items-center gap-2">Card Base</span></div>
        </div>
      </div>

      {/* Properties Panel */}
      <div className="p-4 flex-1">
        <h3 className="font-mono text-sm font-bold uppercase mb-4 flex items-center gap-2"><Settings2 size={16}/> Properties</h3>
        
        <div className="space-y-4">
          {/* Selected element recolor */}
          <div className={`border-2 p-3 ${selected ? 'border-black bg-[#FFE600]/20 shadow-[2px_2px_0px_#000]' : 'border-dashed border-gray-300'}`}>
            <p className="font-mono text-xs font-bold mb-2 uppercase text-gray-500 flex items-center gap-1"><Pipette size={12}/> Selected Element</p>
            {selected ? (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  className="h-9 w-12 p-0 border-2 border-black shrink-0"
                  value={selected.color}
                  onChange={(e) => handleSelectedColorChange(e.target.value)}
                />
                <span className="font-mono text-xs font-bold">{selected.label}</span>
              </div>
            ) : (
              <p className="font-mono text-xs text-gray-400">Click any part of the card to recolor it.</p>
            )}
          </div>

          {/* Text color */}
          <div>
            <p className="font-mono text-xs font-bold mb-2 uppercase text-gray-500">Text Color (Name/Role/Team)</p>
            <div className="flex items-center gap-2">
              <input type="color" className="h-8 w-12 p-0 border-2 border-black" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={() => setTextColor('#39ff14')} className="h-8 w-8 rounded bg-[#39ff14] border-2 border-black" title="Neon Green" />
                <button onClick={() => setTextColor('#ff00ff')} className="h-8 w-8 rounded bg-[#ff00ff] border-2 border-black" title="Neon Magenta" />
                <button onClick={() => setTextColor('#00ffff')} className="h-8 w-8 rounded bg-[#00ffff] border-2 border-black" title="Neon Cyan" />
              </div>
            </div>
            <button onClick={() => { setTheme('neon'); setTextColor('#39ff14'); }} className="mt-2 inline-block border-2 border-black bg-[#FF007A] text-white px-3 py-1 text-xs font-bold uppercase">Apply Neon Preset</button>
          </div>

          {/* Card Text */}
          <div className="pt-4 border-t-2 border-dashed border-gray-300">
            <p className="font-mono text-xs font-bold mb-2 uppercase text-gray-500">Card Text</p>
            <div className="space-y-2">
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-gray-400">Header</label>
                <input
                  type="text"
                  value={fields.header}
                  onChange={(e) => handleFieldChange('header', e.target.value)}
                  className="w-full border-2 border-black px-2 py-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-gray-400">Name</label>
                <input
                  type="text"
                  value={fields.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  className="w-full border-2 border-black px-2 py-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-gray-400">Role</label>
                <input
                  type="text"
                  value={fields.stack}
                  onChange={(e) => handleFieldChange('stack', e.target.value)}
                  className="w-full border-2 border-black px-2 py-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-mono text-[10px] font-bold uppercase text-gray-400">Team</label>
                <input
                  type="text"
                  value={fields.role}
                  onChange={(e) => handleFieldChange('role', e.target.value)}
                  className="w-full border-2 border-black px-2 py-1 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Theme */}
          <div>
            <p className="font-mono text-xs font-bold mb-2 uppercase text-gray-500">Theme</p>
            <div className="grid grid-cols-2 gap-2">
              {THEME_ORDER.map((key) => {
                const style = THEME_STYLES[key];
                const active = theme === key;
                return (
                  <button
                    key={key}
                    onClick={() => handleThemeSelect(key)}
                    className={`flex items-center gap-2 border-2 border-black p-2 text-left text-[10px] font-bold uppercase ${active ? 'shadow-[2px_2px_0px_#000]' : ''}`}
                    style={{ backgroundColor: active ? style.bg : '#f3f4f6', color: active ? style.text : '#000' }}
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border-2 border-black"
                      style={{ backgroundColor: style.bg }}
                    />
                    {style.label}
                  </button>
                );
              })}
            </div>
            {theme === 'custom' && (
              <p className="mt-2 font-mono text-[10px] text-gray-500">
                Blank palette — click any part of the card above and recolor it piece by piece.
              </p>
            )}
          </div>

          {/* Quick Upload */}
          <div className="pt-4 border-t-2 border-dashed border-gray-300">
            <p className="font-mono text-xs font-bold mb-2 uppercase text-gray-500">Quick Upload</p>
            <label className="flex cursor-pointer items-center justify-center gap-2 border-2 border-black bg-[#FFE600] p-3 text-xs font-bold uppercase tracking-wide text-black transition-colors hover:bg-yellow-300 shadow-[4px_4px_0px_#000] active:shadow-none">
              <ImageIcon size={16} /> Select Image
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-[#FFFDE8] font-sans text-black">
      {/* Top Toolbar */}
      <header className="flex h-auto min-h-[3.5rem] shrink-0 flex-wrap items-center justify-between gap-2 border-b-2 border-black bg-[#FFFDE8] px-3 py-2 shadow-[0_4px_0px_#0B5B33] z-20 sm:px-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex gap-1 border-r-2 border-black pr-4">
            <div className="h-4 w-4 bg-[#FFE600] border border-black"></div>
            <div className="h-4 w-4 bg-[#0B5B33] border border-black"></div>
            <div className="h-4 w-4 bg-[#FF007A] border border-black"></div>
          </div>
          <span className="font-mono text-xs sm:text-sm font-bold uppercase tracking-widest text-[#0B5B33]">
            HH Goa ID Lab
          </span>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => handleFlipCard(cardSide === 'front' ? 'back' : 'front')}
            className="flex items-center gap-1 sm:gap-2 border-2 border-black bg-white px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold uppercase shadow-[2px_2px_0px_#000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_#000] active:shadow-none"
          >
            <Eye size={14} /> <span className="hidden xs:inline">{cardSide === 'front' ? 'See Back' : 'See Front'}</span><span className="xs:hidden">Flip</span>
          </button>
          <button onClick={handleDownload} className="flex items-center gap-1 sm:gap-2 border-2 border-black bg-[#FFE600] px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold uppercase shadow-[2px_2px_0px_#000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_#000] active:shadow-none">
            <Download size={14} /> <span className="hidden sm:inline">Export Front + Back</span><span className="sm:hidden">Export</span>
          </button>
          <button onClick={handleShare} className="flex items-center gap-1 sm:gap-2 border-2 border-black bg-[#FF007A] text-white px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold uppercase shadow-[2px_2px_0px_#000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_#000] active:shadow-none">
            <Share2 size={14} /> <span className="hidden sm:inline">Post to X</span><span className="sm:hidden">Share</span>
          </button>
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobilePanel(!mobilePanel)}
            className="lg:hidden flex items-center gap-1 border-2 border-black bg-white px-2 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold uppercase shadow-[2px_2px_0px_#000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_#000] active:shadow-none"
          >
            {mobilePanel ? <X size={14} /> : <Menu size={14} />}
            <span className="hidden sm:inline">{mobilePanel ? 'Close' : 'Settings'}</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        
        {/* Left Sidebar - Tools (hidden on mobile) */}
        <aside className="hidden lg:flex w-16 shrink-0 border-r-2 border-black bg-white flex-col items-center py-4 gap-4 z-20 shadow-[4px_0_0px_rgba(0,0,0,0.05)]">
          <label className="flex cursor-pointer items-center justify-center rounded border-2 border-black bg-[#FFE600] p-2 shadow-[2px_2px_0px_#000]">
            <ImageIcon size={20} />
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
          </label>
        </aside>

        {/* Center Canvas Area (with beach background behind) */}
        <section className="relative flex-1 flex flex-col items-center justify-start lg:justify-center overflow-auto bg-transparent p-4 sm:p-8 shadow-inner">
          <div className="absolute inset-0 z-0 opacity-70">
            <Background3D />
          </div>
          
          {/* Dynamic Interactive Canvas */}
          <div className="relative z-10 flex w-full items-center justify-center">
            <div className="w-full max-w-[480px] flex items-center justify-center" style={{ transform: 'scale(var(--canvas-scale, 1))', transformOrigin: 'top center' }}>
              <div className="canvas-scale-wrapper">
                <IdCanvas
                  ref={idCanvasRef}
                  uploadedImage={image}
                  theme={theme}
                  textColor={textColor}
                  onSelectObject={setSelected}
                />
              </div>
            </div>
          </div>

          <p className="relative z-10 mt-4 sm:mt-6 font-mono text-[10px] sm:text-xs font-bold bg-white/80 backdrop-blur px-3 sm:px-4 py-2 border-2 border-black shadow-[4px_4px_0px_#FF007A] text-center">
            💡 Click any part of the card to select it, then pick a color. Double-click text to edit.
          </p>

          {/* Mobile: quick upload button inline */}
          <label className="lg:hidden relative z-10 mt-3 flex cursor-pointer items-center justify-center gap-2 border-2 border-black bg-[#FFE600] px-4 py-2 text-xs font-bold uppercase tracking-wide text-black shadow-[3px_3px_0px_#000] active:shadow-none">
            <ImageIcon size={16} /> Upload Photo
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
          </label>
        </section>

        {/* Right Sidebar - Properties (desktop) */}
        <aside className="hidden lg:flex w-64 shrink-0 border-l-2 border-black bg-white flex-col z-20 overflow-y-auto">
          <PropertiesPanel />
        </aside>

        {/* Mobile Properties Drawer (overlay) */}
        {mobilePanel && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobilePanel(false)} />
            {/* Drawer */}
            <div className="absolute right-0 top-0 bottom-0 w-[85vw] max-w-[320px] bg-white border-l-2 border-black overflow-y-auto shadow-[-8px_0_20px_rgba(0,0,0,0.2)]">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-black bg-[#FFFDE8] px-4 py-3">
                <span className="font-mono text-sm font-bold uppercase tracking-wide text-[#0B5B33]">⚙️ Settings</span>
                <button
                  onClick={() => setMobilePanel(false)}
                  className="flex items-center gap-1 border-2 border-black bg-white px-2 py-1 text-xs font-bold uppercase shadow-[2px_2px_0px_#000]"
                >
                  <X size={14} /> Close
                </button>
              </div>
              <PropertiesPanel />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}