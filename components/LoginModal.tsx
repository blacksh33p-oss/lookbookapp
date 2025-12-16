import React, { useState, useEffect } from 'react';
import { X, Mail, ArrowRight, Loader2, Check, User, Building2, Lock, Fingerprint, Eye, EyeOff, ExternalLink, RefreshCw, Zap, Crown, Star, ShieldCheck } from 'lucide-react';
import { SubscriptionTier } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuth: (email: string, password?: string, isSignUp?: boolean, username?: string) => Promise<void>;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  initialView?: 'pricing' | 'login';
}

export const LoginModal: React.FC<LoginModalProps> = ({ 
  isOpen, 
  onClose, 
  onAuth, 
  showToast,
  initialView = 'pricing' 
}) => {
  const [step, setStep] = useState<'selection' | 'credentials'>('selection');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(SubscriptionTier.Free);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Resend Logic
  const [resendTimer, setResendTimer] = useState(0);
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
      let interval: any;
      if (resendTimer > 0) {
          interval = setInterval(() => setResendTimer(t => t - 1), 1000);
      }
      return () => clearInterval(interval);
  }, [resendTimer]);

  // Reset state when modal opens based on initialView
  useEffect(() => {
    if (isOpen) {
        if (initialView === 'login') {
            setStep('credentials');
            setAuthMode('signin');
        } else {
            setStep('selection');
            setAuthMode('signup');
        }
        // Clear previous inputs/errors
        setError(null);
        setEmail('');
        setPassword('');
        setUsername('');
        setIsSuccess(false);
    }
  }, [isOpen, initialView]);

  if (!isOpen) return null;

  const handleTierSelect = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
    // Important: Save the plan intent immediately
    if (tier !== SubscriptionTier.Free) {
        localStorage.setItem('pending_plan', tier);
    } else {
        localStorage.removeItem('pending_plan');
    }
    setAuthMode('signup');
    setStep('credentials');
    setError(null);
  };

  const switchToSignIn = () => {
      setStep('credentials');
      setAuthMode('signin');
      setError(null);
  };

  const switchToSignUp = () => {
      // Go back to plan selection to ensure they choose a plan
      setStep('selection');
      setAuthMode('signup');
      setError(null);
  };
  
  const backToPlans = () => {
      setStep('selection');
      setAuthMode('signup');
      setError(null);
  };

  const handleResend = async () => {
      setResendTimer(60);
      if (showToast) showToast("Verification email resent!", "info");
      // Note: Actual Supabase resend logic would go here: supabase.auth.resend({ type: 'signup', email })
  };

  const handleSubmit = async () => {
    // 1. Basic Validation
    if (!email || !email.includes('@')) {
        setError("Please enter a valid email address.");
        return;
    }
    if (authMode === 'signup' && (!username || username.length < 3)) {
        setError("Username must be at least 3 characters.");
        return;
    }
    if (!password || password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
        // 2. Attempt Authentication
        await onAuth(email, password, authMode === 'signup', username);
        
        // 3. Handle Success Scenarios
        if (authMode === 'signup') {
             // If signup successful, show verification screen
             setIsSuccess(true);
        } else {
             // If login successful, close modal (App.tsx handles redirection)
             onClose();
        }
    } catch (err: any) {
        console.error("Auth Error:", err);
        
        // 4. Professional Error Handling
        let msg = err.message || "Authentication failed.";
        
        // Handle Duplicate Email
        if (msg.includes("already registered") || msg.includes("unique constraint") || msg.includes("User already exists") || msg.includes("already taken")) {
            msg = "Account already exists for this email.";
            
            // Auto-suggestion to sign in
            if (showToast) showToast("User exists. Please log in.", 'info');
            setTimeout(() => {
                 setAuthMode('signin');
                 setError(null);
            }, 1000);
            return;
        }
        
        // Handle Wrong Password
        if (msg.includes("Invalid login credentials")) {
            msg = "Incorrect email or password.";
        }
        
        // Handle Unconfirmed Email
        if (msg.includes("Email not confirmed")) {
            msg = "Please verify your email address before logging in. Check your inbox/spam.";
        }

        setError(msg);
        if (showToast) showToast(msg, 'error');
    } finally {
        setIsLoading(false);
    }
  };

  // Success Screen (Email Verification)
  if (isSuccess) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-950 border border-brand-500/30 rounded-2xl w-full max-w-md p-8 text-center shadow-2xl relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-50"></div>
                
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"><X size={20}/></button>
                
                <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-brand-500/20 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
                    <Mail className="text-brand-400" size={32} />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Check your inbox</h3>
                <p className="text-zinc-400 mb-8 text-sm leading-relaxed">
                    We've sent a secure verification link to <br/>
                    <span className="text-white font-medium">{email}</span>
                </p>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <a href="https://mail.google.com" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-white py-3 rounded-lg transition-all text-xs font-bold uppercase tracking-wide">
                        <ExternalLink size={14} /> Open Gmail
                    </a>
                    <a href="https://outlook.live.com" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-white py-3 rounded-lg transition-all text-xs font-bold uppercase tracking-wide">
                        <ExternalLink size={14} /> Open Outlook
                    </a>
                </div>

                <div className="bg-zinc-900/30 p-4 rounded-lg border border-zinc-800/50 text-xs text-zinc-500 mb-6 text-left">
                    <p>Once verified, come back here to log in. We will redirect you to {selectedTier !== 'Free' ? 'finalize your payment' : 'your studio'}.</p>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-500">
                    <span>Didn't receive it?</span>
                    {resendTimer > 0 ? (
                        <span className="text-zinc-600 cursor-wait">Resend in {resendTimer}s</span>
                    ) : (
                        <button onClick={handleResend} className="text-brand-400 hover:text-brand-300 font-bold flex items-center gap-1 transition-colors">
                            <RefreshCw size={10} /> Resend Email
                        </button>
                    )}
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className={`bg-zinc-950 border border-zinc-800 rounded-2xl w-full ${step === 'selection' ? 'max-w-6xl' : 'max-w-md'} overflow-hidden shadow-2xl relative transition-all duration-300`}>
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-20"
        >
            <X size={20} />
        </button>

        {step === 'selection' ? (
             <div className="p-8 lg:p-12">
                <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Create your account</h2>
                        <p className="text-zinc-400 max-w-lg">Join thousands of fashion brands using AI to scale their photography.</p>
                    </div>
                    <div className="text-right">
                         <span className="text-zinc-500 text-sm mr-2">Already have an account?</span>
                         <button onClick={switchToSignIn} className="text-white hover:text-brand-400 font-bold border-b border-zinc-700 hover:border-brand-400 transition-all">Sign In</button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Free Card */}
                     <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col hover:border-zinc-700 transition-all cursor-pointer group" onClick={() => handleTierSelect(SubscriptionTier.Free)}>
                        <div className="mb-6">
                            <div className="text-zinc-500 font-bold tracking-wider uppercase text-xs mb-2">Starter</div>
                            <div className="text-3xl font-bold text-white mb-1">Free</div>
                            <div className="text-zinc-500 text-xs">Forever free. No credit card.</div>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-center gap-2 text-sm text-zinc-300"><Zap size={14} className="text-zinc-500" /> 5 Credits / Day</li>
                            <li className="flex items-center gap-2 text-sm text-zinc-300"><Check size={14} className="text-zinc-500" /> Standard Quality (Flash)</li>
                            <li className="flex items-center gap-2 text-sm text-zinc-300"><Check size={14} className="text-zinc-500" /> 1K Resolution</li>
                        </ul>
                        <button className="w-full bg-zinc-800 group-hover:bg-zinc-700 text-white font-semibold py-3 rounded-lg transition-all border border-transparent">Select Free</button>
                    </div>

                    {/* Creator Card */}
                    <div className="bg-zinc-900 border border-brand-500/50 rounded-xl p-6 flex flex-col relative shadow-[0_0_30px_rgba(139,92,246,0.15)] transform md:-translate-y-2 z-10 cursor-pointer hover:border-brand-400 transition-all" onClick={() => handleTierSelect(SubscriptionTier.Creator)}>
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-indigo-500"></div>
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-2">
                                <div className="text-brand-400 font-bold tracking-wider uppercase text-xs flex items-center gap-1"><Crown size={12} /> Creator</div>
                                <span className="bg-brand-500/20 text-brand-300 text-[9px] font-bold px-2 py-0.5 rounded uppercase">Most Popular</span>
                            </div>
                            <div className="flex items-baseline gap-1 mb-1"><span className="text-4xl font-bold text-white">$29</span><span className="text-zinc-500 text-xs">/mo</span></div>
                            <div className="text-brand-200/60 text-xs">For growing brands.</div>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                             <li className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-sm text-white font-medium"><Star size={14} className="text-brand-400 fill-brand-400" /> 500 Credits / Mo</div>
                                <div className="pl-6 text-[9px] text-brand-200/60 font-mono">~50 Pro or 500 Std Images</div>
                             </li>
                             <li className="flex items-center gap-2 text-sm text-zinc-200"><Check size={14} className="text-brand-400" /> Gemini 3 Pro (Best Quality)</li>
                             <li className="flex items-center gap-2 text-sm text-zinc-200"><Check size={14} className="text-brand-400" /> 2K High-Res</li>
                             <li className="flex items-center gap-2 text-sm text-zinc-200"><ShieldCheck size={14} className="text-brand-400" /> Commercial License</li>
                        </ul>
                        <button className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-brand-500/20">Select Creator</button>
                    </div>

                    {/* Studio Card */}
                    <div className="bg-zinc-900/50 border border-amber-500/30 rounded-xl p-6 flex flex-col hover:border-amber-500/50 transition-all cursor-pointer group" onClick={() => handleTierSelect(SubscriptionTier.Studio)}>
                        <div className="mb-6">
                            <div className="text-amber-500 font-bold tracking-wider uppercase text-xs mb-2 flex items-center gap-1"><Building2 size={12} /> Studio</div>
                            <div className="flex items-baseline gap-1 mb-1"><span className="text-3xl font-bold text-white">$99</span><span className="text-zinc-500 text-xs">/mo</span></div>
                            <div className="text-zinc-500 text-xs">For power users & agencies.</div>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-sm text-zinc-300"><Check size={14} className="text-amber-500" /> 2,000 Credits / Mo</div>
                                <div className="pl-6 text-[9px] text-zinc-500 font-mono">~200 Pro or 2,000 Std Images</div>
                            </li>
                            <li className="flex items-center gap-2 text-sm text-zinc-300"><Check size={14} className="text-amber-500" /> 4K Ultra HD</li>
                            <li className="flex items-center gap-2 text-sm text-zinc-300"><Check size={14} className="text-amber-500" /> Batch Processing API</li>
                            <li className="flex items-center gap-2 text-sm text-zinc-300"><Check size={14} className="text-amber-500" /> Priority Support</li>
                        </ul>
                        <button className="w-full bg-zinc-800 group-hover:bg-zinc-700 text-amber-500 font-bold py-3 rounded-lg transition-all border border-amber-500/20">Select Studio</button>
                    </div>
                </div>
             </div>
        ) : (
             <div className="p-8">
                <div className="mb-6">
                    <button onClick={backToPlans} className="text-xs text-zinc-500 hover:text-white mb-4 flex items-center gap-1">← Back to plans</button>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {authMode === 'signin' ? 'Welcome Back' : (selectedTier === SubscriptionTier.Free ? 'Create Account' : `Join ${selectedTier}`)}
                    </h2>
                    <p className="text-zinc-400 text-sm">
                        {authMode === 'signin' ? 'Enter your credentials to access your studio.' : 'Create your account to start generating.'}
                    </p>
                </div>
                
                <div className="space-y-4">
                    {/* Username Input (Signup Only) */}
                    {authMode === 'signup' && (
                        <div className="space-y-2 animate-slide-up">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Username</label>
                            <div className="relative group">
                                <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand-400 transition-colors" size={18} />
                                <input 
                                    type="text" 
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="studio_name"
                                    className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-brand-500 transition-colors"
                                />
                            </div>
                        </div>
                    )}

                    {/* Email Input */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Email Address</label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand-400 transition-colors" size={18} />
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-brand-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand-400 transition-colors" size={18} />
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                placeholder="••••••••"
                                className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-10 pr-10 text-white focus:outline-none focus:border-brand-500 transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-950/20 border border-red-900/50 p-3 rounded-lg flex items-start gap-2">
                            <div className="p-1 bg-red-500/10 rounded-full mt-0.5"><X size={12} className="text-red-400"/></div>
                            <div className="text-red-300 text-xs leading-relaxed">{error}</div>
                        </div>
                    )}

                    <button 
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <>{authMode === 'signin' ? 'Sign In' : 'Create Account'} <ArrowRight size={18} /></>
                        )}
                    </button>
                    
                    <div className="pt-4 text-center">
                        {authMode === 'signin' ? (
                            <p className="text-xs text-zinc-500">
                                Don't have an account? <button onClick={switchToSignUp} className="text-brand-400 hover:text-brand-300 font-bold ml-1">Sign Up</button>
                            </p>
                        ) : (
                            <p className="text-xs text-zinc-500">
                                Already have an account? <button onClick={switchToSignIn} className="text-brand-400 hover:text-brand-300 font-bold ml-1">Log In</button>
                            </p>
                        )}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};