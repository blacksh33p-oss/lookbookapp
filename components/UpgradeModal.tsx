
import React from 'react';
import { X, Check, Zap, Crown, Sparkles, Building2, User } from 'lucide-react';
import { SubscriptionTier } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (tier: SubscriptionTier) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
        >
            <X size={20} />
        </button>
        
        <div className="p-8 lg:p-12">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-white mb-3">Choose Your Studio Plan</h2>
                <p className="text-slate-400">Scale your fashion photography with AI that understands texture and fit.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* FREE TIER */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 flex flex-col relative group hover:border-slate-700 transition-all">
                    <div className="mb-4">
                        <div className="text-slate-400 font-bold tracking-wider uppercase text-xs mb-1">Starter</div>
                        <div className="text-3xl font-bold text-white">Free</div>
                        <div className="text-slate-500 text-sm mt-1">For testing concepts</div>
                    </div>
                    
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-start gap-2 text-sm text-slate-300">
                            <Check size={16} className="text-slate-500 mt-0.5" />
                            <span>5 Free Generations</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-300">
                            <Check size={16} className="text-slate-500 mt-0.5" />
                            <span>Flash Model Only (Gemini 2.5)</span>
                        </li>
                         <li className="flex items-start gap-2 text-sm text-slate-300">
                            <Check size={16} className="text-slate-500 mt-0.5" />
                            <span>No Watermarks</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-500 line-through decoration-slate-600">
                            <X size={16} className="text-slate-700 mt-0.5" />
                            <span>No Gemini 3 Pro Generations</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-500 line-through decoration-slate-600">
                            <X size={16} className="text-slate-700 mt-0.5" />
                            <span>No "Same Model" Consistency</span>
                        </li>
                    </ul>

                    <button 
                        onClick={onClose}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-semibold py-3 rounded-xl transition-all"
                    >
                        Current Plan
                    </button>
                </div>

                {/* CREATOR TIER */}
                <div className="bg-slate-900 border border-brand-500/50 rounded-2xl p-6 flex flex-col relative shadow-xl shadow-brand-900/10 transform scale-105 z-10">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-indigo-500"></div>
                    <div className="absolute top-4 right-4 bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-brand-500/30">
                        Most Popular
                    </div>

                    <div className="mb-4">
                        <div className="text-brand-400 font-bold tracking-wider uppercase text-xs mb-1 flex items-center gap-1">
                            <User size={12} /> Creator
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-white">$29</span>
                            <span className="text-slate-500 text-sm">/mo</span>
                        </div>
                        <div className="text-slate-400 text-sm mt-1">For social media & depop</div>
                    </div>
                    
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-start gap-2 text-sm text-white font-medium">
                            <div className="bg-brand-500/20 p-0.5 rounded-full text-brand-400"><Check size={12} /></div>
                            <span>40 Pro Credits (Gemini 3)</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-300">
                            <div className="bg-brand-500/20 p-0.5 rounded-full text-brand-400"><Check size={12} /></div>
                            <span>Unlimited Flash Generations</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-300">
                            <div className="bg-brand-500/20 p-0.5 rounded-full text-brand-400"><Check size={12} /></div>
                            <span>"Same Model" Consistency</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-300">
                            <div className="bg-brand-500/20 p-0.5 rounded-full text-brand-400"><Check size={12} /></div>
                            <span>No Watermarks</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-300">
                            <div className="bg-brand-500/20 p-0.5 rounded-full text-brand-400"><Check size={12} /></div>
                            <span>2K Resolution</span>
                        </li>
                    </ul>

                    <button 
                        onClick={() => onUpgrade(SubscriptionTier.Creator)}
                        className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-brand-500/25"
                    >
                        Upgrade to Creator
                    </button>
                </div>

                {/* STUDIO TIER */}
                <div className="bg-slate-950/50 border border-amber-500/30 rounded-2xl p-6 flex flex-col relative group hover:border-amber-500/50 transition-all">
                     <div className="mb-4">
                        <div className="text-amber-500 font-bold tracking-wider uppercase text-xs mb-1 flex items-center gap-1">
                            <Building2 size={12} /> Studio
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold text-white">$99</span>
                            <span className="text-slate-500 text-sm">/mo</span>
                        </div>
                        <div className="text-slate-500 text-sm mt-1">For brands & catalogs</div>
                    </div>
                    
                    <ul className="space-y-3 mb-8 flex-1">
                        <li className="flex items-start gap-2 text-sm text-white font-medium">
                            <div className="bg-amber-500/20 p-0.5 rounded-full text-amber-500"><Check size={12} /></div>
                            <span>200 Pro Credits (Gemini 3)</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-300">
                            <div className="bg-amber-500/20 p-0.5 rounded-full text-amber-500"><Check size={12} /></div>
                            <span>4K Ultra HD Resolution</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-300">
                            <div className="bg-amber-500/20 p-0.5 rounded-full text-amber-500"><Check size={12} /></div>
                            <span>Specific Measurements (Fit)</span>
                        </li>
                         <li className="flex items-start gap-2 text-sm text-slate-300">
                            <div className="bg-amber-500/20 p-0.5 rounded-full text-amber-500"><Check size={12} /></div>
                            <span>Editorial & Pro Styles</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-300">
                            <div className="bg-amber-500/20 p-0.5 rounded-full text-amber-500"><Check size={12} /></div>
                            <span>Commercial License</span>
                        </li>
                    </ul>

                    <button 
                        onClick={() => onUpgrade(SubscriptionTier.Studio)}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-amber-500 font-bold py-3 rounded-xl transition-all border border-amber-500/20 hover:border-amber-500/50"
                    >
                        Upgrade to Studio
                    </button>
                </div>

            </div>
            
            <p className="text-center text-xs text-slate-500 mt-8">
                Enterprise Batch API available for volume >1000/mo. Contact sales.
            </p>
        </div>
      </div>
    </div>
  );
};
