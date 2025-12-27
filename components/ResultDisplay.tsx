import React, { useState, useRef, useEffect } from 'react';
import { Download, RefreshCw, Loader2, User, Users, Camera, Lock, Sparkles, Shirt, Wand2, ChevronUp, Monitor } from 'lucide-react';

interface ResultDisplayProps {
  isLoading: boolean;
  image: string | null;
  width?: number;
  height?: number;
  onDownload: () => void;
  onRegenerate: (keepModel: boolean) => void;
  isPremium: boolean;
  error: string | null;
  onStart: () => void;
  SpotlightGate: React.FC<{ 
    children: React.ReactNode; 
    isLocked: boolean; 
    tier: 'CREATOR' | 'STUDIO'; 
    className?: string;
    containerClassName?: string;
  }>;
}

const LOADING_LOGS = [
    { id: 1, text: "INITIALIZING_TENSORS" },
    { id: 2, text: "ANALYZING_GEOMETRY" },
    { id: 3, text: "CALCULATING_LIGHT_PATHS" },
    { id: 4, text: "SYNTHESIZING_TEXTURES" },
    { id: 5, text: "REFINING_DETAILS" },
    { id: 6, text: "FINALIZING_OUTPUT" },
    { id: 7, text: "STILL_WORKING_ALMOST_DONE" },
    { id: 8, text: "STILL_WORKING_HOLD_ON" }
];

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
    isLoading, 
    image, 
    width,
    height,
    onDownload, 
    onRegenerate, 
    isPremium,
    error,
    onStart,
    SpotlightGate
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
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
        setCurrentStep(0);
        const interval = setInterval(() => {
            setCurrentStep((prev) => {
                // Once we reach the last "Still working" step, loop between the last two steps to show activity
                if (prev >= LOADING_LOGS.length - 1) {
                    return LOADING_LOGS.length - 2;
                }
                return prev + 1;
            });
        }, 2000);
        return () => clearInterval(interval);
    }
  }, [isLoading]);

  const getResolutionLabel = () => {
    if (!width || !height) return "";
    const maxSide = Math.max(width, height);
    if (maxSide > 3000) return "4K";
    if (maxSide > 1500) return "HD";
    return "SD";
  };

  // Loading - System Log Style
  if (isLoading) {
    return (
      <div className="h-full w-full bg-black flex flex-col items-center justify-center relative font-mono p-4">
        <div className="w-full max-w-xs">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-bold text-white uppercase tracking-widest">Processing</span>
             </div>
             
             <div className="space-y-2 border-l border-zinc-800 pl-4 relative">
                 {LOADING_LOGS.slice(0, currentStep + 1).map((log, idx) => (
                     <div key={log.id} className={`flex items-center gap-2 text-[11px] transition-all duration-300 ${idx === currentStep ? 'text-white translate-x-1' : 'text-zinc-400'}`}>
                         <span className={`w-1.5 h-1.5 rounded-full ${idx === currentStep ? 'bg-white' : 'bg-zinc-800'}`}></span>
                         {log.text}... {idx < currentStep && <span className="text-zinc-700 ml-auto">[OK]</span>}
                     </div>
                 ))}
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

  // Empty State / Onboarding Hero
  if (!image) {
    return (
      <div className="h-full w-full bg-black flex flex-col items-center justify-center relative overflow-hidden">
        {/* Background ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-white/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 max-w-md text-center px-6">
            <div className="mb-8 flex justify-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl shadow-black">
                    <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white" strokeWidth={1.5} />
                </div>
            </div>
            
            <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight mb-4">
                Virtual Studio
            </h2>
            <p className="text-zinc-400 text-[11px] sm:text-sm leading-relaxed mb-10 max-w-xs mx-auto">
                Turn garment photos into professional high-fashion editorials using Generative AI.
            </p>
            <button
                onClick={onStart}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white text-black text-[11px] font-black uppercase tracking-widest transition-all hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black shadow-[0_12px_30px_rgba(255,255,255,0.12)] mb-10"
            >
                Upload garment photos
            </button>

            <div className="grid grid-cols-3 gap-2 sm:gap-4 border-t border-zinc-800 pt-8">
                <div className="flex flex-col items-center gap-2 group">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-600 transition-colors">
                        <Shirt size={14} className="text-zinc-400 group-hover:text-white" />
                    </div>
                    <span className="text-[11px] sm:text-xs uppercase font-bold text-zinc-400 tracking-wider">1. Upload</span>
                </div>
                <div className="flex flex-col items-center gap-2 group">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-600 transition-colors">
                        <User size={14} className="text-zinc-400 group-hover:text-white" />
                    </div>
                    <span className="text-[11px] sm:text-xs uppercase font-bold text-zinc-400 tracking-wider">2. Model</span>
                </div>
                <div className="flex flex-col items-center gap-2 group">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-600 transition-colors">
                        <Wand2 size={14} className="text-zinc-400 group-hover:text-white" />
                    </div>
                    <span className="text-[11px] sm:text-xs uppercase font-bold text-zinc-400 tracking-wider">3. Create</span>
                </div>
            </div>
        </div>
      </div>
    );
  }

  // Success
  return (
    <div className="h-full w-full bg-black relative flex flex-col group">
      {width && height && (
        <div className="absolute top-4 sm:top-6 left-4 sm:left-6 z-20 bg-black/60 backdrop-blur-md border border-zinc-800 px-3 py-1.5 rounded-full flex items-center gap-2.5 shadow-2xl">
          <Monitor size={10} className="text-zinc-400" />
          <span className="text-[11px] font-mono text-zinc-300 font-bold uppercase tracking-widest">
            {width} <span className="text-zinc-700">×</span> {height} px
          </span>
          <div className="hidden xs:block w-px h-2.5 bg-zinc-800 mx-0.5"></div>
          <span className={`hidden xs:inline text-[11px] font-black uppercase ${getResolutionLabel() === '4K' ? 'text-amber-500' : getResolutionLabel() === 'HD' ? 'text-blue-400' : 'text-zinc-400'}`}>
            {getResolutionLabel()} Quality
          </span>
        </div>
      )}

      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-zinc-950/30">
        <img 
            src={image} 
            alt="Generated Photoshoot" 
            className="h-full w-full object-contain z-10 shadow-2xl"
        />
      </div>
      
      {/* Floating Action Dock */}
      <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center w-[calc(100%-2rem)] max-w-xs sm:max-w-none justify-center">
        <div className="flex items-center w-full sm:w-auto bg-zinc-950/80 backdrop-blur-2xl border border-zinc-800 p-1 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.8)]" ref={menuRef}>
            
            {/* Regenerate Trigger */}
            <div className="relative flex-1 sm:flex-none">
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="w-full h-10 pl-5 pr-4 hover:bg-zinc-800/50 text-white rounded-l-full font-bold text-[11px] uppercase tracking-widest transition-all flex items-center justify-center sm:justify-start gap-3 group"
                >
                    <RefreshCw size={14} className={`transition-transform duration-500 ${showMenu ? 'rotate-180' : 'group-hover:rotate-45'}`} />
                    <span className="hidden xs:inline">Regen</span>
                    <span className="xs:hidden">Retry</span>
                    <ChevronUp size={12} className={`text-zinc-600 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Regenerate Menu - Floats Upwards */}
                {showMenu && (
                    <div className="absolute bottom-full left-0 mb-4 w-56 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-slide-up">
                        <SpotlightGate isLocked={!isPremium} tier="CREATOR">
                          <button
                              onClick={() => { 
                                  onRegenerate(true); 
                                  if (isPremium) setShowMenu(false); 
                              }}
                              className={`w-full text-left px-5 py-4 flex items-center gap-4 transition-colors border-b border-zinc-900 ${isPremium ? 'hover:bg-zinc-900 text-zinc-300' : ''}`}
                          >
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPremium ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                                      <User size={14} />
                                  </div>
                                  <div className="flex-1">
                                      <span className={`text-[11px] font-black uppercase tracking-wider block ${isPremium ? 'text-white' : 'text-zinc-400'}`}>Keep Identity</span>
                                      <span className="text-[11px] text-zinc-400 font-medium">Locked current model</span>
                                  </div>
                          </button>
                        </SpotlightGate>
                        <button
                            onClick={() => { onRegenerate(false); setShowMenu(false); }}
                            className="w-full text-left px-5 py-4 hover:bg-zinc-900 flex items-center gap-4 text-zinc-300 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-zinc-800 text-white flex items-center justify-center">
                                <Users size={14} />
                            </div>
                            <div className="flex-1">
                                <span className="text-[11px] font-black uppercase tracking-wider block text-white">New Casting</span>
                                <span className="text-[11px] text-zinc-400 font-medium">Randomize identity</span>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            {/* Separator */}
            <div className="w-px h-6 bg-zinc-800/50 mx-1"></div>

            {/* Save Button */}
            <button
                onClick={onDownload}
                className="flex-1 sm:flex-none h-10 pl-4 pr-5 hover:bg-zinc-800/50 text-white rounded-r-full font-bold text-[11px] uppercase tracking-widest transition-all flex items-center justify-center sm:justify-start gap-3 group"
            >
                <Download size={14} className="group-hover:-translate-y-0.5 transition-transform" />
                <span>Save</span>
            </button>
        </div>
      </div>
    </div>
  );
};
