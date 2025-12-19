import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { UserCircle, ChevronDown, Shirt, Ruler, Zap, Hexagon, Sparkles, Move, LogOut, Star, CheckCircle, XCircle, Info, Crown, X, Loader2, Palette, Folder, Library, Plus, Save, Check, AlertCircle, Monitor, Columns, Square } from 'lucide-react';
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
const EYE_COLORS = ["Amber", "Deep Brown", "Steel Blue", "Emerald Green", "Hazel", "Dark Grey"];
const FACE_SHAPES = ["Oval face", "Square jawline", "Heart-shaped face", "High cheekbones", "Soft features", "Defined jawline"];
const SKIN_DETAILS = ["Freckles", "Clear complexion", "Sun-kissed skin", "Dewy skin", "Mole on cheek"];

const STANDARD_STYLES = [ PhotoStyle.Studio, PhotoStyle.Urban, PhotoStyle.Nature, PhotoStyle.Coastal ];
const PRO_STYLES = [ PhotoStyle.Luxury, PhotoStyle.Chromatic, PhotoStyle.Minimalist, PhotoStyle.Film, PhotoStyle.Newton, PhotoStyle.Lindbergh, PhotoStyle.Leibovitz, PhotoStyle.Avedon, PhotoStyle.LaChapelle, PhotoStyle.Testino ];

const ACCOUNT_PORTAL_URL = (import.meta as any).env?.VITE_ACCOUNT_PORTAL_URL || 'https://lookbook.test.onfastspring.com/account';

const getRandomPose = () => POSES[Math.floor(Math.random() * POSES.length)];
const getRandomSeed = () => Math.floor(Math.random() * 1000000000);
const getRandomFeatures = (): string => {
    const eyeColor = EYE_COLORS[Math.floor(Math.random() * EYE_COLORS.length)];
    const faceShape = FACE_SHAPES[Math.floor(Math.random() * FACE_SHAPES.length)];
    const skinDetail = SKIN_DETAILS[Math.floor(Math.random() * SKIN_DETAILS.length)];
    return `${eyeColor} eyes, ${faceShape}, ${skinDetail}`;
}

const getGenerationCost = (options: PhotoshootOptions): number => {
    let cost = 1;
    if (options.modelVersion === ModelVersion.Pro) cost = 10;
    if (options.enable4K) cost += 5;
    if (options.layout === LayoutMode.Diptych) cost += 5;
    return cost;
};

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
        if (onClick) {
          onClick();
        }
      }}
    >
      <div className={`transition-all duration-300 h-full w-full ${isLocked ? 'grayscale opacity-30 hover:opacity-50' : ''} ${className} ${isLocked && !interactive ? 'pointer-events-none' : ''}`}>
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

  const bgColor = 'bg-black border-zinc-800';
  const textColor = type === 'success' ? 'text-white' : type === 'error' ? 'text-red-400' : 'text-zinc-400';
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : Info;

  return (
    <div className="fixed bottom-10 left-0 w-full flex justify-center z-[150] pointer-events-none px-4">
      <div className={`pointer-events-auto px-6 py-3 rounded-md border shadow-2xl flex items-center gap-4 animate-slide-up ${bgColor} backdrop-blur-xl`}>
        <Icon size={14} className={textColor} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white whitespace-nowrap">{message}</span>
        <button onClick={onClose} className="ml-4 text-zinc-600 hover:text-white transition-colors">
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
}

const ConfigSection: React.FC<ConfigSectionProps> = ({ title, icon: Icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/5 bg-transparent last:border-b-0 flex-shrink-0">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="w-full flex items-center justify-between py-5 px-6 text-left focus:outline-none group hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className={`text-[10px] font-bold tracking-[0.3em] text-zinc-500 group-hover:text-white transition-colors uppercase`}>
            {title}
          </span>
        </div>
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
           <ChevronDown size={14} className="text-zinc-700 group-hover:text-white" />
        </div>
      </button>
      {isOpen && (
        <div className="p-6 pt-0 animate-fade-in relative">
            <div className={`mt-2 space-y-6 relative`}>
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
        className={`px-4 py-4 rounded-md border text-left transition-all flex items-center justify-center 
        ${isSelected ? 'bg-white border-white text-black' : 'bg-black border-white/5 hover:border-zinc-700 text-zinc-500'}`}
    >
        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isSelected ? 'text-black' : 'text-zinc-500 group-hover:text-zinc-300'}`}>{label}</span>
    </button>
);

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<{tier: SubscriptionTier, credits: number, username?: string} | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  
  const [guestCredits, setGuestCredits] = useState<number>(() => {
    const saved = localStorage.getItem('fashion_guest_credits');
    return saved !== null ? parseInt(saved, 10) : 5;
  });

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

  const projectMenuRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const [options, setOptions] = useState<PhotoshootOptions>({
    sex: ModelSex.Female, ethnicity: ModelEthnicity.Mixed, age: ModelAge.YoungAdult,
    facialExpression: FacialExpression.Neutral, hairColor: HairColor.JetBlack, hairStyle: HairStyle.StraightSleek,
    style: PhotoStyle.Studio, sceneDetails: '', modelVersion: ModelVersion.Flash,
    layout: LayoutMode.Single,
    aspectRatio: AspectRatio.Square, 
    enable4K: false, height: '', measurementUnit: MeasurementUnit.CM,
    bodyType: BodyType.Standard, isModelLocked: false,
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
    setOptions(prev => ({
      ...prev,
      modelVersion: selectedModel === 'pro-3' ? ModelVersion.Pro : ModelVersion.Flash
    }));
  }, [selectedModel]);

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setShowAccountMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isRestrictedActive = (
    (options.layout === LayoutMode.Diptych && !isStudio) ||
    (options.enable4K && !isStudio) ||
    (PRO_STYLES.includes(options.style) && !hasProAccess) ||
    (!autoPose && !isPremium) ||
    (selectedModel === 'pro-3' && !hasProAccess)
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
          if (error.code === '42P01') console.warn("Table 'projects' not found.");
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

  const saveToLibrary = async (imageUrl: string) => {
    if (!session || !imageUrl || !isConfigured) return;
    
    setIsSaving(true);
    setJustSaved(false);
    setSaveError(false);

    try {
      let publicCdnUrl = imageUrl;

      if (imageUrl.startsWith('data:image')) {
        const timestamp = Date.now();
        const filePath = `${session.user.id}/${timestamp}.png`;
        
        const parts = imageUrl.split(',');
        const base64Data = parts.length > 1 ? parts[1] : parts[0];
        
        let mimeType = 'image/png';
        const mimeMatch = imageUrl.match(/^data:(image\/[a-z]+);base64,/);
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

      const { error: dbError } = await supabase.from('generations').insert([{
        image_url: publicCdnUrl,
        user_id: session.user.id,
        project_id: activeProjectId || null,
        config: leanConfig
      }]);
      
      if (dbError) {
        setSaveError(true);
        showToast(`Cloud Sync Error: ${dbError.message}`, "error");
      } else {
        setJustSaved(true);
        showToast("Archived to cloud", "success");
        setTimeout(() => setJustSaved(false), 3000);
      }
    } catch (e: any) {
      console.error("Archive Sync Failure:", e);
      setSaveError(true);
      showToast("Critical: Storage Offload Failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (isConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session) fetchProfile(session.user.id, session.user.email);
        else setIsAuthLoading(false);
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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

  const fetchProfile = async (userId: string, email?: string) => {
    if (!isConfigured) return;
    try {
        let { data, error } = await supabase.from('profiles').select('tier, credits').eq('id', userId).single();
        if (error && error.code === 'PGRST116') {
             const { data: newProfile } = await supabase.from('profiles').insert([{ id: userId, email: email || 'unknown', tier: SubscriptionTier.Free, credits: 5 }]).select().single();
             if (newProfile) data = newProfile;
        }
        if (data) {
            setUserProfile({
                tier: data.tier as SubscriptionTier || SubscriptionTier.Free,
                credits: data.credits ?? 5, 
                username: email ? email.split('@')[0] : 'Studio User'
            });
        }
    } catch (e) { } finally { setIsAuthLoading(false); }
  };

  const handleAuth = async (email: string, password?: string, isSignUp?: boolean, username?: string) => {
      if (!isConfigured) throw new Error("Authentication is currently disabled.");
      if (isSignUp) {
          const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: username } } });
          if (error) throw error;
      } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
      }
  };

  const handleLogout = async () => {
      if (isConfigured) await supabase.auth.signOut(); 
      setShowAccountMenu(false);
      showToast('Signed out successfully', 'info');
  };

  const handleGenerate = async () => {
      if (window.innerWidth < 1024) setActiveTab('preview');

      const newSeed = getRandomSeed();
      const newFeatures = options.referenceModelImage ? (options.modelFeatures || getRandomFeatures()) : getRandomFeatures();
      const newOptions = { 
        ...options, 
        seed: newSeed, 
        pose: autoPose ? getRandomPose() : (options.pose || getRandomPose()), 
        modelFeatures: newFeatures
      };
      setOptions(newOptions);
      executeGeneration(newOptions);
  };

  const executeGeneration = async (currentOptions: PhotoshootOptions) => {
      const cost = getGenerationCost(currentOptions);
      setIsLoading(true); 
      setError(null); 
      setGeneratedImage(null);

      try {
          if (!session) {
              if (guestCredits < cost) { setLoginModalView('signup'); setShowLoginModal(true); setIsLoading(false); return; }
              const result = await generatePhotoshootImage(currentOptions);
              setGeneratedImage(result);
              setGuestCredits(prev => prev - cost);
              localStorage.setItem('fashion_guest_credits', (guestCredits - cost).toString());
          } else {
              if (!userProfile || userProfile.credits < cost) { setShowUpgradeModal(true); setIsLoading(false); return; }
              const result = await generatePhotoshootImage(currentOptions);
              setGeneratedImage(result);
              const newBalance = userProfile.credits - cost;
              setUserProfile(prev => prev ? ({ ...prev, credits: newBalance }) : null);
              if (isConfigured) {
                await supabase.from('profiles').update({ credits: newBalance }).eq('id', session.user.id);
              }
          }
      } catch (err: any) { 
          const errorMessage = err.message || 'Engine offline. Try again.';
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
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `shoot-${Date.now()}.png`;
      link.click();
    }
  };

  const activeProjectName = activeProjectId === null ? "MASTER ARCHIVE" : projects.find(p => p.id === activeProjectId)?.name.toUpperCase() || "PROJECT";

  return (
    <div className="h-screen w-full flex flex-col text-zinc-300 font-sans bg-black overflow-hidden relative">
      <header className="flex-shrink-0 z-[60] bg-black border-b border-white/5 h-16">
          <div className="max-w-[1920px] mx-auto h-full flex justify-between items-center px-8">
              <div className="flex items-center gap-6">
                  <div className="w-6 h-6 bg-white text-black rounded-sm flex items-center justify-center">
                     <Hexagon size={14} fill="currentColor" />
                  </div>
                  <h1 className="text-[10px] font-bold tracking-[0.5em] text-white uppercase font-mono">FashionStudio<span className="text-zinc-600">.AI</span></h1>
              </div>

              <div className="flex items-center gap-8">
                 {session && userProfile && (
                    <div className="hidden md:flex items-center gap-6" onClick={() => setShowUpgradeModal(true)}>
                        <div className="flex flex-col items-end">
                           <span className="text-[8px] font-black text-zinc-600 tracking-widest uppercase mb-1">Credits Available</span>
                           <span className="text-[10px] font-bold text-white tracking-widest">{userProfile.credits}</span>
                        </div>
                        <div className="w-px h-6 bg-white/10" />
                        <div className="flex flex-col items-end">
                           <span className="text-[8px] font-black text-zinc-600 tracking-widest uppercase mb-1">Membership</span>
                           <span className="text-[10px] font-bold text-white tracking-widest uppercase">{userProfile.tier}</span>
                        </div>
                    </div>
                 )}

                 <div className="flex items-center gap-6">
                    {session && (
                        <button 
                            onClick={() => setShowLibrary(true)} 
                            onMouseEnter={() => setPrefetchLibrary(true)}
                            className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 hover:text-white transition-all uppercase tracking-widest"
                        >
                           Archive
                        </button>
                    )}
                    {session ? (
                        <div className="relative" ref={accountMenuRef}>
                            <button 
                              onClick={() => setShowAccountMenu(!showAccountMenu)}
                              className="w-10 h-10 border border-white/10 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase hover:border-white transition-all"
                            >
                                {session.user.email?.[0]}
                            </button>
                            {showAccountMenu && (
                              <div className="absolute top-full right-0 mt-4 w-56 bg-black border border-white/10 shadow-2xl py-2 z-[100] animate-fade-in">
                                  <div className="px-5 py-4 border-b border-white/5">
                                      <p className="text-[8px] font-black text-zinc-600 uppercase tracking-widest mb-2">Account</p>
                                      <p className="text-[10px] text-white truncate font-medium">{session.user.email}</p>
                                  </div>
                                  <button onClick={() => { setShowUpgradeModal(true); setShowAccountMenu(false); }} className="w-full text-left px-5 py-3.5 text-[10px] uppercase tracking-widest text-zinc-400 hover:text-white flex items-center gap-3">
                                      Plan Details
                                  </button>
                                  <button onClick={handleLogout} className="w-full text-left px-5 py-3.5 text-[10px] uppercase tracking-widest text-red-500 hover:bg-red-500/5 flex items-center gap-3">
                                      Sign Out
                                  </button>
                              </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-8">
                            <button onClick={() => { setLoginModalView('login'); setShowLoginModal(true); }} className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Log in</button>
                            <button onClick={() => { setLoginModalView('signup'); setShowLoginModal(true); }} className="bg-white text-black px-6 py-2.5 rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors">Sign up</button>
                        </div>
                    )}
                 </div>
              </div>
          </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden w-full relative">
        <aside className={`w-full lg:w-[450px] flex-shrink-0 flex flex-col h-full bg-black border-r border-white/5 overflow-hidden min-h-0 ${activeTab === 'editor' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="p-8 border-b border-white/5 space-y-8 flex-shrink-0">
              <div className="space-y-4">
                  <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em]">Processing Engine</label>
                  <div className="grid grid-cols-2 gap-px bg-white/5 p-[1px] rounded-sm">
                      <button
                          onClick={() => setSelectedModel('flash-2.5')}
                          className={`py-3 px-4 transition-all duration-300 ${selectedModel === 'flash-2.5' ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                      >
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Flash 2.5</span>
                      </button>
                      <SpotlightGate
                          isLocked={!hasProAccess}
                          tier="CREATOR"
                          containerClassName="flex-1"
                          interactive={true}
                          onClick={() => {
                            if (!session) { setLoginModalView('signup'); setShowLoginModal(true); return; }
                            if (!hasProAccess) { setShowUpgradeModal(true); return; }
                            setSelectedModel('pro-3');
                          }}
                      >
                        <button
                            className={`w-full h-full py-3 px-4 transition-all duration-300 ${selectedModel === 'pro-3' ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <span className={`text-[10px] font-black uppercase tracking-[0.2em]`}>Pro 3</span>
                        </button>
                      </SpotlightGate>
                  </div>
              </div>

              <SpotlightGate 
                isLocked={!isStudio} 
                tier="STUDIO" 
                interactive={true}
                onClick={() => {
                  if (!session) { setLoginModalView('signup'); setShowLoginModal(true); return; }
                  if (!isStudio) { setShowUpgradeModal(true); return; }
                  setOptions({...options, enable4K: !options.enable4K});
                }}
              >
                <div className={`flex items-center justify-between py-4 px-1 border-b border-white/5 transition-opacity`}>
                    <span className={`text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400`}>4K Production Upscale</span>
                    <button 
                        className={`w-10 h-5 rounded-full relative transition-all duration-500 ${options.enable4K ? 'bg-white' : 'bg-zinc-900 border border-white/10'}`}
                    >
                        <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full transition-all duration-500 ${options.enable4K ? 'right-1 bg-black' : 'left-1 bg-zinc-600'}`}></div>
                    </button>
                </div>
              </SpotlightGate>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
              {session && (
                <div className="p-8 border-b border-white/5" ref={projectMenuRef}>
                  <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.4em] mb-4 block">Archive Specification</label>
                  <div className="relative group">
                      <button 
                          onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                          className="w-full flex items-center justify-between py-4 px-5 border border-white/10 hover:border-white transition-all text-left"
                      >
                          <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] truncate">{activeProjectName}</span>
                          <ChevronDown size={14} className={`text-zinc-600 transition-transform ${showProjectDropdown ? 'rotate-180 text-white' : ''}`} />
                      </button>

                      {showProjectDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-black border border-white/10 shadow-2xl z-[100] py-2">
                            <button onClick={() => { setActiveProjectId(null); setShowProjectDropdown(false); }} className={`w-full text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${activeProjectId === null ? 'text-white bg-white/5' : 'text-zinc-500 hover:text-white'}`}>
                                Master Archive
                            </button>
                            {projects.map(p => (
                                <button key={p.id} onClick={() => { setActiveProjectId(p.id); setShowProjectDropdown(false); }} className={`w-full text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] transition-colors ${activeProjectId === p.id ? 'text-white bg-white/5' : 'text-zinc-500 hover:text-white'}`}>
                                    {p.name}
                                </button>
                            ))}
                            <div className="h-px bg-white/5 my-2" />
                            <button onClick={createProject} className="w-full text-left px-5 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-white/5 flex items-center gap-3">
                                <Plus size={14} /> New Project
                            </button>
                        </div>
                      )}
                  </div>
                </div>
              )}

              <div className="flex flex-col">
                  <ConfigSection title="Garment Library" icon={Shirt} defaultOpen={true}>
                      <OutfitControl outfit={options.outfit} onChange={(newOutfit) => setOptions({ ...options, outfit: newOutfit })} />
                  </ConfigSection>

                  <ConfigSection title="Model Profile" icon={UserCircle}>
                      <div className="grid grid-cols-2 gap-6">
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
                            label="Age" 
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
                      <div className="space-y-6 pt-4 border-t border-white/5">
                          <div className="grid grid-cols-2 gap-6">
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
                          <div className="space-y-3">
                              <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] pl-1">Identification Features</label>
                              <SpotlightGate isLocked={!hasProAccess} tier="CREATOR" interactive={true} onClick={handleLockedClick}>
                                <textarea 
                                  placeholder="Specify moles, freckles, or distinct features..." 
                                  value={options.modelFeatures} 
                                  onChange={(e) => setOptions({...options, modelFeatures: e.target.value})} 
                                  className={`w-full h-24 bg-black border border-white/10 rounded-sm py-4 px-5 text-white resize-none focus:border-white font-mono text-xs transition-all`} 
                                />
                              </SpotlightGate>
                          </div>
                      </div>
                  </ConfigSection>

                  <ConfigSection title="Physicality" icon={Ruler}>
                      <SizeControl options={options} onChange={(newOps) => setOptions(newOps)} isPremium={isPremium} onUpgradeRequest={() => setShowUpgradeModal(true)} />
                  </ConfigSection>

                  <ConfigSection title="Staging" icon={Move}>
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

                  <ConfigSection title="Aesthetic Style" icon={Palette}>
                      <div className="space-y-10">
                          <div className="space-y-4">
                              <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Composition Mode</label>
                              <div className="grid grid-cols-2 gap-6">
                                  <button
                                      onClick={() => setOptions({ ...options, layout: LayoutMode.Single })}
                                      className={`py-5 px-6 border transition-all flex flex-col items-center gap-4 ${options.layout === LayoutMode.Single ? 'bg-white border-white text-black' : 'bg-black border-white/5 hover:border-zinc-700 text-zinc-500'}`}
                                  >
                                      <Square size={20} className={options.layout === LayoutMode.Single ? 'text-black' : 'text-zinc-700'} />
                                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Single</span>
                                  </button>

                                  <SpotlightGate isLocked={!isStudio} tier="STUDIO" interactive={true} onClick={handleStudioInterceptor}>
                                    <button
                                        className={`w-full py-5 px-6 border transition-all flex flex-col items-center gap-4
                                        ${options.layout === LayoutMode.Diptych ? 'bg-white border-white text-black' : 'bg-black border-white/5 hover:border-zinc-700 text-zinc-500'}`}
                                    >
                                        <Columns size={20} className={`${options.layout === LayoutMode.Diptych ? 'text-black' : 'text-zinc-700'}`} />
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Diptych</span>
                                    </button>
                                  </SpotlightGate>
                              </div>
                          </div>

                          <div className="space-y-10">
                              <div className="space-y-4">
                                  <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Standard Library</label>
                                  <div className="grid grid-cols-2 gap-4">
                                      {STANDARD_STYLES.map(s => <StyleButton key={s} label={s} isSelected={options.style === s} onClick={() => setOptions({...options, style: s})} />)}
                                  </div>
                              </div>

                              <div className="space-y-4">
                                  <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Professional Selection</label>
                                  <SpotlightGate isLocked={!hasProAccess} tier="CREATOR" interactive={true} onClick={handleProInterceptor}>
                                    <div className={`grid grid-cols-2 gap-4 transition-all`}>
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

                          <div className="space-y-8 pt-8 border-t border-white/5">
                              <div className="space-y-4">
                                  <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Environmental Context</label>
                                  <textarea placeholder="Specify lighting, surfaces, background geometry..." value={options.sceneDetails} onChange={(e) => setOptions({...options, sceneDetails: e.target.value})} className="w-full h-32 bg-black border border-white/10 rounded-sm py-5 px-6 text-xs text-white focus:border-white font-mono resize-none transition-all" />
                              </div>
                              <div className="pt-2">
                                  <Dropdown label="Frame Format" value={options.aspectRatio} options={Object.values(AspectRatio)} onChange={(val) => setOptions({ ...options, aspectRatio: val as AspectRatio })} />
                              </div>
                          </div>
                      </div>
                  </ConfigSection>
              </div>
          </div>
          
          <div className="p-8 bg-black border-t border-white/10 flex-shrink-0">
              <button 
                  onClick={handleGenerate} 
                  disabled={!isFormValid || isLoading} 
                  className={`w-full py-6 rounded-sm text-[11px] font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 transform active:scale-[0.99]
                  ${!isFormValid || isLoading ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed opacity-50' : 'bg-white text-black hover:bg-zinc-200 shadow-[0_0_30px_rgba(255,255,255,0.1)]'}`}
              >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <><Sparkles size={16} /> Render Output</>}
              </button>
          </div>
        </aside>

        <section className={`flex-1 h-full bg-black relative min-h-0 ${activeTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
           <div className="h-full w-full flex flex-col relative overflow-hidden flex-1">
             <ResultDisplay 
                isLoading={isLoading} image={generatedImage} onDownload={handleDownload} 
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
             {generatedImage && session && (
                <button onClick={() => saveToLibrary(generatedImage)} disabled={isSaving || justSaved} className={`absolute top-10 right-10 px-8 py-4 bg-black/80 backdrop-blur-xl border border-white/10 transition-all duration-500 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] z-20 hover:border-white shadow-2xl ${justSaved ? 'border-emerald-500 text-emerald-500' : ''}`}>
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : justSaved ? <Check size={14} /> : <Save size={14} />}
                  <span>{isSaving ? "Syncing..." : justSaved ? "Archived" : "Archive"}</span>
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