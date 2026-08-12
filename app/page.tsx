"use client";

import dynamic from 'next/dynamic';
import { type ChangeEvent, useState } from 'react';
import { 
  Download, Image as ImageIcon, Layers, LayoutTemplate, 
  MousePointer2, Palette, Share2, Square, Type, Settings2, Link
} from 'lucide-react';

const Background3D = dynamic(() => import('../src/components/Background3D'), { ssr: false });
const IdCanvas = dynamic(() => import('../src/components/IdCanvas'), { ssr: false });

type ThemeName = 'classic' | 'sunset' | 'neon';

export default function Home() {
  const [image, setImage] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeName>('classic');
  const [textColor, setTextColor] = useState<string>('#000000');

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
    const canvasElement = document.querySelector(
      '#badge-canvas canvas.lower-canvas',
    ) as HTMLCanvasElement | null;

    if (!canvasElement) return;

    const url = canvasElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'HHGoa2026-Badge.png';
    link.href = url;
    link.click();
  };

  const handleShare = () => {
    const text = encodeURIComponent(
      'Just minted my official builder pass for @HackerHouseGoa 2026! 🌴🚀 See you in Goa! #FrameInGoa'
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  return (
    <main className="flex h-screen w-screen flex-col overflow-hidden bg-[#FFFDE8] font-sans text-black">
      {/* Top Toolbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b-2 border-black bg-[#FFFDE8] px-4 shadow-[0_4px_0px_#0B5B33] z-20">
        <div className="flex items-center gap-4">
          <div className="flex gap-1 border-r-2 border-black pr-4">
            <div className="h-4 w-4 bg-[#FFE600] border border-black"></div>
            <div className="h-4 w-4 bg-[#0B5B33] border border-black"></div>
            <div className="h-4 w-4 bg-[#FF007A] border border-black"></div>
          </div>
          <span className="font-mono text-sm font-bold uppercase tracking-widest text-[#0B5B33]">
            HH Goa ID Lab
          </span>
        </div>
        
        <div className="flex items-center gap-4 font-mono text-xs font-bold">
          <span className="flex items-center gap-1 cursor-not-allowed text-gray-400"><Type size={14}/> B I U </span>
          <span className="flex items-center gap-1 cursor-not-allowed text-gray-400"><LayoutTemplate size={14}/> Align</span>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleDownload} className="flex items-center gap-2 border-2 border-black bg-[#FFE600] px-3 py-1.5 text-xs font-bold uppercase shadow-[2px_2px_0px_#000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_#000] active:shadow-none">
            <Download size={14} /> Export
          </button>
          <button onClick={handleShare} className="flex items-center gap-2 border-2 border-black bg-[#FF007A] text-white px-3 py-1.5 text-xs font-bold uppercase shadow-[2px_2px_0px_#000] hover:translate-y-[1px] hover:translate-x-[1px] hover:shadow-[1px_1px_0px_#000] active:shadow-none">
            <Share2 size={14} /> Post to X
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar - Tools */}
        <aside className="w-16 shrink-0 border-r-2 border-black bg-white flex flex-col items-center py-4 gap-6 z-20 shadow-[4px_0_0px_rgba(0,0,0,0.05)]">
          <button className="p-2 bg-[#FFE600] border-2 border-black rounded shadow-[2px_2px_0px_#000]"><Layers size={20} /></button>
          <button className="p-2 text-gray-600 hover:text-black"><MousePointer2 size={20} /></button>
          <button className="p-2 text-gray-600 hover:text-black"><Square size={20} /></button>
          <button className="p-2 text-gray-600 hover:text-black"><Type size={20} /></button>
          <label className="p-2 text-gray-600 hover:text-black cursor-pointer flex flex-col items-center gap-1">
            <ImageIcon size={20} />
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
          </label>
          <button className="p-2 text-gray-600 hover:text-black"><Link size={20} /></button>
        </aside>

        {/* Center Canvas Area (with 3D background behind) */}
        <section className="relative flex-1 flex flex-col items-center justify-center overflow-auto bg-gray-100 p-8 shadow-inner">
          <div className="absolute inset-0 z-0 opacity-40">
            <Background3D />
          </div>
          
          {/* Dynamic Interactive Canvas */}
          <div className="relative z-10 flex w-full items-center justify-center">
              <div className="w-[480px] flex items-center justify-center">
              <IdCanvas uploadedImage={image} theme={theme} textColor={textColor} />
            </div>
          </div>

          <p className="relative z-10 mt-6 font-mono text-xs font-bold bg-white/80 backdrop-blur px-4 py-2 border-2 border-black shadow-[4px_4px_0px_#FF007A]">
            💡 Double-click any text on the card to edit. Drag the photo to position it.
          </p>
        </section>

        {/* Right Sidebar - Properties */}
        <aside className="w-64 shrink-0 border-l-2 border-black bg-white flex flex-col z-20 overflow-y-auto">
          
          {/* Layers Panel Fake */}
          <div className="border-b-2 border-black p-4">
            <h3 className="font-mono text-sm font-bold uppercase mb-3 flex items-center gap-2"><Layers size={16}/> Layers</h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between bg-gray-100 p-2 border border-black"><span className="flex items-center gap-2"><Type size={12}/> Text Fields</span></div>
              <div className="flex items-center justify-between bg-[#FFE600] p-2 border border-black font-bold"><span className="flex items-center gap-2"><ImageIcon size={12}/> Uploaded Photo</span></div>
              <div className="flex items-center justify-between bg-gray-100 p-2 border border-black"><span className="flex items-center gap-2"><Square size={12}/> Card Base</span></div>
            </div>
          </div>

          {/* Properties Panel */}
          <div className="p-4 flex-1">
            <h3 className="font-mono text-sm font-bold uppercase mb-4 flex items-center gap-2"><Settings2 size={16}/> Properties</h3>
            
              <div className="space-y-4">
              <div>
                <p className="font-mono text-xs font-bold mb-2 uppercase text-gray-500">Text Color</p>
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
              <div>
                <p className="font-mono text-xs font-bold mb-2 uppercase text-gray-500">Theme Colors</p>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => setTheme('classic')} className={`border-2 border-black p-2 text-xs font-bold uppercase ${theme === 'classic' ? 'bg-[#0B5B33] text-white shadow-[2px_2px_0px_#000]' : 'bg-gray-100'}`}>Goa Green</button>
                  <button onClick={() => setTheme('sunset')} className={`border-2 border-black p-2 text-xs font-bold uppercase ${theme === 'sunset' ? 'bg-[#FFE600] text-black shadow-[2px_2px_0px_#000]' : 'bg-gray-100'}`}>Sun Yellow</button>
                  <button onClick={() => setTheme('neon')} className={`border-2 border-black p-2 text-xs font-bold uppercase ${theme === 'neon' ? 'bg-[#222222] text-[#FF007A] shadow-[2px_2px_0px_#FF007A]' : 'bg-gray-100'}`}>Neon Night</button>
                </div>
              </div>

              <div className="pt-4 border-t-2 border-dashed border-gray-300">
                <p className="font-mono text-xs font-bold mb-2 uppercase text-gray-500">Quick Upload</p>
                <label className="flex cursor-pointer items-center justify-center gap-2 border-2 border-black bg-[#FFE600] p-3 text-xs font-bold uppercase tracking-wide text-black transition-colors hover:bg-yellow-300 shadow-[4px_4px_0px_#000] active:shadow-none">
                  <ImageIcon size={16} /> Select Image
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}