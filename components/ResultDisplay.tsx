
import React, { useState, useRef, useEffect } from 'react';
import { Download, RefreshCw, Loader2, User, Users, Camera, Lock, Sparkles, Shirt, Wand2, Save, ChevronDown, Folder, Hexagon, Plus, FolderPlus, Check } from 'lucide-react';
import { Project } from '../types';

interface ResultDisplayProps {
  isLoading: boolean;
  image: string | null;
  onDownload: () => void;
  onRegenerate: (keepModel: boolean) => void;
  onSaveToProject: (projectId: string | null) => Promise<void>;
  isPremium: boolean;
  isLoggedIn: boolean;
  projects: Project[];
  activeProjectId: string | null;
  error: string | null;
}

const LOADING_LOGS = [
    { id: 1, text: "INITIALIZING_TENSORS" },
    { id: 2, text: "ANALYZING_GEOMETRY" },
    { id: 3, text: "CALCULATING_LIGHT_PATHS" },
    { id: 4, text: "SYNTHESIZING_TEXTURES" },
    { id: 5, text: "REFINING_DETAILS" },
    { id: 6, text: "FINALIZING_OUTPUT" }
];

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ 
    isLoading, 
    image, 
    onDownload, 
    onRegenerate,
    onSaveToProject,
    isPremium,
    isLoggedIn,
    projects,
    activeProjectId,
    error 
}) => {
  const [showRegenMenu, setShowRegenMenu] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const regenMenuRef = useRef<HTMLDivElement>(null);
  const saveMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (regenMenuRef.current && !regenMenuRef.current.contains(event.target as Node)) {
        setShowRegenMenu(false);
      }
      if (saveMenuRef.current && !saveMenuRef.current.contains(event.target as Node)) {
        setShowSaveMenu(false);
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
        }, 1500);
        return () => clearInterval(interval);
    }
  }, [isLoading]);

  const handleSaveClick = async (projectId: string | null) => {
    setIsSaving(true);
    setShowSaveMenu(false);
    try {
      await onSaveToProject(projectId);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full w-full bg-black flex flex-col items-center justify-center relative font-mono">
        <div className="w-64">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-bold text-white uppercase tracking-widest">Processing</span>
             </div>
             
             <div className="space-y-2 border-l border-zinc-800 pl-4 relative">
                 {LOADING_LOGS.map((log, idx) => (
                     <div key={log.id} className={`flex items-center gap-2 text-[10px] transition-all duration-300 ${idx === currentStep ? 'text-white translate-x-1' : idx < currentStep ? 'text-zinc-600' : 'text-zinc-800'}`}>
                         <span className={`w-1.5 h-1.5 rounded-full ${idx === currentStep ? 'bg-white' : idx < currentStep ? 'bg-zinc-800' : 'bg-transparent'}`}></span>
                         {log.text}... {idx < currentStep && <span className="text-zinc-700 ml-auto">[OK]</span>}
                     </div>
                 ))}
             </div>
        </div>
      </div>
    );
  }

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

  if (!image) {
    return (
      <div className="h-full w-full bg-black flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/5 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 max-w-md text-center px-6">
            <div className="mb-8 flex justify-center">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl shadow-black">
                    <Sparkles className="w-8 h-8 text-white" strokeWidth={1.5} />
                </div>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight mb-4">
                Virtual Fashion Studio
            </h2>
            <p className="text-zinc-500 text-sm leading-relaxed mb-10 max-w-xs mx-auto">
                Turn garment photos into professional high-fashion editorials using Generative AI.
            </p>

            <div className="grid grid-cols-3 gap-4 border-t border-zinc-800 pt-8">
                <div className="flex flex-col items-center gap-2 group">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-600 transition-colors">
                        <Shirt size={16} className="text-zinc-400 group-hover:text-white" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">1. Upload</span>
                </div>
                <div className="flex flex-col items-center gap-2 group">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-600 transition-colors">
                        <User size={16} className="text-zinc-400 group-hover:text-white" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">2. Model</span>
                </div>
                <div className="flex flex-col items-center gap-2 group">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-zinc-600 transition-colors">
                        <Wand2 size={16} className="text-zinc-400 group-hover:text-white" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider">3. Create</span>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-black relative flex flex-col group">
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-zinc-950/30">
        <img 
            src={image} 
            alt="Generated Photoshoot" 
            className="h-full w-full object-contain z-10 shadow-2xl"
        />
      </div>
      
      <div className="absolute bottom-6 right-6 flex items-center gap-2 z-30 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="relative" ref={regenMenuRef}>
            <button
                onClick={() => setShowRegenMenu(!showRegenMenu)}
                className="h-9 px-4 bg-black/90 hover:bg-black text-white border border-zinc-800 hover:border-zinc-600 backdrop-blur-md rounded-md font-medium text-[10px] uppercase tracking-wider transition-all flex items-center gap-2"
            >
                <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
                Regenerate
            </button>

            {showRegenMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-56 bg-black border border-zinc-800 rounded-md shadow-2xl z-50 overflow-hidden animate-fade-in py-1">
                    <button
                        onClick={() => { onRegenerate(true); setShowRegenMenu(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-zinc-900 flex items-center gap-3 text-zinc-300 transition-colors border-b border-zinc-900"
                    >
                            <User size={14} />
                            <div className="flex-1">
                            <span className="text-xs font-bold block text-white uppercase">Keep Model</span>
                            <span className="text-[9px] text-zinc-500 font-mono">Preserve identity</span>
                            </div>
                            {!isPremium && <Lock size={10} className="text-zinc-600" />}
                    </button>
                    <button
                        onClick={() => { onRegenerate(false); setShowRegenMenu(false); }}
                        className="w-full text-left px-4 py-3 hover:bg-zinc-900 flex items-center gap-3 text-zinc-300 transition-colors"
                    >
                        <Users size={14} />
                        <div className="flex-1">
                            <span className="text-xs font-bold block text-white uppercase">New Model</span>
                            <span className="text-[9px] text-zinc-500 font-mono">Roll new features</span>
                        </div>
                    </button>
                </div>
            )}
        </div>

        {isLoggedIn ? (
          <div className="relative" ref={saveMenuRef}>
            <button
                onClick={() => setShowSaveMenu(!showSaveMenu)}
                disabled={isSaving}
                className={`h-9 px-4 rounded-md font-bold text-[10px] uppercase tracking-wider transition-all flex items-center gap-2 shadow-xl border ${justSaved ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-white text-black border-transparent hover:bg-zinc-200'}`}
            >
                {isSaving ? <Loader2 size={12} className="animate-spin" /> : justSaved ? <Check size={12} /> : <Save size={12} />}
                {justSaved ? "Saved" : "Save"}
                <ChevronDown size={10} className={`transition-transform duration-200 ${showSaveMenu ? 'rotate-180' : ''}`} />
            </button>

            {showSaveMenu && (
                <div className="absolute bottom-full right-0 mb-3 w-64 bg-black border border-zinc-800 rounded-lg shadow-[0_20px_60px_rgba(0,0,0,0.8)] z-[100] overflow-hidden animate-fade-in py-1">
                    <div className="px-4 py-3 text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] border-b border-zinc-900 mb-1 flex justify-between">
                        Folder <span>Archive</span>
                    </div>
                    
                    <button 
                        onClick={() => handleSaveClick(null)}
                        className={`w-full text-left px-4 py-3 text-[10px] flex items-center gap-3 transition-all uppercase font-bold group
                            ${activeProjectId === null ? 'bg-[#0051e0] text-white' : 'text-zinc-300 hover:bg-zinc-900'}`}
                    >
                        <div className="w-5 h-5 flex items-center justify-center shrink-0">
                            <Hexagon size={12} className={activeProjectId === null ? 'text-white' : 'text-zinc-600 group-hover:text-white'} />
                        </div>
                        <div className="flex-1">
                            <span className="block">General Archive</span>
                        </div>
                        {activeProjectId === null && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                    </button>

                    <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                        {projects.map(p => (
                            <button 
                                key={p.id}
                                onClick={() => handleSaveClick(p.id)}
                                className={`w-full text-left px-4 py-3 text-[10px] flex items-center justify-between transition-all uppercase font-bold group
                                    ${activeProjectId === p.id ? 'bg-[#0051e0] text-white' : 'text-zinc-300 hover:bg-zinc-900'}`}
                            >
                                <div className="flex items-center gap-3 truncate pr-2">
                                    <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                        <Folder size={12} className={activeProjectId === p.id ? 'text-white' : 'text-zinc-600 group-hover:text-white'} />
                                    </div>
                                    <span className="truncate">{p.name}</span>
                                </div>
                                {activeProjectId === p.id && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </button>
                        ))}
                    </div>

                    <div className="border-t border-zinc-900 mt-1 pt-1">
                        <button 
                            onClick={onDownload}
                            className="w-full text-left px-4 py-3 text-[10px] text-zinc-400 hover:bg-zinc-900 hover:text-white flex items-center gap-3 transition-colors uppercase font-bold"
                        >
                            <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                <Download size={14} />
                            </div>
                            <span>Local Download</span>
                        </button>
                    </div>
                </div>
            )}
          </div>
        ) : (
          <button
              onClick={onDownload}
              className="h-9 px-4 bg-white text-black hover:bg-zinc-200 rounded-md font-bold text-[10px] uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
          >
              <Download size={12} />
              Save
          </button>
        )}
      </div>
    </div>
  );
};
