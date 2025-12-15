
import React, { useState } from 'react';
import { X, Mail, ArrowRight, Loader2, Check, User, Building2 } from 'lucide-react';
import { SubscriptionTier } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string) => Promise<void>;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [step, setStep] = useState<'selection' | 'email'>('selection');
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(SubscriptionTier.Free);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTierSelect = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
    setStep('email');
  };

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) {
        setError("Please enter a valid email address.");
        return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
        await onLogin(email);
        // Note: In a real app, you would pass the selectedTier to the backend 
        // or store it in localStorage to initiate Checkout after login redirect.
        if (selectedTier !== SubscriptionTier.Free) {
            localStorage.setItem('pending_plan', selectedTier);
        }
        onClose();
    } catch (err: any) {
        setError(err.message || "Failed to login. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

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
                    <p className="text-zinc-400">Select a plan to create your account or <button onClick={() => setStep('email')} className="text-brand-400 hover:underline font-bold">Sign In</button></p>
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
                    <button onClick={() => setStep('selection')} className="text-xs text-zinc-500 hover:text-white mb-4 flex items-center gap-1">← Back to plans</button>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {selectedTier === SubscriptionTier.Free ? 'Sign in' : `Join ${selectedTier}`}
                    </h2>
                    <p className="text-zinc-400 text-sm">Enter your email to receive a secure login link.</p>
                </div>
                
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Email Address</label>
                        <div className="relative group">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand-400 transition-colors" size={18} />
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                placeholder="you@example.com"
                                className="w-full bg-black border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-brand-500 transition-colors"
                            />
                        </div>
                        {error && <p className="text-red-400 text-xs">{error}</p>}
                    </div>

                    <button 
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : (
                            <>Continue <ArrowRight size={18} /></>
                        )}
                    </button>
                    
                    <p className="text-center text-[10px] text-zinc-600 mt-4 leading-relaxed">
                        By continuing, you agree to our Terms of Service.
                    </p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
