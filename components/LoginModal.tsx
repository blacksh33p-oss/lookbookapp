import React, { useState } from 'react';
import { X, Mail, ArrowRight, Loader2, Check, User, Building2, Lock, Fingerprint, LogIn } from 'lucide-react';
import { SubscriptionTier } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuth: (email: string, password?: string, isSignUp?: boolean, username?: string) => Promise<void>;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onAuth }) => {
  const [step, setStep] = useState<'selection' | 'credentials'>('selection');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(SubscriptionTier.Free);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setStep('selection'); 
      setAuthMode('signup');
      setError(null);
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
        if (msg.includes("already registered") || msg.includes("unique constraint") || msg.includes("User already exists")) {
            msg = "This email is already registered. Please Sign In instead.";
            // Optional: Auto-switch to sign in for better UX?
            // setAuthMode('signin'); 
        }
        
        // Handle Wrong Password
        if (msg.includes("Invalid login credentials")) {
            msg = "Incorrect email or password.";
        }

        setError(msg);
    } finally {
        setIsLoading(false);
    }
  };

  // Success Screen (Email Verification)
  if (isSuccess) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-950 border border-brand-500/30 rounded-2xl w-full max-w-md p-8 text-center shadow-2xl relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={20}/></button>
                <div className="w-16 h-16 bg-brand-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mail className="text-brand-400" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Verify your account</h3>
                <p className="text-zinc-400 mb-6">We've sent a verification link to <span className="text-white font-medium">{email}</span>.</p>
                
                <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800 text-sm text-zinc-400 mb-6 text-left">
                    <p className="mb-2"><strong className="text-white">Next Step:</strong> Click the link in your email.</p>
                    <p>Once verified, you will be automatically redirected to complete your <strong>{selectedTier} Plan</strong> setup.</p>
                </div>

                <button onClick={onClose} className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-zinc-200 transition-colors">
                    I understand
                </button>
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className={`bg-zinc-950 border border-zinc-800 rounded-2xl w-full ${step === 'selection' ? 'max-w-5xl' : 'max-w-md'} overflow-hidden shadow-2xl relative transition-all duration-300`}>
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-20"
        >
            <X size={20} />
        </button>

        {step === 'selection' ? (
             <div className="p-8 lg:p-12">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-white mb-3">Join FashionStudio</h2>
                    <p className="text-zinc-400">Select a plan to create your account or <button onClick={switchToSignIn} className="text-brand-400 hover:underline font-bold">Sign In</button></p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Free Card */}
                     <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col hover:border-zinc-700 transition-all cursor-pointer group" onClick={() => handleTierSelect(SubscriptionTier.Free)}>
                        <div className="mb-4">
                            <div className="text-zinc-500 font-bold tracking-wider uppercase text-xs mb-1">Starter</div>
                            <div className="text-3xl font-bold text-white">Free</div>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-start gap-2 text-sm text-zinc-400"><Check size={16} className="text-zinc-600 mt-0.5" /> 5 Free Generations</li>
                            <li className="flex items-start gap-2 text-sm text-zinc-400"><Check size={16} className="text-zinc-600 mt-0.5" /> Standard Model Only</li>
                        </ul>
                        <button className="w-full bg-zinc-800 group-hover:bg-zinc-700 text-white font-semibold py-3 rounded-lg transition-all">Select Free</button>
                    </div>

                    {/* Creator Card */}
                    <div className="bg-zinc-900 border border-brand-500/50 rounded-xl p-6 flex flex-col relative shadow-xl shadow-brand-900/10 transform scale-105 z-10 cursor-pointer hover:border-brand-400 transition-all" onClick={() => handleTierSelect(SubscriptionTier.Creator)}>
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-indigo-500"></div>
                        <div className="mb-4">
                            <div className="text-brand-400 font-bold tracking-wider uppercase text-xs mb-1 flex items-center gap-1"><User size={12} /> Creator</div>
                            <div className="flex items-baseline gap-1"><span className="text-3xl font-bold text-white">$29</span><span className="text-zinc-500 text-sm">/mo</span></div>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                             <li className="flex items-start gap-2 text-sm text-white"><Check size={16} className="text-brand-500 mt-0.5" /> 40 Pro Credits</li>
                             <li className="flex items-start gap-2 text-sm text-zinc-300"><Check size={16} className="text-brand-500 mt-0.5" /> Model Consistency</li>
                             <li className="flex items-start gap-2 text-sm text-zinc-300"><Check size={16} className="text-brand-500 mt-0.5" /> 2K Resolution</li>
                        </ul>
                        <button className="w-full bg-brand-600 hover:bg-brand-500 text-white font-bold py-3 rounded-lg transition-all">Select Creator</button>
                    </div>

                    {/* Studio Card */}
                    <div className="bg-zinc-900/50 border border-amber-500/30 rounded-xl p-6 flex flex-col hover:border-amber-500/50 transition-all cursor-pointer group" onClick={() => handleTierSelect(SubscriptionTier.Studio)}>
                        <div className="mb-4">
                            <div className="text-amber-500 font-bold tracking-wider uppercase text-xs mb-1 flex items-center gap-1"><Building2 size={12} /> Studio</div>
                            <div className="flex items-baseline gap-1"><span className="text-3xl font-bold text-white">$99</span><span className="text-zinc-500 text-sm">/mo</span></div>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                            <li className="flex items-start gap-2 text-sm text-zinc-300"><Check size={16} className="text-amber-500 mt-0.5" /> 200 Pro Credits</li>
                            <li className="flex items-start gap-2 text-sm text-zinc-300"><Check size={16} className="text-amber-500 mt-0.5" /> 4K Ultra HD</li>
                            <li className="flex items-start gap-2 text-sm text-zinc-300"><Check size={16} className="text-amber-500 mt-0.5" /> Commercial License</li>
                        </ul>
                        <button className="w-full bg-zinc-800 group-hover:bg-zinc-700 text-amber-500 font-bold py-3 rounded-lg transition-all border border-amber-500/20">Select Studio</button>
                    </div>
                </div>
             </div>
        ) : (
             <div className="p-8">
                <div className="mb-6">
                    <button onClick={switchToSignUp} className="text-xs text-zinc-500 hover:text-white mb-4 flex items-center gap-1">← Back to plans</button>
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
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                placeholder="••••••••"
                                className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-brand-500 transition-colors"
                            />
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