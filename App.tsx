
import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, ChevronDown, Shirt, Ruler, Zap, LayoutGrid, LayoutList, Hexagon, Sparkles, Move, LogOut, CreditCard, Star, CheckCircle, XCircle, Info, Lock, GitCommit, Crown, RotateCw, X, Loader2, Palette, RefreshCcw, Command, Monitor, Folder, Library, Plus, Save, Check, HelpCircle, FolderPlus, ChevronRight } from 'lucide-react';
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
import { ModelSex, ModelEthnicity, ModelAge, FacialExpression, PhotoStyle, PhotoshootOptions, ModelVersion, MeasurementUnit, AspectRatio, BodyType, OutfitItem, SubscriptionTier, Project, Generation } from './types';

const APP_VERSION = "v1.9.6"; 

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
    return cost;
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
    <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[110] px-5 py-3.5 rounded-xl border shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-3 animate-slide-up ${bgColor} backdrop-blur-xl`}>
      <Icon size={18} className={textColor} />
      <span className="text-[11px] font-black uppercase tracking-widest text-white whitespace-nowrap">{message}</span>
      <button onClick={onClose} className="ml-2 text-zinc-500 hover:text-white transition-colors">
        <X size={14} />
      </button>
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
    <div className="border-b border-zinc-800 bg-black/50 last:border-b-0">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4 text-left focus:outline-none group hover:bg-zinc-900/50 transition-colors">
        <div className="flex items-center gap-3">
          <Icon size={14} className={`text-zinc-500 group-hover:text-white transition-colors ${isOpen ? 'text-white' : ''}`} />
          <span className="font-mono text-xs font-medium tracking-wide text-zinc-300 group-hover:text-white transition-colors">{title}</span>
        </div>
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
           <ChevronDown size={14} className="text-zinc-600 group-hover:text-white" />
        </div>
      </button>
      {isOpen && <div className="p-4 pt-0 animate-fade-in"><div className="mt-2 space-y-5">{children}</div></div>}
    </div>
  );
};

interface StyleButtonProps {
    label: string;
    isSelected: boolean;
    isLocked?: boolean;
    onClick: () => void;
}
const StyleButton: React.FC<StyleButtonProps> = ({ label, isSelected, isLocked, onClick }) => (
    <button onClick={onClick} className={`relative px-3 py-3 rounded-md border text-left transition-all group overflow-hidden min-h-[3rem] flex items-center justify-between ${isSelected ? 'bg-white border-white text-black shadow-lg shadow-white/5' : 'bg-black border-zinc-800 hover:border-zinc-600 text-zinc-400'} ${isLocked && !isSelected ? 'opacity-60 cursor-not-allowed hover:bg-black hover:border-zinc-800' : ''}`}>
        <span className={`text-[10px] font-bold uppercase tracking-wide z-10 relative ${isSelected ? 'text-black' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{label}</span>
        {isLocked && !isSelected && <Lock size={10} className="text-zinc-600" />}
    </button>
);

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<{tier: SubscriptionTier, credits: number, username?: string} | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [guestCredits, setGuestCredits] = useState<number>(() => {
    const saved = localStorage.getItem('fashion_guest_credits');
    return saved !== null ? parseInt(saved, 10) : 5;
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalView, setLoginModalView] = useState<'pricing' | 'login' | 'signup'>('signup'); 
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [autoPose, setAutoPose] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const projectSelectorRef = useRef<HTMLDivElement>(null);

  const [options, setOptions] = useState<PhotoshootOptions>({
    sex: ModelSex.Female, ethnicity: ModelEthnicity.Mixed, age: ModelAge.YoungAdult,
    facialExpression: FacialExpression.Neutral, hairColor: "Dark Brown", hairStyle: "Straight & Loose",
    style: PhotoStyle.Studio, sceneDetails: '', modelVersion: ModelVersion.Flash,
    aspectRatio: AspectRatio.Portrait, enable4K: false, height: '', measurementUnit: MeasurementUnit.CM,
    bodyType: BodyType.Standard,
    outfit: { 
        top: { garmentType: '', description: '', images: [], sizeChart: null, sizeChartDetails: '' },
        bottom: { garmentType: '', description: '', images: [], sizeChart: null, sizeChartDetails: '' },
        shoes: { garmentType: '', description: '', images: [], sizeChart: null, sizeChartDetails: '' },
        accessories: { garmentType: '', description: '', images: [], sizeChart: null, sizeChartDetails: '' }
    }
  });

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => setToast({ message, type });

  const isFormValid = Object.values(options.outfit).some((item: OutfitItem) => 
    item.images.length > 0 || (item.description && item.description.trim().length > 0) || (item.garmentType && item.garmentType.trim().length > 0)
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectSelectorRef.current && !projectSelectorRef.current.contains(event.target as Node)) {
        setShowProjectSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchProjects();
    }
  }, [session]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (error) return;
      if (data) {
        setProjects(data);
        if (data.length > 0 && !activeProjectId) setActiveProjectId(data[0].id);
      }
    } catch (e) { }
  };

  const createProject = async (manualName?: string) => {
    const name = manualName || prompt("New Folder Name?");
    if (!name) return null;
    try {
      const { data, error } = await supabase.from('projects').insert([{ name, user_id: session.user.id }]).select().single();
      if (error) {
        showToast(`Failed to create project: ${error.message}`, "error");
        return null;
      }
      if (data) {
        setProjects([data, ...projects]);
        setActiveProjectId(data.id);
        return data.id;
      }
    } catch (e) {
      showToast("Error creating folder", "error");
    }
    return null;
  };

  const saveToLibrary = async (projectId: string | null) => {
    if (!session || !generatedImage) return;
    try {
      const payload = {
        image_url: generatedImage,
        user_id: session.user.id,
        project_id: projectId,
        config: { ...options, referenceModelImage: undefined }
      };
      
      const { error } = await supabase.from('generations').insert([payload]);
      if (error) throw error;
      showToast("Saved to Archive", "success");
    } catch (e: any) {
      showToast(e.message || "Error saving to archive", "error");
      throw e;
    }
  };

  useEffect(() => {
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
  }, []);

  const fetchProfile = async (userId: string, email?: string) => {
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
      if (!isConfigured) return;
      if (isSignUp) {
          const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: username } } });
          if (error) throw error;
      } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
      }
  };

  const handleLogout = async () => {
      await supabase.auth.signOut(); 
      showToast('Signed out successfully', 'info');
  };

  const handleGenerate = async () => {
      // Safety guard for window.aistudio which is only available in specific environments
      const aistudio = (window as any).aistudio;
      
      if (options.modelVersion === ModelVersion.Pro && aistudio) {
        try {
          const hasKey = await aistudio.hasSelectedApiKey();
          if (!hasKey) {
            await aistudio.openSelectKey();
          }
        } catch (e) {
          console.warn("AI Studio key selection failed or not supported in this context:", e);
        }
      }

      const newSeed = getRandomSeed();
      const newFeatures = options.referenceModelImage ? (options.modelFeatures || getRandomFeatures()) : getRandomFeatures();
      const newOptions = { 
        ...options, 
        seed: newSeed, 
        pose: autoPose ? getRandomPose() : (options.pose || getRandomPose()), 
        modelFeatures: newFeatures,
        referenceModelImage: options.referenceModelImage
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
              if (guestCredits < cost) { handleSignup(); return; }
              const result = await generatePhotoshootImage(currentOptions);
              setGeneratedImage(result);
              setGuestCredits(prev => {
                  const val = prev - cost;
                  localStorage.setItem('fashion_guest_credits', val.toString());
                  return val;
              });
          } else {
              if (!userProfile || userProfile.credits < cost) { setShowUpgradeModal(true); return; }
              const result = await generatePhotoshootImage(currentOptions);
              setGeneratedImage(result);
              const newBalance = userProfile.credits - cost;
              setUserProfile(prev => prev ? ({ ...prev, credits: newBalance }) : null);
              supabase.from('profiles').update({ credits: newBalance }).eq('id', session.user.id);
          }
      } catch (err: any) { 
          console.error("Execute Generation Error:", err);
          
          const aistudio = (window as any).aistudio;
          if (err.message?.includes("Requested entity was not found.") && currentOptions.modelVersion === ModelVersion.Pro && aistudio) {
              await aistudio.openSelectKey();
              setError("API Key verification failed. Please ensure you select a key from a paid GCP project.");
          } else {
              setError(err.message || 'Generation failed. Please check your garment photos and try again.');
          }
      } finally { 
          setIsLoading(false); 
      }
  }

  const handleUpgrade = (tier?: SubscriptionTier) => {
     const fs = (window as any).fastspring;
     if (fs?.builder && tier) {
         fs.builder.push({ products: [{ path: tier.toLowerCase(), quantity: 1 }], tags: { userId: session.user.id } });
         if (fs.builder.checkout) fs.builder.checkout();
         setShowUpgradeModal(false);
     }
  };

  const handleLogin = () => { setLoginModalView('login'); setShowLoginModal(true); };
  const handleSignup = () => { setLoginModalView('signup'); setShowLoginModal(true); };

  const handleProFeatureClick = (action: () => void) => {
      if (session ? (userProfile?.tier === SubscriptionTier.Creator || userProfile?.tier === SubscriptionTier.Studio) : false) action();
      else if (!session) handleSignup();
      else setShowUpgradeModal(true);
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `shoot-${Date.now()}.png`;
      link.click();
    }
  };

  const isPremium = session ? userProfile?.tier !== SubscriptionTier.Free : false;
  const hasProAccess = session ? (userProfile?.tier === SubscriptionTier.Creator || userProfile?.tier === SubscriptionTier.Studio) : false;

  const activeProjectName = activeProjectId === null ? "Default Archive" : projects.find(p => p.id === activeProjectId)?.name || "Folder";

  return (
    <div className="min-h-screen text-zinc-300 font-sans bg-black relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-white/5 rounded-full blur-[150px]"></div>
         <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-zinc-900/40 rounded-full blur-[150px]"></div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onAuth={handleAuth} initialView={loginModalView} showToast={showToast} />
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgrade={handleUpgrade} currentTier={userProfile?.tier || SubscriptionTier.Free} />
      <LibraryDrawer 
        isOpen={showLibrary} 
        onClose={() => setShowLibrary(false)} 
        initialProjectId={activeProjectId} 
        session={session} 
        projects={projects}
        onProjectChange={setActiveProjectId}
      />

      <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-b border-zinc-800/50 h-14">
          <div className="max-w-[1920px] mx-auto h-full flex justify-between items-center px-4 md:px-6">
              <div className="flex items-center gap-3">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white text-black rounded-sm flex items-center justify-center shadow-lg shadow-white/10 shrink-0">
                     <Hexagon size={14} fill="currentColor" strokeWidth={0} />
                  </div>
                  <h1 className="text-xs sm:text-sm font-bold tracking-tight text-white font-mono uppercase">FashionStudio<span className="text-zinc-500">.ai</span></h1>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                 {session && (
                    <button onClick={() => setShowLibrary(true)} className="flex items-center gap-2 text-[10px] sm:text-xs font-medium text-zinc-400 hover:text-white transition-colors group">
                        <Library size={14} className="group-hover:scale-110 transition-transform" /> <span className="hidden xs:inline">Archive</span>
                    </button>
                 )}
                 {session ? (
                     <>
                        <button onClick={() => setShowUpgradeModal(true)} className="hidden sm:flex text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors items-center gap-1.5 border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-md">
                           <Crown size={12} className="text-amber-500" /> 
                           <span>{userProfile?.tier}</span>
                        </button>
                        <div onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700 text-[10px] font-bold text-white cursor-pointer relative">
                            {session.user.email?.[0].toUpperCase()}
                            {showProfileMenu && (
                                <div className="absolute top-10 right-0 w-48 bg-black border border-zinc-800 rounded-md shadow-2xl z-50 overflow-hidden">
                                    <div className="p-3 border-b border-zinc-800 text-[10px] text-zinc-500 truncate">{session.user.email}</div>
                                    <button onClick={() => window.open('https://lookbook.test.onfastspring.com/account', '_blank')} className="w-full text-left px-3 py-2.5 text-[10px] text-white hover:bg-zinc-900 flex items-center gap-2 uppercase font-bold"><CreditCard size={12} /> Billing</button>
                                    <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 text-[10px] text-red-400 hover:bg-zinc-900 flex items-center gap-2 uppercase font-bold"><LogOut size={12} /> Sign Out</button>
                                </div>
                            )}
                        </div>
                     </>
                 ) : (
                    <div className="flex items-center gap-3">
                        <button onClick={handleLogin} className="text-[10px] sm:text-xs font-medium text-white">Log in</button>
                        <button onClick={handleSignup} className="bg-white text-black px-2.5 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-xs font-bold transition-colors">Sign up</button>
                    </div>
                 )}
              </div>
          </div>
      </header>

      <main className="pt-20 px-4 md:px-6 max-w-[1920px] mx-auto min-h-screen pb-12 relative z-10">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 relative">
          <div className="order-2 lg:order-1 lg:col-span-4 flex flex-col gap-4 relative z-20 pb-32 lg:pb-0">
            
            {session && (
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Working Folder</label>
                    <div className="relative" ref={projectSelectorRef}>
                        <div className="bg-zinc-950 border border-zinc-800 rounded-md p-1 flex items-center gap-1 group transition-all hover:border-zinc-600 focus-within:border-zinc-500">
                            <button 
                                onClick={() => setShowProjectSelector(!showProjectSelector)}
                                className="w-full bg-transparent border-none text-[11px] font-mono font-bold text-white pl-8 pr-8 py-2.5 focus:ring-0 cursor-pointer flex items-center justify-between uppercase tracking-wide truncate"
                            >
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none group-focus-within:text-white transition-colors">
                                    <Folder size={14} />
                                </div>
                                <span className="truncate">{activeProjectName}</span>
                                <div className="absolute right-12 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none group-focus-within:text-white transition-colors">
                                    <ChevronDown size={14} className={`transition-transform duration-200 ${showProjectSelector ? 'rotate-180' : ''}`} />
                                </div>
                            </button>
                            <button onClick={() => createProject()} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-md transition-all shrink-0" title="New Folder">
                                <Plus size={16}/>
                            </button>
                        </div>

                        {showProjectSelector && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-black border border-zinc-800 rounded-md shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-fade-in py-1">
                                <button 
                                    onClick={() => { setActiveProjectId(null); setShowProjectSelector(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-[10px] font-bold transition-colors uppercase tracking-widest flex items-center gap-3 ${activeProjectId === null ? 'bg-[#0051e0] text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
                                >
                                    <Hexagon size={12} className={activeProjectId === null ? 'text-white' : 'text-zinc-600'} /> Default Archive
                                </button>
                                {projects.map(p => (
                                    <button 
                                        key={p.id}
                                        onClick={() => { setActiveProjectId(p.id); setShowProjectSelector(false); }}
                                        className={`w-full text-left px-4 py-2.5 text-[10px] font-bold transition-colors uppercase tracking-widest flex items-center gap-3 ${activeProjectId === p.id ? 'bg-[#0051e0] text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'}`}
                                    >
                                        <Folder size={12} className={activeProjectId === p.id ? 'text-white' : 'text-zinc-600'} /> {p.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-black/80 backdrop-blur-sm border border-zinc-800 rounded-lg overflow-hidden shadow-lg">
                <ConfigSection title="Wardrobe" icon={Shirt} defaultOpen={true}>
                    <OutfitControl outfit={options.outfit} onChange={(newOutfit) => setOptions({ ...options, outfit: newOutfit })} />
                </ConfigSection>
                <ConfigSection title="Model & Set" icon={UserCircle} defaultOpen={true}>
                    <div className="space-y-3 mb-6">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Engine Selection</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => setOptions({...options, modelVersion: ModelVersion.Flash})} 
                                className={`flex flex-col items-center justify-center py-3 rounded-md border transition-all ${options.modelVersion === ModelVersion.Flash ? 'bg-white border-white' : 'bg-black border-zinc-800 hover:border-zinc-700'}`}
                            >
                                <span className={`text-[10px] font-bold uppercase ${options.modelVersion === ModelVersion.Flash ? 'text-black' : 'text-zinc-400'}`}>Flash 3</span>
                            </button>
                            <button 
                                onClick={() => handleProFeatureClick(() => setOptions({...options, modelVersion: ModelVersion.Pro}))} 
                                className={`flex flex-col items-center justify-center py-3 rounded-md border transition-all relative ${options.modelVersion === ModelVersion.Pro ? 'bg-white border-white' : 'bg-black border-zinc-800 hover:border-zinc-700'}`}
                            >
                                {!hasProAccess && <Lock size={10} className="absolute top-1 right-1 text-zinc-600" />}
                                <span className={`text-[10px] font-bold uppercase ${options.modelVersion === ModelVersion.Pro ? 'text-black' : 'text-zinc-400'}`}>Pro 3</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Dropdown label="Sex" value={options.sex} options={Object.values(ModelSex)} onChange={(val) => setOptions({ ...options, sex: val })} />
                        <Dropdown label="Age" value={options.age} options={Object.values(ModelAge)} onChange={(val) => setOptions({ ...options, age: val })} />
                        <Dropdown label="Ethnicity" value={options.ethnicity} options={Object.values(ModelEthnicity)} onChange={(val) => setOptions({ ...options, ethnicity: val })} />
                        <Dropdown label="Expression" value={options.facialExpression} options={Object.values(FacialExpression)} onChange={(val) => setOptions({ ...options, facialExpression: val })} />
                    </div>
                    <div className="h-px bg-zinc-900 my-4"></div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Photo Style</label>
                      <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                         {STANDARD_STYLES.map(style => (<StyleButton key={style} label={style} isSelected={options.style === style} onClick={() => setOptions({...options, style: style as PhotoStyle})} />))}
                         <div className="col-span-2 text-[9px] font-bold text-zinc-500 uppercase tracking-wider mt-2 mb-1 pl-1">Premium Styles</div>
                         {PRO_STYLES.map(style => (<StyleButton key={style} label={style} isSelected={options.style === style} isLocked={!hasProAccess} onClick={() => handleProFeatureClick(() => setOptions({...options, style: style as PhotoStyle}))} />))}
                      </div>
                    </div>
                </ConfigSection>
                <ConfigSection title="Pose" icon={Move}>
                    <PoseControl selectedPose={options.pose} onPoseChange={(p) => setOptions({ ...options, pose: p })} isAutoMode={autoPose} onToggleAutoMode={setAutoPose} isPremium={isPremium} onUpgrade={() => handleProFeatureClick(() => {})} />
                </ConfigSection>
                <ConfigSection title="Model Specs" icon={Ruler}>
                    <SizeControl options={options} onChange={setOptions} isPremium={isPremium} onUpgradeRequest={() => handleProFeatureClick(() => {})} />
                </ConfigSection>
            </div>
            
            <button onClick={handleGenerate} disabled={!isFormValid || isLoading} className={`w-full py-4 rounded-md text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 transform active:scale-[0.98] shadow-xl ${!isFormValid || isLoading ? 'bg-zinc-900 text-zinc-600 border border-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}>
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <><Sparkles size={16} fill="black" /> Generate Shoot</>}
            </button>
          </div>

          <div className="order-1 lg:order-2 lg:col-span-8 h-[50vh] xs:h-[60vh] lg:h-[calc(100vh-8rem)] sticky top-20 bg-black border border-zinc-800 rounded-lg overflow-hidden shadow-2xl relative">
             <ResultDisplay 
                isLoading={isLoading} 
                image={generatedImage} 
                onDownload={handleDownload} 
                onRegenerate={(keep) => {
                    setOptions({ ...options, referenceModelImage: keep ? (generatedImage || options.referenceModelImage) : undefined });
                    handleGenerate();
                }}
                onSaveToProject={saveToLibrary}
                isPremium={isPremium} 
                isLoggedIn={!!session}
                projects={projects}
                activeProjectId={activeProjectId}
                error={error} 
             />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
