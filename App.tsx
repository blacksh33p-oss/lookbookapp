import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, ChevronDown, Shirt, Ruler, Zap, LayoutGrid, LayoutList, Hexagon, Sparkles, Move, LogOut, CreditCard, Star, CheckCircle, XCircle, Info, Lock, GitCommit, Crown, RotateCw, X, Loader2, Palette, RefreshCcw, Command, Monitor, Folder, Library, Plus, Save, Check, HelpCircle, AlertCircle } from 'lucide-react';
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

const APP_VERSION = "v1.8.8"; 
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
    const env = (import.meta as any).env || {};
    if (tier === SubscriptionTier.Starter) val = env.VITE_FASTSPRING_STARTER_PATH || '';
    if (tier === SubscriptionTier.Creator) val = env.VITE_FASTSPRING_CREATOR_PATH || '';
    if (tier === SubscriptionTier.Studio) val = env.VITE_FASTSPRING_STUDIO_PATH || '';
    return val || tier.toLowerCase();
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
    <div className={`fixed bottom-10 left-1/2 -translate-x-1/2 z-[150] px-5 py-3.5 rounded-xl border shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-3 animate-slide-up ${bgColor} backdrop-blur-xl`}>
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
  const [guestCredits, setGuestCredits] = useState<number>(() => {
    const saved = localStorage.getItem('fashion_guest_credits');
    return saved !== null ? parseInt(saved, 10) : 5;
  });

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalView, setLoginModalView] = useState<'pricing' | 'login' | 'signup'>('signup'); 
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [autoPose, setAutoPose] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

  const projectMenuRef = useRef<HTMLDivElement>(null);

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
    const handleClickOutside = (event: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const saveToLibrary = async (imageUrl: string) => {
    if (!session || !imageUrl || !isConfigured) return;
    
    setIsSaving(true);
    setJustSaved(false);
    setSaveError(false);

    try {
      const payload = {
        image_url: imageUrl,
        user_id: session.user.id,
        project_id: activeProjectId || null,
        config: { ...options, referenceModelImage: undefined }
      };
      
      const { error } = await supabase.from('generations').insert([payload]);
      
      if (error) {
        setSaveError(true);
        console.error("Save error:", error);
        showToast(`Error: ${error.message}`, "error");
      } else {
        setJustSaved(true);
        showToast("Shoot saved to archive", "success");
        setTimeout(() => setJustSaved(false), 3000);
      }
    } catch (e: any) {
      setSaveError(true);
      showToast("Error saving to archive", "error");
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
      if (!isConfigured) {
          throw new Error("Authentication is currently disabled (missing configuration).");
      }
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
      showToast('Signed out successfully', 'info');
  };

  const handleGenerate = () => {
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
      if (!session) {
          if (guestCredits < cost) { handleSignup(); return; }
          setIsLoading(true); setError(null); setGeneratedImage(null);
          try {
            const result = await generatePhotoshootImage(currentOptions);
            setGeneratedImage(result);
            setGuestCredits(prev => prev - cost);
            localStorage.setItem('fashion_guest_credits', (guestCredits - cost).toString());
          } catch (err: any) { setError(err.message || 'Error'); } finally { setIsLoading(false); }
      } else {
          if (!userProfile || userProfile.credits < cost) { setShowUpgradeModal(true); return; }
          setIsLoading(true); setError(null); setGeneratedImage(null);
          try {
            const result = await generatePhotoshootImage(currentOptions);
            setGeneratedImage(result);
            const newBalance = userProfile.credits - cost;
            setUserProfile(prev => prev ? ({ ...prev, credits: newBalance }) : null);
            if (isConfigured) {
              await supabase.from('profiles').update({ credits: newBalance }).eq('id', session.user.id);
              if (userProfile.tier !== SubscriptionTier.Free) saveToLibrary(result);
            }
          } catch (err: any) { setError(err.message || 'Error'); } finally { setIsLoading(false); }
      }
  }

  const handleUpgrade = (tier?: SubscriptionTier) => {
     if (userProfile?.tier !== SubscriptionTier.Free && !tier) {
         window.open(ACCOUNT_PORTAL_URL, '_blank');
         return;
     }
     const fs = (window as any).fastspring;
     if (fs?.builder && tier) {
         const productPath = getProductPath(tier);
         fs.builder.push({ products: [{ path: productPath, quantity: 1 }], tags: { userId: session.user.id } });
         if (fs.builder.checkout) fs.builder.checkout();
         setShowUpgradeModal(false);
     }
  };

  const handleLogin = () => { setLoginModalView('login'); setShowLoginModal(true); };
  const handleSignup = () => { setLoginModalView('signup'); setShowLoginModal(true); };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `shoot-${Date.now()}.png`;
      link.click();
    }
  };

  const isPremium = session ? userProfile?.tier !== SubscriptionTier.Free : false;
  const isStudio = session ? userProfile?.tier === SubscriptionTier.Studio : false;
  const hasProAccess = session ? (userProfile?.tier === SubscriptionTier.Creator || userProfile?.tier === SubscriptionTier.Studio) : false;

  const activeProjectName = activeProjectId === null ? "Main Archive" : projects.find(p => p.id === activeProjectId)?.name || "Main Archive";

  return (
    <div className="min-h-screen text-zinc-300 font-sans bg-black relative overflow-hidden selection:bg-white selection:text-black">
      <header className="fixed top-0 left-0 right-0 z-[60] bg-black/80 backdrop-blur-xl border-b border-zinc-800/50 h-14">
          <div className="max-w-[1920px] mx-auto h-full flex justify-between items-center px-6">
              <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-white text-black rounded-sm flex items-center justify-center shadow-lg shadow-white/10 shrink-0">
                     <Hexagon size={14} fill="currentColor" />
                  </div>
                  <h1 className="text-sm font-bold tracking-tight text-white font-mono uppercase">FashionStudio<span className="text-zinc-500">.ai</span></h1>
              </div>
              <div className="flex items-center gap-4">
                 {session && (
                    <button onClick={() => setShowLibrary(true)} className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
                        <Library size={14} /> Archive
                    </button>
                 )}
                 {session ? (
                    <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700 text-xs font-bold text-white uppercase cursor-pointer" onClick={() => setShowProfileMenu(!showProfileMenu)}>
                        {session.user.email?.[0]}
                    </div>
                 ) : (
                    <div className="flex items-center gap-3 sm:gap-6">
                        <button onClick={handleLogin} className="text-xs font-bold text-zinc-400 hover:text-white transition-colors">Log in</button>
                        <button onClick={handleSignup} className="bg-white text-black px-4 py-1.5 rounded-md text-xs font-bold hover:bg-zinc-200 transition-colors">Sign up</button>
                    </div>
                 )}
              </div>
          </div>
      </header>

      <main className="pt-20 px-6 max-w-[1920px] mx-auto min-h-screen pb-12 relative z-10">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* TASK 1: UPGRADED FOLDER DROPDOWN UI */}
            {session && isConfigured && (
              <div className="space-y-1.5" ref={projectMenuRef}>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Working Folder</label>
                <div className={`relative transition-all duration-200 bg-zinc-950 border rounded-lg p-1 flex items-center group
                  ${saveError ? 'border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'border-zinc-800 hover:border-zinc-600 focus-within:border-zinc-500'}
                `}>
                    <button 
                        onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                        className="flex-1 flex items-center gap-3 px-3 py-2 text-left hover:bg-zinc-900 rounded-md transition-all group outline-none"
                    >
                        <Folder size={14} className={`transition-colors ${showProjectDropdown ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest truncate">{activeProjectName}</span>
                        <ChevronDown size={14} className={`ml-auto text-zinc-600 transition-transform duration-200 ${showProjectDropdown ? 'rotate-180 text-white' : ''}`} />
                    </button>
                    <div className="w-px h-6 bg-zinc-800 mx-1"></div>
                    <button onClick={createProject} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-md transition-colors" title="New Folder">
                        <Plus size={16}/>
                    </button>

                    {showProjectDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-black border border-zinc-800 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[70] overflow-hidden animate-fade-in py-1 border-t-0">
                          <button 
                              onClick={() => { setActiveProjectId(null); setShowProjectDropdown(false); }}
                              className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 transition-colors ${activeProjectId === null ? 'bg-zinc-900 text-white border-l-2 border-white' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white'}`}
                          >
                              <Library size={12} /> Main Archive
                          </button>
                          {projects.map(p => (
                              <button 
                                  key={p.id}
                                  onClick={() => { setActiveProjectId(p.id); setShowProjectDropdown(false); }}
                                  className={`w-full text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 transition-colors ${activeProjectId === p.id ? 'bg-zinc-900 text-white border-l-2 border-white' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white'}`}
                              >
                                  <Folder size={12} /> {p.name}
                              </button>
                          ))}
                      </div>
                    )}
                </div>
                {saveError && (
                  <p className="text-[9px] text-red-400 flex items-center gap-1 pl-1">
                    <AlertCircle size={10} /> Folder sync failed. Please re-select.
                  </p>
                )}
              </div>
            )}

            <div className="bg-black/80 backdrop-blur-sm border border-zinc-800 rounded-lg overflow-hidden shadow-xl">
                <ConfigSection title="Wardrobe" icon={Shirt} defaultOpen={true}>
                    <OutfitControl outfit={options.outfit} onChange={(newOutfit) => setOptions({ ...options, outfit: newOutfit })} />
                </ConfigSection>
                <ConfigSection title="Model" icon={UserCircle} defaultOpen={true}>
                    <div className="grid grid-cols-2 gap-4">
                        <Dropdown label="Sex" value={options.sex} options={Object.values(ModelSex)} onChange={(val) => setOptions({ ...options, sex: val })} />
                        <Dropdown label="Age" value={options.age} options={Object.values(ModelAge)} onChange={(val) => setOptions({ ...options, age: val })} />
                        <Dropdown label="Ethnicity" value={options.ethnicity} options={Object.values(ModelEthnicity)} onChange={(val) => setOptions({ ...options, ethnicity: val })} />
                        <Dropdown label="Style" value={options.style} options={Object.values(PhotoStyle)} onChange={(val) => setOptions({ ...options, style: val })} />
                    </div>
                </ConfigSection>
            </div>
            
            <button 
                onClick={handleGenerate} 
                disabled={!isFormValid || isLoading} 
                className={`w-full py-4 rounded-md text-[11px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 transform active:scale-[0.98] shadow-lg
                ${!isFormValid || isLoading ? 'bg-zinc-900 text-zinc-600 border border-zinc-800' : 'bg-white text-black hover:bg-zinc-200'}`}
            >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <><Sparkles size={16} /> Generate Shoot</>}
            </button>
          </div>

          {/* TASK 2: ENHANCED SAVE BUTTON FEEDBACK UI */}
          <div className="lg:col-span-8 h-[calc(100vh-8rem)] sticky top-20 bg-black border border-zinc-800 rounded-lg overflow-hidden shadow-2xl relative">
             <ResultDisplay 
                isLoading={isLoading} 
                image={generatedImage} 
                onDownload={handleDownload} 
                onRegenerate={() => handleGenerate()} 
                isPremium={true} 
                error={error} 
             />
             
             {generatedImage && session && (
                <button 
                  onClick={() => saveToLibrary(generatedImage)} 
                  disabled={isSaving || justSaved} 
                  className={`absolute top-6 right-6 px-6 py-3 rounded-md transition-all duration-300 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest shadow-2xl backdrop-blur-md border
                    ${justSaved 
                        ? 'bg-emerald-500 text-white border-emerald-400 scale-105' 
                        : isSaving 
                          ? 'bg-zinc-800 text-zinc-400 border-zinc-700 cursor-not-allowed'
                          : 'bg-black/90 text-white border-zinc-700 hover:border-white hover:bg-black'}`}
                >
                  {isSaving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : justSaved ? (
                    <Check size={14} strokeWidth={3} />
                  ) : saveError ? (
                    <AlertCircle size={14} className="text-red-400" />
                  ) : (
                    <Save size={14} />
                  )}
                  {isSaving ? "Saving Asset..." : justSaved ? "Saved!" : saveError ? "Retry Save" : "Archive Shoot"}
                </button>
             )}
          </div>
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onAuth={handleAuth} initialView={loginModalView} />
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgrade={handleUpgrade} currentTier={userProfile?.tier || SubscriptionTier.Free} />
      <LibraryDrawer isOpen={showLibrary} onClose={() => setShowLibrary(false)} activeProjectId={activeProjectId} />
    </div>
  );
};

export default App;