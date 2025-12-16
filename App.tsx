import React, { useState, useEffect } from 'react';
import { UserCircle, ChevronDown, Shirt, Ruler, Zap, LayoutGrid, LayoutList, Hexagon, Sparkles, Move, LogOut, CreditCard, Star, CheckCircle, XCircle, Info, Lock, Clock, GitCommit, Crown, RotateCw, X } from 'lucide-react';
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
const APP_VERSION = "v1.4.1-Stable"; 
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

// Helper to calculate cost dynamically
const getGenerationCost = (options: PhotoshootOptions): number => {
    let cost = 1; // Base cost for Flash
    
    if (options.modelVersion === ModelVersion.Pro) {
        cost = 10; // Pro is expensive ($0.24/img approx)
    }
    
    if (options.enable4K) {
        cost += 5; // 4K adds overhead
    }
    
    return cost;
};

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

// --- Toast Component ---
interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}
const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColors = {
        success: 'bg-emerald-950/90 border-emerald-900',
        error: 'bg-red-950/90 border-red-900',
        info: 'bg-zinc-900/90 border-zinc-800'
    };
    const iconColors = {
        success: 'text-emerald-400',
        error: 'text-red-400',
        info: 'text-brand-400'
    };
    const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : Info;

    return (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-2xl backdrop-blur-md animate-slide-up ${bgColors[type]}`}>
            <Icon size={18} className={iconColors[type]} />
            <span className="text-sm font-medium text-white">{message}</span>
            <button onClick={onClose} className="ml-2 text-zinc-500 hover:text-white"><XCircle size={14} /></button>
        </div>
    );
};

const App: React.FC = () => {
  
  // User State
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<{tier: SubscriptionTier, credits: number, username?: string} | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);

  // Guest State (LocalStorage)
  const [guestCredits, setGuestCredits] = useState<number>(() => {
    const saved = localStorage.getItem('fashion_guest_credits');
    return saved !== null ? parseInt(saved, 10) : 5;
  });

  // UI State
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalView, setLoginModalView] = useState<'pricing' | 'login'>('pricing'); // Default to pricing
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [appMode, setAppMode] = useState<'single' | 'batch'>('single');
  const [autoPose, setAutoPose] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

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

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
      setToast({ message, type });
  };

  // --- DAILY RESET LOGIC (Client Side) ---
  useEffect(() => {
    // Guest Daily Reset
    const today = new Date().toDateString();
    const lastReset = localStorage.getItem('fashion_guest_date');
    
    // Initialize date if first visit
    if (!lastReset) {
         localStorage.setItem('fashion_guest_date', today);
    } 
    // If it's a new day, refill credits
    else if (lastReset !== today) {
        setGuestCredits(5);
        localStorage.setItem('fashion_guest_credits', '5');
        localStorage.setItem('fashion_guest_date', today);
        showToast("New Day! Guest credits refilled to 5.", "success");
    }
  }, []);

  // --- URL ERROR HANDLING (Fixes "Refusing to login") ---
  useEffect(() => {
      // Supabase returns errors in the hash, e.g., #error=access_denied&error_description=...
      const hash = window.location.hash;
      if (hash && hash.includes('error=')) {
          const params = new URLSearchParams(hash.substring(1));
          const errorDescription = params.get('error_description');
          
          if (errorDescription) {
              console.error("Auth URL Error:", errorDescription);
              // Convert spaces to pluses sometimes happens in decoding
              const cleanMsg = errorDescription.replace(/\+/g, ' ');
              showToast(cleanMsg, 'error');
              
              // Clear the URL so we don't keep hitting the error state
              window.history.replaceState(null, '', window.location.pathname);
          }
      }
  }, []);

  // --- PAYMENT REDIRECT CHECKER ---
  const checkPendingPlan = async (userSession: any) => {
    if (!userSession) return;
    
    // 1. Check for SUCCESSFUL return from FastSpring
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
        showToast('Payment verification in progress...', 'info');
        window.history.replaceState({}, '', window.location.pathname);
        localStorage.removeItem('pending_plan');
        
        // Immediate fetch
        await fetchProfile(userSession.user.id);

        // Polling to catch webhook delay (5 times over 10 seconds)
        let attempts = 0;
        const interval = setInterval(async () => {
            attempts++;
            console.log(`Polling profile attempt ${attempts}...`);
            await fetchProfile(userSession.user.id);
            if (attempts >= 5) {
                clearInterval(interval);
                showToast('Sync complete. If credits are missing, please wait 1 min and refresh.', 'success');
            }
        }, 2000);
        
        return;
    }

    // 2. Check for PENDING PLAN (User signed up intending to buy)
    const pendingPlan = localStorage.getItem('pending_plan');
    if (pendingPlan && pendingPlan !== SubscriptionTier.Free && !isRedirecting) {
        console.log("Found pending plan, initiating checkout sequence...", pendingPlan);
        handleUpgrade(pendingPlan as SubscriptionTier, userSession);
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

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event);
      setSession(session);
      
      if (event === 'SIGNED_IN' && session) {
         setShowLoginModal(false);
         await fetchProfile(session.user.id);
         await checkPendingPlan(session);
         showToast(`Welcome back!`, 'success');
      } else if (event === 'SIGNED_OUT') {
         setUserProfile(null);
         setSession(null);
         localStorage.removeItem('pending_plan');
         showToast('Signed out successfully', 'info');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    setIsRefreshingProfile(true);
    try {
        let { data, error } = await supabase
            .from('profiles')
            .select('tier, credits, username')
            .eq('id', userId)
            .single();
        
        // Handle "Row not found" (PGRST116)
        if (error && error.code === 'PGRST116') {
             console.log("Profile missing for user, creating default profile...");
             const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert([{
                    id: userId,
                    tier: SubscriptionTier.Free,
                    credits: 5,
                    username: 'Studio User'
                }])
                .select()
                .single();

             if (!createError && newProfile) {
                 data = newProfile;
                 error = null;
             }
        }

        if (data) {
            setUserProfile({
                tier: data.tier as SubscriptionTier || SubscriptionTier.Free,
                credits: data.credits !== undefined ? data.credits : 0,
                username: data.username
            });
        }
    } catch (e) {
        console.error("Profile fetch error", e);
    } finally {
        setIsAuthLoading(false);
        setIsRefreshingProfile(false);
    }
  };

  const handleManualRefresh = () => {
    if (session) {
        fetchProfile(session.user.id);
        showToast("Profile synced.", "info");
    }
  };

  // --- Handlers ---
  const handleAuth = async (email: string, password?: string, isSignUp?: boolean, username?: string) => {
      if (!isConfigured) {
          showToast("Database not configured. Check settings.", 'error');
          return;
      }
      
      if (!password) throw new Error("Password is required.");

      if (isSignUp) {
          const { data, error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: window.location.origin, 
                data: {
                    username: username,
                    full_name: username
                }
              }
          });
          if (error) throw error;
          
          if (data.user && data.user.identities && data.user.identities.length === 0) {
              throw new Error("User already exists. Please sign in.");
          }
      } else {
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
          setUserProfile(null);
          setSession(null);
          localStorage.removeItem('pending_plan');
      }
  };

  // FastSpring Payment Integration (ROBUST)
  const handleUpgrade = async (tier: SubscriptionTier, explicitSession?: any) => {
     setIsRedirecting(true);

     try {
         let activeSession = explicitSession || session;
         if (!activeSession) {
             const { data } = await supabase.auth.getSession();
             activeSession = data.session;
         }

         if (!activeSession) {
             localStorage.setItem('pending_plan', tier);
             setIsRedirecting(false);
             setLoginModalView('pricing');
             setShowLoginModal(true);
             setShowUpgradeModal(false);
             return;
         }

         if (tier === SubscriptionTier.Free) {
             localStorage.removeItem('pending_plan');
             setIsRedirecting(false);
             setShowUpgradeModal(false);
             showToast("You are on the Free plan.", "info");
             return;
         }

         const checkoutUrl = tier === SubscriptionTier.Creator 
            ? import.meta.env.VITE_FASTSPRING_CREATOR_URL 
            : import.meta.env.VITE_FASTSPRING_STUDIO_URL;

         if (!checkoutUrl) {
             console.error("Missing FastSpring URL for tier:", tier);
             showToast("Checkout configuration error. Please contact support.", "error");
             setIsRedirecting(false);
             return;
         }

         const tags = `userId:${activeSession.user.id},userEmail:${activeSession.user.email}`;
         const separator = checkoutUrl.includes('?') ? '&' : '?';
         const finalUrl = `${checkoutUrl}${separator}tags=${tags}`;

         window.location.href = finalUrl;
         
     } catch (err) {
         console.error("Upgrade sequence failed:", err);
         setIsRedirecting(false);
         showToast("Failed to initiate checkout.", "error");
     }
  };

  const handleLogin = () => {
      setLoginModalView('login');
      setShowLoginModal(true);
  };

  const handleSignup = () => {
      setLoginModalView('pricing');
      setShowLoginModal(true);
  };

  const executeGeneration = async (currentOptions: PhotoshootOptions) => {
      const cost = getGenerationCost(currentOptions);
      const isGuest = !session;
      const isFreeTier = session && userProfile?.tier === SubscriptionTier.Free;

      if (isGuest || isFreeTier) {
          if (currentOptions.modelVersion === ModelVersion.Pro) {
              showToast("Gemini 3 Pro is available on Creator plans.", "info");
              setShowUpgradeModal(true);
              return;
          }
      }

      if (isGuest) {
          if (guestCredits < cost) {
              showToast(guestCredits < 1 ? "Daily limit reached! Credits refill tomorrow." : "Not enough guest credits for this operation.", "info");
              setLoginModalView('pricing'); 
              setShowLoginModal(true);
              return;
          }
      } else {
          if (!userProfile) return;
          if (userProfile.credits < cost) {
              showToast(`Insufficient credits. This job requires ${cost} credits.`, "info");
              setShowUpgradeModal(true);
              return;
          }
      }

      setIsLoading(true);
      setError(null);
      setGeneratedImage(null);

      try {
        console.log("Generating with model:", currentOptions.modelVersion);
        const result = await generatePhotoshootImage(currentOptions);
        setGeneratedImage(result);

        if (isGuest) {
            const newGuestCredits = guestCredits - cost;
            setGuestCredits(newGuestCredits);
            localStorage.setItem('fashion_guest_credits', newGuestCredits.toString());
        } else {
            const { data: freshProfile } = await supabase
                .from('profiles')
                .select('credits')
                .eq('id', session.user.id)
                .single();
            
            const currentDbCredits = freshProfile?.credits || 0;
            
            if (currentDbCredits >= cost) {
                 const { error } = await supabase
                    .from('profiles')
                    .update({ credits: currentDbCredits - cost })
                    .eq('id', session.user.id);
                
                if (!error) {
                     setUserProfile(prev => prev ? ({ ...prev, credits: currentDbCredits - cost }) : null);
                }
            }
        }

      } catch (err: any) {
        setError(err.message || 'Something went wrong during generation.');
        showToast("Generation failed", 'error');
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
      showToast("Image saved!", 'success');
    }
  };

  const isFormValid = Object.values(options.outfit).some((item: OutfitItem) => 
    item.images.length > 0 || (item.description && item.description.trim().length > 0) || (item.garmentType && item.garmentType.trim().length > 0)
  );

  const isPremium = session ? userProfile?.tier !== SubscriptionTier.Free : false;
  const isStudio = session ? userProfile?.tier === SubscriptionTier.Studio : false;

  const handleModelSelect = (version: ModelVersion) => {
      if (version === ModelVersion.Pro && !isPremium) {
          setShowUpgradeModal(true);
          return;
      }
      setOptions({ ...options, modelVersion: version });
  };

  const handleStyleSelect = (newStyle: string) => {
      const isProStyle = PRO_STYLES.includes(newStyle as PhotoStyle);
      if (isProStyle && !isPremium) {
          setShowUpgradeModal(true);
          return;
      }
      setOptions({ ...options, style: newStyle as PhotoStyle });
  };

  const currentCost = getGenerationCost(options);

  if (isRedirecting) {
      return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-6">
            <div className="flex flex-col items-center gap-6 animate-fade-in text-center max-w-md">
                <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-widest uppercase mb-2">Redirecting to Checkout</h2>
                    <p className="text-zinc-500 font-mono text-xs">Please wait while we transfer you to our secure payment provider...</p>
                </div>
                
                <button 
                    onClick={() => {
                        setIsRedirecting(false);
                        localStorage.removeItem('pending_plan');
                    }}
                    className="mt-4 px-6 py-2 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-full text-xs font-bold hover:bg-zinc-800 transition-all flex items-center gap-2"
                >
                    <X size={14} /> Cancel
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen text-zinc-200 font-sans selection:bg-brand-500/99 selection:text-white">
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        onAuth={handleAuth} 
        initialView={loginModalView}
        showToast={showToast}
      />
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
                        {userProfile?.tier === SubscriptionTier.Free && (
                           <button
                             onClick={() => setShowUpgradeModal(true)}
                             className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] mr-2"
                           >
                              <Crown size={12} fill="currentColor" />
                              Upgrade
                           </button>
                        )}

                        <div 
                           onClick={() => setShowUpgradeModal(true)}
                           className="hidden sm:flex flex-col items-end px-2 border-r border-white/10 cursor-pointer group"
                        >
                            <span className="text-[10px] text-zinc-400 font-bold uppercase group-hover:text-white transition-colors">
                                {userProfile?.username || 'Studio User'}
                            </span>
                            <div className="text-xs font-mono font-bold text-white tabular-nums flex items-center gap-1 group-hover:text-brand-300 transition-colors">
                                {userProfile?.credits || 0} <Zap size={10} className="text-brand-400 fill-brand-400" />
                            </div>
                        </div>
                        
                        <button 
                            onClick={handleManualRefresh}
                            className={`h-8 w-8 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer z-50 pointer-events-auto ${isRefreshingProfile ? 'animate-spin text-brand-400' : 'text-zinc-400 hover:text-white'}`}
                            title="Refresh Credits"
                        >
                            <RotateCw size={12} />
                        </button>

                        <div className="h-8 w-8 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer z-50 pointer-events-auto" onClick={(e) => handleLogout(e)} title="Logout">
                             <LogOut size={12} />
                        </div>
                     </>
                 ) : (
                    <div className="flex items-center gap-2 px-2">
                        <div className="hidden sm:flex flex-col items-end mr-3">
                            <span className="text-[10px] text-zinc-500 font-mono text-right">GUEST MODE</span>
                            <div className="text-xs font-mono font-bold text-white tabular-nums flex items-center justify-end gap-1">
                                {guestCredits} <Zap size={10} className={guestCredits > 0 ? "text-brand-400 fill-brand-400" : "text-zinc-600"} />
                            </div>
                        </div>
                        <button onClick={handleLogin} className="text-zinc-400 hover:text-white px-3 py-1.5 text-xs font-bold transition-colors">
                            Log in
                        </button>
                        <button onClick={handleSignup} className="bg-white text-black hover:bg-zinc-200 px-4 py-1.5 rounded-full text-xs font-bold transition-colors">
                            Start Creating
                        </button>
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
                    <div className="mb-6 space-y-2">
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                            Model Engine
                        </label>
                        <div className="grid grid-cols-2 gap-2 bg-black p-1 rounded-lg border border-zinc-800">
                            <button
                                onClick={() => handleModelSelect(ModelVersion.Flash)}
                                className={`flex flex-col items-center justify-center py-3 px-2 rounded-md transition-all ${options.modelVersion === ModelVersion.Flash ? 'bg-zinc-800 border border-zinc-600 shadow-md ring-1 ring-white/10' : 'hover:bg-zinc-900 border border-transparent opacity-60 hover:opacity-100'}`}
                            >
                                <span className={`text-[10px] font-bold uppercase ${options.modelVersion === ModelVersion.Flash ? 'text-white' : 'text-zinc-500'}`}>Flash</span>
                                <span className="text-[8px] text-zinc-400 font-mono">1 Credit</span>
                            </button>
                            <button
                                onClick={() => handleModelSelect(ModelVersion.Pro)}
                                className={`flex flex-col items-center justify-center py-3 px-2 rounded-md transition-all relative overflow-hidden ${options.modelVersion === ModelVersion.Pro ? 'bg-brand-900/40 border border-brand-500 shadow-md ring-1 ring-brand-400/50' : 'hover:bg-zinc-900 border border-transparent opacity-60 hover:opacity-100'}`}
                            >
                                <div className="absolute top-0 right-0 p-1">
                                    {isPremium ? (
                                        <Star size={6} className="text-brand-400 fill-brand-400" />
                                    ) : (
                                        <Lock size={8} className="text-zinc-500" />
                                    )}
                                </div>
                                <span className={`text-[10px] font-bold uppercase ${options.modelVersion === ModelVersion.Pro ? 'text-brand-200' : 'text-zinc-500'}`}>Pro</span>
                                <span className="text-[8px] text-zinc-500 font-mono">10 Credits</span>
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
                          onChange={(e) => handleStyleSelect(e.target.value)}
                          className="w-full appearance-none bg-black border border-zinc-800 text-white text-xs font-mono uppercase rounded-none px-4 py-3 focus:border-brand-500 focus:outline-none transition-all cursor-pointer group-hover:border-zinc-700"
                        >
                          <optgroup label="Standard">
                            {STANDARD_STYLES.map(style => (<option key={style} value={style}>{style}</option>))}
                          </optgroup>
                          <optgroup label="Editorial (Pro)">
                            {PRO_STYLES.map(style => (<option key={style} value={style}>{!isPremium ? '🔒 ' : ''} {style}</option>))}
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

            <div className="mt-8 lg:mt-6 sticky bottom-0 z-30 space-y-3">
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
                <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1.5">
                        <GitCommit size={10} />
                        {APP_VERSION}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 font-mono flex items-center gap-1">
                        Cost: {currentCost} Credit{currentCost > 1 ? 's' : ''}
                    </span>
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