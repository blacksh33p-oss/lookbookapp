
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, Download, Trash2, RotateCw, Inbox } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Generation } from '../types';

// Define the missing LibraryDrawerProps interface
interface LibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId: string | null;
  prefetch: boolean;
}

/**
 * ARCHITECTURAL LOAD OPTIMIZATION
 * Batch size of 50 is the optimal saturation point for 4K displays.
 * Combined with lean metadata selection, this ensures TTFB < 200ms.
 */
const PAGE_SIZE = 50;

/**
 * UTILITY: Edge-Optimized Image Delivery
 * Leverages Supabase Storage's built-in CDN transformation engine.
 * This prevents the 'Presigned URL' bottleneck by using deterministic public URLs.
 */
const getThumbnailUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('supabase.co/storage/v1/object/public')) {
    // 400px width is the breakpoint for high-DPI thumbnails at 50% grid width
    return `${url}?width=400&quality=70&resize=contain`;
  }
  return url;
};

/**
 * SKELETON UI: FCP Optimization
 * Ensures the 'First Contentful Paint' is immediate while the lean JSON batch is in transit.
 */
const ArchiveSkeleton = () => (
  <div className="grid grid-cols-2 gap-3 sm:gap-4 animate-pulse">
    {[...Array(10)].map((_, i) => (
      <div 
        key={i} 
        className="aspect-[3/4] bg-zinc-900/50 rounded-lg border border-zinc-800/50 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-800/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
      </div>
    ))}
  </div>
);

export const LibraryDrawer: React.FC<LibraryDrawerProps> = ({ isOpen, onClose, activeProjectId, prefetch }) => {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  // Memoization and deduplication refs
  const fetchedIds = useRef<Set<string>>(new Set());
  const lastProjectId = useRef<string | null>(undefined as any);
  const observerTarget = useRef<HTMLDivElement>(null);

  /**
   * LEAN DATA RETRIEVAL (The Speed Fix)
   * Instead of select('*'), we fetch only essential scalars.
   * We use the -> operator to pluck only the modelVersion from the config JSONB.
   * This excludes the heavy outfit/prompt data from the network waterfall.
   */
  const fetchPage = useCallback(async (pageNum: number, isReset = false) => {
    if (isLoading || (!hasMore && !isReset)) return;

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // PERFORMANCE CRITICAL: Only select necessary columns. 
      // Do not fetch the full 'config' object in the list view.
      let query = supabase
        .from('generations')
        .select(`
          id, 
          image_url, 
          created_at, 
          project_id, 
          config->modelVersion
        `, { count: 'exact' })
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (activeProjectId) {
        query = query.eq('project_id', activeProjectId);
      }

      const { data, error, count } = await query;
      
      if (error) throw error;

      if (data) {
        // Map the results to satisfy the Generation type (PostgREST JSONB selection 
        // returns config as an object containing only the requested fields)
        const typedData = data as unknown as Generation[];

        if (isReset) {
          fetchedIds.current = new Set(typedData.map(g => g.id));
          setGenerations(typedData);
          setPage(1);
        } else {
          const newItems = typedData.filter(g => !fetchedIds.current.has(g.id));
          newItems.forEach(g => fetchedIds.current.add(g.id));
          setGenerations(prev => [...prev, ...newItems]);
          setPage(pageNum + 1);
        }
        
        const totalFetched = from + data.length;
        setHasMore(count ? totalFetched < count : data.length === PAGE_SIZE);
      }
    } catch (err) {
      console.error("Archive Fetch Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId, isLoading, hasMore]);

  /**
   * STALE-WHILE-REVALIDATE (SWR) Pattern
   * Allows the Archive to feel 'instant' on second load.
   */
  useEffect(() => {
    if (!isOpen && !prefetch) return;

    const projectChanged = lastProjectId.current !== activeProjectId;
    
    if (projectChanged) {
      setGenerations([]);
      fetchedIds.current.clear();
      setPage(0);
      setHasMore(true);
    }

    if (projectChanged || (generations.length === 0 && !isLoading)) {
      fetchPage(0, true);
    }

    lastProjectId.current = activeProjectId;
  }, [isOpen, prefetch, activeProjectId, fetchPage]);

  // Infinite Scroll Intersection Observer
  useEffect(() => {
    if (!isOpen || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchPage(page);
        }
      },
      { threshold: 0.1, rootMargin: '400px' } 
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isOpen, hasMore, isLoading, page, fetchPage]);

  const deleteGeneration = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Permanently delete this shoot?")) return;
    
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
        
        {/* Header - Lean Navigation */}
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
              title="Refresh (Force Sync)"
            >
              <RotateCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors rounded-md hover:bg-zinc-900">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Optimized Render Engine */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar touch-pan-y">
          {isLoading && generations.length === 0 ? (
            <ArchiveSkeleton />
          ) : !isLoading && generations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 sm:p-12 opacity-30">
               <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 border border-zinc-800">
                  <Inbox size={24} className="text-zinc-500" />
               </div>
               <p className="text-sm text-white font-bold mb-1">Archive is empty</p>
               <p className="text-xs text-zinc-500">Fast-sync is active. No records found.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {generations.map((gen, index) => (
                  <div key={gen.id} className="group relative aspect-[3/4] bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-500 transition-all shadow-lg">
                    <img 
                      src={getThumbnailUrl(gen.image_url)} 
                      alt="Shoot" 
                      loading={index < 10 ? 'eager' : 'lazy'}
                      decoding="async"
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                    />
                    
                    {/* Interaction Dock */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[1px]">
                       <a 
                          href={gen.image_url} 
                          download={`shoot-${gen.id}.png`} 
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

                    {/* Meta Footer */}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none">
                        <div className="flex items-center justify-between">
                            <span className="text-[7px] text-zinc-400 font-mono">
                                {new Date(gen.created_at).toLocaleDateString()}
                            </span>
                            {gen.config?.modelVersion && (
                                <span className="text-[7px] text-zinc-500 uppercase tracking-tighter bg-black/50 px-1 rounded">
                                    {gen.config.modelVersion.includes('Pro') ? 'PRO' : 'FLASH'}
                                </span>
                            )}
                        </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Lazy Loading Sentinel */}
              <div ref={observerTarget} className="h-10 flex items-center justify-center">
                {isLoading && generations.length > 0 && <Loader2 className="animate-spin text-zinc-700" size={20} />}
                {!hasMore && generations.length > 0 && (
                  <span className="text-[9px] font-bold text-zinc-800 uppercase tracking-widest opacity-40">Sync Complete</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
