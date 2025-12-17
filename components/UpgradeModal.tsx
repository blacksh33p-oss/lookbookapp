
import React from 'react';
import { X, Check, Zap, Crown, Building2, User, ArrowRight } from 'lucide-react';
import { SubscriptionTier } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (tier: SubscriptionTier) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onUpgrade }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      <div className="bg-black border border-zinc-800 rounded-xl w-full max-w-6xl overflow-hidden relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white z-20"><X size={20} /></button>
        
        <div className="p-8 lg:p-12">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Upgrade Plan</h2>
                <p className="text-zinc-500 text-sm">Unlock studio-quality AI generation.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
                {/* FREE - Faded */}
                <div className="bg-zinc-950 border border-zinc-800/50 rounded-lg p-6 flex flex-col opacity-60 hover:opacity-100 transition-opacity scale-95">
                    <div className="mb-6">
                        <div className="text-zinc-600 font-bold uppercase text-[10px] mb-1">Current</div>
                        <div className="text-2xl font-bold text-zinc-400">Guest</div>
                    </div>
                    <ul className="space-y-3 mb-6 flex-1 text-sm text-zinc-500">
                        <li>5 Daily Drafts</li>
                        <li>Standard Quality</li>
                        <li>Watermarked</li>
                    </ul>
                    <button onClick={onClose} className="w-full bg-zinc-900/50 text-zinc-500 py-2.5 rounded-md border border-zinc-800 text-xs font-medium cursor-default">Active</button>
                </div>

                {/* STARTER */}
                <div className="bg-black border border-zinc-800 rounded-lg p-6 flex flex-col hover:border-zinc-500 transition-colors h-full">
                     <div className="mb-6">
                        <div className="text-zinc-400 font-bold uppercase text-[10px] mb-1">Starter</div>
                        <div className="text-2xl font-bold text-white">$9<span className="text-sm text-zinc-500 font-normal">/mo</span></div>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1 text-sm text-zinc-400">
                        <li className="flex items-center gap-2"><Check size={12} className="text-zinc-500" /> <span className="text-zinc-200">100 Fast Drafts</span></li>
                        <li className="flex items-center gap-2"><Check size={12} className="text-zinc-500" /> Flash Model Only</li>
                        <li className="flex items-center gap-2"><Check size={12} className="text-zinc-500" /> No Watermark</li>
                    </ul>
                    <button onClick={() => onUpgrade(SubscriptionTier.Starter)} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 rounded-md border border-zinc-700 text-xs transition-all">Upgrade to Starter</button>
                </div>

                {/* CREATOR - HERO */}
                <div className="bg-white border border-transparent rounded-lg p-6 flex flex-col relative shadow-2xl shadow-white/10 transform scale-105 z-10 h-full justify-between">
                    <div className="absolute top-0 inset-x-0 h-1 bg-zinc-200 rounded-t-lg"></div>
                    <div>
                        <div className="flex justify-between items-start mb-2 mt-2">
                            <div>
                                <div className="text-black font-extrabold uppercase text-[10px] tracking-widest mb-1">Recommended</div>
                                <div className="text-3xl font-black text-black tracking-tight">$29<span className="text-sm text-zinc-600 font-medium">/mo</span></div>
                            </div>
                            <Crown size={20} className="text-black fill-black/10" />
                        </div>
                        <div className="h-px bg-zinc-200 w-full my-4"></div>
                        <ul className="space-y-3 mb-8 text-sm text-zinc-800">
                             <li className="flex items-center gap-2"><Check size={14} className="text-black stroke-[3px]" /> <span className="font-bold">50 Studio Quality</span></li>
                             <li className="flex items-center gap-2"><Check size={14} className="text-black" /> <span className="text-zinc-600">or 500 Fast Drafts</span></li>
                             <li className="flex items-center gap-2"><Check size={14} className="text-black" /> <span className="font-medium">Pro Model (V3)</span></li>
                             <li className="flex items-center gap-2"><Check size={14} className="text-black" /> 2K Resolution</li>
                             <li className="flex items-center gap-2"><Check size={14} className="text-black" /> Commercial Rights</li>
                        </ul>
                    </div>
                    <button onClick={() => onUpgrade(SubscriptionTier.Creator)} className="w-full bg-black text-white hover:bg-zinc-800 font-bold py-3.5 rounded-md text-xs transition-all flex items-center justify-center gap-2 shadow-lg">
                        Get Creator Access <ArrowRight size={12} />
                    </button>
                </div>

                {/* STUDIO */}
                <div className="bg-black border border-zinc-800 rounded-lg p-6 flex flex-col hover:border-zinc-500 transition-colors h-full">
                     <div className="mb-6">
                        <div className="text-zinc-400 font-bold uppercase text-[10px] mb-1">Agency</div>
                        <div className="text-2xl font-bold text-white">$99<span className="text-sm text-zinc-500 font-normal">/mo</span></div>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1 text-sm text-zinc-400">
                        <li className="flex items-center gap-2"><Check size={12} className="text-zinc-500" /> <span className="text-zinc-200">200 Studio Quality</span></li>
                        <li className="flex items-center gap-2"><Check size={12} className="text-zinc-500" /> 4K Ultra HD</li>
                        <li className="flex items-center gap-2"><Check size={12} className="text-zinc-500" /> Priority Support</li>
                    </ul>
                    <button onClick={() => onUpgrade(SubscriptionTier.Studio)} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 rounded-md border border-zinc-700 text-xs transition-all">Upgrade to Studio</button>
                </div>
            </div>
            
            <div className="mt-12 pt-8 border-t border-zinc-900 grid grid-cols-2 md:grid-cols-4 gap-4 text-center opacity-70">
                 <div><div className="text-xl font-bold text-white">100k+</div><div className="text-[10px] uppercase text-zinc-600">Generated</div></div>
                 <div><div className="text-xl font-bold text-white">99.9%</div><div className="text-[10px] uppercase text-zinc-600">Uptime</div></div>
                 <div><div className="text-xl font-bold text-white">&lt;15s</div><div className="text-[10px] uppercase text-zinc-600">Latency</div></div>
                 <div><div className="text-xl font-bold text-white">24/7</div><div className="text-[10px] uppercase text-zinc-600">Support</div></div>
            </div>
        </div>
      </div>
    </div>
  );
};
