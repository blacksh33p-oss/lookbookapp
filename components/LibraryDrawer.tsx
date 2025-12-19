
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, Download, Trash2, RotateCw, Inbox } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Generation } from '../types';

interface LibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId: string | null;
  prefetch?: boolean;
}

const PAGE_SIZE = 30;

/**
 * PERFORMANCE UTILITY: URL-First Resizing
 * Leverages the Cloud CDN transformation layer to fetch compressed thumbnails.
 * Converts the full 2.5MB source URL into a ~20KB optimized WebP asset.
 * This ensures the Archive DOM never contains Data URIs / Base64.
 */
const getThumbnailUrl = (url: string) => {
  if (!url) return '';
  // Verify standard cloud storage pattern
  if (url.includes('supabase.co/storage/v1/object/public')) {
    // Request a 300px width @ 60% quality WebP via the transformation endpoint
    const baseUrl = url.replace('/storage/v1/object/public', '/storage/v1/render/image/public');
    return `${baseUrl}?width=300&quality=60&resize=contain`;
  }
  return url;
};

/**
 * SKELETON UI: FCP Optimization
 * Maintains layout stability while the sub-200ms JSON request resolves.
 */
const ArchiveSkeleton = () => (
  <div className="grid grid-cols-2 gap-3 sm:gap-4 animate-pulse">
    {[...Array(8)].map((_, i) => (
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
  
  // Data State Refs
  const fetchedIds = useRef<Set<string>>(new Set());
  const lastProjectId = useRef<string | null>(undefined as any);
  const observerTarget = useRef<HTMLDivElement>(null);

  /**
   * PERFORMANCE CRITICAL FETCH
   * Strictly requests scalar metadata only. We use 'config->modelVersion' to pluck
   * only the specific string from the JSONB block, preventing the transfer of 
   * the heavy sanitized config object.
   */
  const fetchPage = useCallback(async (pageNum: number, isReset = false) => {
    if (isLoading || (!hasMore && !isReset)) return;

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // SELECTIVE PROJECTION: Do NOT fetch '*' (all columns).
      // We explicitly request 'image_url' which now strictly contains a CDN URL.
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
      console.error("Archive sync failure:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId, isLoading, hasMore]);

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

  // Infinite Scroll Trigger
  useEffect(() => {
    if (!isOpen || !hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchPage(page);
        }
      },
      { threshold: 0.1, rootMargin: '500px' } 
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [isOpen, hasMore, isLoading, page, fetchPage]);

  const deleteGeneration = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Permanently delete this record?")) return;
    
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
        
        {/* Sticky Header */}
        <div className="p-4 sm:p-6 flex items-center justify-between border-b border-zinc-800 bg-black/80 backdrop-blur-md sticky top-0 z-10">
          <div className="overflow-hidden">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">Shoot History</h2>
            <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-bold truncate">
              {activeProjectId ? 'Active Project' : 'Cloud Archive'}
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button 
              onClick={() => fetchPage(0, true)} 
              disabled={isLoading}
              className="p-2 text-zinc-500 hover:text-white transition-colors disabled:opacity-30 rounded-md hover:bg-zinc-900"
              title="Refresh Data"
            >
              <RotateCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors rounded-md hover:bg-zinc-900">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Optimized Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar touch-pan-y">
          {isLoading && generations.length === 0 ? (
            <ArchiveSkeleton />
          ) : !isLoading && generations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 sm:p-12 opacity-30">
               <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 border border-zinc-800">
                  <Inbox size={24} className="text-zinc-500" />
               </div>
               <p className="text-sm text-white font-bold mb-1">Archive is empty</p>
               <p className="text-xs text-zinc-500">Your cloud-synced shoots will appear here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {generations.map((gen, index) => (
                  <div key={gen.id} className="group relative aspect-[3/4] bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-500 transition-all shadow-lg">
                    {/* CDN Optimized Image: Strictly URL based, no Base64 */}
                    <img 
                      src={getThumbnailUrl(gen.image_url)} 
                      alt="Photoshoot thumbnail" 
                      loading={index < 4 ? 'eager' : 'lazy'} // Eager load first 2 rows
                      decoding="async"
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                    />
                    
                    {/* Action Overlay */}
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

                    {/* Metadata Bar */}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none">
                        <div className="flex items-center justify-between">
                            <span className="text-[7px] text-zinc-400 font-mono">
                                {new Date(gen.created_at).toLocaleDateString()}
                            </span>
                            {gen.config?.modelVersion && (
                                <span className="text-[7px] text-zinc-500 uppercase tracking-tighter bg-black/50 px-1 rounded border border-zinc-800">
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
                {isLoading && generations.length > 0 && <Loader2 className="animate-spin text-zinc-700" size={20} />}
                {!hasMore && generations.length > 0 && (
                  <span className="text-[9px] font-bold text-zinc-800 uppercase tracking-widest opacity-40 text-center block w-full">Library Synchronized</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
