
import React, { useState, useEffect } from 'react';
import { X, Loader2, Download, Trash2, ExternalLink, RotateCw, Folder, LayoutGrid, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Generation, Project } from '../types';

interface LibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialProjectId: string | null;
  session: any;
  projects: Project[];
  onProjectChange: (id: string | null) => void;
}

export const LibraryDrawer: React.FC<LibraryDrawerProps> = ({ 
  isOpen, 
  onClose, 
  initialProjectId, 
  session, 
  projects,
  onProjectChange
}) => {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(initialProjectId);

  useEffect(() => {
    setCurrentProjectId(initialProjectId);
  }, [initialProjectId]);

  useEffect(() => {
    if (isOpen && session?.user?.id) {
      fetchGenerations();
    }
  }, [isOpen, currentProjectId, retryCount, session?.user?.id]);

  const fetchGenerations = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    
    // Mobile safety: ensure loading state clears if fetch is silent
    const timeout = setTimeout(() => setIsLoading(false), 6000);

    try {
      let query = supabase
        .from('generations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (currentProjectId) {
        query = query.eq('project_id', currentProjectId);
      } else {
        // If "Main Archive" is selected, show only items without a project ID or all items?
        // Let's make "Main Archive" show everything NOT in a folder for true organization
        query = query.is('project_id', null);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Fetch generations error:", error);
      } else if (data) {
        setGenerations(data);
      }
    } catch (err) {
      console.error("Fetch generations exception:", err);
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  };

  const deleteGeneration = async (id: string) => {
    if (!confirm("Are you sure you want to delete this shoot?")) return;
    const { error } = await supabase.from('generations').delete().eq('id', id);
    if (!error) {
      setGenerations(generations.filter(g => g.id !== id));
    }
  };

  const handleProjectSwitch = (id: string | null) => {
    setCurrentProjectId(id);
    onProjectChange(id); // Sync with sidebar
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 h-full w-full max-w-lg bg-black border-l border-zinc-800 shadow-2xl animate-fade-in flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-zinc-800 bg-black/80 backdrop-blur-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight uppercase">Archive Browser</h2>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setRetryCount(prev => prev + 1)} 
                disabled={isLoading}
                className="p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <RotateCw size={16} className={isLoading ? 'animate-spin' : ''} />
              </button>
              <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Folder Switcher within Drawer */}
          <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                <Folder size={14} />
              </div>
              <select 
                value={currentProjectId || ''} 
                onChange={(e) => handleProjectSwitch(e.target.value || null)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-md pl-10 pr-10 py-2.5 text-[10px] font-bold text-white uppercase tracking-widest focus:border-zinc-500 transition-all appearance-none cursor-pointer"
              >
                <option value="">General Archive</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                <ChevronDown size={14} />
              </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar touch-pan-y bg-zinc-950/20">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
              <Loader2 className="animate-spin text-zinc-700" size={32} />
              <p className="text-[10px] text-zinc-600 font-mono tracking-widest uppercase animate-pulse">Retreiving_Data...</p>
            </div>
          ) : generations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 sm:p-12">
               <div className="w-16 h-16 bg-zinc-900/50 rounded-full flex items-center justify-center mb-6 border border-zinc-800/50">
                  <LayoutGrid size={24} className="text-zinc-700" />
               </div>
               <p className="text-sm text-zinc-400 font-bold mb-2 uppercase tracking-tight">No items in this folder</p>
               <p className="text-xs text-zinc-600 max-w-[200px] mx-auto leading-relaxed">Save generated shoots here to build your collection.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 pb-10">
              {generations.map((gen) => (
                <div key={gen.id} className="group relative aspect-[3/4] bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-500 transition-all shadow-lg hover:shadow-white/5">
                  <img src={gen.image_url} alt="Shoot" className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                     <a 
                        href={gen.image_url} 
                        download={`shoot-${gen.id}.png`} 
                        className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-2xl"
                        title="Download"
                     >
                        <Download size={18} />
                     </a>
                     <button 
                        onClick={() => deleteGeneration(gen.id)} 
                        className="p-3 bg-red-600 text-white rounded-full hover:scale-110 transition-transform shadow-2xl"
                        title="Delete"
                     >
                        <Trash2 size={18} />
                     </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent pointer-events-none">
                      <p className="text-[9px] text-zinc-400 font-mono">
                        {new Date(gen.created_at).toLocaleDateString()}
                      </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
