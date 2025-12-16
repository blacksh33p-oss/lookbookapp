import React from 'react';
import { X, Check, Zap, Crown, Building2, User, Star, Infinity, Layers, Image as ImageIcon, ShieldCheck } from 'lucide-react';
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
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button 
            onClick={onClose}
            className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors z-20 bg-zinc-900/50 p-2 rounded-full hover:bg-zinc-800"
        >
            <X size={20} />
        </button>
        
        <div className="p-8 lg:p-12">
            <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">Upgrade your Studio</h2>
                <p className="text-zinc-400 max-w-xl mx-auto text-lg">Unlock professional models, 4K resolution, and commercial licensing rights.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                
                {/* FREE TIER */}
                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-8 flex flex-col relative group hover:border-zinc-700 transition-all">
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-zinc-800 rounded-lg text-zinc-400"><User size={20} /></div>
                            <span className="text-zinc-500 font-bold tracking-widest uppercase text-xs">Starter</span>
                        </div>
                        <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-4xl font-bold text-white">Free</span>
                        </div>
                        <p className="text-zinc-500 text-sm leading-relaxed">Perfect for testing the engine and personal concept exploration.</p>
                    </div>
                    
                    <div className="space-y-4 mb-8 flex-1">
                        <div className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-2">Features</div>
                        <ul className="space-y-3">
                            <li className="flex flex-col gap-1">
                                <div className="flex items-center gap-3 text-sm text-zinc-300">
                                    <div className="bg-zinc-800 p-1 rounded-full"><Zap size={10} className="text-zinc-400" /></div>
                                    <span>5 Daily Credits</span>
                                </div>
                                <div className="pl-8 text-[10px] text-zinc-600 font-mono">Refills every 24 hours</div>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-zinc-300">
                                <div className="bg-zinc-800 p-1 rounded-full"><Check size={10} className="text-zinc-400" /></div>
                                <span>Standard Model (Flash 2.5)</span>
                            </li>
                             <li className="flex items-center gap-3 text-sm text-zinc-300">
                                <div className="bg-zinc-800 p-1 rounded-full"><ImageIcon size={10} className="text-zinc-400" /></div>
                                <span>Standard 1K Resolution</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-zinc-500 line-through decoration-zinc-700 opacity-60">
                                <div className="p-1"><ShieldCheck size={12} /></div>
                                <span>Commercial License</span>
                            </li>
                        </ul>
                    </div>

                    <button 
                        onClick={onClose}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-4 rounded-xl transition-all border border-transparent hover:border-zinc-600"
                    >
                        Current Plan
                    </button>
                </div>

                {/* CREATOR TIER */}
                <div className="bg-zinc-900 border border-brand-500/50 rounded-2xl p-8 flex flex-col relative shadow-[0_0_50px_rgba(139,92,246,0.1)] transform md:-translate-y-4 z-10">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-500 to-indigo-500"></div>
                    <div className="absolute top-4 right-4 bg-gradient-to-r from-brand-600 to-indigo-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase shadow-lg border border-white/10">
                        Most Popular
                    </div>

                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-brand-500/10 rounded-lg text-brand-400 border border-brand-500/20"><Crown size={20} /></div>
                            <span className="text-brand-400 font-bold tracking-widest uppercase text-xs">Creator</span>
                        </div>
                        <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-4xl font-bold text-white">$29</span>
                            <span className="text-zinc-500 font-medium">/month</span>
                        </div>
                        <p className="text-zinc-400 text-sm leading-relaxed">For content creators, depop sellers, and social media managers.</p>
                    </div>
                    
                    <div className="space-y-4 mb-8 flex-1">
                        <div className="text-xs font-bold text-brand-300 uppercase tracking-widest mb-2">Everything in Free, plus:</div>
                        <ul className="space-y-4">
                            <li className="flex flex-col gap-1.5 p-2 bg-brand-500/5 rounded-lg border border-brand-500/10">
                                <div className="flex items-center gap-3 text-sm text-white font-medium">
                                    <div className="bg-brand-500 p-1 rounded-full text-white"><Star size={10} fill="currentColor" /></div>
                                    <span>500 Monthly Credits</span>
                                </div>
                                <div className="pl-8 flex flex-col gap-0.5">
                                    <div className="text-[10px] text-brand-200/80 font-mono flex items-center gap-1.5">
                                       <span className="w-1.5 h-1.5 bg-brand-400 rounded-full"></span>
                                       <b>50</b> Pro Shoots (Gemini 3)
                                    </div>
                                    <div className="text-[10px] text-zinc-500 font-mono ml-3">
                                       OR 500 Standard Shoots
                                    </div>
                                </div>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-zinc-200">
                                <div className="bg-brand-900/50 p-1 rounded-full text-brand-400"><Check size={10} /></div>
                                <span><strong className="text-white">Gemini 3 Pro</strong> Model Access</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-zinc-200">
                                <div className="bg-brand-900/50 p-1 rounded-full text-brand-400"><Check size={10} /></div>
                                <span>2K High-Res Upscaling</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-zinc-200">
                                <div className="bg-brand-900/50 p-1 rounded-full text-brand-400"><Check size={10} /></div>
                                <span>Access all <strong className="text-white">Editorial Styles</strong></span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-zinc-200">
                                <div className="bg-brand-900/50 p-1 rounded-full text-brand-400"><ShieldCheck size={10} /></div>
                                <span>Commercial Usage Rights</span>
                            </li>
                        </ul>
                    </div>

                    <button 
                        onClick={() => onUpgrade(SubscriptionTier.Creator)}
                        className="w-full bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-brand-500/25 border border-white/10"
                    >
                        Start Creator Trial
                    </button>
                    <p className="text-center text-[10px] text-zinc-500 mt-3">Cancel anytime. No questions asked.</p>
                </div>

                {/* STUDIO TIER */}
                <div className="bg-zinc-900/30 border border-amber-500/30 rounded-2xl p-8 flex flex-col relative group hover:border-amber-500/50 transition-all">
                     <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500 border border-amber-500/20"><Building2 size={20} /></div>
                            <span className="text-amber-500 font-bold tracking-widest uppercase text-xs">Studio</span>
                        </div>
                        <div className="flex items-baseline gap-1 mb-2">
                            <span className="text-4xl font-bold text-white">$99</span>
                            <span className="text-zinc-500 font-medium">/month</span>
                        </div>
                        <p className="text-zinc-500 text-sm leading-relaxed">For professional agencies, catalogs, and high-volume production.</p>
                    </div>
                    
                    <div className="space-y-4 mb-8 flex-1">
                        <div className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">Everything in Creator, plus:</div>
                        <ul className="space-y-4">
                            <li className="flex flex-col gap-1.5 p-2 bg-amber-500/5 rounded-lg border border-amber-500/10">
                                <div className="flex items-center gap-3 text-sm text-white font-medium">
                                    <div className="bg-amber-500 p-1 rounded-full text-black"><Infinity size={10} /></div>
                                    <span>2,000 Monthly Credits</span>
                                </div>
                                <div className="pl-8 flex flex-col gap-0.5">
                                    <div className="text-[10px] text-amber-200/80 font-mono flex items-center gap-1.5">
                                       <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                       <b>200</b> Pro Shoots (Gemini 3)
                                    </div>
                                    <div className="text-[10px] text-zinc-500 font-mono ml-3">
                                       OR 2,000 Standard Shoots
                                    </div>
                                </div>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-zinc-300">
                                <div className="bg-amber-900/30 p-1 rounded-full text-amber-500"><Check size={10} /></div>
                                <span><strong className="text-white">4K Ultra HD</strong> Resolution</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-zinc-300">
                                <div className="bg-amber-900/30 p-1 rounded-full text-amber-500"><Layers size={10} /></div>
                                <span>Batch API Access (CSV)</span>
                            </li>
                             <li className="flex items-center gap-3 text-sm text-zinc-300">
                                <div className="bg-amber-900/30 p-1 rounded-full text-amber-500"><Check size={10} /></div>
                                <span>Priority Processing Queue</span>
                            </li>
                            <li className="flex items-center gap-3 text-sm text-zinc-300">
                                <div className="bg-amber-900/30 p-1 rounded-full text-amber-500"><Check size={10} /></div>
                                <span>Dedicated Support</span>
                            </li>
                        </ul>
                    </div>

                    <button 
                        onClick={() => onUpgrade(SubscriptionTier.Studio)}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-amber-500 font-bold py-4 rounded-xl transition-all border border-amber-500/20 hover:border-amber-500/50"
                    >
                        Upgrade to Studio
                    </button>
                </div>

            </div>
            
            <div className="mt-12 pt-8 border-t border-zinc-800 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                 <div>
                    <div className="text-2xl font-bold text-white mb-1">100k+</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500">Images Generated</div>
                 </div>
                 <div>
                    <div className="text-2xl font-bold text-white mb-1">99.9%</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500">Uptime SLA</div>
                 </div>
                 <div>
                    <div className="text-2xl font-bold text-white mb-1">&lt; 15s</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500">Generation Time</div>
                 </div>
                 <div>
                    <div className="text-2xl font-bold text-white mb-1">24/7</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500">Expert Support</div>
                 </div>
            </div>

            <p className="text-center text-xs text-zinc-600 mt-8">
                Enterprise Batch API available for volume exceeding 1,000/mo. Contact sales.
            </p>

        </div>
      </div>
    </div>
  );
};