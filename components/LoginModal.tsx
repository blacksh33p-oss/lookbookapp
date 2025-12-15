
import React, { useState } from 'react';
import { X, Mail, ArrowRight, Loader2 } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string) => Promise<void>;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) {
        setError("Please enter a valid email address.");
        return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
        await onLogin(email);
        onClose();
    } catch (err: any) {
        setError(err.message || "Failed to login. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
        >
            <X size={20} />
        </button>
        
        <div className="p-8">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
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
                        <>Sign In <ArrowRight size={18} /></>
                    )}
                </button>
                
                <p className="text-center text-[10px] text-zinc-600 mt-4 leading-relaxed">
                    By signing in, you agree to our Terms of Service. We use magic links for passwordless security.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};
