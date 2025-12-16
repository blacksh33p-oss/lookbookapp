import React, { useState, useRef, useEffect } from 'react';
import { Download, RefreshCw, Sparkles, Loader2, User, Users, ChevronDown, Camera, Lock, Maximize2 } from 'lucide-react';

interface ResultDisplayProps {
  isLoading: boolean;
  image: string | null;
  onDownload: () => void;
  onRegenerate: (keepModel: boolean) => void;
  isPremium: boolean;
  error: string | null;
}

const LOADING_STATES = [
    { text: "INITIALIZING_TENSORS", sub: "Allocating GPU Memory..." },
    { text: "ANALYZING_GEOMETRY", sub: "Mapping Cloth Physics..." },
    { text: "CALCULATING_LIGHT_BOUNCE", sub: "Raytracing Global Illumination..." },
    { text: "SYNTHESIZING_TEXTURES", sub: "Generating High-Fidelity Details..." },
    { text: "REFINING_DETAILS", sub: "Applying Tyndall Effect..." },
    { text: "FINALIZING_OUTPUT", sub: "Compositing Final Frame..." }
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

  // Semantic Loading Loop
  useEffect(() => {
    if (isLoading) {
        setLoadingIndex(0); // Reset on start
        const interval = setInterval(() => {
            setLoadingIndex((prev) => (prev + 1) % LOADING_STATES.length);
        }, 1200); // Change state every 1.2s
        return () => clearInterval(interval);
    }
  }, [isLoading]);

  // --- Loading State ---
  if (isLoading) {
    const currentStep = LOADING_STATES[loadingIndex];
    return (
      <div className="h-full w-full bg-zinc-900/20 border border-white/5 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-20"></div>
        <div className="w-full h-1 absolute top-0 bg-zinc-800 overflow-hidden">
             <div className="h-full bg-white animate-progress"></div>
        </div>
        
        <div className="relative z-10 flex flex-col items-center animate-fade-in gap-8 max-w-xs text-center">
            <div className="relative">
                 <div className="absolute inset-0 bg-brand-500 blur-3xl opacity-20 animate-pulse-slow"></div>
                 <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-600 tracking-tighter opacity-80 animate-pulse">
                    RENDERING
                 </div>
            </div>
            
            <div className="flex flex-col items-center gap-3 w-full">
                <div className="h-px w-12 bg-zinc-800"></div>
                <div className="flex flex-col gap-1 items-center">
                    <span className="font-mono text-xs text-brand-400 font-bold tracking-wider">
                        /// {currentStep.text}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">
                        {currentStep.sub}
                    </span>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="h-full w-full bg-red-950/10 border border-red-900/50 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm relative">
        <div className="border border-red-500/50 p-6 bg-black/50">
            <h3 className="text-2xl md:text-3xl font-black text-red-500 mb-4 uppercase tracking-tighter">System Failure</h3>
            <p className="text-red-300 font-mono text-xs text-left whitespace-pre-wrap max-w-lg leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  // --- Empty State ---
  if (!image) {
    return (
      <div className="h-full w-full bg-black border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]"></div>
        
        {/* Decorative Lines - Boosted Opacity - Responsive Positioning */}
        <div className="absolute top-4 left-4 md:top-8 md:left-8 w-4 h-4 border-t border-l border-white/50"></div>
        <div className="absolute top-4 right-4 md:top-8 md:right-8 w-4 h-4 border-t border-r border-white/50"></div>
        <div className="absolute bottom-4 left-4 md:bottom-8 md:left-8 w-4 h-4 border-b border-l border-white/50"></div>
        <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 w-4 h-4 border-b border-r border-white/50"></div>

        <div className="relative z-10 flex flex-col items-center text-center px-4">
            <div className="mb-4 md:mb-6 opacity-60 group-hover:opacity-100 transition-opacity duration-700">
                <Camera className="w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12 text-white" strokeWidth={1} />
            </div>
            <h3 className="text-3xl sm:text-5xl md:text-7xl font-black text-white tracking-tighter mb-2 md:mb-4 opacity-50 group-hover:opacity-100 transition-opacity duration-700 select-none">
                STUDIO
            </h3>
            <p className="text-zinc-400 font-mono text-[10px] md:text-xs tracking-widest uppercase opacity-80">
                Awaiting Configuration
            </p>
        </div>
      </div>
    );
  }

  // --- Success State ---
  return (
    <div className="h-full w-full bg-black border border-white/10 relative flex flex-col group">
      {/* Image Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-checkerboard">
        <img 
            src={image} 
            alt="Generated Photoshoot" 
            className="h-full w-full object-contain animate-fade-in z-10 relative"
        />
      </div>
      
      {/* Footer / Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/95 to-transparent flex flex-col sm:flex-row justify-end items-end gap-3 z-30">
        
        <div className="hidden sm:block mr-auto pb-1">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-brand-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-mono text-brand-400">GENERATION COMPLETE</span>
            </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Action Menu */}
            <div className="relative flex-1 sm:flex-none" ref={menuRef}>
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="w-full sm:w-auto h-12 sm:h-10 px-6 bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                    <RefreshCw size={14} />
                    Regenerate
                </button>

                {showMenu && (
                    <div className="absolute bottom-full left-0 right-0 sm:left-auto sm:right-0 mb-2 w-full sm:w-64 bg-zinc-950 border border-zinc-800 shadow-2xl z-50 animate-slide-up">
                        <button
                            onClick={() => { onRegenerate(true); setShowMenu(false); }}
                            className="w-full text-left px-4 py-3 hover:bg-zinc-900 flex items-center gap-3 text-zinc-300 transition-colors border-b border-zinc-900"
                        >
                             <User size={14} className="text-brand-400" />
                             <div className="flex-1">
                                <span className="text-xs font-bold uppercase block text-white">Keep Model</span>
                                <span className="text-[10px] font-mono text-zinc-500">Maintain identity, change pose</span>
                             </div>
                             {!isPremium && <Lock size={10} className="text-zinc-500" />}
                        </button>
                        <button
                            onClick={() => { onRegenerate(false); setShowMenu(false); }}
                            className="w-full text-left px-4 py-3 hover:bg-zinc-900 flex items-center gap-3 text-zinc-300 transition-colors"
                        >
                            <Users size={14} className="text-blue-400" />
                            <div className="flex-1">
                                <span className="text-xs font-bold uppercase block text-white">New Model</span>
                                <span className="text-[10px] font-mono text-zinc-500">Roll new character</span>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            <button
              onClick={onDownload}
              className="flex-1 sm:flex-none h-12 sm:h-10 px-6 bg-white text-black hover:bg-zinc-200 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              <Download size={14} />
              Save
            </button>
        </div>
      </div>
    </div>
  );
};