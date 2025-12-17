
import React from 'react';
import { X, Check, Zap, Crown, Building2, User } from 'lucide-react';
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
                <p className="text-zinc-500 text-sm">Professional tools for high-volume production.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* FREE */}
                <div className="bg-black border border-zinc-800 rounded-lg p-6 flex flex-col opacity-60 hover:opacity-100 transition-opacity">
                    <div className="mb-8">
                        <div className="text-zinc-500 font-bold uppercase text-xs mb-2">Guest</div>
                        <div className="text-3xl font-bold text-white">Free</div>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1 text-sm text-zinc-400">
                        <li>5 Images / Day</li>
                        <li>Standard Model</li>
                        <li>1K Resolution</li>
                    </ul>
                    <button onClick={onClose} className="w-full bg-zinc-900 text-white py-3 rounded-md border border-zinc-800 text-xs font-medium">Current</button>
                </div>

                {/* STARTER */}
                <div className="bg-black border border-zinc-800 rounded-lg p-6 flex flex-col hover:border-zinc-600 transition-colors">
                     <div className="mb-8">
                        <div className="text-zinc-400 font-bold uppercase text-xs mb-2">Starter</div>
                        <div className="text-3xl font-bold text-white">$9<span className="text-sm text-zinc-500 font-normal">/mo</span></div>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1 text-sm text-zinc-400">
                        <li className="text-zinc-200 font-medium">100 Standard Images/Mo</li>
                        <li>Flash Model Only</li>
                        <li>1K Resolution</li>
                        <li>Commercial Rights</li>
                    </ul>
                    <button onClick={() => onUpgrade(SubscriptionTier.Starter)} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 rounded-md border border-zinc-700 text-xs">Upgrade</button>
                </div>

                {/* CREATOR */}
                <div className="bg-zinc-900/20 border border-zinc-600 rounded-lg p-6 flex flex-col relative shadow-lg shadow-white/5">
                    <div className="absolute top-4 right-4 bg-white text-black px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase">Popular</div>
                    <div className="mb-8">
                        <div className="text-white font-bold uppercase text-xs mb-2">Creator</div>
                        <div className="text-3xl font-bold text-white">$29<span className="text-sm text-zinc-500 font-normal">/mo</span></div>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1 text-sm text-zinc-300">
                         <li className="text-white font-medium">50 Pro / 500 Standard</li>
                         <li>Gemini 3 Pro + Flash</li>
                         <li>2K Resolution</li>
                         <li>Editorial Styles</li>
                    </ul>
                    <button onClick={() => onUpgrade(SubscriptionTier.Creator)} className="w-full bg-white hover:bg-zinc-200 text-black font-bold py-3 rounded-md text-xs">Upgrade</button>
                </div>

                {/* STUDIO */}
                <div className="bg-black border border-zinc-800 rounded-lg p-6 flex flex-col hover:border-zinc-600 transition-colors">
                     <div className="mb-8">
                        <div className="text-zinc-400 font-bold uppercase text-xs mb-2">Studio</div>
                        <div className="text-3xl font-bold text-white">$99<span className="text-sm text-zinc-500 font-normal">/mo</span></div>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1 text-sm text-zinc-400">
                        <li className="text-zinc-200 font-medium">200 Pro / 2k Standard</li>
                        <li>4K Ultra HD</li>
                        <li>Priority Queue</li>
                        <li>Commercial Rights</li>
                    </ul>
                    <button onClick={() => onUpgrade(SubscriptionTier.Studio)} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold py-3 rounded-md border border-zinc-700 text-xs">Upgrade</button>
                </div>
            </div>
            
            <div className="mt-12 pt-8 border-t border-zinc-900 grid grid-cols-4 gap-4 text-center">
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
