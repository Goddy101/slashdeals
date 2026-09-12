'use client';

import { useState, useEffect } from 'react';

interface FlyerStudioProps {
  dealId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function FlyerStudioModal({ dealId, isOpen, onClose }: FlyerStudioProps) {
  const [format, setFormat] = useState<'story' | 'square' | 'banner'>('story');
  const [template, setTemplate] = useState<'flash' | 'luxury' | 'minimal'>('flash');
  
  // UI Color (Updates instantly for smooth dragging)
  const [uiColor, setUiColor] = useState('#22C55E');
  // API Color (Only updates when the user stops dragging)
  const [debouncedColor, setDebouncedColor] = useState('#22C55E');
  
  const [downloading, setDownloading] = useState(false);

  // The Debounce Magic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedColor(uiColor);
    }, 300); // Waits 300ms after the last color change before updating

    return () => clearTimeout(timer); // Cleans up the timer if the user keeps dragging
  }, [uiColor]);

  if (!isOpen) return null;

  // Notice we are using debouncedColor here now, NOT uiColor!
  const previewUrl = `/api/flyer/generate?deal_id=${dealId}&format=${format}&template=${template}&color=${encodeURIComponent(debouncedColor)}`;

  async function handleDownload() {
    setDownloading(true);
    try {
      const response = await fetch(previewUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `slashdeals-${template}-${format}-${dealId}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-zinc-900 p-6 border border-zinc-800 text-white shadow-2xl grid md:grid-cols-2 gap-6">
        
        {/* Controls Column */}
        <div className="space-y-5">
          <div>
            <h2 className="text-xl font-black">🎨 Marketing Asset Studio</h2>
            <p className="text-xs text-zinc-400">Generate high-converting flyers with your Escrow Trust Stamp</p>
          </div>

          {/* Format Picker */}
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Format</label>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              {(['story', 'square', 'banner'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`py-2 rounded-lg font-bold border transition ${
                    format === f ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-zinc-800 bg-zinc-800/50'
                  }`}
                >
                  {f === 'story' ? 'Story (9:16)' : f === 'square' ? 'Square (1:1)' : 'Banner (16:9)'}
                </button>
              ))}
            </div>
          </div>

          {/* Template Picker */}
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Style Template</label>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              {(['flash', 'luxury', 'minimal'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTemplate(t)}
                  className={`py-2 rounded-lg font-bold border transition ${
                    template === t ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400' : 'border-zinc-800 bg-zinc-800/50'
                  }`}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Brand Accent Color */}
          <div>
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Brand Accent Color</label>
            <div className="mt-2 flex items-center gap-3">
              <input 
                type="color" 
                value={uiColor} 
                onChange={(e) => setUiColor(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-lg border-2 border-zinc-700 bg-transparent p-0.5"
              />
              <span className="text-xs text-zinc-400 font-mono">Custom Hex: {uiColor}</span>
            </div>
          </div>

          {/* Download Trigger */}
          <div className="pt-4 flex gap-3">
            <button onClick={onClose} className="w-1/3 py-3 rounded-xl bg-zinc-800 text-sm font-semibold hover:bg-zinc-700 transition-colors">
              Close
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-2/3 py-3 rounded-xl bg-emerald-500 text-sm font-bold text-black hover:bg-emerald-400 disabled:opacity-50 transition-colors"
            >
              {downloading ? 'Downloading...' : '📥 Download High-Res PNG'}
            </button>
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="flex flex-col items-center justify-center bg-zinc-950 p-4 rounded-xl border border-zinc-800">
          <p className="text-xs text-zinc-500 mb-2 font-mono">Live Edge Preview</p>
          <div className="relative max-h-[420px] w-full flex items-center justify-center overflow-hidden rounded-lg shadow-inner">
            {/* Added a subtle transition to the image so color updates feel smoother */}
            <img
              key={previewUrl} // Forces re-render when URL changes
              src={previewUrl}
              alt="Flyer Preview"
              className="max-h-[400px] w-auto object-contain rounded-md shadow-2xl transition-opacity duration-300"
            />
          </div>
        </div>

      </div>
    </div>
  );
}