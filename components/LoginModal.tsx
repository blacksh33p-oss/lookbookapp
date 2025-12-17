
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
  const [resendTimer, setResendTimer] = useState(0);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
      let interval: any;
      if (resendTimer > 0) interval = setInterval(() => setResendTimer(t => t - 1), 1000);
      return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    if (isOpen) {
        setStep(initialView === 'login' ? 'credentials' : 'selection');
        setAuthMode(initialView === 'login' ? 'signin' : 'signup');
        setError(null); setEmail(''); setPassword(''); setUsername(''); setIsSuccess(false);
    }
  }, [isOpen, initialView]);

  if (!isOpen) return null;

  const handleTierSelect = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
    if (tier !== SubscriptionTier.Free) localStorage.setItem('pending_plan', tier);
    else localStorage.removeItem('pending_plan');
    setAuthMode('signup');
    setStep('credentials');
    setError(null);
  };

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) { setError("Invalid email."); return; }
    if (authMode === 'signup' && (!username || username.length < 3)) { setError("Username too short."); return; }
    if (!password || password.length < 6) { setError("Password too short."); return; }
    
    setIsLoading(true);
    setError(null);

    try {
        await onAuth(email, password, authMode === 'signup', username);
        if (authMode === 'signup') setIsSuccess(true);
        else onClose();
    } catch (err: any) {
        setError(err.message || "Auth failed.");
    } finally {
        setIsLoading(false);
    }
  };

  if (isSuccess) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-black border border-zinc-800 rounded-lg w-full max-w-md p-8 text-center relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={16}/></button>
                <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-800">
                    <Mail className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Check your inbox</h3>
                <p className="text-zinc-500 mb-8 text-sm">Verification link sent to <span className="text-white">{email}</span></p>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <a href="https://mail.google.com" target="_blank" className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white py-2.5 rounded-md text-xs font-bold uppercase">Gmail</a>
                    <a href="https://outlook.live.com" target="_blank" className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white py-2.5 rounded-md text-xs font-bold uppercase">Outlook</a>
                </div>
                <div className="text-xs text-zinc-600">
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : <button onClick={() => setResendTimer(60)} className="hover:text-white">Resend Email</button>}
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className={`bg-black border border-zinc-800 rounded-xl w-full ${step === 'selection' ? 'max-w-6xl' : 'max-w-md'} overflow-hidden relative`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white z-20"><X size={16} /></button>

        {step === 'selection' ? (
             <div className="p-8 md:p-12">
                <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Select Plan</h2>
                        <p className="text-zinc-500 text-sm">Scale your fashion photography with AI.</p>
                    </div>
                    <button onClick={() => { setStep('credentials'); setAuthMode('signin'); }} className="text-zinc-400 hover:text-white text-sm font-medium">Log In</button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     <div className="bg-black border border-zinc-800 rounded-lg p-6 hover:border-zinc-600 transition-colors cursor-pointer flex flex-col" onClick={() => handleTierSelect(SubscriptionTier.Free)}>
                        <div className="mb-4">
                            <div className="text-white font-bold text-lg mb-1">Guest</div>
                            <div className="text-zinc-500 text-xs">For testing.</div>
                        </div>
                        <ul className="space-y-2 mb-6 flex-1 text-sm text-zinc-400">
                            <li>5 Daily Credits</li>
                            <li>Standard Model</li>
                            <li>1K Resolution</li>
                        </ul>
                        <button className="w-full bg-zinc-900 text-white font-medium py-2 rounded-md border border-zinc-800 text-xs">Select</button>
                    </div>

                    <div className="bg-black border border-zinc-800 rounded-lg p-6 hover:border-zinc-600 transition-colors cursor-pointer flex flex-col" onClick={() => handleTierSelect(SubscriptionTier.Starter)}>
                        <div className="mb-4">
                            <div className="text-white font-bold text-lg mb-1">Starter</div>
                            <div className="text-zinc-500 text-xs">$9/mo</div>
                        </div>
                        <ul className="space-y-2 mb-6 flex-1 text-sm text-zinc-400">
                            <li>100 Monthly Credits</li>
                            <li>Standard Model</li>
                            <li>1K Resolution</li>
                        </ul>
                        <button className="w-full bg-zinc-900 text-white font-medium py-2 rounded-md border border-zinc-800 text-xs">Select</button>
                    </div>

                    <div className="bg-zinc-900/30 border border-zinc-700 rounded-lg p-6 hover:border-white transition-colors cursor-pointer flex flex-col relative" onClick={() => handleTierSelect(SubscriptionTier.Creator)}>
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-1">
                                <div className="text-white font-bold text-lg">Creator</div>
                                <span className="bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase">Popular</span>
                            </div>
                            <div className="text-zinc-500 text-xs">$29/mo</div>
                        </div>
                        <ul className="space-y-2 mb-6 flex-1 text-sm text-zinc-300">
                             <li>500 Monthly Credits</li>
                             <li>Gemini 3 Pro</li>
                             <li>2K Res</li>
                             <li>Commercial Rights</li>
                        </ul>
                        <button className="w-full bg-white text-black font-bold py-2 rounded-md text-xs">Select</button>
                    </div>

                    <div className="bg-black border border-zinc-800 rounded-lg p-6 hover:border-zinc-600 transition-colors cursor-pointer flex flex-col" onClick={() => handleTierSelect(SubscriptionTier.Studio)}>
                        <div className="mb-4">
                            <div className="text-white font-bold text-lg mb-1">Studio</div>
                            <div className="text-zinc-500 text-xs">$99/mo</div>
                        </div>
                        <ul className="space-y-2 mb-6 flex-1 text-sm text-zinc-400">
                            <li>2,000 Credits</li>
                            <li>4K Ultra HD</li>
                            <li>Batch API</li>
                            <li>Priority Queue</li>
                        </ul>
                        <button className="w-full bg-zinc-900 text-white font-medium py-2 rounded-md border border-zinc-800 text-xs">Select</button>
                    </div>
                </div>
             </div>
        ) : (
             <div className="p-8">
                <button onClick={() => { setStep('selection'); setAuthMode('signup'); }} className="text-xs text-zinc-500 hover:text-white mb-6">← Back</button>
                <h2 className="text-xl font-bold text-white mb-6">
                    {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                </h2>
                
                <div className="space-y-4">
                    {authMode === 'signup' && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Username</label>
                            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-md py-2 px-3 text-white focus:border-zinc-500" />
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-md py-2 px-3 text-white focus:border-zinc-500" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} className="w-full bg-black border border-zinc-800 rounded-md py-2 px-3 text-white focus:border-zinc-500" />
                    </div>

                    {error && <div className="text-red-500 text-xs">{error}</div>}

                    <button onClick={handleSubmit} disabled={isLoading} className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-2.5 rounded-md transition-all mt-2">
                        {isLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : (authMode === 'signin' ? 'Continue' : 'Create Account')}
                    </button>
                    
                    <div className="pt-2 text-center">
                         <button onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} className="text-xs text-zinc-500 hover:text-white">
                            {authMode === 'signin' ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                         </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
