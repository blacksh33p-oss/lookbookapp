import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, ChevronDown, Shirt, Ruler, Zap, LayoutGrid, LayoutList, Hexagon, Sparkles, Move, LogOut, CreditCard, Star, CheckCircle, XCircle, Info, Lock, GitCommit, Crown, RotateCw, X, Loader2, Palette, RefreshCcw, Command } from 'lucide-react';
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
const APP_VERSION = "v1.4.34-GeistAudited"; 
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
    <div className="border-b border-zinc-800 bg-black last:border-b-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left focus:outline-none group hover:bg-zinc-900 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon size={14} className={`text-zinc-500 group-hover:text-white transition-colors ${isOpen ? 'text-white' : ''}`} />
          <span className="font-mono text-xs font-medium tracking-wide text-zinc-300 group-hover:text-white transition-colors">{title}</span>
        </div>
        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
           <ChevronDown size={14} className="text-zinc-600 group-hover:text-white" />
        </div>
      </button>
      {isOpen && (
        <div className="p-4 pt-0 animate-fade-in">
            <div className="mt-2 space-y-5">
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
            className={`relative px-3 py-3 rounded-md border text-left transition-all group overflow-hidden min-h-[3rem] flex items-center justify-between
            ${isSelected 
                ? 'bg-white border-white text-black' 
                : 'bg-black border-zinc-800 hover:border-zinc-600 text-zinc-400'
            }
            ${isLocked && !isSelected ? 'opacity-60 cursor-not-allowed hover:bg-black hover:border-zinc-800' : ''}
            `}
        >
            <span className={`text-[10px] font-bold uppercase tracking-wide z-10 relative ${isSelected ? 'text-black' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                {simpleName}
            </span>
            
            {isLocked && !isSelected && <Lock size={10} className="text-zinc-600" />}
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
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const colors = {
        success: 'bg-zinc-900 border-zinc-700 text-white',
        error: 'bg-red-950 border-red-900 text-red-200',
        info: 'bg-zinc-900 border-zinc-700 text-zinc-300'
    };
    const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : Info;

    return (
        <div className={`fixed bottom-6 right-6 z-[200] flex items-center gap-3 px-4 py-3 rounded-md border shadow-xl backdrop-blur-md animate-slide-up ${colors[type]}`}>
            <Icon size={16} />
            <span className="text-xs font-medium font-mono">{message}</span>
            <button onClick={onClose} className="ml-4 hover:text-white"><X size={12} /></button>
        </div>
    );
};

const App: React.FC = () => {
  
  // CACHED INITIAL STATE
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

  const isFormValid = Object.values(options.outfit).some((item: OutfitItem) => 
    item.images.length > 0 || (item.description && item.description.trim().length > 0) || (item.garmentType && item.garmentType.trim().length > 0)
  );

  // --- SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            if (isFormValid && !isLoading) {
                handleGenerate();
            } else if (!isFormValid) {
                showToast("Please add at least one garment description or image.", "info");
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFormValid, isLoading, options]); // Dependencies to ensure fresh state

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
         setTimeout(() => {
             fetchProfile(session.user.id, session.user.email);
             checkPendingPlan(session);
         }, 300);
         showToast(`Welcome back!`, 'success');
      } else if (event === 'SIGNED_OUT') {
         setUserProfile(null);
         localStorage.removeItem('fashion_user_profile'); 
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
  }, [session?.user?.id]); 

  const fetchProfile = async (userId: string, email?: string, retry = true) => {
    try {
        let { data, error } = await supabase.from('profiles').select('tier, credits').eq('id', userId).single();
        
        // RETRY LOGIC: If network error or unknown, try once more
        if (error && retry) {
            await new Promise(r => setTimeout(r, 500));
            const retryResult = await supabase.from('profiles').select('tier, credits').eq('id', userId).single();
            if (!retryResult.error) {
                data = retryResult.data;
                error = null;
            }
        }

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
            const finalProfile = {
                tier: data.tier as SubscriptionTier || SubscriptionTier.Free,
                credits: data.credits ?? 5, 
                username: email ? email.split('@')[0] : 'Studio User'
            };
            setUserProfile(finalProfile);
            return data;
        }
    } catch (e) {
        console.error("Profile fetch error", e);
        setUserProfile(prev => prev || {
            tier: SubscriptionTier.Free,
            credits: 0,
            username: email ? email.split('@')[0] : 'Studio User'
        });
        showToast("Connection issue. Showing cached/default credits.", "info");
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
      
      try { 
          await supabase.auth.signOut(); 
          const today = new Date().toDateString();
          localStorage.setItem('fashion_guest_date', today);
          setGuestCredits(5);
      } catch (err) {} 
      
      showToast('Signed out successfully', 'info');
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

            const newBalance = userProfile.credits - cost;
            setUserProfile(prev => prev ? ({ ...prev, credits: newBalance }) : null);

            supabase.from('profiles').update({ credits: newBalance }).eq('id', session.user.id).then(({ error }) => {
                if (error) { console.error("DB Sync Error:", error); }
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


  const isPremium = session ? userProfile?.tier !== SubscriptionTier.Free : false;
  const isStudio = session ? userProfile?.tier === SubscriptionTier.Studio : false;
  const currentCost = getGenerationCost(options);

  if (isRedirecting) {
      return (
        <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-6">
            <div className="flex flex-col items-center gap-6 animate-fade-in text-center max-w-md">
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Redirecting</h2>
                    <p className="text-zinc-500 text-sm mt-1">Connecting to payment gateway...</p>
                </div>
            </div>
        </div>
      );
  }

  if (isSyncingPayment) {
    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6">
            <div className="bg-black border border-zinc-800 p-8 rounded-lg max-w-sm w-full text-center">
                <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                    <Loader2 size={24} className="text-white animate-spin" />
                </div>
                <h2 className="text-lg font-bold text-white mb-2">Syncing Purchase</h2>
                <p className="text-zinc-500 text-xs mb-6">This may take a moment while we verify your transaction.</p>
                <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                    <div className="bg-white h-full animate-progress"></div>
                </div>
                <button onClick={() => setIsSyncingPayment(false)} className="mt-6 text-xs text-zinc-500 hover:text-white transition-colors">Cancel</button>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen text-zinc-300 font-sans selection:bg-white selection:text-black bg-black">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} onAuth={handleAuth} initialView={loginModalView} showToast={showToast} />
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} onUpgrade={(tier) => handleUpgrade(tier)} />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/50 backdrop-blur-xl border-b border-zinc-800 h-14">
          <div className="max-w-[1920px] mx-auto h-full flex justify-between items-center px-4 md:px-6">
              <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-white text-black rounded-sm flex items-center justify-center">
                     <Hexagon size={14} fill="currentColor" strokeWidth={0} />
                  </div>
                  <h1 className="text-sm font-bold tracking-tight text-white">FashionStudio</h1>
              </div>

              <div className="hidden md:flex gap-px bg-zinc-800 p-[1px] rounded-md overflow-hidden">
                  <button onClick={() => setAppMode('single')} className={`px-4 py-1.5 text-xs font-medium transition-all ${appMode === 'single' ? 'bg-zinc-100 text-black' : 'bg-black text-zinc-500 hover:text-zinc-300'}`}>Runway</button>
                  <button onClick={() => setAppMode('batch')} className={`px-4 py-1.5 text-xs font-medium transition-all ${appMode === 'batch' ? 'bg-zinc-100 text-black' : 'bg-black text-zinc-500 hover:text-zinc-300'}`}>Batch</button>
              </div>

              <div className="flex items-center gap-4">
                 {session ? (
                     <>
                        {(!userProfile || userProfile.tier !== SubscriptionTier.Studio) && (
                           <button onClick={() => setShowUpgradeModal(true)} className="hidden sm:flex text-[10px] font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-colors items-center gap-1.5 border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-md">
                              <Crown size={12} /> Pro
                           </button>
                        )}
                        <div onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-3 cursor-pointer group px-2 py-1 rounded-md hover:bg-zinc-900 transition-colors">
                            <div className="text-right hidden sm:block">
                                <div className="text-[10px] font-bold text-white">
                                    {userProfile?.username || session.user.email?.split('@')[0]}
                                </div>
                                <div className="text-[10px] text-zinc-500 font-mono">
                                    {userProfile?.credits ?? <Loader2 size={8} className="animate-spin inline" />} Credits
                                </div>
                            </div>
                            <div className="w-6 h-6 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
                                <span className="text-xs font-bold text-white">{session.user.email?.[0].toUpperCase()}</span>
                            </div>
                        </div>
                        {showProfileMenu && (
                            <div className="absolute top-12 right-4 w-48 bg-black border border-zinc-800 rounded-md shadow-2xl z-50 animate-fade-in overflow-hidden">
                                <div className="p-3 border-b border-zinc-800">
                                    <div className="text-xs text-zinc-400 truncate">{session.user.email}</div>
                                </div>
                                <div className="p-1">
                                    <button onClick={() => { setShowUpgradeModal(true); setShowProfileMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-white hover:bg-zinc-900 rounded-sm transition-colors flex items-center gap-2"><CreditCard size={12} /> Billing</button>
                                    <button onClick={() => { setIsSyncingPayment(true); pollForCredits(session.user.id, session.user.email); setShowProfileMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-white hover:bg-zinc-900 rounded-sm transition-colors flex items-center gap-2"><RefreshCcw size={12} /> Sync</button>
                                    <button onClick={(e) => handleLogout(e)} className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-zinc-900 rounded-sm transition-colors flex items-center gap-2"><LogOut size={12} /> Sign Out</button>
                                </div>
                            </div>
                        )}
                     </>
                 ) : (
                    <div className="flex items-center gap-3">
                        <span className="hidden sm:inline text-xs font-mono text-zinc-500">{guestCredits} Credits</span>
                        <button onClick={handleLogin} className="text-xs font-medium text-white hover:text-zinc-300">Log in</button>
                        <button onClick={handleSignup} className="bg-white text-black hover:bg-zinc-200 px-3 py-1.5 rounded-md text-xs font-bold transition-colors">Sign up</button>
                    </div>
                 )}
              </div>
          </div>
      </header>

      <main className="pt-20 px-4 md:px-6 max-w-[1920px] mx-auto min-h-screen pb-12">
        {appMode === 'batch' ? ( <BatchMode /> ) : (
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 relative">
          
          {/* Controls Column */}
          <div className="order-2 lg:order-1 lg:col-span-4 flex flex-col gap-4 relative z-20 pb-20 lg:pb-0">
            <div className="bg-black border border-zinc-800 rounded-lg overflow-hidden shadow-sm">
                <ConfigSection title="Wardrobe" icon={Shirt} defaultOpen={true}>
                    <OutfitControl outfit={options.outfit} onChange={(newOutfit) => setOptions({ ...options, outfit: newOutfit })} />
                </ConfigSection>
                <ConfigSection title="Model & Set" icon={UserCircle} defaultOpen={true}>
                    <div className="mb-6 space-y-3">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Engine</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setOptions({...options, modelVersion: ModelVersion.Flash})} className={`flex flex-col items-center justify-center py-3 px-2 rounded-md border transition-all ${options.modelVersion === ModelVersion.Flash ? 'bg-white border-white' : 'bg-black border-zinc-800 hover:border-zinc-600'}`}>
                                <span className={`text-[10px] font-bold uppercase ${options.modelVersion === ModelVersion.Flash ? 'text-black' : 'text-white'}`}>Flash 2.5</span>
                                <span className={`text-[9px] font-mono mt-0.5 ${options.modelVersion === ModelVersion.Flash ? 'text-zinc-600' : 'text-zinc-500'}`}>1 Credit</span>
                            </button>
                            <button onClick={() => { if(isPremium) setOptions({...options, modelVersion: ModelVersion.Pro}); else setShowUpgradeModal(true); }} className={`flex flex-col items-center justify-center py-3 px-2 rounded-md border transition-all relative ${options.modelVersion === ModelVersion.Pro ? 'bg-white border-white' : 'bg-black border-zinc-800 hover:border-zinc-600'}`}>
                                {!isPremium && <Lock size={10} className="absolute top-2 right-2 text-zinc-500" />}
                                <span className={`text-[10px] font-bold uppercase ${options.modelVersion === ModelVersion.Pro ? 'text-black' : 'text-white'}`}>Pro 3</span>
                                <span className={`text-[9px] font-mono mt-0.5 ${options.modelVersion === ModelVersion.Pro ? 'text-zinc-600' : 'text-zinc-500'}`}>10 Credits</span>
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Dropdown label="Sex" value={options.sex} options={Object.values(ModelSex)} onChange={(val) => setOptions({ ...options, sex: val })} />
                        <Dropdown label="Age" value={options.age} options={Object.values(ModelAge)} onChange={(val) => setOptions({ ...options, age: val })} />
                        <Dropdown label="Ethnicity" value={options.ethnicity} options={Object.values(ModelEthnicity)} onChange={(val) => setOptions({ ...options, ethnicity: val })} />
                        <Dropdown label="Mood" value={options.facialExpression} options={Object.values(FacialExpression)} onChange={(val) => setOptions({ ...options, facialExpression: val })} />
                    </div>
                    <div className="h-px bg-zinc-900 my-4"></div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Style</label>
                      <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                         {STANDARD_STYLES.map(style => (<StyleButton key={style} label={style} isSelected={options.style === style} onClick={() => setOptions({...options, style: style as PhotoStyle})} />))}
                         <div className="col-span-2 text-[9px] font-bold text-zinc-500 uppercase tracking-wider mt-2 mb-1 pl-1">Pro Styles</div>
                         {PRO_STYLES.map(style => (<StyleButton key={style} label={style} isSelected={options.style === style} isLocked={!isPremium} onClick={() => { if(isPremium) setOptions({...options, style: style as PhotoStyle}); else setShowUpgradeModal(true); }} />))}
                      </div>
                    </div>
                </ConfigSection>
                <ConfigSection title="Pose" icon={Move}>
                    <PoseControl selectedPose={options.pose} onPoseChange={(p) => setOptions({ ...options, pose: p })} isAutoMode={autoPose} onToggleAutoMode={setAutoPose} isPremium={isPremium} onUpgrade={() => setShowUpgradeModal(true)} />
                </ConfigSection>
                <ConfigSection title="Size" icon={Ruler}>
                    <SizeControl options={options} onChange={setOptions} isPremium={isStudio} onUpgradeRequest={() => setShowUpgradeModal(true)} />
                </ConfigSection>
            </div>
            
            <div className="sticky bottom-4 z-30 lg:bottom-0">
                {!isFormValid && (
                    <div className="mb-2 text-[10px] text-amber-500 font-mono text-center bg-black/80 backdrop-blur border border-amber-900/30 py-1.5 rounded flex items-center justify-center gap-2">
                         <Info size={12} /> Add at least 1 garment to generate
                    </div>
                )}
                <button 
                    onClick={handleGenerate} 
                    disabled={!isFormValid || isLoading} 
                    className={`w-full py-3 px-4 rounded-md text-sm font-medium transition-all shadow-lg flex items-center justify-center gap-2 group ${!isFormValid || isLoading ? 'bg-zinc-900 text-zinc-500 cursor-not-allowed border border-zinc-800' : 'bg-white text-black hover:bg-zinc-200 border border-white'}`}
                >
                    {isLoading ? (<Loader2 size={16} className="animate-spin" />) : (<><Sparkles size={16} fill="black" /> Generate Shoot</>)}
                </button>
                <div className="flex justify-between items-center mt-3 px-1">
                    <span className="text-[10px] text-zinc-600 font-mono flex items-center gap-1.5">
                       {APP_VERSION} 
                       <span className="hidden lg:flex items-center gap-0.5 text-zinc-700 bg-zinc-900/50 px-1 rounded border border-zinc-800"><Command size={8} /> ↵</span>
                    </span>
                    <span className="text-[10px] font-bold text-zinc-500 font-mono">Cost: {currentCost} Credits</span>
                </div>
            </div>
          </div>
          
          {/* Preview Column */}
          <div className="order-1 lg:order-2 lg:col-span-8 h-[60vh] lg:h-[calc(100vh-8rem)] sticky top-20 bg-black border border-zinc-800 rounded-lg overflow-hidden">
             <ResultDisplay isLoading={isLoading} image={generatedImage} onDownload={handleDownload} onRegenerate={handleRegenerate} isPremium={isPremium} error={error} />
          </div>

        </div>
        )}
      </main>
    </div>
  );
};

export default App;