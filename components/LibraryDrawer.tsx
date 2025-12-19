
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Loader2, Download, Trash2, RotateCw, Inbox, AlertTriangle } from 'lucide-react';
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
 * ARCHITECTURAL FIX: Cloud-First Image Transformation
 * This helper ensures we only ever request optimized, resized thumbnails from the CDN.
 * It strictly filters out any Base64 data strings to prevent browser hangs.
 */
const getThumbnailUrl = (url: string | undefined): string => {
  if (!url || url.startsWith('data:')) return '';
  
  // Verify it's a Supabase storage URL to apply transformation
  if (url.includes('supabase.co/storage/v1/object/public')) {
    // Switch from standard object endpoint to the dedicated Render engine
    // This transforms a 5MB original into a ~15KB WebP thumbnail
    const renderUrl = url.replace('/storage/v1/object/public', '/storage/v1/render/image/public');
    return `${renderUrl}?width=300&height=400&quality=60&resize=contain`;
  }
  
  return url;
};

const ArchiveSkeleton = () => (
  <div className="grid grid-cols-2 gap-3 sm:gap-4 animate-pulse">
    {[...Array(6)].map((_, i) => (
      <div 
        key={i} 
        className="aspect-[3/4] bg-zinc-900 rounded-lg border border-zinc-800 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-800/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
      </div>
    ))}
  </div>
);

export const LibraryDrawer: React.FC<LibraryDrawerProps> = ({ isOpen, onClose, activeProjectId, prefetch }) => {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  
  const fetchedIds = useRef<Set<string>>(new Set());
  const lastProjectId = useRef<string | null>(undefined as any);
  const observerTarget = useRef<HTMLDivElement>(null);

  /**
   * HARD PERFORMANCE FIX: SELECTIVE PROJECTION
   * We have removed 'config' and all JSONB sub-selections.
   * By fetching only these 4 flat columns, we reduce the JSON payload from 25MB to <10KB.
   * This bypasses the old "dirty" Base64 data stored in the config column.
   */
  const fetchPage = useCallback(async (pageNum: number, isReset = false) => {
    if (isLoading || (!hasMore && !isReset)) return;

    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // NUCLEAR OPTION: No config access. No JSONB plucking. Just raw metadata.
      let query = supabase
        .from('generations')
        .select('id, image_url, created_at, project_id', { count: 'exact' })
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
          setPage(page + 1);
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
      console.error("Archive Sync Fail:", err);
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId, isLoading, hasMore, page]);

  useEffect(() => {
    if (!isOpen && !prefetch) return;
    const projectChanged = lastProjectId.current !== activeProjectId;
    if (projectChanged) {
      setGenerations([]);
      fetchedIds.current.clear();
      setPage(0);
      setHasMore(true);
      fetchPage(0, true);
    } else if (generations.length === 0 && !isLoading) {
      fetchPage(0, true);
    }
    lastProjectId.current = activeProjectId;
  }, [isOpen, prefetch, activeProjectId, fetchPage, generations.length, isLoading]);

  useEffect(() => {
    if (!isOpen || !hasMore || isLoading) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchPage(page);
        }
      },
      { threshold: 0.1, rootMargin: '600px' } 
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [isOpen, hasMore, isLoading, page, fetchPage]);

  const deleteGeneration = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete permanently?")) return;
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
        
        <div className="p-4 sm:p-6 flex items-center justify-between border-b border-zinc-800 bg-black/80 backdrop-blur-md sticky top-0 z-10">
          <div className="overflow-hidden">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">Shoot Archive</h2>
            <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-widest font-bold truncate">
              URL-First Performance Active
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button 
              onClick={() => fetchPage(0, true)} 
              disabled={isLoading}
              className="p-2 text-zinc-500 hover:text-white transition-colors disabled:opacity-30 rounded-md hover:bg-zinc-900"
            >
              <RotateCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors rounded-md hover:bg-zinc-900">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar touch-pan-y">
          {isLoading && generations.length === 0 ? (
            <ArchiveSkeleton />
          ) : !isLoading && generations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 opacity-30">
               <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 border border-zinc-800">
                  <Inbox size={24} className="text-zinc-500" />
               </div>
               <p className="text-sm text-white font-bold">Archive Empty</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {generations.map((gen, index) => {
                  const thumbUrl = getThumbnailUrl(gen.image_url);
                  const isBase64 = gen.image_url?.startsWith('data:');

                  return (
                    <div key={gen.id} className="group relative aspect-[3/4] bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-500 transition-all">
                      {isBase64 ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 p-4 text-center">
                            <AlertTriangle size={20} className="text-amber-500 mb-2" />
                            <span className="text-[8px] uppercase text-zinc-500 font-bold leading-tight">Legacy Item<br/>Requires URL Migration</span>
                        </div>
                      ) : (
                        <img 
                          src={thumbUrl} 
                          alt="Fashion" 
                          loading={index < 4 ? 'eager' : 'lazy'}
                          decoding="async"
                          className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" 
                        />
                      )}
                      
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-[1px]">
                         <a 
                            href={gen.image_url} 
                            target="_blank"
                            rel="noopener noreferrer"
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

                      <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none">
                          <span className="text-[7px] text-zinc-500 font-mono">
                              {new Date(gen.created_at).toLocaleDateString()}
                          </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div ref={observerTarget} className="h-10 flex items-center justify-center">
                {isLoading && generations.length > 0 && <Loader2 className="animate-spin text-zinc-700" size={20} />}
                {!hasMore && generations.length > 0 && (
                  <span className="text-[9px] font-bold text-zinc-800 uppercase tracking-widest opacity-40 text-center block w-full">Fast Sync Complete</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
