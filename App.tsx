import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, ChevronDown, Shirt, Ruler, Zap, Hexagon, Sparkles, Move, LogOut, CreditCard, CheckCircle, XCircle, Info, Lock, Crown, Plus, Save, Check, Loader2, Folder, Library, AlertCircle } from 'lucide-react';
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
import { ModelSex, ModelEthnicity, ModelAge, FacialExpression, PhotoStyle, PhotoshootOptions, ModelVersion, MeasurementUnit, AspectRatio, BodyType, OutfitItem, SubscriptionTier, Project } from './types';

const POSES = [
    "Standing naturally, arms relaxed", "Walking towards camera, confident stride", "Leaning slightly against a wall", 
    "Side profile, looking over shoulder", "Hands in pockets, relaxed stance", "Sitting on a stool"
];

const getRandomPose = () => POSES[Math.floor(Math.random() * POSES.length)];
const getRandomSeed = () => Math.floor(Math.random() * 1000000000);

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
    </div>
  );
};

const ConfigSection: React.FC<{ title: string; icon: any; children: any; defaultOpen?: boolean }> = ({ title, icon: Icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-zinc-800 bg-black/50 last:border-b-0">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4 text-left focus:outline-none group hover:bg-zinc-900/50 transition-colors">
        <div className="flex items-center gap-3">
          <Icon size={14} className={`text-zinc-500 group-hover:text-white transition-colors ${isOpen ? 'text-white' : ''}`} />
          <span className="font-mono text-xs font-medium tracking-wide text-zinc-300 group-hover:text-white transition-colors">{title}</span>
        </div>
        <ChevronDown size={14} className={`text-zinc-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="p-4 pt-0 animate-fade-in"><div className="mt-2 space-y-5">{children}</div></div>}
    </div>
  );
};

const App: React.FC = () => {
  const [userProfile, setUserProfile] = useState<{tier: SubscriptionTier, credits: number, username?: string} | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalView, setLoginModalView] = useState<'pricing' | 'login' | 'signup'>('signup'); 
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [autoPose, setAutoPose] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

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
    const handleClickOutside = (event: MouseEvent) => {
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session) {
          fetchProfile(session.user.id, session.user.email);
          fetchProjects();
        } else {
          setIsAuthLoading(false);
        }
      });
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        setSession(session);
        if (event === 'SIGNED_IN' && session) {
           setShowLoginModal(false);
           fetchProfile(session.user.id, session.user.email);
           fetchProjects();
        } else if (event === 'SIGNED_OUT') {
           setUserProfile(null); setSession(null); setProjects([]); setActiveProjectId(null);
        }
      });
      return () => subscription.unsubscribe();
    } else {
      setIsAuthLoading(false);
    }
  }, []);

  const fetchProjects = async () => {
    if (!isConfigured) return;
    try {
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        setProjects(data);
        if (data.length > 0 && !activeProjectId) setActiveProjectId(data[0].id);
      }
    } catch (e) {}
  };

  const createProject = async () => {
    if (!isConfigured) return;
    const name = prompt("Project Name?");
    if (!name) return;
    try {
      const { data, error } = await supabase.from('projects').insert([{ name, user_id: session.user.id }]).select().single();
      if (!error && data) {
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
      const { error } = await supabase.from('generations').insert([{
        image_url: imageUrl,
        user_id: session.user.id,
        project_id: activeProjectId || null,
        config: { ...options, referenceModelImage: undefined }
      }]);
      
      if (error) {
        setSaveError(true);
        showToast(`Failed to save: ${error.message}`, "error");
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
          throw new Error("Database not configured. Authentication is currently disabled.");
      }
      
      if (isSignUp) {
          const { error } = await supabase.auth.signUp({ 
            email, 
            password, 
            options: { data: { full_name: username } } 
          });
          if (error) throw error;
      } else {
          const { error } = await supabase.auth.signInWithPassword({ 
            email, 
            password 
          });
          if (error) throw error;
      }
  };

  const handleGenerate = async () => {
      const newSeed = getRandomSeed();
      const newOptions = { ...options, seed: newSeed, pose: autoPose ? getRandomPose() : options.pose };
      setOptions(newOptions);
      setIsLoading(true); setError(null); setGeneratedImage(null);
      try {
        const result = await generatePhotoshootImage(newOptions);
        setGeneratedImage(result);
        if (userProfile) setUserProfile({...userProfile, credits: userProfile.credits - 1});
      } catch (err: any) { setError(err.message || 'Error'); } finally { setIsLoading(false); }
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `shoot-${Date.now()}.png`;
      link.click();
    }
  };

  const activeProjectName = activeProjectId === null ? "Main Archive" : projects.find(p => p.id === activeProjectId)?.name || "Main Archive";

  return (
    <div className="min-h-screen text-zinc-300 font-sans bg-black relative selection:bg-white selection:text-black">
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
                    <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700 text-xs font-bold text-white uppercase">
                        {session.user.email?.[0]}
                    </div>
                 ) : (
                    <div className="flex items-center gap-3 sm:gap-6">
                        <button onClick={() => {setLoginModalView('login'); setShowLoginModal(true);}} className="text-xs font-bold text-zinc-400 hover:text-white transition-colors">Log in</button>
                        <button onClick={() => {setLoginModalView('signup'); setShowLoginModal(true);}} className="bg-white text-black px-4 py-1.5 rounded-md text-xs font-bold hover:bg-zinc-200 transition-colors">Sign up</button>
                    </div>
                 )}
              </div>
          </div>
      </header>

      <main className="pt-20 px-6 max-w-[1920px] mx-auto min-h-screen pb-12 relative z-10">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 flex flex-col gap-4">
            
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
                          {projects.length === 0 && (
                            <div className="px-4 py-3 text-[10px] text-zinc-600 italic">No custom folders yet</div>
                          )}
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
                        ? 'bg-emerald-500 text-white border-emerald-400 scale-105 animate-bounce-in' 
                        : isSaving 
                          ? 'bg-zinc-800 text-zinc-400 border-zinc-700 cursor-not-allowed'
                          : 'bg-black/90 text-white border-zinc-700 hover:border-white hover:bg-black'}`}
                >
                  {isSaving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : justSaved ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    <Save size={14} />
                  )}
                  {isSaving ? "Saving Asset..." : justSaved ? "Saved!" : "Archive Shoot"}
                </button>
             )}
          </div>
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onAuth={handleAuth} initialView={loginModalView} />
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgrade={() => {}} currentTier={SubscriptionTier.Free} />
      <LibraryDrawer isOpen={showLibrary} onClose={() => setShowLibrary(false)} activeProjectId={activeProjectId} />
    </div>
  );
};

export default App;