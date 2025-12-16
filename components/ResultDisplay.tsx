import React, { useState, useRef, useEffect } from 'react';
import { Download, RefreshCw, Loader2, User, Users, Camera, Lock } from 'lucide-react';

interface ResultDisplayProps {
  isLoading: boolean;
  image: string | null;
  onDownload: () => void;
  onRegenerate: (keepModel: boolean) => void;
  isPremium: boolean;
  error: string | null;
}

const LOADING_STATES = [
    "INITIALIZING_TENSORS",
    "ANALYZING_GEOMETRY",
    "CALCULATING_LIGHT",
    "SYNTHESIZING_TEXTURES",
    "REFINING_DETAILS",
    "FINALIZING_OUTPUT"
];

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
    isLoading, 
    image, 
    onDownload, 
    onRegenerate, 
    isPremium,
    error 
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isLoading) {
        setLoadingIndex(0);
        const interval = setInterval(() => {
            setLoadingIndex((prev) => (prev + 1) % LOADING_STATES.length);
        }, 1200);
        return () => clearInterval(interval);
    }
  }, [isLoading]);

  // Loading
  if (isLoading) {
    return (
      <div className="h-full w-full bg-black flex flex-col items-center justify-center relative">
        <div className="flex flex-col items-center gap-4">
             <div className="w-12 h-12 border border-zinc-800 border-t-white rounded-full animate-spin"></div>
             <div className="font-mono text-xs text-zinc-500 tracking-widest uppercase">
                 {LOADING_STATES[loadingIndex]}...
             </div>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="h-full w-full bg-black flex flex-col items-center justify-center p-8 text-center">
        <div className="border border-red-900/50 p-6 rounded-lg max-w-md bg-red-950/10">
            <h3 className="text-sm font-bold text-red-500 mb-2 uppercase tracking-wide">System Failure</h3>
            <p className="text-zinc-400 font-mono text-xs leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  // Empty
  if (!image) {
    return (
      <div className="h-full w-full bg-black flex flex-col items-center justify-center relative group">
        <div className="flex flex-col items-center text-center px-4">
            <Camera className="w-10 h-10 text-zinc-800 mb-4 stroke-1" />
            <p className="text-zinc-600 font-medium text-sm tracking-wide">
                Configure your shoot to begin
            </p>
        </div>
      </div>
    );
  }

  // Success
  return (
    <div className="h-full w-full bg-black relative flex flex-col">
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <img 
            src={image} 
            alt="Generated Photoshoot" 
            className="h-full w-full object-contain z-10"
        />
      </div>
      
      <div className="absolute bottom-6 right-6 flex items-center gap-2 z-30">
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="h-9 px-4 bg-black/80 hover:bg-black text-white border border-zinc-800 hover:border-zinc-600 backdrop-blur-md rounded-md font-medium text-xs transition-all flex items-center gap-2"
            >
                <RefreshCw size={12} />
                Regenerate
            </button>

            {showMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-56 bg-black border border-zinc-800 rounded-md shadow-2xl z-50 overflow-hidden">
                    <button
                        onClick={() => { onRegenerate(true); setShowMenu(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-zinc-900 flex items-center gap-3 text-zinc-300 transition-colors border-b border-zinc-900"
                    >
                            <User size={14} />
                            <div className="flex-1">
                            <span className="text-xs font-bold block text-white">Keep Model</span>
                            <span className="text-[10px] text-zinc-500">Same ID, new pose</span>
                            </div>
                            {!isPremium && <Lock size={10} className="text-zinc-600" />}
                    </button>
                    <button
                        onClick={() => { onRegenerate(false); setShowMenu(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-zinc-900 flex items-center gap-3 text-zinc-300 transition-colors"
                    >
                        <Users size={14} />
                        <div className="flex-1">
                            <span className="text-xs font-bold block text-white">New Model</span>
                            <span className="text-[10px] text-zinc-500">Roll new character</span>
                        </div>
                    </button>
                </div>
            )}
        </div>

        <button
            onClick={onDownload}
            className="h-9 px-4 bg-white text-black hover:bg-zinc-200 rounded-md font-medium text-xs transition-all flex items-center gap-2 shadow-sm"
        >
            <Download size={12} />
            Save
        </button>
      </div>
    </div>
  );
};