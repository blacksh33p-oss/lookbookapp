
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Loader2, Download, Trash2, RotateCw, Inbox } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Generation, ModelVersion } from '../types';

interface LibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId: string | null;
  prefetch?: boolean;
}

/** 
 * PERFORMANCE CONFIGURATION
 * 30 items is optimized to fill the viewport on 4K displays while keeping 
 * the JSON payload under the 50KB threshold for near-instant parsing.
 */
const PAGE_SIZE = 30;

// Utility to optimize image URLs for thumbnails
const getThumbnailUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('supabase.co/storage/v1/object/public')) {
        return `${url}?width=400&quality=70&resize=contain`;
    }
    return url;
};

/**
 * SKELETON COMPONENT
 * Provides immediate visual structure to satisfy FCP requirements.
 */
const ArchiveSkeleton = () => (
  <div className="grid grid-cols-2 gap-3 sm:gap-4 animate-pulse">
    {[...Array(12)].map((_, i) => (
      <div 
        key={i} 
        className="aspect-[3/4] bg-zinc-900/40 rounded-lg border border-zinc-800/50 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-800/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
      </div>
    ))}
  </div>
);

export const LibraryDrawer: React.FC<LibraryDrawerProps> = ({ isOpen, onClose, activeProjectId, prefetch }) => {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Ref to track IDs to prevent duplicate rendering during race conditions
  const fetchedIds = useRef<Set<string>>(new Set());
  const observerTarget = useRef<HTMLDivElement>(null);

  /**
   * DATA FETCHING - BATCH OPTIMIZED
   * Fetches metadata including image_url in a single round-trip.
   */
  const fetchPage = useCallback(async (pageNum: number, isReset = false) => {
    if (isLoading || (!hasMore && !isReset)) return;

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
        if (isReset) {
          fetchedIds.current = new Set(data.map(g => g.id));
          setGenerations(data);
        } else {
          const newItems = data.filter(g => !fetchedIds.current.has(g.id));
          newItems.forEach(g => fetchedIds.current.add(g.id));
          setGenerations(prev => [...prev, ...newItems]);
        }
        
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

  // Handle Prefetching (Triggered on hover of Archive button)
  useEffect(() => {
    if (prefetch && generations.length === 0 && !isLoading) {
      fetchPage(0, true);
    }
  }, [prefetch, fetchPage, generations.length, isLoading]);

  // Reset/Initial load when drawer opens
  useEffect(() => {
    if (isOpen && (generations.length === 0 || activeProjectId !== null)) {
      setPage(0);
      setHasMore(true);
      setIsInitialLoad(true);
      fetchPage(0, true);
    }
  }, [activeProjectId, isOpen]);

  // Infinite Scroll Intersection Observer
  useEffect(() => {
    if (!isOpen || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchPage(page);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
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
      fetchedIds.current.delete(id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 h-full w-full max-w-lg bg-black border-l border-zinc-800 shadow-2xl animate-fade-in flex flex-col">
        
        {/* Header - Fixed */}
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

        {/* Optimized Scrollable Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar touch-pan-y">
          {isInitialLoad && isLoading ? (
            <ArchiveSkeleton />
          ) : generations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 sm:p-12 opacity-30">
               <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 border border-zinc-800">
                  <Inbox size={24} className="text-zinc-500" />
               </div>
               <p className="text-sm text-white font-bold mb-1">Archive is empty</p>
               <p className="text-xs text-zinc-500">Generations appear here automatically when saved.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {generations.map((gen, index) => (
                  <div key={gen.id} className="group relative aspect-[3/4] bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-500 transition-all shadow-lg">
                    <img 
                      src={getThumbnailUrl(gen.image_url)} 
                      alt="Shoot" 
                      loading={index < 8 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                    />
                    
                    {/* Interaction Layer */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[1px]">
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

                    {/* Metadata Overlay */}
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

              {/* Infinite Scroll Trigger */}
              <div ref={observerTarget} className="h-10 flex items-center justify-center">
                {isLoading && <Loader2 className="animate-spin text-zinc-700" size={20} />}
                {!hasMore && generations.length > 0 && (
                  <span className="text-[9px] font-bold text-zinc-800 uppercase tracking-widest opacity-40">End of results</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
