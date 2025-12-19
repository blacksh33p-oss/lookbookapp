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
      <div className="h-full w-full flex flex-col items-center justify-center relative font-mono">
        <div className="w-80">
             <div className="flex items-center gap-4 mb-12">
                <div className="w-4 h-4 border border-white/20 border-t-white rounded-full animate-spin"></div>
                <span className="text-[9px] font-black text-white uppercase tracking-[0.5em]">SYNTHESIZING</span>
             </div>
             
             <div className="space-y-4 border-l border-white/5 pl-8">
                 {LOADING_LOGS.map((log, idx) => (
                     <div key={log.id} className={`flex items-center gap-4 text-[8px] transition-all duration-700 tracking-[0.3em] ${idx === currentStep ? 'text-white translate-x-1' : idx < currentStep ? 'text-zinc-700' : 'text-zinc-900'}`}>
                         <span className={`w-1 h-1 rounded-full ${idx === currentStep ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]' : idx < currentStep ? 'bg-zinc-800' : 'bg-transparent'}`}></span>
                         {log.text}
                     </div>
                 ))}
             </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-12 text-center animate-fade-in">
        <div className="border border-red-500/20 py-10 px-14 bg-red-500/[0.01] rounded-sm backdrop-blur-md">
            <h3 className="text-[9px] font-black text-red-500 mb-5 uppercase tracking-[0.4em]">ERR_LATENT_FAILURE</h3>
            <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-[0.2em] max-w-[200px] mx-auto leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  if (!image) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.02)_0%,_transparent_60%)] pointer-events-none transition-opacity duration-1000 group-hover:opacity-100" />

        <div className="relative z-10 max-w-xl text-center px-12 animate-slide-up">
            <div className="mb-14 flex justify-center">
                <div className="w-16 h-16 bg-transparent border border-white/5 flex items-center justify-center shadow-2xl relative">
                    <div className="absolute inset-0 bg-white/[0.02] blur-xl -z-10" />
                    <Sparkles className="w-6 h-6 text-zinc-600" strokeWidth={1} />
                </div>
            </div>
            
            <p className="text-[8px] font-black text-zinc-700 uppercase tracking-[0.8em] mb-8">ATELIER_CORE_v2.5</p>
            <h2 className="text-5xl md:text-7xl font-serif font-light text-white italic mb-12 tracking-tighter opacity-80 group-hover:opacity-100 transition-opacity">
                Digital Atelier
            </h2>
            <p className="text-zinc-700 text-[10px] uppercase tracking-[0.4em] font-medium leading-[2.5] mb-20 max-w-xs mx-auto">
                Synthesizing production-grade fashion imagery through generative optics.
            </p>

            <div className="flex items-center justify-center gap-10 opacity-10">
                <div className="flex flex-col items-center gap-4">
                    <Shirt size={16} strokeWidth={1} />
                    <span className="text-[7px] uppercase font-black tracking-[0.4em]">ASSET</span>
                </div>
                <div className="h-px w-6 bg-white" />
                <div className="flex flex-col items-center gap-4">
                    <User size={16} strokeWidth={1} />
                    <span className="text-[7px] uppercase font-black tracking-[0.4em]">ID</span>
                </div>
                <div className="h-px w-6 bg-white" />
                <div className="flex flex-col items-center gap-4">
                    <Wand2 size={16} strokeWidth={1} />
                    <span className="text-[7px] uppercase font-black tracking-[0.4em]">GEN</span>
                </div>
            </div>
        </div>
        
        {/* Micro-Typography corners */}
        <div className="absolute top-6 left-6 text-metadata">STUDIO_LIGHTBOX_v2</div>
        <div className="absolute top-6 right-6 text-metadata">RENDER_ENGINE:GEMINI_2.5_FL</div>
        <div className="absolute bottom-6 left-6 text-metadata">READY_FOR_SYNTH</div>
        <div className="absolute bottom-6 right-6 text-metadata">0.00ms_LATENCY</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative flex flex-col group animate-fade-in">
      {/* Micro-Typography corners */}
      <div className="absolute top-8 left-8 text-metadata z-20">FRAME_ID: FS_{Math.floor(Math.random()*9999)}</div>
      <div className="absolute top-8 right-8 text-metadata z-20">RESOLUTION: 2048x2048_PX</div>
      <div className="absolute bottom-8 left-8 text-metadata z-20">SAMP_RATE: PRO_DENSITY</div>
      <div className="absolute bottom-8 right-8 text-metadata z-20">SYNTH_COMPLETE_OK</div>

      <div className="flex-1 relative flex items-center justify-center overflow-hidden z-10">
        <img 
            src={image} 
            alt="Editorial Output" 
            className="h-full w-full object-contain p-12 md:p-24 transition-all duration-1000 group-hover:scale-[1.02] filter group-hover:brightness-110"
        />
      </div>
      
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 flex items-center animate-slide-up">
        <div className="flex items-center bg-[#050505]/90 backdrop-blur-2xl border border-white/5 p-1 rounded-sm shadow-2xl shadow-black/80" ref={menuRef}>
            
            <div className="relative">
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="h-11 pl-8 pr-6 hover:bg-white hover:text-black text-zinc-400 rounded-sm font-black text-[9px] uppercase tracking-[0.4em] transition-all flex items-center gap-4 group/btn"
                >
                    <RefreshCw size={12} className={`transition-transform duration-700 ${showMenu ? 'rotate-180 text-black' : 'group-hover/btn:text-white'}`} />
                    <span className="group-hover/btn:text-white">Regenerate</span>
                    <ChevronUp size={12} className={`transition-transform ${showMenu ? 'rotate-180' : ''}`} />
                </button>

                {showMenu && (
                    <div className="absolute bottom-full left-0 mb-6 w-64 bg-black border border-white/5 shadow-2xl z-50 overflow-hidden animate-slide-up shadow-[0_0_0_1px_rgba(255,255,255,0.01)]">
                        <SpotlightGate isLocked={!isPremium} tier="CREATOR">
                          <button
                              onClick={() => { 
                                  onRegenerate(true); 
                                  if (isPremium) setShowMenu(false); 
                              }}
                              className={`w-full text-left px-6 py-6 flex items-center gap-5 transition-all border-b border-white/5 group/sub ${isPremium ? 'hover:bg-white text-zinc-600' : ''}`}
                          >
                                  <div className="flex-1">
                                      <span className={`text-[9px] font-black uppercase tracking-[0.2em] block mb-1 ${isPremium ? 'group-hover/sub:text-black text-white' : 'text-zinc-800'}`}>Preserve Model</span>
                                      <span className="text-[7px] text-zinc-800 font-bold uppercase tracking-widest">Locked Identity Matrix</span>
                                  </div>
                          </button>
                        </SpotlightGate>
                        <button
                            onClick={() => { onRegenerate(false); setShowMenu(false); }}
                            className="w-full text-left px-6 py-6 hover:bg-white flex items-center gap-5 text-zinc-600 transition-all group/sub"
                        >
                            <div className="flex-1">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] block mb-1 group-hover/sub:text-black text-white">New Casting</span>
                                <span className="text-[7px] text-zinc-800 font-bold uppercase tracking-widest">Randomize Talent Node</span>
                            </div>
                        </button>
                    </div>
                )}
            </div>

            <div className="w-px h-5 bg-white/5 mx-1"></div>

            <button
                onClick={onDownload}
                className="h-11 pl-6 pr-8 hover:bg-white hover:text-black text-zinc-400 rounded-sm font-black text-[9px] uppercase tracking-[0.4em] transition-all flex items-center gap-4 group/btn"
            >
                <Download size={12} className="group-hover/btn:text-white" />
                <span className="group-hover/btn:text-white">Save_Output</span>
            </button>
        </div>
      </div>
    </div>
  );
};