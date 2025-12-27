import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { UserCircle, ChevronDown, Shirt, Ruler, Zap, Hexagon, Sparkles, Move, LogOut, Star, CheckCircle, XCircle, Info, Crown, X, Loader2, Palette, Folder, Library, Plus, Save, Check, AlertCircle, Monitor, Columns, Square, Coins, Settings2, Image as ImageIcon } from 'lucide-react';
import { Dropdown } from './components/Dropdown';
import { ResultDisplay } from './components/ResultDisplay';
import { SizeControl } from './components/SizeControl';
import { OutfitControl } from './components/OutfitControl';
import { PoseControl } from './components/PoseControl';
import { LoginModal } from './components/LoginModal';
import { UpgradeModal } from './components/UpgradeModal';
import { LibraryDrawer } from './components/LibraryDrawer';
import { generatePhotoshootImage } from './services/gemini';
import { supabase, isConfigured } from './lib/supabase';
import { ModelSex, ModelEthnicity, ModelAge, FacialExpression, HairColor, HairStyle, PhotoStyle, PhotoshootOptions, ModelVersion, MeasurementUnit, AspectRatio, BodyType, OutfitItem, SubscriptionTier, Project, LayoutMode } from './types';

const POSES = [
    "Standing naturally, arms relaxed", "Walking towards camera, confident stride", "Leaning slightly against a wall", 
    "Side profile, looking over shoulder", "Hands in pockets, relaxed stance", "Sitting on a stool", 
    "Dynamic motion, fabric flowing", "Three-quarter view, hand on hip", "Arms crossed, powerful stance", 
    "Walking away, turning head back", "Seated on floor, legs crossed", "Leaning forward", "Back to camera"
];

const ACCOUNT_PORTAL_URL = (import.meta as any).env?.VITE_ACCOUNT_PORTAL_URL || 'https://lookbook.test.onfastspring.com/account';

const getRandomPose = () => POSES[Math.floor(Math.random() * POSES.length)];
const getRandomSeed = () => Math.floor(Math.random() * 1000000000);

const getGenerationCost = (options: PhotoshootOptions): number => {
    let cost = 1;
    if (options.modelVersion === ModelVersion.Pro) cost = 10;
    if (options.enable4K) cost += 5;
    return cost;
};

const STANDARD_STYLES = [ PhotoStyle.Studio, PhotoStyle.Urban, PhotoStyle.Nature, PhotoStyle.Coastal ];
const PRO_STYLES = [ PhotoStyle.Luxury, PhotoStyle.Chromatic, PhotoStyle.Minimalist, PhotoStyle.Film, PhotoStyle.Newton, PhotoStyle.Lindbergh, PhotoStyle.Leibovitz, PhotoStyle.Avedon, PhotoStyle.LaChapelle, PhotoStyle.Testino ];

/**
 * SpotlightGate Component
 * Wraps restricted features with desaturation/opacity rules.
 * Click triggers the relevant modal (Login or Upgrade) immediately.
 */
export const SpotlightGate: React.FC<{ 
  children: React.ReactNode; 
  isLocked: boolean; 
  tier: 'CREATOR' | 'STUDIO'; 
  className?: string; 
  containerClassName?: string;
  onClick?: () => void;
  interactive?: boolean;
}> = ({ children, isLocked, className = "", containerClassName = "", onClick, interactive = false }) => {
  return (
    <div 
      className={`relative ${containerClassName} ${isLocked ? 'cursor-pointer' : ''}`}
      onClick={(e) => {
        if (isLocked && onClick) {
          onClick();
        }
      }}
    >
      <div className={`transition-all duration-300 h-full w-full ${isLocked ? 'grayscale opacity-40 hover:opacity-70' : ''} ${className} ${isLocked && !interactive ? 'pointer-events-none' : ''}`}>
        {children}
      </div>
    </div>
  );
};

const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'info'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-zinc-900 border-emerald-500/50' : type === 'error' ? 'bg-zinc-900 border-red-500/50' : 'bg-zinc-900 border-zinc-700';
  const textColor = type === 'success' ? 'text-emerald-400' : type === 'error' ? 'text-red-400' : 'text-zinc-300';
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : Info;

  return (
    <div className="fixed bottom-24 lg:bottom-10 left-0 w-full flex justify-center z-[150] pointer-events-none px-4">
      <div className={`pointer-events-auto px-5 py-3.5 rounded-xl border shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-3 animate-slide-up ${bgColor} backdrop-blur-xl`}>
        <Icon size={18} className={textColor} />
        <span className="text-[11px] font-black uppercase tracking-widest text-white whitespace-nowrap">{message}</span>
        <button onClick={onClose} className="ml-2 text-zinc-500 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

interface ConfigSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  sectionRef?: React.Ref<HTMLDivElement>;
}

const ConfigSection: React.FC<ConfigSectionProps> = ({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  isOpen,
  onOpenChange,
  sectionRef
}) => {
  const [isOpenInternal, setIsOpenInternal] = useState(defaultOpen);
  const isControlled = typeof isOpen === 'boolean';
  const isOpenState = isControlled ? isOpen : isOpenInternal;

  const setOpenState = (nextOpen: boolean) => {
    if (!isControlled) {
      setIsOpenInternal(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <div className="border-b border-zinc-800 bg-black/50 last:border-b-0 flex-shrink-0" ref={sectionRef}>
      <button 
        onClick={() => setOpenState(!isOpenState)} 
        className="w-full flex items-center justify-between py-3 px-4 text-left focus:outline-none group hover:bg-zinc-900/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={14} className={`text-zinc-500 group-hover:text-white transition-colors ${isOpenState ? 'text-white' : ''}`} />
          <span className="font-mono text-xs font-medium tracking-wider text-zinc-300 group-hover:text-white transition-colors uppercase">
            {title}
          </span>
        </div>
        <div className={`transition-transform duration-200 ${isOpenState ? 'rotate-180' : ''}`}>
           <ChevronDown size={14} className="text-zinc-600 group-hover:text-white" />
        </div>
      </button>
      {isOpenState && (
        <div className="p-4 pt-0 animate-fade-in relative">
            <div className={`mt-2 space-y-5 relative`}>
                {children}
            </div>
        </div>
      )}
    </div>
  );
};

interface StyleButtonProps {
    label: string;
    isSelected: boolean;
    onClick: () => void;
}
const StyleButton: React.FC<StyleButtonProps> = ({ label, isSelected, onClick }) => (
    <button 
        onClick={onClick} 
        className={`px-3 py-3 rounded-md border text-left transition-all group overflow-hidden min-h-[3rem] flex items-center justify-between 
        ${isSelected ? 'bg-white border-white text-black shadow-lg shadow-white/5' : 'bg-black border-zinc-800 hover:border-zinc-600 text-zinc-400'}`}
    >
        <span className={`text-[11px] font-bold uppercase tracking-wider z-10 relative ${isSelected ? 'text-black' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{label}</span>
    </button>
);

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<{tier: SubscriptionTier, credits: number, username?: string} | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  
  const [guestCredits, setGuestCredits] = useState<number | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [prefetchLibrary, setPrefetchLibrary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalView, setLoginModalView] = useState<'login' | 'signup'>('signup'); 
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [autoPose, setAutoPose] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);
  
  const [selectedModel, setSelectedModel] = useState<'flash-2.5' | 'pro-3'>('flash-2.5');
  const [isWardrobeOpen, setIsWardrobeOpen] = useState(true);

  const projectMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const wardrobeSectionRef = useRef<HTMLDivElement>(null);

  const [options, setOptions] = useState<PhotoshootOptions>({
    sex: ModelSex.Female, ethnicity: ModelEthnicity.Mixed, age: ModelAge.YoungAdult,
    facialExpression: FacialExpression.Neutral, hairColor: HairColor.JetBlack, hairStyle: HairStyle.StraightSleek,
    style: PhotoStyle.Studio, sceneDetails: '', modelVersion: ModelVersion.Flash,
    layout: LayoutMode.Single,
    aspectRatio: AspectRatio.Square, 
    enable4K: false, height: '', measurementUnit: MeasurementUnit.CM,
    bodyType: BodyType.Standard, isModelLocked: false, modelFeatures: '',
    outfit: { 
        top: { garmentType: '', description: '', images: [], sizeChart: null, sizeChartDetails: '' },
        bottom: { garmentType: '', description: '', images: [], sizeChart: null, sizeChartDetails: '' },
        shoes: { garmentType: '', description: '', images: [], sizeChart: null, sizeChartDetails: '' },
        accessories: { garmentType: '', description: '', images: [], sizeChart: null, sizeChartDetails: '' }
    }
  });

  const isPremium = session ? userProfile?.tier !== SubscriptionTier.Free : false;
  const hasProAccess = session ? (userProfile?.tier === SubscriptionTier.Creator || userProfile?.tier === SubscriptionTier.Studio) : false;
  const isStudio = session ? userProfile?.tier === SubscriptionTier.Studio : false;

  useEffect(() => {
    if (!session && selectedModel === 'pro-3') {
        setSelectedModel('flash-2.5');
    }

    const shouldEnable4K = selectedModel === 'flash-2.5' ? false : options.enable4K;
    
    setOptions(prev => ({
      ...prev,
      modelVersion: selectedModel === 'pro-3' ? ModelVersion.Pro : ModelVersion.Flash,
      enable4K: shouldEnable4K
    }));
  }, [selectedModel, session]);

  useEffect(() => {
    if (isAuthLoading) return;
    
    if (!session) {
      fetch('/api/guest-status')
        .then(async (res) => {
           if (res.status === 404 || res.status === 500) {
               return { remaining: 3 }; 
           }
           
           const contentType = res.headers.get("content-type");
           if (!contentType || !contentType.includes("application/json")) {
               return { remaining: 3 };
           }

           if (!res.ok) throw new Error(`API Error: ${res.status}`);
           
           const text = await res.text();
           try {
             return JSON.parse(text);
           } catch (e) {
             return { remaining: 3 };
           }
        })
        .then(data => {
            const credits = typeof data?.remaining === 'number' ? data.remaining : 3;
            setGuestCredits(credits);
            localStorage.setItem('fashion_guest_credits', credits.toString());
        })
        .catch(err => {
            setGuestCredits(3);
        });
    }
  }, [session, isAuthLoading]);

  const [generatedResult, setGeneratedResult] = useState<{image: string, width: number, height: number} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => setToast({ message, type });

  const handleLockedClick = () => {
    if (!session) {
      setLoginModalView('signup');
      setShowLoginModal(true);
    } else {
      setShowUpgradeModal(true);
    }
  };

  const handleWardrobeJump = () => {
    setIsWardrobeOpen(true);
    requestAnimationFrame(() => {
      wardrobeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentCost = getGenerationCost(options);

  const isRestrictedActive = (
    (options.layout === LayoutMode.Diptych && !isStudio) ||
    (options.enable4K && !isStudio) ||
    (PRO_STYLES.includes(options.style) && !hasProAccess) ||
    (!autoPose && !isPremium) ||
    (selectedModel === 'pro-3' && !session)
  );

  const isFormValid = !isRestrictedActive && Object.values(options.outfit).some((item: OutfitItem) => 
    item.images.length > 0 || (item.description && item.description.trim().length > 0) || (item.garmentType && item.garmentType.trim().length > 0)
  );

  useEffect(() => {
    if (session?.user) {
      fetchProjects();
    }
  }, [session]);

  const handleProInterceptor = () => {
    if (!session) {
        setLoginModalView('signup');
        setShowLoginModal(true);
        return true;
    }
    if (!hasProAccess) {
        setShowUpgradeModal(true);
        return true;
    }
    return false;
  };

  const handleStudioInterceptor = () => {
    if (!session) {
        setLoginModalView('signup');
        setShowLoginModal(true);
        return true;
    }
    if (!isStudio) {
        setShowUpgradeModal(true);
        return true;
    }
    return false;
  };

  const fetchProjects = async () => {
    if (!isConfigured) return;
    try {
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (error) {
          if (error.code === '42P01') console.warn("Table 'projects' not found. Run SQL script.");
          return;
      }
      if (data) {
        setProjects(data);
        if (data.length > 0 && !activeProjectId) setActiveProjectId(data[0].id);
      }
    } catch (e) {
      console.error("Fetch projects exception:", e);
    }
  };

  const createProject = async () => {
    if (!isConfigured) return;
    const name = prompt("Project Name?");
    if (!name) return;
    try {
      const { data, error } = await supabase.from('projects').insert([{ name, user_id: session.user.id }]).select().single();
      if (error) {
        showToast(`Failed to create project: ${error.message}`, "error");
        return;
      }
      if (data) {
        setProjects([data, ...projects]);
        setActiveProjectId(data.id);
        showToast(`Project "${name}" created`, "success");
      }
    } catch (e) {
      showToast("Error creating project", "error");
    }
  };

  const saveToLibrary = async () => {
    if (!session || !generatedResult || !isConfigured) return;
    const { image, width, height } = generatedResult;
    
    setIsSaving(true);
    setJustSaved(false);
    setSaveError(false);

    try {
      let publicCdnUrl = image;

      if (image.startsWith('data:image')) {
        const timestamp = Date.now();
        const filePath = `${session.user.id}/${timestamp}.png`;
        
        const parts = image.split(',');
        const base64Data = parts.length > 1 ? parts[1] : parts[0];
        
        let mimeType = 'image/png';
        const mimeMatch = image.match(/^data:(image\/[a-z]+);base64,/);
        if (mimeMatch) mimeType = mimeMatch[1];

        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        const blob = new Blob([bytes], { type: mimeType });

        const { error: uploadError } = await supabase.storage
          .from('artworks')
          .upload(filePath, blob, { contentType: mimeType, upsert: false });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('artworks')
          .getPublicUrl(filePath);
          
        publicCdnUrl = publicUrl;
      }

      const sanitizedOutfit = JSON.parse(JSON.stringify(options.outfit));
      (Object.keys(sanitizedOutfit) as Array<keyof typeof sanitizedOutfit>).forEach(key => {
        sanitizedOutfit[key].images = []; 
        sanitizedOutfit[key].sizeChart = null; 
      });

      const leanConfig = { 
        ...options, 
        outfit: sanitizedOutfit,
        referenceModelImage: undefined 
      };

      const generationPayload = {
        image_url: publicCdnUrl,
        user_id: session.user.id,
        project_id: activeProjectId || null,
        config: leanConfig,
        width: width,
        height: height
      };

      let dbError = (await supabase.from('generations').insert([generationPayload])).error;

      if (dbError && /(column .*height|column .*width)/i.test(dbError.message)) {
        const { width, height, ...fallbackPayload } = generationPayload;
        dbError = (await supabase.from('generations').insert([fallbackPayload])).error;
      }

      if (dbError) {
        setSaveError(true);
        showToast(`Cloud Sync Error: ${dbError.message}`, "error");
      } else {
        setJustSaved(true);
        showToast("Archived to cloud", "success");
        setTimeout(() => setJustSaved(false), 3000);
      }
    } catch (e: any) {
      setSaveError(true);
      showToast("Critical: Storage Offload Failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (isConfigured) {
      (supabase.auth as any).getSession().then(({ data: { session } }: any) => {
        setSession(session);
        if (session) fetchProfile(session.user.id, session.user.email);
        else setIsAuthLoading(false);
      });
      const { data: { subscription } } = (supabase.auth as any).onAuthStateChange(async (event: any, session: any) => {
        setSession(session);
        if (event === 'SIGNED_IN' && session) {
           setShowLoginModal(false);
           setTimeout(() => fetchProfile(session.user.id, session.user.email), 300);
        } else if (event === 'SIGNED_OUT') {
           setUserProfile(null); setSession(null); setProjects([]); setActiveProjectId(null);
        }
      });
      return () => subscription.unsubscribe();
    } else {
      setIsAuthLoading(false);
    }
  }, []);

  const ensureStarterCredits = async (userId: string, email?: string) => {
    try {
      const response = await fetch('/api/ensure-starter-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email })
      });
      if (!response.ok) return null;
      const payload = await response.json();
      return payload?.profile ?? null;
    } catch (error) {
      return null;
    }
  };

  const fetchProfile = async (userId: string, email?: string) => {
    if (!isConfigured) return;
    try {
        let { data, error } = await supabase.from('profiles').select('tier, credits').eq('id', userId).single();
        if (error && error.code === 'PGRST116') {
             const { data: newProfile } = await supabase.from('profiles').insert([{ id: userId, email: email || 'unknown', tier: SubscriptionTier.Free, credits: 50 }]).select().single();
             if (newProfile) data = newProfile;
        }
        if (data && data.tier === SubscriptionTier.Free) {
            const hasMissingCredits = data.credits == null;
            const hasLowCredits = typeof data.credits === 'number' && data.credits < 50;
            if (hasMissingCredits || hasLowCredits) {
                const updatedProfile = await ensureStarterCredits(userId, email);
                if (updatedProfile) data = updatedProfile;
            }
        }
        if (data) {
            setUserProfile({
                tier: data.tier as SubscriptionTier || SubscriptionTier.Free,
                credits: data.credits ?? 0, 
                username: email ? email.split('@')[0] : 'Studio User'
            });
        }
    } catch (e) { } finally { setIsAuthLoading(false); }
  };

  const handleAuth = async (email: string, password?: string, isSignUp?: boolean, username?: string) => {
      if (!isConfigured) throw new Error("Authentication is currently disabled.");
      if (isSignUp) {
          const { error } = await (supabase.auth as any).signUp({ email, password, options: { data: { full_name: username } } });
          if (error) throw error;
      } else {
          const { error } = await (supabase.auth as any).signInWithPassword({ email, password });
          if (error) throw error;
      }
  };

  const handleLogout = async () => {
      if (isConfigured) await (supabase.auth as any).signOut(); 
      setShowAccountMenu(false);
      showToast('Signed out successfully', 'info');
  };

  const handleGenerate = async () => {
      if (isCreditsLoading) {
          showToast('Loading credits...', 'info');
          return;
      }
      const userCredits = session ? (userProfile?.credits || 0) : (guestCredits || 0);
      if (userCredits < currentCost) {
          if (!session) {
            setLoginModalView('signup');
            setShowLoginModal(true);
          } else {
            setShowUpgradeModal(true);
          }
          return;
      }

      if (window.innerWidth < 1024) setActiveTab('preview');

      const newSeed = getRandomSeed();
      const newOptions = { 
        ...options, 
        seed: newSeed, 
        pose: autoPose ? getRandomPose() : (options.pose || getRandomPose()),
        modelFeatures: options.modelFeatures?.trim() || ''
      };
      setOptions(newOptions);
      executeGeneration(newOptions);
  };

  const executeGeneration = async (currentOptions: PhotoshootOptions) => {
      const cost = getGenerationCost(currentOptions);
      setIsLoading(true); 
      setError(null); 
      setGeneratedResult(null);

      try {
          if (!session && currentOptions.modelVersion.includes('Pro')) {
            throw new Error("Guest mode is limited to Flash 2.5. Please login to use Pro models.");
          }

          const safeCredits = session ? (userProfile?.credits || 0) : (guestCredits || 0);
          if (safeCredits < cost) {
              if (!session) {
                setLoginModalView('signup');
                setShowLoginModal(true);
              } else {
                setShowUpgradeModal(true);
              }
              setIsLoading(false);
              return;
          }

          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };

          if (session?.user?.id) {
            headers['x-user-id'] = session.user.id;
          }

          const response = await fetch('/api/generate', {
            method: 'POST',
            headers,
            body: JSON.stringify(currentOptions),
          });
        
          if (response.status === 429) {
             setGuestCredits(0);
             localStorage.setItem('fashion_guest_credits', '0');
             setLoginModalView('signup');
             setShowLoginModal(true);
             throw new Error("Daily guest limit reached. Please create an account to continue.");
          }

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || `Generation Failed: ${response.status}`);
          }
        
          const data = await response.json();
          if (!data.image) throw new Error("The studio backend returned an empty frame.");

          const result = { image: data.image, width: data.width || 1024, height: data.height || 1024 };
          setGeneratedResult(result);

          if (!session) {
              const newGuestBalance = Math.max(0, (guestCredits || 0) - cost);
              setGuestCredits(newGuestBalance);
              localStorage.setItem('fashion_guest_credits', newGuestBalance.toString());
          } else {
              if (userProfile) {
                const newBalance = userProfile.credits - cost;
                setUserProfile(prev => prev ? ({ ...prev, credits: newBalance }) : null);
                if (isConfigured) {
                  await supabase.from('profiles').update({ credits: newBalance }).eq('id', session.user.id);
                }
              }
          }
      } catch (err: any) { 
          const errorMessage = err.message || 'The studio is currently offline. Please check your credentials.';
          setError(errorMessage); 
      } finally { 
          setIsLoading(false); 
      }
  }

  const handleUpgrade = (tier?: SubscriptionTier) => {
     if (userProfile?.tier !== SubscriptionTier.Free && !tier) {
         window.open(ACCOUNT_PORTAL_URL, '_blank');
         return;
     }
     const fs = (window as any).fastspring;
     if (fs?.builder && tier) {
         const productPath = tier.toLowerCase();
         fs.builder.push({ products: [{ path: productPath, quantity: 1 }], tags: { userId: session.user.id } });
         if (fs.builder.checkout) fs.builder.checkout();
         setShowUpgradeModal(false);
     }
  };

  const handleDownload = () => {
    if (generatedResult) {
      const link = document.createElement('a');
      link.href = generatedResult.image;
      link.download = `shoot-${Date.now()}.png`;
      link.click();
    }
  };

  const activeProjectName = activeProjectId === null ? "Main Archive" : projects.find(p => p.id === activeProjectId)?.name || "Main Archive";

  const isCreditsLoading = isAuthLoading || (session ? userProfile === null : guestCredits === null);
  const userCredits = session ? (userProfile?.credits ?? 0) : (guestCredits ?? 0);
  const isOutOfCredits = !isCreditsLoading && userCredits < currentCost;

  return (
    <div className="h-[100dvh] w-full flex flex-col text-zinc-300 font-sans bg-black overflow-hidden relative">
      <header className="flex-shrink-0 z-[60] bg-black/80 backdrop-blur-xl border-b border-zinc-800/50 h-14">
          <div className="max-w-[1920px] mx-auto h-full flex justify-between items-center px-4 sm:px-6">
              <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-6 h-6 bg-white text-black rounded-sm flex items-center justify-center shadow-lg shadow-white/10 shrink-0">
                     <Hexagon size={12} fill="currentColor" />
                  </div>
                  <h1 className="text-[11px] sm:text-sm font-bold tracking-tight text-white font-mono uppercase">Studio<span className="text-zinc-500">.ai</span></h1>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-6">
                 {session && userProfile ? (
                    <div className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-3 py-1 rounded-full group cursor-pointer transition-all bg-gradient-to-r from-amber-500/25 via-amber-400/10 to-zinc-900/70 border border-amber-400/30 shadow-[0_0_18px_rgba(251,191,36,0.18)] ring-1 ring-amber-400/20 hover:shadow-[0_0_26px_rgba(251,191,36,0.3)] hover:border-amber-300/50" onClick={() => setShowUpgradeModal(true)}>
                        <div className="flex items-center gap-1.5 px-1.5">
                           <Zap size={10} className="text-amber-400 fill-amber-400" />
                           <span className="text-[11px] font-black text-white">{userProfile.credits}</span>
                        </div>
                        <div className="hidden xs:flex items-center gap-1.5 px-1">
                           <Crown size={10} className={`${userProfile.tier !== SubscriptionTier.Free ? 'text-amber-400' : 'text-zinc-600'}`} />
                           <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">{userProfile.tier}</span>
                        </div>
                    </div>
                 ) : !session && (
                    <div className="flex items-center gap-2 sm:gap-3 px-2.5 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-zinc-900/70 border border-amber-400/30 shadow-[0_0_16px_rgba(251,191,36,0.16)] ring-1 ring-amber-400/10">
                        <Coins size={10} className="text-amber-400 shrink-0" />
                        <span className="text-[11px] sm:text-xs font-black text-white uppercase tracking-widest whitespace-nowrap">
                            {guestCredits === null ? '...' : guestCredits} <span className="hidden xs:inline">CR.</span>
                        </span>
                    </div>
                 )}

                 <div className="flex items-center gap-2 sm:gap-4">
                    {session && (
                        <button 
                            onClick={() => setShowLibrary(true)} 
                            onMouseEnter={() => setPrefetchLibrary(true)}
                            className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                        >
                            <Library size={16} /> <span className="hidden lg:inline">Archive</span>
                        </button>
                    )}
                    {session ? (
                        <div className="relative" ref={accountMenuRef}>
                            <button 
                              onClick={() => setShowAccountMenu(!showAccountMenu)}
                              className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700 text-xs font-bold text-white uppercase hover:border-white transition-all cursor-pointer"
                            >
                                {session.user.email?.[0]}
                            </button>
                            {showAccountMenu && (
                              <div className="absolute top-full right-0 mt-2 w-48 bg-black border border-zinc-800 rounded-lg shadow-2xl py-1 transition-all z-[100] animate-fade-in">
                                  <div className="px-4 py-3 border-b border-zinc-900">
                                      <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Signed in as</p>
                                      <p className="text-xs text-white truncate font-medium">{session.user.email}</p>
                                  </div>
                                  <button onClick={() => { setShowUpgradeModal(true); setShowAccountMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white flex items-center gap-2">
                                      <Star size={14} className="text-amber-400" /> Subscription
                                  </button>
                                  <button onClick={handleLogout} className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-zinc-900 flex items-center gap-2">
                                      <LogOut size={14} /> Sign Out
                                  </button>
                              </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 sm:gap-6">
                            <button onClick={() => { setLoginModalView('login'); setShowLoginModal(true); }} className="text-[11px] font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-widest">Log in</button>
                            <button onClick={() => { setLoginModalView('signup'); setShowLoginModal(true); }} className="bg-white text-black px-3 py-1.5 rounded text-[11px] font-black hover:bg-zinc-200 transition-colors uppercase tracking-widest">Sign up</button>
                        </div>
                    )}
                 </div>
              </div>
          </div>
      </header>

      {/* Mobile Tab Navigation */}
      <div className="lg:hidden flex-shrink-0 bg-black border-b border-zinc-800 flex h-14">
          <button 
            onClick={() => setActiveTab('editor')}
            className={`flex-1 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'editor' ? 'text-white border-b-2 border-white bg-zinc-900/50' : 'text-zinc-400 hover:text-zinc-300'}`}
          >
            <Settings2 size={16} /> Editor
          </button>
          <button 
            onClick={() => setActiveTab('preview')}
            className={`flex-1 text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-colors ${activeTab === 'preview' ? 'text-white border-b-2 border-white bg-zinc-900/50' : 'text-zinc-400 hover:text-zinc-300'}`}
          >
            <ImageIcon size={16} /> Preview
          </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden max-w-[1920px] mx-auto w-full px-0 sm:px-4 lg:px-6 py-0 lg:py-6 gap-0 lg:gap-6 min-h-0 relative">
        <aside className={`w-full lg:w-[400px] flex-shrink-0 flex flex-col h-full bg-black border-x lg:border border-zinc-800 rounded-none lg:rounded-lg overflow-hidden shadow-xl min-h-0 ${activeTab === 'editor' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="p-4 border-b border-zinc-800 bg-zinc-950/50 space-y-4 flex-shrink-0">
              <div className="space-y-1.5">
                  <div className="flex justify-between items-center pl-1">
                      <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Engine</label>
                      <span className="text-[11px] font-mono text-zinc-400 uppercase">Flash Priority</span>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-1 flex gap-1 shadow-sm">
                      <button
                          onClick={() => setSelectedModel('flash-2.5')}
                          className={`flex-1 py-2 px-2 rounded-md transition-all duration-200 flex flex-col items-center justify-center gap-0.5 ${selectedModel === 'flash-2.5' ? 'bg-zinc-100 text-black shadow-md' : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/50'}`}
                      >
                          <span className="text-[11px] font-black uppercase tracking-wider">Flash 2.5</span>
                          <span className={`text-[11px] font-bold uppercase ${selectedModel === 'flash-2.5' ? 'text-zinc-400' : 'text-zinc-400'}`}>1 CREDIT</span>
                      </button>
                      <SpotlightGate
                          isLocked={!session || (session && (userProfile?.credits || 0) < 10)}
                          tier="CREATOR"
                          containerClassName="flex-1"
                          className="h-full"
                          interactive={true}
                          onClick={() => {
                            if (!session) { setLoginModalView('signup'); setShowLoginModal(true); return; }
                            if (session && (userProfile?.credits || 0) < 10) { setShowUpgradeModal(true); return; }
                            setSelectedModel('pro-3');
                          }}
                      >
                        <button
                            onClick={() => {
                              if (!session) return;
                              if ((userProfile?.credits || 0) < 10) return;
                              setSelectedModel('pro-3');
                            }}
                            className={`w-full h-full py-2 px-2 rounded-md transition-all duration-200 flex flex-col items-center justify-center gap-0.5
                              ${selectedModel === 'pro-3' ? 'bg-zinc-100 text-black shadow-md' : 'text-zinc-400 hover:text-zinc-300 hover:bg-zinc-900/50'}`}
                        >
                            <span className={`text-[11px] font-black uppercase tracking-wider`}>Pro 3</span>
                            <span className={`text-[11px] font-bold uppercase ${selectedModel === 'pro-3' ? 'text-zinc-400' : 'text-zinc-300'}`}>10 CREDITS</span>
                        </button>
                      </SpotlightGate>
                  </div>
              </div>

              <SpotlightGate 
                isLocked={!isStudio || selectedModel === 'flash-2.5'} 
                tier="STUDIO" 
                interactive={true}
                onClick={() => {
                  if (selectedModel === 'flash-2.5') {
                    showToast('4K requires Pro 3 engine', 'info');
                    return;
                  }
                  if (!session) { setLoginModalView('signup'); setShowLoginModal(true); return; }
                  if (!isStudio) { setShowUpgradeModal(true); return; }
                  setOptions({...options, enable4K: !options.enable4K});
                }}
              >
                <div
                  onClick={() => {
                    if (!isStudio || selectedModel === 'flash-2.5') return;
                    setOptions({ ...options, enable4K: !options.enable4K });
                  }}
                  className={`flex items-center justify-between p-3 bg-zinc-900/30 border border-zinc-800 rounded-md transition-opacity pr-4 ${selectedModel === 'flash-2.5' ? 'opacity-40' : ''}`}
                >
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                        <div className={`p-2 rounded bg-zinc-800/50 border border-zinc-700 shrink-0`}>
                            <Monitor size={14} className="text-zinc-400" />
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                            <span className={`text-[11px] font-bold uppercase tracking-wider text-zinc-300 truncate`}>4K Production Upscale</span>
                            <span className="text-[11px] font-black text-zinc-400 uppercase">
                                {selectedModel === 'flash-2.5' ? 'PRO ENGINE REQUIRED' : '+5 CREDITS'}
                            </span>
                        </div>
                    </div>
                    <button 
                        disabled={selectedModel === 'flash-2.5'}
                        role="switch"
                        aria-checked={options.enable4K}
                        aria-label="Enable 4K upscale"
                        className={`w-10 h-5 rounded-full relative transition-all duration-300 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 ${options.enable4K && selectedModel !== 'flash-2.5' ? 'bg-white' : 'bg-zinc-800'}`}
                    >
                        <div className={`absolute top-1 w-3 h-3 rounded-full transition-all duration-300 ${options.enable4K && selectedModel !== 'flash-2.5' ? 'right-1 bg-black' : 'left-1 bg-zinc-600'}`}></div>
                    </button>
                </div>
              </SpotlightGate>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4 min-h-0 max-h-full">
              {session && (
                <div className="space-y-1.5 flex-shrink-0" ref={projectMenuRef}>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Archive Location</label>
                  <div className="relative bg-zinc-950 border rounded-lg p-1 flex items-center border-zinc-800 hover:border-zinc-600">
                      <button 
                          onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                          className="flex-1 flex items-center gap-3 px-3 py-2 text-left hover:bg-zinc-900 rounded-md transition-all outline-none"
                      >
                          <Folder size={14} className="text-zinc-500" />
                          <span className="text-[11px] font-bold text-white uppercase tracking-wider truncate">{activeProjectName}</span>
                          <ChevronDown size={14} className={`ml-auto text-zinc-600 transition-transform ${showProjectDropdown ? 'rotate-180 text-white' : ''}`} />
                      </button>
                      <div className="w-px h-6 bg-zinc-800 mx-1"></div>
                      <button onClick={createProject} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-md transition-colors"><Plus size={16}/></button>

                      {showProjectDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-black border border-zinc-800 rounded-lg shadow-2xl z-[100] overflow-hidden py-1">
                            <button onClick={() => { setActiveProjectId(null); setShowProjectDropdown(false); }} className={`w-full text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider flex items-center gap-3 transition-colors ${activeProjectId === null ? 'bg-zinc-900 text-white border-l-2 border-white' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white'}`}>
                                <Library size={12} /> Main Archive
                            </button>
                            {projects.map(p => (
                                <button key={p.id} onClick={() => { setActiveProjectId(p.id); setShowProjectDropdown(false); }} className={`w-full text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider flex items-center gap-3 transition-colors ${activeProjectId === p.id ? 'bg-zinc-900 text-white border-l-2 border-white' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white'}`}>
                                    <Folder size={12} /> {p.name}
                                </button>
                            ))}
                        </div>
                      )}
                  </div>
                </div>
              )}

              <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden shadow-sm flex flex-col">
                  <ConfigSection
                    title="Wardrobe & Garments"
                    icon={Shirt}
                    defaultOpen={true}
                    isOpen={isWardrobeOpen}
                    onOpenChange={setIsWardrobeOpen}
                    sectionRef={wardrobeSectionRef}
                  >
                      <OutfitControl outfit={options.outfit} onChange={(newOutfit) => setOptions({ ...options, outfit: newOutfit })} />
                  </ConfigSection>

                  <ConfigSection title="Model Identity" icon={UserCircle}>
                      <div className="grid grid-cols-2 gap-4">
                          <Dropdown 
                            label="Sex" 
                            value={options.sex} 
                            options={Object.values(ModelSex)} 
                            onChange={(val) => setOptions({ ...options, sex: val })} 
                            lockedOptions={!hasProAccess ? Object.values(ModelSex).filter(s => s !== ModelSex.Female) : []}
                            onLockedClick={handleLockedClick}
                          />
                          <Dropdown 
                            label="Ethnicity" 
                            value={options.ethnicity} 
                            options={Object.values(ModelEthnicity)} 
                            onChange={(val) => setOptions({ ...options, ethnicity: val })} 
                            lockedOptions={!hasProAccess ? Object.values(ModelEthnicity).filter(e => e !== ModelEthnicity.Mixed) : []}
                            onLockedClick={handleLockedClick}
                          />
                          <Dropdown 
                            label="Age Range" 
                            value={options.age} 
                            options={Object.values(ModelAge)} 
                            onChange={(val) => setOptions({ ...options, age: val })} 
                            lockedOptions={!hasProAccess ? Object.values(ModelAge).filter(a => a !== ModelAge.YoungAdult) : []}
                            onLockedClick={handleLockedClick}
                          />
                          <Dropdown 
                            label="Expression" 
                            value={options.facialExpression} 
                            options={Object.values(FacialExpression)} 
                            onChange={(val) => setOptions({ ...options, facialExpression: val })} 
                            lockedOptions={!hasProAccess ? Object.values(FacialExpression).filter(f => f !== FacialExpression.Neutral) : []}
                            onLockedClick={handleLockedClick}
                          />
                      </div>
                      <div className="space-y-3 pt-2">
                          <div className="grid grid-cols-2 gap-3">
                              <Dropdown 
                                label="Hair Color" 
                                value={options.hairColor as HairColor} 
                                options={Object.values(HairColor)} 
                                onChange={(val) => setOptions({ ...options, hairColor: val })} 
                                lockedOptions={!hasProAccess ? Object.values(HairColor).filter(h => h !== HairColor.JetBlack) : []}
                                onLockedClick={handleLockedClick}
                              />
                              <Dropdown 
                                label="Hair Style" 
                                value={options.hairStyle as HairStyle} 
                                options={Object.values(HairStyle)} 
                                onChange={(val) => setOptions({ ...options, hairStyle: val })} 
                                lockedOptions={!hasProAccess ? Object.values(HairStyle).filter(h => h !== HairStyle.StraightSleek) : []}
                                onLockedClick={handleLockedClick}
                              />
                          </div>
                          <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Custom Features</label>
                              <SpotlightGate isLocked={!hasProAccess} tier="CREATOR" interactive={true} onClick={handleLockedClick}>
                                <textarea 
                                  placeholder="e.g. Amber eyes, soft features, high cheekbones, natural skin texture..." 
                                  value={options.modelFeatures} 
                                  onChange={(e) => setOptions({...options, modelFeatures: e.target.value})} 
                                  className={`w-full h-20 bg-black border border-zinc-800 rounded-md py-2 px-3 text-white resize-none focus:border-zinc-500 font-mono text-xs transition-all`} 
                                />
                              </SpotlightGate>
                          </div>
                      </div>
                  </ConfigSection>

                  <ConfigSection title="Physicality & Size" icon={Ruler}>
                      <SizeControl options={options} onChange={(newOps) => setOptions(newOps)} isPremium={isPremium} onUpgradeRequest={() => setShowUpgradeModal(true)} />
                  </ConfigSection>

                  <ConfigSection title="Pose & Staging" icon={Move}>
                      <PoseControl 
                        selectedPose={options.pose} 
                        onPoseChange={(p) => setOptions({...options, pose: p})} 
                        isAutoMode={autoPose} 
                        onToggleAutoMode={setAutoPose} 
                        isPremium={isPremium} 
                        hasSession={!!session}
                        onUpgrade={handleProInterceptor} 
                        SpotlightGate={SpotlightGate}
                        onLockedClick={() => { if (!session) { setLoginModalView('signup'); setShowLoginModal(true); } else if (!isPremium) setShowUpgradeModal(true); }}
                      />
                  </ConfigSection>

                  <ConfigSection title="Visual Style & Scene" icon={Palette}>
                      <div className="space-y-6">
                          <div className="space-y-3">
                              <div className="flex flex-col gap-0.5 px-1">
                                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Lookbook Composition</label>
                                <span className="text-[11px] text-zinc-400 font-medium">Define structural rendering mode</span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3">
                                  <button
                                      onClick={() => setOptions({ ...options, layout: LayoutMode.Single })}
                                      className={`px-4 py-3 rounded-lg border transition-all flex flex-col gap-3 group ${options.layout === LayoutMode.Single ? 'bg-white border-white' : 'bg-black border-zinc-800 hover:border-zinc-600'}`}
                                  >
                                      <div className={`w-full aspect-[4/3] rounded border flex items-center justify-center ${options.layout === LayoutMode.Single ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900/50 border-zinc-800'}`}>
                                          <Square size={16} className={options.layout === LayoutMode.Single ? 'text-black' : 'text-zinc-400'} />
                                      </div>
                                      <div className="flex flex-col gap-0.5 text-left">
                                          <span className={`text-[11px] font-black uppercase tracking-wider ${options.layout === LayoutMode.Single ? 'text-black' : 'text-white'}`}>Single View</span>
                                      </div>
                                  </button>

                                  <SpotlightGate isLocked={!isStudio} tier="STUDIO" interactive={true} onClick={handleStudioInterceptor}>
                                    <button
                                        onClick={() => setOptions({ ...options, layout: LayoutMode.Diptych })}
                                        className={`w-full px-4 py-3 rounded-lg border transition-all flex flex-col gap-3 group relative overflow-hidden pr-4
                                        ${options.layout === LayoutMode.Diptych ? 'bg-white border-white' : 'bg-black border-zinc-800 hover:border-zinc-600'}`}
                                    >
                                        <div className={`w-full aspect-[4/3] rounded border flex items-center justify-center ${options.layout === LayoutMode.Diptych ? 'bg-zinc-100 border-zinc-200' : 'bg-zinc-900/50 border-zinc-800'}`}>
                                            <Columns size={16} className={`${options.layout === LayoutMode.Diptych ? 'text-black' : 'text-zinc-400'}`} />
                                        </div>
                                        <div className="flex flex-col gap-0.5 text-left w-full">
                                            <span className={`text-[11px] font-black uppercase tracking-wider ${options.layout === LayoutMode.Diptych ? 'text-black' : 'text-white'}`}>Diptych Split</span>
                                        </div>
                                    </button>
                                  </SpotlightGate>
                              </div>
                          </div>

                          <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                              <div className="space-y-3">
                                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Standard Aesthetics</label>
                                  <div className="grid grid-cols-2 gap-3">
                                      {STANDARD_STYLES.map(s => <StyleButton key={s} label={s} isSelected={options.style === s} onClick={() => setOptions({...options, style: s})} />)}
                                  </div>
                              </div>

                              <div className="space-y-3 pt-2">
                                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider px-1">Premium Styles</label>
                                  <SpotlightGate isLocked={!hasProAccess} tier="CREATOR" interactive={true} onClick={handleProInterceptor}>
                                    <div className={`grid grid-cols-2 gap-3 transition-all`}>
                                        {PRO_STYLES.map(s => (
                                            <StyleButton 
                                              key={s} 
                                              label={s} 
                                              isSelected={options.style === s} 
                                              onClick={() => { if (hasProAccess) setOptions({...options, style: s}); }} 
                                            />
                                        ))}
                                    </div>
                                  </SpotlightGate>
                              </div>
                          </div>

                          <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                              <div className="space-y-1.5">
                                  <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider pl-1">Scenery Details</label>
                                  <textarea placeholder="e.g. Modern concrete loft, soft morning light, minimalist furniture..." value={options.sceneDetails} onChange={(e) => setOptions({...options, sceneDetails: e.target.value})} className="w-full h-24 bg-black border border-zinc-800 rounded-md py-2 px-3 text-xs text-white focus:border-zinc-500 font-mono resize-none" />
                              </div>
                              <div className="pt-2">
                                  <Dropdown label="Format / Aspect Ratio" value={options.aspectRatio} options={Object.values(AspectRatio)} onChange={(val) => setOptions({ ...options, aspectRatio: val as AspectRatio })} />
                              </div>
                          </div>
                      </div>
                  </ConfigSection>
              </div>
          </div>
          
          <div className="p-3 sm:p-4 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800 flex-shrink-0 relative">
              <button 
                  onClick={handleGenerate} 
                  disabled={isLoading || isCreditsLoading || (!isFormValid && !isOutOfCredits)} 
                  className={`w-full py-4 sm:py-5 rounded-md text-[11px] sm:text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 transform active:scale-[0.98] shadow-2xl
                  ${isLoading || isCreditsLoading ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed opacity-50' : 
                    isOutOfCredits ? 'bg-amber-500 text-black hover:bg-amber-400' :
                    !isFormValid ? 'bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed opacity-50' :
                    'bg-white text-black hover:bg-zinc-200'}`}
              >
                  {isLoading ? (
                      <div className="flex items-center gap-3">
                          <Loader2 size={16} className="animate-spin" />
                          <span>Rendering...</span>
                      </div>
                  ) : isOutOfCredits ? (
                      <div className="flex flex-col items-center">
                          <div className="flex items-center gap-2">
                              <Star size={16} /> 
                              <span>Trial Ended • Upgrade</span>
                          </div>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center">
                          <div className="flex items-center gap-2">
                              <Sparkles size={16} /> 
                              <span>Generate Shoot</span>
                          </div>
                          <div className="flex items-center gap-1 mt-1 opacity-60 text-[11px]">
                              <Coins size={10} />
                              <span>{currentCost} {currentCost === 1 ? 'CREDIT' : 'CREDITS'}</span>
                          </div>
                      </div>
                  )}
              </button>
              {!isFormValid && !isOutOfCredits && !isRestrictedActive && (
                <div className="mt-2 text-center">
                  <p className="text-[9px] text-zinc-400">Add at least one garment image or description.</p>
                  <button
                    type="button"
                    onClick={handleWardrobeJump}
                    className="mt-1 text-[8px] font-black uppercase tracking-widest text-white/70 hover:text-white transition-colors"
                  >
                    Open Wardrobe &amp; Garments
                  </button>
                </div>
              )}
              {!isFormValid && !isLoading && !isOutOfCredits && isRestrictedActive && (
                <div className="mt-1.5 text-center">
                  <span className="text-[11px] font-black uppercase text-red-500 tracking-tighter">Selection includes locked features</span>
                </div>
              )}
          </div>
        </aside>

        <section className={`flex-1 h-full bg-black border-x lg:border border-zinc-800 rounded-none lg:rounded-lg overflow-y-auto custom-scrollbar shadow-2xl relative min-h-0 ${activeTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
           <div className="min-h-full max-h-full flex flex-col relative overflow-hidden flex-1">
             <ResultDisplay 
                isLoading={isLoading} 
                image={generatedResult?.image || null}
                width={generatedResult?.width}
                height={generatedResult?.height}
                onDownload={handleDownload} 
                onRegenerate={(keepModel) => { 
                    if (keepModel && !session) { setLoginModalView('signup'); setShowLoginModal(true); return; }
                    if (keepModel && !isPremium) { setShowUpgradeModal(true); return; }
                    const seed = keepModel ? options.seed : getRandomSeed(); 
                    setOptions({ ...options, seed, isModelLocked: keepModel }); 
                    executeGeneration({ ...options, seed, isModelLocked: keepModel }); 
                }} 
                isPremium={isPremium} error={error} 
                SpotlightGate={SpotlightGate}
             />
             {generatedResult && session && (
                <button onClick={saveToLibrary} disabled={isSaving || justSaved} className={`absolute top-6 right-6 px-4 py-2 sm:px-6 sm:py-3 rounded-md transition-all duration-300 flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-black uppercase tracking-widest shadow-2xl backdrop-blur-md border z-20 ${justSaved ? 'bg-emerald-500 text-white border-emerald-400 scale-105' : isSaving ? 'bg-zinc-800 text-zinc-400 border-zinc-700 cursor-not-allowed' : 'bg-black/90 text-white border-zinc-700 hover:border-white hover:bg-black'}`}>
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : justSaved ? <Check size={14} strokeWidth={3} /> : saveError ? <AlertCircle size={14} className="text-red-400" /> : <Save size={14} />}
                  <span className="hidden xs:inline">{isSaving ? "Saving..." : justSaved ? "Saved!" : saveError ? "Retry" : "Archive"}</span>
                </button>
             )}
           </div>
        </section>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onAuth={handleAuth} initialView={loginModalView} />
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgrade={handleUpgrade} currentTier={userProfile?.tier || SubscriptionTier.Free} />
      <LibraryDrawer isOpen={showLibrary} onClose={() => setShowLibrary(false)} prefetch={prefetchLibrary} activeProjectId={activeProjectId} />
    </div>
  );
};

export default App;
