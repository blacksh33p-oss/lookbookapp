
import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, ChevronDown, Shirt, Ruler, Zap, LayoutGrid, LayoutList, Hexagon, Sparkles, Move, LogOut, CreditCard, Star, CheckCircle, XCircle, Info, Lock, GitCommit, Crown, RotateCw, X, Loader2, Palette, RefreshCcw, Command, Monitor, Folder, Library, Plus, Save } from 'lucide-react';
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

const APP_VERSION = "v1.8.1"; 
const ACCOUNT_PORTAL_URL = 'https://lookbook.test.onfastspring.com/account';

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

const getProductPath = (tier: SubscriptionTier): string => {
    let val = '';
    if (tier === SubscriptionTier.Starter) val = import.meta.env.VITE_FASTSPRING_STARTER_PATH || '';
    if (tier === SubscriptionTier.Creator) val = import.meta.env.VITE_FASTSPRING_CREATOR_PATH || '';
    if (tier === SubscriptionTier.Studio) val = import.meta.env.VITE_FASTSPRING_STUDIO_PATH || '';
    if (!val) {
        if (tier === SubscriptionTier.Starter) val = import.meta.env.VITE_FASTSPRING_STARTER_URL || '';
        if (tier === SubscriptionTier.Creator) val = import.meta.env.VITE_FASTSPRING_CREATOR_URL || '';
        if (tier === SubscriptionTier.Studio) val = import.meta.env.VITE_FASTSPRING_STUDIO_URL || '';
    }
    return val || tier.toLowerCase();
};

const Toast: React.FC<{ message: string; type: 'success' | 'error' | 'info'; onClose: () => void }> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-zinc-900 border-emerald-500/50' : type === 'error' ? 'bg-zinc-900 border-red-500/50' : 'bg-zinc-900 border-zinc-700';
  const textColor = type === 'success' ? 'text-emerald-400' : type === 'error' ? 'text-red-400' : 'text-zinc-300';
  const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : Info;

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-lg border shadow-2xl flex items-center gap-3 animate-fade-in ${bgColor}`}>
      <Icon size={16} className={textColor} />
      <span className="text-xs font-bold uppercase tracking-wider text-white">{message}</span>
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
  const [userProfile, setUserProfile] = useState<{tier: SubscriptionTier, credits: number, username?: string} | null>(() => {
      try {
          const cached = localStorage.getItem('fashion_user_profile');
          return cached ? JSON.parse(cached) : null;
      } catch (e) { return null; }
  });

  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [guestCredits, setGuestCredits] = useState<number>(() => {
    const saved = localStorage.getItem('fashion_guest_credits');
    return saved !== null ? parseInt(saved, 10) : 5;
  });

  // Projects & Archive State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalView, setLoginModalView] = useState<'pricing' | 'login' | 'signup'>('signup'); 
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [autoPose, setAutoPose] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const [hasApiKey, setHasApiKey] = useState<boolean>(true);

  const [options, setOptions] = useState<PhotoshootOptions>({
    sex: ModelSex.Female, ethnicity: ModelEthnicity.Mixed, age: ModelAge.YoungAdult,
    facialExpression: FacialExpression.Neutral, hairColor: "Dark Brown", hairStyle: "Straight & Loose",
    style: PhotoStyle.Studio, sceneDetails: '', modelVersion: ModelVersion.Flash,
    aspectRatio: AspectRatio.Portrait, enable4K: false, height: '', measurementUnit: MeasurementUnit.CM,
    bodyType: BodyType.Standard, isModelLocked: false,
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
    if (session?.user) {
      fetchProjects();
    }
  }, [session]);

  useEffect(() => {
    const checkApiKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio && typeof aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await aistudio.hasSelectedApiKey();
        setHasApiKey(hasKey);
      }
    };
    checkApiKey();
  }, []);

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (data) {
      setProjects(data);
      if (data.length > 0 && !activeProjectId) setActiveProjectId(data[0].id);
    }
  };

  const createProject = async () => {
    const name = prompt("Project Name?");
    if (!name) return;
    const { data } = await supabase.from('projects').insert([{ name, user_id: session.user.id }]).select().single();
    if (data) {
      setProjects([data, ...projects]);
      setActiveProjectId(data.id);
      showToast("Project created", "success");
    }
  };

  const saveToLibrary = async (imageUrl: string) => {
    if (!session || !imageUrl) return;
    setIsSaving(true);
    try {
      const payload = {
        image_url: imageUrl,
        user_id: session.user.id,
        project_id: activeProjectId || null,
        config: { ...options, referenceModelImage: undefined }
      };
      
      const { error } = await supabase.from('generations').insert([payload]);
      
      if (error) {
        console.error("Supabase insert error:", error);
        showToast(`Failed to save: ${error.message}`, "error");
      } else {
        showToast("Saved to library", "success");
      }
    } catch (e: any) {
      console.error("Save to library exception:", e);
      showToast("Error saving to archive", "error");
    } finally {
      setIsSaving(false);
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
         showToast(`Welcome back!`, 'success');
      } else if (event === 'SIGNED_OUT') {
         setUserProfile(null); setSession(null); setProjects([]); setActiveProjectId(null);
         showToast('Signed out successfully', 'info');
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
          const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: username } } });
          if (error) throw error;
      } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
      }
  };

  const handleLogout = async (e?: React.MouseEvent) => {
      if (e) e.preventDefault();
      setSession(null); setUserProfile(null); setShowProfileMenu(false);
      await supabase.auth.signOut(); 
      showToast('Signed out successfully', 'info');
  };

  const handleUpgrade = async (tier?: SubscriptionTier) => {
     try {
         const { data } = await supabase.auth.getSession();
         if (!data.session) { handleSignup(); return; }
         if (userProfile?.tier !== SubscriptionTier.Free && !tier) {
             window.open(ACCOUNT_PORTAL_URL, '_blank');
             return;
         }
         const fs = (window as any).fastspring;
         if (fs?.builder && tier) {
             const productPath = getProductPath(tier);
             const payload = { products: [{ path: productPath, quantity: 1 }], tags: { userId: data.session.user.id } };
             fs.builder.push(payload);
             if (fs.builder.checkout) setTimeout(() => fs.builder.checkout(), 200);
             setShowUpgradeModal(false);
         }
     } catch (err) { }
  };

  const handleLogin = () => { setLoginModalView('login'); setShowLoginModal(true); };
  const handleSignup = () => { setLoginModalView('signup'); setShowLoginModal(true); };

  const handleProFeatureClick = (action: () => void) => {
      if (session ? (userProfile?.tier === SubscriptionTier.Creator || userProfile?.tier === SubscriptionTier.Studio) : false) action();
      else if (!session) handleSignup();
      else setShowUpgradeModal(true);
  };

  const executeGeneration = async (currentOptions: PhotoshootOptions) => {
      const cost = getGenerationCost(currentOptions);
      if (!session) {
          if (guestCredits < cost) { handleSignup(); return; }
          setIsLoading(true); setError(null); setGeneratedImage(null);
          try {
            const result = await generatePhotoshootImage(currentOptions);
            setGeneratedImage(result);
            setGuestCredits(prev => prev - cost);
          } catch (err: any) { setError(err.message || 'Error'); } finally { setIsLoading(false); }
      } else {
          if (!userProfile || userProfile.credits < cost) { setShowUpgradeModal(true); return; }
          setIsLoading(true); setError(null); setGeneratedImage(null);
          try {
            const result = await generatePhotoshootImage(currentOptions);
            setGeneratedImage(result);
            const newBalance = userProfile.credits - cost;
            setUserProfile(prev => prev ? ({ ...prev, credits: newBalance }) : null);
            supabase.from('profiles').update({ credits: newBalance }).eq('id', session.user.id);
            
            if (userProfile.tier !== SubscriptionTier.Free) {
              saveToLibrary(result);
            }
          } catch (err: any) { 
            if (err.message && err.message.includes("Requested entity was not found.")) {
                setHasApiKey(false);
                showToast("Invalid API context. Please re-select your key.", "error");
            } else {
                setError(err.message || 'Error'); 
            }
          } finally { setIsLoading(false); }
      }
  }

  const handleGenerate = () => {
      const newSeed = getRandomSeed();
      const newFeatures = options.isModelLocked && options.modelFeatures ? options.modelFeatures : getRandomFeatures();
      const newOptions = { 
        ...options, 
        seed: newSeed, 
        pose: autoPose ? getRandomPose() : (options.pose || getRandomPose()), 
        modelFeatures: newFeatures,
        referenceModelImage: options.isModelLocked ? (generatedImage || options.referenceModelImage) : undefined
      };
      setOptions(newOptions);
      executeGeneration(newOptions);
  };
  
  const handleRegenerate = (keepModel: boolean) => {
       const newOptions = { 
        ...options, 
        seed: keepModel ? options.seed : getRandomSeed(), 
        pose: autoPose ? getRandomPose() : (options.pose || getRandomPose()),
        referenceModelImage: keepModel ? (generatedImage || options.referenceModelImage) : undefined
       };
       setOptions(newOptions);
       executeGeneration(newOptions);
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `fashion-studio-shoot-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("Image downloaded", "success");
    }
  };

  const isPremium = session ? userProfile?.tier !== SubscriptionTier.Free : false;
  const isStudio = session ? userProfile?.tier === SubscriptionTier.Studio : false;
  const hasProAccess = session ? (userProfile?.tier === SubscriptionTier.Creator || userProfile?.tier === SubscriptionTier.Studio) : false;

  return (
    <div className="min-h-screen text-zinc-300 font-sans bg-black relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-white/5 rounded-full blur-[150px]"></div>
         <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-zinc-900/40 rounded-full blur-[150px]"></div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {!hasApiKey && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex items-center justify-center p-6 text-center">
          <div className="max-w-md animate-fade-in">
             <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-black">
                <Lock className="text-white" size={24} />
             </div>
            <h2 className="text-2xl font-bold text-white mb-4">API Key Required</h2>
            <p className="text-zinc-400 mb-6 text-sm leading-relaxed">
              To access high-performance generation (Gemini 3 Pro) and ensure availability, you must select your own API key from a paid GCP project.
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-zinc-300 underline block mt-4 font-mono text-[10px] uppercase tracking-widest">View Billing Docs</a>
            </p>
            <button 
              onClick={async () => {
                const aistudio = (window as any).aistudio;
                if (aistudio && typeof aistudio.openSelectKey === 'function') {
                    await aistudio.openSelectKey();
                    setHasApiKey(true);
                }
              }}
              className="bg-white text-black px-8 py-3.5 rounded-md font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-xl shadow-white/5"
            >
              Select Paid API Key
            </button>
          </div>
        </div>
      )}

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onAuth={handleAuth} initialView={loginModalView} showToast={showToast} />
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgrade={handleUpgrade} currentTier={userProfile?.tier || SubscriptionTier.Free} />
      <LibraryDrawer isOpen={showLibrary} onClose={() => setShowLibrary(false)} activeProjectId={activeProjectId} />

      <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-b border-zinc-800/50 h-14">
          <div className="max-w-[1920px] mx-auto h-full flex justify-between items-center px-4 md:px-6">
              <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-white text-black rounded-sm flex items-center justify-center shadow-lg shadow-white/10">
                     <Hexagon size={14} fill="currentColor" strokeWidth={0} />
                  </div>
                  <h1 className="text-sm font-bold tracking-tight text-white font-mono">FashionStudio<span className="text-zinc-500">.ai</span></h1>
              </div>

              <div className="flex items-center gap-4">
                 {session && (
                    <button onClick={() => setShowLibrary(true)} className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                        <Library size={14} /> Library
                    </button>
                 )}
                 {session ? (
                     <>
                        <button onClick={() => setShowUpgradeModal(true)} className="hidden sm:flex text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors items-center gap-1.5 border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-md">
                           <Crown size={12} className="text-amber-500" /> 
                           <span>{userProfile?.tier === SubscriptionTier.Free ? 'Guest' : userProfile?.tier}</span>
                        </button>
                        <div onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-3 cursor-pointer group px-2 py-1 rounded-md hover:bg-zinc-900 transition-colors relative">
                            <div className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700 text-xs font-bold text-white">
                                {session.user.email?.[0].toUpperCase()}
                            </div>
                        </div>
                        {showProfileMenu && (
                            <div className="absolute top-12 right-4 w-48 bg-black border border-zinc-800 rounded-md shadow-2xl z-50 animate-fade-in overflow-hidden">
                                <div className="p-3 border-b border-zinc-800 text-[10px] text-zinc-500 truncate">{session.user.email}</div>
                                <div className="p-1">
                                    <button onClick={() => handleUpgrade()} className="w-full text-left px-3 py-2 text-xs text-white hover:bg-zinc-900 rounded-sm flex items-center gap-2"><CreditCard size={12} /> Billing</button>
                                    <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-zinc-900 rounded-sm flex items-center gap-2"><LogOut size={12} /> Sign Out</button>
                                </div>
                            </div>
                        )}
                     </>
                 ) : (
                    <div className="flex items-center gap-3">
                        <button onClick={handleLogin} className="text-xs font-medium text-white">Log in</button>
                        <button onClick={handleSignup} className="bg-white text-black px-3 py-1.5 rounded-md text-xs font-bold transition-colors">Sign up</button>
                    </div>
                 )}
              </div>
          </div>
      </header>

      <main className="pt-20 px-4 md:px-6 max-w-[1920px] mx-auto min-h-screen pb-12 relative z-10">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 relative">
          <div className="order-2 lg:order-1 lg:col-span-4 flex flex-col gap-4 relative z-20 pb-32 lg:pb-0">
            
            {session && (
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                        <Folder size={14} className="text-zinc-500" />
                        <select 
                            value={activeProjectId || ''} 
                            onChange={(e) => setActiveProjectId(e.target.value || null)}
                            className="bg-transparent border-none text-xs font-bold text-white p-0 focus:ring-0 cursor-pointer flex-1"
                        >
                            <option value="">All Generations</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <button onClick={createProject} className="p-1 text-zinc-500 hover:text-white"><Plus size={16}/></button>
                </div>
            )}

            <div className="bg-black/80 backdrop-blur-sm border border-zinc-800 rounded-lg overflow-hidden shadow-lg">
                <ConfigSection title="Wardrobe" icon={Shirt} defaultOpen={true}>
                    <OutfitControl outfit={options.outfit} onChange={(newOutfit) => setOptions({ ...options, outfit: newOutfit })} />
                </ConfigSection>
                <ConfigSection title="Model & Set" icon={UserCircle} defaultOpen={true}>
                    <div className="mb-4 flex items-center justify-between bg-zinc-900/40 p-2 rounded-md border border-zinc-800">
                        <div className="flex items-center gap-2">
                            <Star size={12} className={options.isModelLocked ? "text-amber-500" : "text-zinc-600"} />
                            <span className="text-[10px] font-bold text-white uppercase tracking-wide">Lock Character</span>
                        </div>
                        <button 
                            onClick={() => setOptions({...options, isModelLocked: !options.isModelLocked})}
                            className={`w-8 h-4 rounded-full relative transition-colors ${options.isModelLocked ? 'bg-amber-500' : 'bg-zinc-700'}`}
                        >
                            <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${options.isModelLocked ? 'translate-x-4' : 'translate-x-0'}`}></div>
                        </button>
                    </div>

                    <div className="mb-6 space-y-3">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Engine</label>
                        <div className="grid grid-cols-2 gap-3 mb-2">
                            <button onClick={() => setOptions({...options, modelVersion: ModelVersion.Flash})} className={`flex flex-col items-center justify-center py-3 px-2 rounded-md border transition-all ${options.modelVersion === ModelVersion.Flash ? 'bg-white border-white' : 'bg-black border-zinc-800 hover:border-zinc-600'}`}>
                                <span className={`text-[10px] font-bold uppercase ${options.modelVersion === ModelVersion.Flash ? 'text-black' : 'text-white'}`}>Flash 2.5</span>
                            </button>
                            <button onClick={() => handleProFeatureClick(() => setOptions({...options, modelVersion: ModelVersion.Pro}))} className={`flex flex-col items-center justify-center py-3 px-2 rounded-md border transition-all relative ${options.modelVersion === ModelVersion.Pro ? 'bg-white border-white' : 'bg-black border-zinc-800 hover:border-zinc-600'}`}>
                                {!hasProAccess && <Lock size={10} className="absolute top-2 right-2 text-zinc-500" />}
                                <span className={`text-[10px] font-bold uppercase ${options.modelVersion === ModelVersion.Pro ? 'text-black' : 'text-white'}`}>Pro 3</span>
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
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Style</label>
                      <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                         {STANDARD_STYLES.map(style => (<StyleButton key={style} label={style} isSelected={options.style === style} onClick={() => setOptions({...options, style: style as PhotoStyle})} />))}
                         <div className="col-span-2 text-[9px] font-bold text-zinc-500 uppercase tracking-wider mt-2 mb-1 pl-1">Pro Styles</div>
                         {PRO_STYLES.map(style => (<StyleButton key={style} label={style} isSelected={options.style === style} isLocked={!hasProAccess} onClick={() => handleProFeatureClick(() => setOptions({...options, style: style as PhotoStyle}))} />))}
                      </div>
                    </div>
                </ConfigSection>
                <ConfigSection title="Pose" icon={Move}>
                    <PoseControl selectedPose={options.pose} onPoseChange={(p) => setOptions({ ...options, pose: p })} isAutoMode={autoPose} onToggleAutoMode={setAutoPose} isPremium={isPremium} onUpgrade={() => handleProFeatureClick(() => {})} />
                </ConfigSection>
                <ConfigSection title="Size" icon={Ruler}>
                    <SizeControl options={options} onChange={setOptions} isPremium={isStudio} onUpgradeRequest={() => handleProFeatureClick(() => {})} />
                </ConfigSection>
            </div>
            
            <div className="sticky bottom-4 z-30 lg:bottom-0">
                <button onClick={handleGenerate} disabled={!isFormValid || isLoading} className={`w-full py-3.5 px-4 rounded-md text-sm font-bold tracking-wide transition-all shadow-xl flex items-center justify-center gap-2 group transform active:scale-[0.99] ${!isFormValid || isLoading ? 'bg-zinc-900 text-zinc-500 cursor-not-allowed border border-zinc-800' : 'bg-white text-black hover:bg-zinc-100 border border-white'}`}>
                    {isLoading ? (<Loader2 size={16} className="animate-spin" />) : (<><Sparkles size={16} fill="black" /> Generate Shoot</>)}
                </button>
                <div className="flex justify-between items-center mt-3 px-1 text-[10px] text-zinc-500 font-mono">
                    <span>{APP_VERSION}</span>
                    <span>Cost: {getGenerationCost(options)} Credits</span>
                </div>
            </div>
          </div>
          <div className="order-1 lg:order-2 lg:col-span-8 h-[60vh] lg:h-[calc(100vh-8rem)] sticky top-20 bg-black/50 backdrop-blur-sm border border-zinc-800 rounded-lg overflow-hidden shadow-2xl">
             <ResultDisplay isLoading={isLoading} image={generatedImage} onDownload={handleDownload} onRegenerate={handleRegenerate} isPremium={isPremium} error={error} />
             {generatedImage && session && (
                <button 
                  onClick={() => saveToLibrary(generatedImage)}
                  disabled={isSaving}
                  className="absolute top-6 right-6 bg-black/80 backdrop-blur border border-zinc-800 p-2 rounded-md text-white hover:text-white hover:border-zinc-600 transition-all flex items-center gap-2 text-xs font-bold"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save to Archive
                </button>
             )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
