import React, { useState, useRef, useEffect } from 'react';
import { Download, RefreshCw, Loader2, User, Users, Sparkles, Shirt, Wand2, ChevronUp } from 'lucide-react';

interface ResultDisplayProps {
  isLoading: boolean;
  image: string | null;
  onDownload: () => void;
  onRegenerate: (keepModel: boolean) => void;
  isPremium: boolean;
  error: string | null;
  SpotlightGate: React.FC<{ 
    children: React.ReactNode; 
    isLocked: boolean; 
    tier: 'CREATOR' | 'STUDIO'; 
    className?: string;
    containerClassName?: string;
  }>;
}

const LOADING_LOGS = [
    { id: 1, text: "INIT_NEURAL_FRAME" },
    { id: 2, text: "CALC_DIFFUSION_PATH" },
    { id: 3, text: "SYNT_TEXTILE_GRAIN" },
    { id: 4, text: "REFINING_OPTICS" },
    { id: 5, text: "UP_PRODUCTION_RES" }
];

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
    isLoading, 
    image, 
    onDownload, 
    onRegenerate, 
    isPremium,
    error,
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
            setCurrentStep((prev) => Math.min(prev + 1, LOADING_LOGS.length - 1));
        }, 1200);
        return () => clearInterval(interval);
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="h-full w-full bg-black flex flex-col items-center justify-center relative font-mono">
        <div className="w-80">
             <div className="flex items-center gap-4 mb-12">
                <div className="w-5 h-5 border border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Rendering Sequence</span>
             </div>
             
             <div className="space-y-4 border-l border-white/5 pl-8">
                 {LOADING_LOGS.map((log, idx) => (
                     <div key={log.id} className={`flex items-center gap-4 text-[9px] transition-all duration-500 tracking-[0.2em] ${idx === currentStep ? 'text-white translate-x-2' : idx < currentStep ? 'text-zinc-600' : 'text-zinc-900'}`}>
                         <span className={`w-1 h-1 ${idx === currentStep ? 'bg-white' : idx < currentStep ? 'bg-zinc-800' : 'bg-transparent'}`}></span>
                         {log.text} {idx < currentStep && <span className="text-[8px] opacity-30 ml-auto font-black">OK</span>}
                     </div>
                 ))}
             </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full bg-black flex flex-col items-center justify-center p-12 text-center">
        <div className="border border-red-500/20 py-8 px-12 bg-red-500/[0.02]">
            <h3 className="text-[10px] font-black text-red-500 mb-4 uppercase tracking-[0.3em]">Critical Engine Fail</h3>
            <p className="text-zinc-500 font-mono text-[11px] uppercase tracking-wide max-w-xs mx-auto leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  if (!image) {
    return (
      <div className="h-full w-full bg-black flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.03)_0%,_transparent_70%)] pointer-events-none" />

        <div className="relative z-10 max-w-xl text-center px-12">
            <div className="mb-12 flex justify-center">
                <div className="w-20 h-20 bg-black border border-white/10 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-white" strokeWidth={1} />
                </div>
            </div>
            
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.8em] mb-6">Production Studio v2.5</p>
            <h2 className="text-5xl md:text-7xl font-serif font-light text-white italic mb-10 tracking-tight">
                Virtual Editorial
            </h2>
            <p className="text-zinc-500 text-[11px] uppercase tracking-[0.3em] font-medium leading-loose mb-20 max-w-md mx-auto">
                Synthesizing high-fidelity fashion photography through diffusion models.
            </p>

            <div className="flex items-center justify-center gap-12 opacity-30">
                <div className="flex flex-col items-center gap-4">
                    <Shirt size={20} strokeWidth={1} />
                    <span className="text-[8px] uppercase font-black tracking-[0.4em]">Asset</span>
                </div>
                <div className="h-px w-8 bg-zinc-800" />
                <div className="flex flex-col items-center gap-4">
                    <User size={20} strokeWidth={1} />
                    <span className="text-[8px] uppercase font-black tracking-[0.4em]">Identity</span>
                </div>
                <div className="h-px w-8 bg-zinc-800" />
                <div className="flex flex-col items-center gap-4">
                    <Wand2 size={20} strokeWidth={1} />
                    <span className="text-[8px] uppercase font-black tracking-[0.4em]">Render</span>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-black relative flex flex-col group">
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <img 
            src={image} 
            alt="Editorial Output" 
            className="h-full w-full object-contain z-10 p-10 md:p-20 transition-transform duration-1000 group-hover:scale-105"
        />
      </div>
      
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex items-center">
        <div className="flex items-center bg-black/90 backdrop-blur-2xl border border-white/10 p-1 rounded-full shadow-2xl" ref={menuRef}>
            
            <div className="relative">
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="h-12 pl-8 pr-6 hover:bg-white hover:text-black text-white rounded-l-full font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center gap-4 group"
                >
                    <RefreshCw size={14} className={`transition-transform duration-700 ${showMenu ? 'rotate-180' : ''}`} />
                    <span>Regenerate</span>
                    <ChevronUp size={12} className={`transition-transform ${showMenu ? 'rotate-180' : ''}`} />
                </button>

                {showMenu && (
                    <div className="absolute bottom-full left-0 mb-6 w-64 bg-black border border-white/10 shadow-2xl z-50 overflow-hidden animate-slide-up">
                        <SpotlightGate isLocked={!isPremium} tier="CREATOR">
                          <button
                              onClick={() => { 
                                  onRegenerate(true); 
                                  if (isPremium) setShowMenu(false); 
                              }}
                              className={`w-full text-left px-6 py-6 flex items-center gap-5 transition-all border-b border-white/5 ${isPremium ? 'hover:bg-white hover:text-black text-zinc-400' : ''}`}
                          >
                                  <div className="flex-1">
                                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] block mb-1 ${isPremium ? 'group-hover:text-black text-white' : 'text-zinc-600'}`}>Preserve Model</span>
                                      <span className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest">Locked Identity</span>
                                  </div>
                          </button>
                        </SpotlightGate>
                        <button
                            onClick={() => { onRegenerate(false); setShowMenu(false); }}
                            className="w-full text-left px-6 py-6 hover:bg-white hover:text-black flex items-center gap-5 text-zinc-400 transition-all group"
                        >
                            <div className="flex-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] block mb-1 group-hover:text-black text-white">New Casting</span>
                                <span className="text-[8px] text-zinc-700 font-bold uppercase tracking-widest">Randomize Identity</span>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            <div className="w-px h-6 bg-white/10 mx-1"></div>

            <button
                onClick={onDownload}
                className="h-12 pl-6 pr-8 hover:bg-white hover:text-black text-white rounded-r-full font-black text-[10px] uppercase tracking-[0.3em] transition-all flex items-center gap-4 group"
            >
                <Download size={14} />
                <span>Save</span>
            </button>
        </div>
      </div>
    </div>
  );
};