
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, Download, Trash2, ExternalLink, RotateCw, Inbox } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Generation, ModelVersion } from '../types';

interface LibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId: string | null;
  prefetch?: boolean;
}

const PAGE_SIZE = 12;

// Utility to optimize image URLs for thumbnails
// Reduces payload size by requesting scaled-down versions from Supabase Storage
const getThumbnailUrl = (url: string) => {
    if (!url) return '';
    // If it's a Supabase storage URL, we can append transformation parameters
    if (url.includes('supabase.co/storage/v1/object/public')) {
        return `${url}?width=400&quality=75&resize=contain`;
    }
    // Fallback to original for non-Supabase or data URLs
    return url;
};

export const LibraryDrawer: React.FC<LibraryDrawerProps> = ({ isOpen, onClose, activeProjectId, prefetch }) => {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Refs for infinite scroll intersection observer
  const observerTarget = useRef<HTMLDivElement>(null);

  // Function to fetch a specific page of generations
  const fetchPage = useCallback(async (pageNum: number, isNewProject = false) => {
    if (isLoading || (!hasMore && !isNewProject)) return;

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('generations')
        .select('*', { count: 'exact' })
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (activeProjectId) {
        query = query.eq('project_id', activeProjectId);
      }

      const { data, error, count } = await query;
      
      if (error) throw error;

      if (data) {
        setGenerations(prev => isNewProject ? data : [...prev, ...data]);
        // Update hasMore based on total count
        const totalFetched = from + data.length;
        setHasMore(count ? totalFetched < count : data.length === PAGE_SIZE);
        setPage(pageNum + 1);
      }
    } catch (err) {
      console.error("Archive Fetch Error:", err);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [activeProjectId, isLoading, hasMore]);

  // Handle Prefetching and Initial Load
  useEffect(() => {
    if ((isOpen || prefetch) && generations.length === 0 && isInitialLoad) {
      setGenerations([]);
      setPage(0);
      setHasMore(true);
      fetchPage(0, true);
    }
  }, [activeProjectId, isOpen, prefetch, generations.length, isInitialLoad, fetchPage]);

  // Reset state when project changes
  useEffect(() => {
    if (isOpen) {
      setGenerations([]);
      setPage(0);
      setHasMore(true);
      setIsInitialLoad(true);
      fetchPage(0, true);
    }
  }, [activeProjectId]);

  // Infinite Scroll Observer logic
  useEffect(() => {
    if (!isOpen || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchPage(page);
        }
      },
      { threshold: 0.1, rootMargin: '150px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isOpen, hasMore, isLoading, page, fetchPage]);

  const deleteGeneration = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this shoot?")) return;
    
    const { error } = await supabase.from('generations').delete().eq('id', id);
    if (!error) {
      setGenerations(prev => prev.filter(g => g.id !== id));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 h-full w-full max-w-lg bg-black border-l border-zinc-800 shadow-2xl animate-fade-in flex flex-col">
        
        {/* Header */}
        <div className="p-4 sm:p-6 flex items-center justify-between border-b border-zinc-800 bg-black/80 backdrop-blur-md sticky top-0 z-10">
          <div className="overflow-hidden">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">Shoot History</h2>
            <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-bold truncate">
              {activeProjectId ? 'Project Archive' : 'Global Library'}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button 
              onClick={() => fetchPage(0, true)} 
              disabled={isLoading}
              className="p-2 text-zinc-500 hover:text-white transition-colors disabled:opacity-30 rounded-md hover:bg-zinc-900"
              title="Refresh Archive"
            >
              <RotateCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors rounded-md hover:bg-zinc-900">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar touch-pan-y">
          {isInitialLoad && isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[3/4] bg-zinc-900/50 rounded-lg animate-pulse border border-zinc-800" />
              ))}
            </div>
          ) : generations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 sm:p-12 opacity-30">
               <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 border border-zinc-800">
                  <Inbox size={24} className="text-zinc-500" />
               </div>
               <p className="text-sm text-white font-bold mb-1">Archive is empty</p>
               <p className="text-xs text-zinc-500">Generations will appear here once saved.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {generations.map((gen, index) => (
                  <div key={gen.id} className="group relative aspect-[3/4] bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-500 transition-all shadow-lg">
                    <img 
                      src={getThumbnailUrl(gen.image_url)} 
                      alt="Shoot" 
                      // Performance Optimization: 
                      // Eager load first 6 items (viewport) with high priority
                      // Lazy load the rest to save bandwidth
                      loading={index < 6 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                    />
                    
                    {/* Action Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[2px]">
                       <a 
                          href={gen.image_url} 
                          download={`fashion-shoot-${gen.id}.png`} 
                          onClick={(e) => e.stopPropagation()}
                          className="p-2.5 bg-white text-black rounded-full hover:scale-110 active:scale-95 transition-all shadow-xl"
                       >
                          <Download size={16} />
                       </a>
                       <button 
                          onClick={(e) => deleteGeneration(gen.id, e)} 
                          className="p-2.5 bg-red-600 text-white rounded-full hover:scale-110 active:scale-95 transition-all shadow-xl"
                       >
                          <Trash2 size={16} />
                       </button>
                    </div>

                    {/* Visual Metadata */}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none">
                        <div className="flex items-center justify-between">
                            <span className="text-[7px] text-zinc-400 font-mono">
                                {new Date(gen.created_at).toLocaleDateString()}
                            </span>
                            {gen.config?.modelVersion && (
                                <span className="text-[7px] text-zinc-500 uppercase tracking-tighter">
                                    {gen.config.modelVersion.includes('Pro') ? 'PRO' : 'FLASH'}
                                </span>
                            )}
                        </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Infinite Scroll Sentinel */}
              <div ref={observerTarget} className="h-10 flex items-center justify-center">
                {isLoading && <Loader2 className="animate-spin text-zinc-700" size={20} />}
                {!hasMore && generations.length > 0 && (
                  <span className="text-[9px] font-bold text-zinc-800 uppercase tracking-widest">End of results</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
