
import React, { useState, useEffect } from 'react';
import { X, Loader2, Download, Trash2, ExternalLink, RotateCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Generation } from '../types';

interface LibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId: string | null;
  session: any;
}

export const LibraryDrawer: React.FC<LibraryDrawerProps> = ({ isOpen, onClose, activeProjectId, session }) => {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (isOpen && session?.user?.id) {
      fetchGenerations();
    }
  }, [isOpen, activeProjectId, retryCount, session?.user?.id]);

  const fetchGenerations = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    
    // Safety timeout to prevent stuck loading on mobile
    const timeout = setTimeout(() => setIsLoading(false), 8000);

    try {
      let query = supabase
        .from('generations')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      
      if (activeProjectId) {
        query = query.eq('project_id', activeProjectId);
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
    } else {
      console.error("Delete error:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 h-full w-full max-w-lg bg-black border-l border-zinc-800 shadow-2xl animate-fade-in flex flex-col">
        <div className="p-4 sm:p-6 flex items-center justify-between border-b border-zinc-800 bg-black/80 backdrop-blur-md">
          <div className="overflow-hidden">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">Shoot History</h2>
            <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-bold truncate">Workspace: {activeProjectId ? 'Project' : 'All'}</p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <button 
              onClick={() => setRetryCount(prev => prev + 1)} 
              disabled={isLoading}
              className="p-2 text-zinc-500 hover:text-white transition-colors disabled:opacity-30"
            >
              <RotateCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar touch-pan-y">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="animate-spin text-zinc-600" size={32} />
              <p className="text-xs text-zinc-500 font-mono">LOADING_ASSETS...</p>
            </div>
          ) : generations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 sm:p-12 opacity-40">
               <div className="w-12 h-12 sm:w-16 sm:h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                  <ExternalLink size={20} className="sm:size-24" />
               </div>
               <p className="text-sm text-white font-bold mb-1">Archive empty</p>
               <p className="text-xs text-zinc-500">Generations saved here will persist in your cloud library.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {generations.map((gen) => (
                <div key={gen.id} className="group relative aspect-[3/4] bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-all">
                  <img src={gen.image_url} alt="Shoot" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                  <div className="absolute inset-0 bg-black/60 sm:opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                     <a 
                        href={gen.image_url} 
                        download={`shoot-${gen.id}.png`} 
                        className="p-2.5 sm:p-2 bg-white text-black rounded-full hover:scale-110 transition-transform shadow-lg"
                     >
                        <Download size={16} />
                     </a>
                     <button onClick={() => deleteGeneration(gen.id)} className="p-2.5 sm:p-2 bg-red-600 text-white rounded-full hover:scale-110 transition-transform shadow-lg">
                        <Trash2 size={16} />
                     </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent pointer-events-none">
                      <p className="text-[8px] text-zinc-400 font-mono truncate">
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
