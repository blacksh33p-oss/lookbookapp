
import React, { useState, useEffect } from 'react';
import { X, Mail, Loader2, User, Lock, Eye, EyeOff, Hexagon, AlertCircle } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuth: (email: string, password?: string, isSignUp?: boolean, username?: string) => Promise<void>;
  initialView?: 'login' | 'signup';
}

export const LoginModal: React.FC<LoginModalProps> = ({ 
  isOpen, 
  onClose, 
  onAuth, 
  initialView = 'signup' 
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialView === 'login' ? 'signin' : 'signup');
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
        setAuthMode(initialView === 'login' ? 'signin' : 'signup');
        setError(null); setEmail(''); setPassword(''); setUsername(''); setIsSuccess(false);
    }
  }, [isOpen, initialView]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) { setError("Please enter a valid email."); return; }
    if (authMode === 'signup' && (!username || username.length < 3)) { setError("Username must be at least 3 characters."); return; }
    if (!password || password.length < 6) { setError("Password must be at least 6 characters."); return; }
    
    setIsLoading(true);
    setError(null);

    try {
        await onAuth(email, password, authMode === 'signup', username);
        if (authMode === 'signup') setIsSuccess(true);
        else onClose();
    } catch (err: any) {
        setError(err.message || "Authentication failed. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  if (isSuccess) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-black border border-zinc-800 rounded-lg w-full max-w-md p-8 text-center relative shadow-2xl">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"><X size={16}/></button>
                <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-zinc-800">
                    <Mail className="text-white" size={20} />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Check your inbox</h3>
                <p className="text-zinc-500 mb-8 text-sm leading-relaxed">We sent a verification link to <span className="text-white font-medium">{email}</span>. Please verify your account to continue.</p>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all">Gmail</a>
                    <a href="https://outlook.live.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white py-2.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all">Outlook</a>
                </div>
                <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">
                    {resendTimer > 0 ? `Resend available in ${resendTimer}s` : <button onClick={() => setResendTimer(60)} className="hover:text-white transition-colors">Resend Verification Email</button>}
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      <div className="bg-black border border-zinc-800 rounded-xl w-full max-w-md overflow-hidden relative shadow-[0_0_100px_rgba(255,255,255,0.05)]">
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white z-20 transition-colors"><X size={18} /></button>

        <div className="p-10">
            <div className="mb-10 text-center">
                <div className="w-12 h-12 bg-white text-black rounded-lg flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Hexagon size={24} fill="currentColor" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2 tracking-tighter uppercase font-mono">
                    {authMode === 'signin' ? 'Welcome Back' : 'Create Account'}
                </h2>
                <p className="text-zinc-500 text-xs">Access pro-grade fashion photography AI</p>
            </div>
            
            <div className="space-y-5">
                {authMode === 'signup' && (
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Identity Name</label>
                        <div className="relative">
                            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-md py-3 px-4 pl-10 text-white focus:border-zinc-500 transition-all font-mono" placeholder="Your name or agency" />
                            <User className="absolute left-3 top-3.5 text-zinc-700" size={14} />
                        </div>
                    </div>
                )}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Email Address</label>
                    <div className="relative">
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-md py-3 px-4 pl-10 text-white focus:border-zinc-500 transition-all font-mono" placeholder="name@company.com" />
                        <Mail className="absolute left-3 top-3.5 text-zinc-700" size={14} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] pl-1">Secure Password</label>
                    <div className="relative">
                        <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} className="w-full bg-black border border-zinc-800 rounded-md py-3 px-4 pl-10 pr-10 text-white focus:border-zinc-500 transition-all font-mono" placeholder="••••••••" />
                        <Lock className="absolute left-3 top-3.5 text-zinc-700" size={14} />
                        <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-zinc-700 hover:text-white transition-colors">
                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold p-3 rounded-md flex items-start gap-2">
                        <AlertCircle size={14} className="shrink-0" />
                        {error}
                    </div>
                )}

                <button onClick={handleSubmit} disabled={isLoading} className="w-full bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-[0.2em] text-[10px] py-4 rounded-md transition-all mt-4 shadow-xl active:scale-[0.98] disabled:opacity-50">
                    {isLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : (authMode === 'signin' ? 'Continue' : 'Join Now')}
                </button>
                
                <div className="pt-6 text-center border-t border-zinc-900 mt-2">
                     <button onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} className="text-[10px] font-black text-zinc-500 hover:text-white uppercase tracking-widest transition-all">
                        {authMode === 'signin' ? "Don't have an account? Sign up" : "Already registered? Sign in"}
                     </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
