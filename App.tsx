import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, ChevronDown, Shirt, Ruler, Zap, LayoutGrid, LayoutList, Hexagon, Sparkles, Move, LogOut, CreditCard, Star, CheckCircle, XCircle, Info, Lock, GitCommit, Crown, RotateCw, X, Loader2, Palette, RefreshCcw } from 'lucide-react';
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
import { ModelSex, ModelEthnicity, ModelAge, FacialExpression, PhotoStyle, PhotoshootOptions, ModelVersion, MeasurementUnit, AspectRatio, BodyType, OutfitItem, SubscriptionTier } from './types';

// Constants
const APP_VERSION = "v1.4.27-CacheSync"; 
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

const getGenerationCost = (options: PhotoshootOptions): number => {
    let cost = 1;
    if (options.modelVersion === ModelVersion.Pro) cost = 10;
    if (options.enable4K) cost += 5;
    return cost;
};

// --- Sub-Components ---

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

interface StyleButtonProps {
    label: string;
    isSelected: boolean;
    isLocked?: boolean;
    onClick: () => void;
}
const StyleButton: React.FC<StyleButtonProps> = ({ label, isSelected, isLocked, onClick }) => {
    const simpleName = label.split('(')[0].trim();
    return (
        <button
            onClick={onClick}
            className={`relative p-3 rounded-lg border text-left transition-all group overflow-hidden min-h-[3.5rem] flex flex-col justify-center
            ${isSelected 
                ? 'bg-brand-500/10 border-brand-500 text-white ring-1 ring-brand-500' 
                : 'bg-zinc-900/40 border-zinc-800'
            }
            ${isLocked && !isSelected ? 'opacity-80 hover:opacity-100 hover:border-brand-500/40' : 'hover:border-zinc-600'}
            `}
        >
            <span className={`text-[9px] font-bold uppercase tracking-widest z-10 relative ${isSelected ? 'text-brand-300' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                {simpleName}
            </span>
            {isLocked && !isSelected && (
                <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-sm">
                    <div className="bg-black/90 px-2 py-1 rounded-full border border-brand-500/30 shadow-[0_0_15px_rgba(139,92,246,0.3)] flex items-center gap-1.5 transform scale-90 group-hover:scale-100 transition-transform">
                        <Lock size={10} className="text-brand-400" />
                        <span className="text-[8px] font-bold text-white uppercase tracking-wider">Unlock</span>
                    </div>
                </div>
            )}
            {isLocked && (
                <div className="absolute top-1.5 right-1.5 opacity-40 group-hover:opacity-0 transition-opacity">
                    <Lock size={10} className="text-zinc-500" />
                </div>
            )}
        </button>
    );
};

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
  
  // CACHED INITIAL STATE: Load from localStorage immediately to prevent flicker
  const [userProfile, setUserProfile] = useState<{tier: SubscriptionTier, credits: number, username?: string} | null>(() => {
      try {
          const cached = localStorage.getItem('fashion_user_profile');
          return cached ? JSON.parse(cached) : null;
      } catch (e) {
          return null;
      }
  });

  const [session, setSession] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const [isSyncingPayment, setIsSyncingPayment] = useState(false);
  const [syncAttempts, setSyncAttempts] = useState(0);
  const syncIntervalRef = useRef<any>(null);

  const [guestCredits, setGuestCredits] = useState<number>(() => {
    const saved = localStorage.getItem('fashion_guest_credits');
    return saved !== null ? parseInt(saved, 10) : 5;
  });

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalView, setLoginModalView] = useState<'pricing' | 'login'>('pricing'); 
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [appMode, setAppMode] = useState<'single' | 'batch'>('single');
  const [autoPose, setAutoPose] = useState(true);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null);

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

  // --- PERSIST CACHE ---
  useEffect(() => {
      if (userProfile) {
          localStorage.setItem('fashion_user_profile', JSON.stringify(userProfile));
      }
  }, [userProfile]);

  // --- DAILY RESET LOGIC ---
  useEffect(() => {
    const today = new Date().toDateString();
    const lastReset = localStorage.getItem('fashion_guest_date');
    
    if (!lastReset) {
         localStorage.setItem('fashion_guest_date', today);
    } else if (lastReset !== today) {
        setGuestCredits(5);
        localStorage.setItem('fashion_guest_credits', '5');
        localStorage.setItem('fashion_guest_date', today);
        showToast("New Day! Guest credits refilled to 5.", "success");
    }
  }, []);

  // --- ERROR HANDLING ---
  useEffect(() => {
      const hash = window.location.hash;
      if (hash && hash.includes('error=')) {
          const params = new URLSearchParams(hash.substring(1));
          const errorDescription = params.get('error_description');
          if (errorDescription) {
              showToast(errorDescription.replace(/\+/g, ' '), 'error');
              window.history.replaceState(null, '', window.location.pathname);
          }
      }
  }, []);

  useEffect(() => {
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
    };
  }, []);

  const checkPendingPlan = async (userSession: any) => {
    if (!userSession) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
        setIsSyncingPayment(true);
        setSyncAttempts(0);
        window.history.replaceState({}, '', window.location.pathname);
        pollForCredits(userSession.user.id, userSession.user.email);
    } else {
        const pendingPlan = localStorage.getItem('pending_plan');
        if (pendingPlan && pendingPlan !== SubscriptionTier.Free) {
            const fresh = await fetchProfile(userSession.user.id, userSession.user.email);
            if (fresh && fresh.tier === pendingPlan) {
                localStorage.removeItem('pending_plan');
                showToast(`You are now on the ${pendingPlan} plan.`, 'success');
            }
        }
    }
  };

  const pollForCredits = async (userId: string, emailArg?: string) => {
      let attempts = 0;
      const pendingPlan = localStorage.getItem('pending_plan');
      const { data: initialData } = await supabase.from('profiles').select('credits').eq('id', userId).single();
      const startCredits = initialData?.credits || 0;

      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);

      syncIntervalRef.current = setInterval(async () => {
          attempts++;
          setSyncAttempts(attempts);
          const { data } = await supabase.from('profiles').select('tier, credits').eq('id', userId).single();
          const tierMatch = pendingPlan ? data?.tier === pendingPlan : false;
          const creditBump = data && data.credits > startCredits;
          
          if (data && (tierMatch || creditBump || attempts >= 60)) {
              clearInterval(syncIntervalRef.current);
              if (data) {
                  let bestEmail = emailArg;
                  if (!bestEmail) {
                      const { data: sessionData } = await supabase.auth.getSession();
                      bestEmail = sessionData?.session?.user?.email;
                  }
                  setUserProfile((prev) => ({
                      tier: data.tier as SubscriptionTier,
                      credits: data.credits,
                      username: bestEmail ? bestEmail.split('@')[0] : (prev?.username || 'Studio User')
                  }));
              }
              if (tierMatch || creditBump) {
                   localStorage.removeItem('pending_plan');
                   setTimeout(() => {
                      setIsSyncingPayment(false);
                      showToast('Purchase synced successfully!', 'success');
                  }, 1500);
              } else {
                  setIsSyncingPayment(false);
                  showToast("Sync timed out. Server might be slow. Check back later.", "info");
              }
          }
      }, 2000);
  };

  // --- AUTH INIT ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
          fetchProfile(session.user.id, session.user.email);
          checkPendingPlan(session);
      } else {
          setIsAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' && session) {
         setShowLoginModal(false);
         await fetchProfile(session.user.id, session.user.email);
         await checkPendingPlan(session);
         showToast(`Welcome back!`, 'success');
      } else if (event === 'SIGNED_OUT') {
         setUserProfile(null);
         localStorage.removeItem('fashion_user_profile'); // Clear cache on logout
         setSession(null);
         localStorage.removeItem('pending_plan');
         showToast('Signed out successfully', 'info');
      } else if (event === 'TOKEN_REFRESHED' && session) {
         fetchProfile(session.user.id, session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- DEDICATED REALTIME SUBSCRIPTION ---
  useEffect(() => {
    if (!session?.user?.id) return;

    // Create a dedicated channel for profile updates
    const channel = supabase.channel(`profile_sync:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`
        },
        (payload: any) => {
          if (payload.new && typeof payload.new.credits === 'number') {
            setUserProfile((prev) => {
               // Update local state if DB changes (e.g. background webhook or manual update)
               // This keeps us in sync without refresh
               if (!prev) return {
                   tier: payload.new.tier as SubscriptionTier || SubscriptionTier.Free,
                   credits: payload.new.credits,
                   username: session.user.email?.split('@')[0] || 'Studio User'
               };
               return {
                   ...prev,
                   tier: payload.new.tier as SubscriptionTier || prev.tier,
                   credits: payload.new.credits
               };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]); // Re-subscribe only if user changes

  const fetchProfile = async (userId: string, email?: string) => {
    try {
        let { data, error } = await supabase.from('profiles').select('tier, credits').eq('id', userId).single();
        
        if (error && error.code === 'PGRST116') {
             const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert([{ id: userId, email: email || 'unknown', tier: SubscriptionTier.Free, credits: 5 }])
                .select().single();
             if (!createError && newProfile) { data = newProfile; error = null; }
             else if (createError?.code === '23505') {
                 const { data: retryData } = await supabase.from('profiles').select('tier, credits').eq('id', userId).single();
                 if (retryData) { data = retryData; error = null; }
             }
        }

        if (data && data.tier === SubscriptionTier.Free && (data.credits === 0 || data.credits === null)) {
            await supabase.from('profiles').update({ credits: 5 }).eq('id', userId);
            data.credits = 5;
        }

        if (data) {
            if (data.credits === null || data.credits === undefined) return null;
            setUserProfile({
                tier: data.tier as SubscriptionTier || SubscriptionTier.Free,
                credits: data.credits, 
                username: email ? email.split('@')[0] : 'Studio User'
            });
            return data;
        }
    } catch (e) {
        console.error("Profile fetch error", e);
    } finally {
        setIsAuthLoading(false);
    }
    return null;
  };

  const handleManualRefresh = async () => {
    if (session) {
        setIsRefreshingProfile(true);
        const freshData = await fetchProfile(session.user.id, session.user.email);
        setIsRefreshingProfile(false);
        const pendingPlan = localStorage.getItem('pending_plan');
        if (pendingPlan && freshData && freshData.tier === pendingPlan) {
            localStorage.removeItem('pending_plan');
            showToast(`Purchase verified! You are now on the ${pendingPlan} plan.`, 'success');
        } else {
            showToast("Profile synced.", "info");
        }
    }
  };

  const handleAuth = async (email: string, password?: string, isSignUp?: boolean, username?: string) => {
      if (!isConfigured) { showToast("Database not configured.", 'error'); return; }
      if (!password) throw new Error("Password is required.");

      if (isSignUp) {
          const { data, error } = await supabase.auth.signUp({
              email, password, options: { emailRedirectTo: window.location.origin, data: { full_name: username } }
          });
          if (error) throw error;
          if (data.user?.identities?.length === 0) throw new Error("User already exists. Please sign in.");
      } else {
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) throw error;
      }
  };

  const handleLogout = async (e?: React.MouseEvent) => {
      if (e) e.preventDefault();
      setSession(null);
      setUserProfile(null);
      localStorage.removeItem('fashion_user_profile');
      localStorage.removeItem('pending_plan');
      setShowProfileMenu(false);
      try { await supabase.auth.signOut(); } catch (err) {} 
      window.location.reload();
  };

  const handleUpgrade = async (tier: SubscriptionTier) => {
     setIsRedirecting(true);
     try {
         const { data } = await supabase.auth.getSession();
         const activeSession = data.session;

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
             return;
         }

         const checkoutUrl = tier === SubscriptionTier.Creator ? import.meta.env.VITE_FASTSPRING_CREATOR_URL : import.meta.env.VITE_FASTSPRING_STUDIO_URL;
         const tags = encodeURIComponent(`userId:${activeSession.user.id}`);
         const separator = checkoutUrl.includes('?') ? '&' : '?';
         window.location.href = `${checkoutUrl}${separator}tags=${tags}&email=${encodeURIComponent(activeSession.user.email)}`;
     } catch (err) {
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
              showToast(guestCredits < 1 ? "Daily limit reached!" : "Not enough guest credits.", "info");
              setLoginModalView('pricing'); 
              setShowLoginModal(true);
              return;
          }
          setIsLoading(true);
          setError(null);
          setGeneratedImage(null);
          try {
            const result = await generatePhotoshootImage(currentOptions);
            setGeneratedImage(result);
            const newGuestCredits = guestCredits - cost;
            setGuestCredits(newGuestCredits);
            localStorage.setItem('fashion_guest_credits', newGuestCredits.toString());
          } catch (err: any) {
            setError(err.message || 'Error');
            showToast("Generation failed", 'error');
          } finally { setIsLoading(false); }
      } else {
          if (!userProfile) return;
          // Optimistic check
          if (userProfile.credits < cost) {
              showToast(`Insufficient credits. You have ${userProfile.credits}, need ${cost}.`, "info");
              setShowUpgradeModal(true);
              return;
          }
          
          setIsLoading(true);
          setError(null);
          setGeneratedImage(null);

          try {
            const result = await generatePhotoshootImage(currentOptions);
            setGeneratedImage(result);

            // 1. Optimistic Update (Immediate)
            const newBalance = userProfile.credits - cost;
            setUserProfile(prev => prev ? ({ ...prev, credits: newBalance }) : null);

            // 2. Fire and forget DB update (Realtime subscription will correct if needed)
            supabase.from('profiles').update({ credits: newBalance }).eq('id', session.user.id).then(({ error }) => {
                if (error) {
                    console.error("DB Sync Error:", error);
                    // Revert if critical error (though usually realtime will fix this)
                }
            });

          } catch (err: any) {
            setError(err.message || 'Error');
            showToast("Generation failed", 'error');
          } finally {
            setIsLoading(false);
          }
      }
  }

  const handleGenerate = () => {
      const newSeed = getRandomSeed();
      const newPose = autoPose ? getRandomPose() : (options.pose || getRandomPose());
      const newFeatures = getRandomFeatures(); 
      const newOptions = { ...options, seed: newSeed, pose: newPose, modelFeatures: newFeatures };
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
                <button onClick={() => { setIsRedirecting(false); localStorage.removeItem('pending_plan'); }} className="mt-4 px-6 py-2 bg-zinc-900 border border-zinc-700 text-zinc-300 rounded-full text-xs font-bold hover:bg-zinc-800 transition-all flex items-center gap-2"><X size={14} /> Cancel</button>
            </div>
        </div>
      );
  }

  if (isSyncingPayment) {
    return (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-6">
            <div className="flex flex-col items-center gap-6 animate-fade-in text-center max-w-md border border-brand-500/20 bg-zinc-900/50 p-8 rounded-3xl shadow-2xl shadow-brand-500/10 relative">
                <button onClick={() => setIsSyncingPayment(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white p-2 rounded-full hover:bg-zinc-800 transition-all"><X size={20} /></button>
                <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center border border-brand-500/20 animate-pulse-slow"><Loader2 size={32} className="text-brand-400 animate-spin" /></div>
                <div><h2 className="text-2xl font-black text-white tracking-tight mb-2">Syncing Purchase</h2><p className="text-zinc-400 text-sm">Waiting for payment provider confirmation...</p></div>
                <div className="flex flex-col gap-2 w-full"><div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden"><div className="h-full bg-brand-500 animate-[progress_2s_ease-in-out_infinite]"></div></div><div className="flex justify-between items-center text-[10px] text-zinc-600 font-mono uppercase"><span>Connecting</span><span>{Math.min(syncAttempts * 2, 120)}s elapsed</span></div></div>
                {syncAttempts > 5 && <div className="text-[10px] text-amber-500 font-bold bg-amber-900/20 p-2 rounded mt-2 border border-amber-500/30">Webhook delaying... Please wait.</div>}
                {syncAttempts > 10 && <button onClick={() => pollForCredits(session?.user?.id, session?.user?.email)} className="mt-2 text-xs text-brand-400 hover:text-brand-300 underline">Force Check Again</button>}
            </div>
             <style>{`@keyframes progress { 0% { width: 0%; transform: translateX(-100%); } 50% { width: 50%; } 100% { width: 100%; transform: translateX(100%); } }`}</style>
        </div>
    );
  }

  return (
    <div className="min-h-screen text-zinc-200 font-sans selection:bg-brand-500/99 selection:text-white">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onAuth={handleAuth} initialView={loginModalView} showToast={showToast} />
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgrade={(tier) => handleUpgrade(tier)} />

      <header className="fixed top-0 left-0 right-0 z-40 px-6 py-4 pointer-events-none">
          <div className="max-w-[1920px] mx-auto flex justify-between items-start pointer-events-auto">
              <div className="flex items-center gap-4 glass-panel px-4 py-2.5 rounded-full">
                  <div className="bg-brand-600 text-white p-1.5 rounded-full shadow-[0_0_15px_rgba(124,58,237,0.5)]">
                     <Hexagon size={18} fill="currentColor" className="animate-pulse-slow" />
                  </div>
                  <div><h1 className="text-sm font-bold tracking-widest uppercase leading-none">Fashion<span className="text-zinc-500 font-light">Studio</span></h1></div>
              </div>

              <div className="hidden md:flex glass-panel rounded-full p-1 gap-1">
                  <button onClick={() => setAppMode('single')} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${appMode === 'single' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}><LayoutGrid size={14} /> Runway</button>
                  <button onClick={() => setAppMode('batch')} className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${appMode === 'batch' ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}><LayoutList size={14} /> Batch</button>
              </div>

              <div className="glass-panel rounded-full px-2 py-2 flex items-center gap-3 relative">
                 {session ? (
                     <>
                        {(!userProfile || userProfile.tier !== SubscriptionTier.Studio) && (
                           <button onClick={() => setShowUpgradeModal(true)} className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_20px_rgba(124,58,237,0.5)] mr-2">
                              <Crown size={12} fill="currentColor" /> Upgrade
                           </button>
                        )}
                        <div onClick={() => setShowProfileMenu(!showProfileMenu)} className="hidden sm:flex flex-col items-end px-2 border-r border-white/10 cursor-pointer group select-none">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase group-hover:text-white transition-colors">
                                {userProfile?.username || (session.user.email ? session.user.email.split('@')[0] : 'Studio User')}
                            </span>
                            <div className="text-xs font-mono font-bold text-white tabular-nums flex items-center gap-1 group-hover:text-brand-300 transition-colors">
                                {userProfile?.credits !== undefined ? userProfile.credits : <Loader2 size={10} className="animate-spin text-zinc-500" />} 
                                <Zap size={10} className="text-brand-400 fill-brand-400" />
                            </div>
                        </div>
                        {showProfileMenu && (
                            <div className="absolute top-full right-0 mt-2 w-56 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-2 z-50 animate-slide-up origin-top-right">
                                <div className="p-2 border-b border-zinc-900 mb-1">
                                    <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Account</div>
                                    <div className="text-xs text-white truncate">{session.user.email}</div>
                                </div>
                                <button onClick={() => { setShowUpgradeModal(true); setShowProfileMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-white bg-gradient-to-r from-brand-600/20 to-indigo-600/20 hover:from-brand-600/30 hover:to-indigo-600/30 border border-brand-500/30 rounded-lg transition-all flex items-center gap-2 mb-1"><CreditCard size={14} className="text-brand-400" /> Plans & Billing</button>
                                <button onClick={() => { setIsSyncingPayment(true); pollForCredits(session.user.id, session.user.email); setShowProfileMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors flex items-center gap-2"><RefreshCcw size={14} className="text-zinc-500" /> Restore Purchase</button>
                                <button onClick={handleManualRefresh} className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-900 rounded-lg transition-colors flex items-center gap-2"><RotateCw size={14} className={isRefreshingProfile ? 'animate-spin' : ''} /> Sync Profile</button>
                                <button onClick={(e) => handleLogout(e)} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-colors flex items-center gap-2 mt-1"><LogOut size={14} /> Sign Out</button>
                            </div>
                        )}
                        {(!userProfile || userProfile.tier !== SubscriptionTier.Studio) && (
                             <button onClick={() => setShowUpgradeModal(true)} className="h-8 w-8 bg-brand-900/50 rounded-full flex items-center justify-center border border-brand-500/30 hover:bg-brand-900 transition-colors cursor-pointer z-50 pointer-events-auto sm:hidden"><Crown size={14} className="text-brand-400" fill="currentColor" /></button>
                        )}
                        <button onClick={handleManualRefresh} className={`h-8 w-8 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer z-50 pointer-events-auto sm:hidden ${isRefreshingProfile ? 'animate-spin text-brand-400' : 'text-zinc-400 hover:text-white'}`}><RotateCw size={12} /></button>
                        <div className="h-8 w-8 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700 hover:bg-zinc-700 transition-colors cursor-pointer z-50 pointer-events-auto sm:hidden" onClick={(e) => handleLogout(e)}><LogOut size={12} /></div>
                     </>
                 ) : (
                    <div className="flex items-center gap-2 px-2">
                        <div className="hidden sm:flex flex-col items-end mr-3">
                            <span className="text-[10px] text-zinc-500 font-mono text-right">GUEST MODE</span>
                            <div className="text-xs font-mono font-bold text-white tabular-nums flex items-center justify-end gap-1">{guestCredits} <Zap size={10} className={guestCredits > 0 ? "text-brand-400 fill-brand-400" : "text-zinc-600"} /></div>
                        </div>
                        <button onClick={handleLogin} className="text-zinc-400 hover:text-white px-3 py-1.5 text-xs font-bold transition-colors">Log in</button>
                        <button onClick={handleSignup} className="bg-white text-black hover:bg-zinc-200 px-4 py-1.5 rounded-full text-xs font-bold transition-colors">Start Creating</button>
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
                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">Model Engine</label>
                        <div className="grid grid-cols-2 gap-2 bg-black p-1 rounded-lg border border-zinc-800">
                            <button onClick={() => setOptions({...options, modelVersion: ModelVersion.Flash})} className={`flex flex-col items-center justify-center py-3 px-2 rounded-md transition-all ${options.modelVersion === ModelVersion.Flash ? 'bg-zinc-800 border border-zinc-600 shadow-md ring-1 ring-white/10' : 'hover:bg-zinc-900 border border-transparent opacity-60 hover:opacity-100'}`}><span className={`text-[10px] font-bold uppercase ${options.modelVersion === ModelVersion.Flash ? 'text-white' : 'text-zinc-500'}`}>Flash</span><span className="text-[8px] text-zinc-400 font-mono">1 Credit</span></button>
                            <button onClick={() => { if(isPremium) setOptions({...options, modelVersion: ModelVersion.Pro}); else setShowUpgradeModal(true); }} className={`flex flex-col items-center justify-center py-3 px-2 rounded-md transition-all relative overflow-hidden ${options.modelVersion === ModelVersion.Pro ? 'bg-brand-900/40 border border-brand-500 shadow-md ring-1 ring-brand-400/50' : 'hover:bg-zinc-900 border border-transparent opacity-60 hover:opacity-100'}`}><div className="absolute top-0 right-0 p-1">{isPremium ? <Star size={6} className="text-brand-400 fill-brand-400" /> : <Lock size={8} className="text-zinc-500" />}</div><span className={`text-[10px] font-bold uppercase ${options.modelVersion === ModelVersion.Pro ? 'text-brand-200' : 'text-zinc-500'}`}>Pro</span><span className="text-[8px] text-zinc-500 font-mono">10 Credits</span></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Dropdown label="Sex" value={options.sex} options={Object.values(ModelSex)} onChange={(val) => setOptions({ ...options, sex: val })} />
                        <Dropdown label="Age" value={options.age} options={Object.values(ModelAge)} onChange={(val) => setOptions({ ...options, age: val })} />
                        <Dropdown label="Ethnicity" value={options.ethnicity} options={Object.values(ModelEthnicity)} onChange={(val) => setOptions({ ...options, ethnicity: val })} />
                        <Dropdown label="Mood" value={options.facialExpression} options={Object.values(FacialExpression)} onChange={(val) => setOptions({ ...options, facialExpression: val })} />
                    </div>
                    <div className="border-t border-dashed border-zinc-800 my-4"></div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2"><Palette size={12} /> Art Direction</label>
                      <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                         {STANDARD_STYLES.map(style => (<StyleButton key={style} label={style} isSelected={options.style === style} onClick={() => setOptions({...options, style: style as PhotoStyle})} />))}
                         <div className="col-span-2 text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-2 mb-1 pl-1 flex items-center gap-2">Pro Styles <div className="h-px bg-zinc-800 flex-1"></div></div>
                         {PRO_STYLES.map(style => (<StyleButton key={style} label={style} isSelected={options.style === style} isLocked={!isPremium} onClick={() => { if(isPremium) setOptions({...options, style: style as PhotoStyle}); else setShowUpgradeModal(true); }} />))}
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
                <button onClick={handleGenerate} disabled={!isFormValid || isLoading} className={`relative w-full py-4 px-6 text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${!isFormValid || isLoading ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800' : 'bg-white text-black hover:bg-brand-400 hover:text-black border border-white hover:border-brand-400 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(167,139,250,0.4)]'}`}>
                    {isLoading ? (<div className="flex items-center gap-2"><span className="w-2 h-2 bg-black rounded-full animate-bounce"></span><span className="w-2 h-2 bg-black rounded-full animate-bounce delay-100"></span><span className="w-2 h-2 bg-black rounded-full animate-bounce delay-200"></span></div>) : (<><Sparkles size={16} /> Generate Shoot</>)}
                </button>
                <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1.5"><GitCommit size={10} /> {APP_VERSION}</span>
                    <span className="text-[10px] font-bold text-zinc-400 font-mono flex items-center gap-1">Cost: {currentCost} Credit{currentCost > 1 ? 's' : ''}</span>
                </div>
            </div>
          </div>
          <div className="order-1 lg:order-2 lg:col-span-8 h-[60vh] lg:h-[calc(100vh-8rem)] sticky top-24">
             <ResultDisplay isLoading={isLoading} image={generatedImage} onDownload={handleDownload} onRegenerate={handleRegenerate} isPremium={isPremium} error={error} />
          </div>
        </div>
        )}
      </main>
    </div>
  );
};

export default App;