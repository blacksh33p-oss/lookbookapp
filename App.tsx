import React, { useState, useEffect } from 'react';
import { UserCircle, ChevronDown, Shirt, Ruler, Zap, LayoutGrid, LayoutList, Hexagon, Sparkles, Move, LogOut, CreditCard, Star } from 'lucide-react';
import { Dropdown } from './components/Dropdown';
import { ResultDisplay } from './components/ResultDisplay';
import { SizeControl } from './components/SizeControl';
import { OutfitControl } from './components/OutfitControl';
import { PoseControl } from './components/PoseControl';
import { LoginModal } from './components/LoginModal';
import { UpgradeModal } from './components/UpgradeModal';
import { BatchMode } from './components/BatchMode';
import { generatePhotoshootImage } from './services/gemini';
import { supabase, isConfigured } from './lib/supabase';
import { ModelSex, ModelEthnicity, ModelAge, FacialExpression, PhotoStyle, PhotoshootOptions, ModelVersion, MeasurementUnit, AspectRatio, GeneratedImage, BodyType, OutfitItem, SubscriptionTier } from './types';

// Constants for Random Generation
const POSES = [
    "Standing naturally, arms relaxed",
    "Walking towards camera, confident stride",
    "Leaning slightly against a wall, casual look",
    "Side profile, looking over shoulder",
    "Hands in pockets, relaxed stance",
    "Sitting on a stool, elegant pose",
    "Dynamic motion, fabric flowing",
    "Three-quarter view, hand on hip",
    "Arms crossed, powerful stance",
    "Walking away, turning head back",
    "Seated on floor, legs crossed, casual",
    "Leaning forward, engaging with camera",
    "Back to camera, head turned profile"
];
const EYE_COLORS = ["Amber", "Deep Brown", "Steel Blue", "Emerald Green", "Hazel", "Dark Grey"];
const FACE_SHAPES = ["Oval face", "Square jawline", "Heart-shaped face", "High cheekbones", "Soft features", "Defined jawline"];
const SKIN_DETAILS = ["Freckles", "Clear complexion", "Sun-kissed skin", "Dewy skin", "Mole on cheek"];
const STANDARD_STYLES = [ PhotoStyle.Studio, PhotoStyle.Street, PhotoStyle.Nature, PhotoStyle.Beach ];
const PRO_STYLES = [ PhotoStyle.Luxury, PhotoStyle.Cyberpunk, PhotoStyle.Minimalist, PhotoStyle.Newton, PhotoStyle.Lindbergh, PhotoStyle.Leibovitz, PhotoStyle.Avedon, PhotoStyle.LaChapelle, PhotoStyle.Testino ];

const getRandomPose = () => POSES[Math.floor(Math.random() * POSES.length)];
const getRandomSeed = () => Math.floor(Math.random() * 1000000000);
const getRandomFeatures = (): string => {
    const eyeColor = EYE_COLORS[Math.floor(Math.random() * EYE_COLORS.length)];
    const faceShape = FACE_SHAPES[Math.floor(Math.random() * FACE_SHAPES.length)];
    const skinDetail = SKIN_DETAILS[Math.floor(Math.random() * SKIN_DETAILS.length)];
    return `${eyeColor} eyes, ${faceShape}, ${skinDetail}`;
}

// Reusable Section Component
interface ConfigSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const ConfigSection: React.FC<ConfigSectionProps> = ({ title, icon: Icon, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className={`glass-panel rounded-none border-x-0 border-t border-b-0 first:border-t-0 border-white/10 overflow-hidden transition-all duration-300`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left focus:outline-none group hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <Icon size={16} className={`text-zinc-500 group-hover:text-brand-400 transition-colors ${isOpen ? 'text-brand-400' : ''}`} />
          <span className="font-mono text-sm tracking-widest uppercase text-zinc-300 group-hover:text-white transition-colors">{title}</span>
        </div>
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
           <ChevronDown size={14} className="text-zinc-600 group-hover:text-white" />
        </div>
      </button>
      {isOpen && (
        <div className="p-5 pt-0 animate-slide-up">
            <div className="mt-2 space-y-6">
                {children}
            </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  
  // User State
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<{tier: SubscriptionTier, credits: number, username?: string} | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false); // New state for payment redirect UI

  // Guest State (LocalStorage)
  const [guestCredits, setGuestCredits] = useState<number>(() => {
    const saved = localStorage.getItem('fashion_guest_credits');
    return saved !== null ? parseInt(saved, 10) : 5;
  });

  // UI State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [appMode, setAppMode] = useState<'single' | 'batch'>('single');
  const [autoPose, setAutoPose] = useState(true);

  // Input State
  const [options, setOptions] = useState<PhotoshootOptions>({
    sex: ModelSex.Female,
    ethnicity: ModelEthnicity.Mixed,
    age: ModelAge.YoungAdult,
    facialExpression: FacialExpression.Neutral,
    hairColor: "Dark Brown",
    hairStyle: "Straight & Loose",
    style: PhotoStyle.Studio,
    sceneDetails: '',
    modelVersion: ModelVersion.Flash,
    aspectRatio: AspectRatio.Portrait,
    enable4K: false, 
    height: '',
    measurementUnit: MeasurementUnit.CM,
    bodyType: BodyType.Standard,
    measurements: { bust: '', waist: '', hips: '' },
    outfit: { 
        top: { garmentType: '', description: '', fitNotes: '', images: [], sizeChart: null, sizeChartDetails: '' },
        bottom: { garmentType: '', description: '', fitNotes: '', images: [], sizeChart: null, sizeChartDetails: '' },
        shoes: { garmentType: '', description: '', fitNotes: '', images: [], sizeChart: null, sizeChartDetails: '' },
        accessories: { garmentType: '', description: '', fitNotes: '', images: [], sizeChart: null, sizeChartDetails: '' }
    },
    seed: undefined,
    pose: undefined,
    modelFeatures: undefined,
    referenceModelImage: undefined
  });

  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- HELPER: Handle Payment Redirect Logic ---
  const checkPendingPlan = async (userSession: any) => {
    if (!userSession) return;
    
    const pendingPlan = localStorage.getItem('pending_plan');
    if (pendingPlan && pendingPlan !== SubscriptionTier.Free) {
        console.log("Found pending plan, initiating checkout...", pendingPlan);
        setIsRedirecting(true);
        // Small delay to ensure UI updates before redirect
        setTimeout(async () => {
             await handleUpgrade(pendingPlan as SubscriptionTier, userSession);
             localStorage.removeItem('pending_plan');
             setIsRedirecting(false);
        }, 1000);
    }
  };

  // --- SUPABASE INITIALIZATION & AUTH ---
  useEffect(() => {
    // 1. Check active session on load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
          fetchProfile(session.user.id);
          checkPendingPlan(session);
      } else {
          setIsAuthLoading(false);
      }
    });

    // 2. Listen for auth changes (Magic Link login, Sign out, etc)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event);
      setSession(session);
      
      if (event === 'SIGNED_IN' && session) {
         await fetchProfile(session.user.id);
         await checkPendingPlan(session);
         setShowLoginModal(false); // Close modal on success
      } else if (event === 'SIGNED_OUT') {
         setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('tier, credits, username')
            .eq('id', userId)
            .single();
        
        if (data) {
            setUserProfile({
                tier: data.tier as SubscriptionTier || SubscriptionTier.Free,
                credits: data.credits || 0,
                username: data.username
            });
        }
    } catch (e) {
        console.error("Profile fetch error", e);
    } finally {
        setIsAuthLoading(false);
    }
  };

  // --- Handlers ---
  const handleAuth = async (email: string, password?: string, isSignUp?: boolean, username?: string) => {
      if (!isConfigured) {
          alert("Database not connected.\n\nPlease go to Vercel > Settings > Environment Variables and add:\n- VITE_SUPABASE_URL\n- VITE_SUPABASE_ANON_KEY");
          return;
      }
      
      if (!password) throw new Error("Password is required.");

      if (isSignUp) {
          // Sign Up with Meta Data
          const { data, error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                    username: username, // Pass username to metadata
                    full_name: username
                }
              }
          });
          if (error) throw error;
          
          // Check for existing user identity if Supabase didn't throw error but returned empty user
          if (data.user && data.user.identities && data.user.identities.length === 0) {
              throw new Error("User already exists. Please sign in.");
          }

          // Note: The UI for success is handled in LoginModal
      } else {
          // Sign In
          const { error } = await supabase.auth.signInWithPassword({
              email,
              password,
          });
          if (error) throw error;
      }
  };

  const handleLogout = async (e?: React.MouseEvent) => {
      if (e) e.preventDefault();
      try {
          await supabase.auth.signOut();
      } catch (err) {
          console.error("Supabase signout error:", err);
      } finally {
          // Force state clear regardless of network result
          setUserProfile(null);
          setSession(null);
          localStorage.removeItem('pending_plan');
      }
  };

  const createCheckoutSession = async (priceId: string, currentSession: any) => {
      try {
        const response = await fetch('/api/create-checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                priceId,
                userId: currentSession?.user?.id,
                email: currentSession?.user?.email,
            }),
        });

        if (!response.ok) throw new Error('Network response was not ok');

        const { url } = await response.json();
        
        if (url) {
            window.location.href = url;
        } else {
            throw new Error("Unable to initiate checkout.");
        }

      } catch (err: any) {
        console.error("Checkout Error:", err);
        alert(err.message || "Payment System Unavailable");
      }
  };

  const handleUpgrade = async (tier: SubscriptionTier, explicitSession?: any) => {
     // Use passed session or state session
     const activeSession = explicitSession || session;

     if (!activeSession) {
         // Store intent and show login
         localStorage.setItem('pending_plan', tier);
         setShowLoginModal(true);
         return;
     }

     // Mapping Tiers to Stripe Price IDs (Replace with your real Price IDs from Stripe Dashboard)
     const PRICE_IDS = {
         [SubscriptionTier.Creator]: 'price_1234_creator', 
         [SubscriptionTier.Studio]: 'price_5678_studio'
     };

     if (tier === SubscriptionTier.Free) return;

     await createCheckoutSession(PRICE_IDS[tier], activeSession);
     setShowUpgradeModal(false);
  };

  const executeGeneration = async (currentOptions: PhotoshootOptions) => {
      // 1. Determine Usage Mode (Guest vs User)
      const isGuest = !session;

      if (isGuest) {
          if (guestCredits < 1) {
              setShowLoginModal(true);
              return;
          }
      } else {
          // Logged in user checks - recheck latest state
          if (!userProfile) return;
          if (userProfile.credits < 1) {
              setShowUpgradeModal(true);
              return;
          }
      }

      setIsLoading(true);
      setError(null);
      setGeneratedImage(null);

      try {
        // Call Gemini API
        console.log("Generating with model:", currentOptions.modelVersion);
        const result = await generatePhotoshootImage(currentOptions);
        setGeneratedImage(result);

        // Deduct Credits
        if (isGuest) {
            const newGuestCredits = guestCredits - 1;
            setGuestCredits(newGuestCredits);
            localStorage.setItem('fashion_guest_credits', newGuestCredits.toString());
        } else {
            // Fetch fresh credits first to ensure atomic-like decrement
            const { data: freshProfile } = await supabase
                .from('profiles')
                .select('credits')
                .eq('id', session.user.id)
                .single();
            
            const currentDbCredits = freshProfile?.credits || 0;
            
            if (currentDbCredits > 0) {
                 const { error } = await supabase
                    .from('profiles')
                    .update({ credits: currentDbCredits - 1 })
                    .eq('id', session.user.id);
                
                if (!error) {
                     setUserProfile(prev => prev ? ({ ...prev, credits: currentDbCredits - 1 }) : null);
                } else {
                    console.error("Failed to update credits in DB", error);
                }
            }
        }

      } catch (err: any) {
        setError(err.message || 'Something went wrong during generation.');
      } finally {
        setIsLoading(false);
      }
  }

  const handleGenerate = () => {
      const newSeed = getRandomSeed();
      const newPose = autoPose ? getRandomPose() : (options.pose || getRandomPose());
      const newFeatures = getRandomFeatures(); 
      const newOptions = { ...options, seed: newSeed, pose: newPose, modelFeatures: newFeatures, referenceModelImage: undefined };
      setOptions(newOptions);
      executeGeneration(newOptions);
  };
  
  const handleRegenerate = (keepModel: boolean) => {
       const newPose = autoPose ? getRandomPose() : (options.pose || getRandomPose());
       const newOptions = { ...options, seed: keepModel ? options.seed : getRandomSeed(), pose: newPose };
       setOptions(newOptions);
       executeGeneration(newOptions);
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `fashion-shoot-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const isFormValid = Object.values(options.outfit).some((item: OutfitItem) => 
    item.images.length > 0 || (item.description && item.description.trim().length > 0) || (item.garmentType && item.garmentType.trim().length > 0)
  );

  // Allow premium features if session exists AND not free tier, OR just visually lock them
  const isPremium = session ? userProfile?.tier !== SubscriptionTier.Free : false;
  const isStudio = session ? userProfile?.tier === SubscriptionTier.Studio : false;

  // --- Redirect Overlay ---
  if (isRedirecting) {
      return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
            <div className="flex flex-col items-center gap-6 animate-fade-in">
                <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                <h2 className="text-xl font-bold text-white tracking-widest uppercase">Redirecting to Secure Checkout</h2>
                <p className="text-zinc-500 font-mono text-xs">Please wait while we transfer you to our payment provider...</p>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen text-zinc-200 font-sans selection:bg-brand-500/99 selection:text-white">
      
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onAuth={handleAuth} />
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgrade={(tier) => handleUpgrade(tier)} />

      <header className="fixed top-0 left-0 right-0 z-40 px-6 py-4 pointer-events-none">
          <div className="max-w-[1920px] mx-auto flex justify-between items-start pointer-events-auto">
              <div className="flex items-center gap-4 glass-panel px-4 py-2.5 rounded-full">
                  <div className="bg-brand-600 text-white p-1.5 rounded-full shadow-[0_0_15px_rgba(124,58,237,0.5)]">
                     <Hexagon size={18} fill="currentColor" className="animate-pulse-slow" />
                  </div>
                  <div>
                    <h1 className="text-sm font-bold tracking-widest uppercase leading-none">Fashion<span className="text-zinc-500 font-light">Studio</span></h1>
                  </div>
              </div>

              <div className="hidden md:flex glass-panel rounded-full p-1 gap-1">
                  <button 
                      onClick={() => setAppMode('single')}
                      className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${appMode === 'single' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                  >
                      <LayoutGrid size={14} /> Runway
                  </button>
                  <button 
                      onClick={() => setAppMode('batch')}
                      className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${appMode === 'batch' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                  >
                      <LayoutList size={14} /> Batch
                  </button>
              </div>

              <div className="glass-panel rounded-full px-2 py-2 flex items-center gap-3">
                 {session ? (
                     <>
                        <div className="hidden sm:flex flex-col items-end px-2 border-r border-white/10">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase">
                                {userProfile?.username || 'Studio User'}
                            </span>
                            <div className="text-xs font-mono font-bold text-white tabular-nums flex items-center gap-1">
                                {userProfile?.credits || 0} <Zap size={10} className="text-brand-400 fill-brand-400" />
                            </div>
                        </div>
                        <div className="h-8 w-8 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer z-50 pointer-events-auto" onClick={(e) => handleLogout(e)} title="Logout">
                             <LogOut size={12} />
                        </div>
                     </>
                 ) : (
                    <div className="flex items-center gap-2 px-2">
                        <div className="hidden sm:flex flex-col items-end mr-2">
                            <span className="text-[10px] text-zinc-500 font-mono">GUEST MODE</span>
                            <div className="text-xs font-mono font-bold text-white tabular-nums flex items-center gap-1">
                                {guestCredits} <Zap size={10} className={guestCredits > 0 ? "text-brand-400 fill-brand-400" : "text-zinc-600"} />
                            </div>
                        </div>
                        <button onClick={() => setShowLoginModal(true)} className="bg-white text-black hover:bg-zinc-200 px-3 py-1.5 rounded-full text-xs font-bold transition-colors">LOGIN</button>
                    </div>
                 )}
              </div>
          </div>
      </header>

      <main className="pt-24 px-4 sm:px-6 lg:px-8 max-w-[1920px] mx-auto min-h-screen pb-12">
        {appMode === 'batch' ? ( <BatchMode /> ) : (
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 relative">
          <div className="order-2 lg:order-1 lg:col-span-4 flex flex-col gap-0 relative z-20">
            
            <div className="mb-6 px-1"><h2 className="text-3xl font-bold tracking-tighter text-white uppercase">Configuration</h2><div className="h-1 w-12 bg-brand-500 mt-2"></div></div>
            
            <div className="flex flex-col gap-px bg-zinc-800/50 border border-white/5 rounded-xl overflow-hidden shadow-2xl">
                <ConfigSection title="01 // Wardrobe" icon={Shirt} defaultOpen={true}>
                    <OutfitControl outfit={options.outfit} onChange={(newOutfit) => setOptions({ ...options, outfit: newOutfit })} />
                </ConfigSection>
                
                <ConfigSection title="02 // Model & Set" icon={UserCircle} defaultOpen={true}>
                    {/* Model Version Selector */}
                    <div className="mb-6 space-y-2">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                            Model Engine
                        </label>
                        <div className="grid grid-cols-2 gap-2 bg-black p-1 rounded-lg border border-zinc-800">
                            <button
                                onClick={() => setOptions({ ...options, modelVersion: ModelVersion.Flash })}
                                className={`flex flex-col items-center justify-center py-3 px-2 rounded-md transition-all ${options.modelVersion === ModelVersion.Flash ? 'bg-zinc-800 border border-zinc-600 shadow-md ring-1 ring-white/10' : 'hover:bg-zinc-900 border border-transparent opacity-60 hover:opacity-100'}`}
                            >
                                <span className={`text-[10px] font-bold uppercase ${options.modelVersion === ModelVersion.Flash ? 'text-white' : 'text-zinc-500'}`}>Flash</span>
                                <span className="text-[8px] text-zinc-400 font-mono">Fast / Std</span>
                            </button>
                            <button
                                onClick={() => setOptions({ ...options, modelVersion: ModelVersion.Pro })}
                                className={`flex flex-col items-center justify-center py-3 px-2 rounded-md transition-all relative overflow-hidden ${options.modelVersion === ModelVersion.Pro ? 'bg-brand-900/40 border border-brand-500 shadow-md ring-1 ring-brand-400/50' : 'hover:bg-zinc-900 border border-transparent opacity-60 hover:opacity-100'}`}
                            >
                                <div className="absolute top-0 right-0 p-1">
                                    <Star size={6} className="text-brand-400 fill-brand-400" />
                                </div>
                                <span className={`text-[10px] font-bold uppercase ${options.modelVersion === ModelVersion.Pro ? 'text-brand-200' : 'text-zinc-500'}`}>Pro</span>
                                <span className="text-[8px] text-zinc-500 font-mono">High Quality</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Dropdown label="Sex" value={options.sex} options={Object.values(ModelSex)} onChange={(val) => setOptions({ ...options, sex: val })} />
                        <Dropdown label="Age" value={options.age} options={Object.values(ModelAge)} onChange={(val) => setOptions({ ...options, age: val })} />
                        <Dropdown label="Ethnicity" value={options.ethnicity} options={Object.values(ModelEthnicity)} onChange={(val) => setOptions({ ...options, ethnicity: val })} />
                        <Dropdown label="Mood" value={options.facialExpression} options={Object.values(FacialExpression)} onChange={(val) => setOptions({ ...options, facialExpression: val })} />
                    </div>
                    <div className="border-t border-dashed border-zinc-800 my-4"></div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Art Direction</label>
                      <div className="relative group">
                        <select
                          value={options.style}
                          onChange={(e) => setOptions({ ...options, style: e.target.value as PhotoStyle })}
                          className="w-full appearance-none bg-black border border-zinc-800 text-white text-xs font-mono uppercase rounded-none px-4 py-3 focus:border-brand-500 focus:outline-none transition-all cursor-pointer group-hover:border-zinc-700"
                        >
                          <optgroup label="Standard">
                            {STANDARD_STYLES.map(style => (<option key={style} value={style}>{style}</option>))}
                          </optgroup>
                          <optgroup label="Editorial (Pro)">
                            {PRO_STYLES.map(style => (<option key={style} value={style}>{!isStudio ? '🔒 ' : ''} {style}</option>))}
                          </optgroup>
                        </select>
                        <div className="absolute right-0 top-0 bottom-0 w-8 flex items-center justify-center pointer-events-none border-l border-zinc-800 bg-zinc-900/50">
                            <ChevronDown size={14} className="text-zinc-500" />
                        </div>
                      </div>
                    </div>
                </ConfigSection>
                
                <ConfigSection title="03 // Pose & Action" icon={Move}>
                    <PoseControl selectedPose={options.pose} onPoseChange={(p) => setOptions({ ...options, pose: p })} isAutoMode={autoPose} onToggleAutoMode={setAutoPose} isPremium={isPremium} onUpgrade={() => setShowUpgradeModal(true)} />
                </ConfigSection>

                <ConfigSection title="04 // Measurements" icon={Ruler}>
                    <SizeControl options={options} onChange={setOptions} isPremium={isStudio} onUpgradeRequest={() => setShowUpgradeModal(true)} />
                </ConfigSection>
            </div>

            <div className="mt-8 lg:mt-6 sticky bottom-0 z-30">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent -top-12 pointer-events-none"></div>
                <button
                    onClick={handleGenerate}
                    disabled={!isFormValid || isLoading}
                    className={`relative w-full py-4 px-6 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all
                        ${!isFormValid || isLoading 
                        ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800' 
                        : 'bg-white text-black hover:bg-brand-400 hover:text-black border border-white hover:border-brand-400 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(167,139,250,0.4)]'
                        }`}
                >
                    {isLoading ? (
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-black rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-black rounded-full animate-bounce delay-100"></span>
                            <span className="w-2 h-2 bg-black rounded-full animate-bounce delay-200"></span>
                        </div>
                    ) : (
                        <>
                            <Sparkles size={16} />
                            Generate Shoot
                        </>
                    )}
                </button>
                <div className="text-center mt-2">
                    <span className="text-[10px] text-zinc-600 font-mono">Cost: 1 Credit</span>
                </div>
            </div>

          </div>

          <div className="order-1 lg:order-2 lg:col-span-8 h-[60vh] lg:h-[calc(100vh-8rem)] sticky top-24">
             <ResultDisplay 
                isLoading={isLoading}
                image={generatedImage}
                onDownload={handleDownload}
                onRegenerate={handleRegenerate}
                isPremium={isPremium}
                error={error}
             />
          </div>

        </div>
        )}
      </main>
    </div>
  );
};

export default App;