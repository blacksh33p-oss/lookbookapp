

import React from 'react';
import { X, Check, Zap, Crown, Building2, User, ArrowRight, ExternalLink, Info } from 'lucide-react';
import { SubscriptionTier } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (tier?: SubscriptionTier) => void;
  currentTier: SubscriptionTier;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onUpgrade, currentTier }) => {
  if (!isOpen) return null;

  const isPaidUser = currentTier !== SubscriptionTier.Free;

  const getButtonContent = (tier: SubscriptionTier, defaultText: string) => {
      // 1. Current Plan
      if (tier === currentTier) {
          return {
              text: "Current Plan",
              disabled: true,
              style: "cursor-default opacity-50 bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-800 hover:text-zinc-400"
          };
      }

      // 2. Paid User Logic
      if (isPaidUser) {
           const tierOrder: Record<string, number> = {
              [SubscriptionTier.Free]: 0,
              [SubscriptionTier.Starter]: 1,
              [SubscriptionTier.Creator]: 2,
              [SubscriptionTier.Studio]: 3,
           };
           
           const currentLevel = tierOrder[currentTier] || 0;
           const targetLevel = tierOrder[tier] || 0;

           if (targetLevel > currentLevel) {
               // UPGRADE: Allow immediate switch
               return { 
                   text: "Upgrade", 
                   disabled: false, 
                   style: "" // Uses default styles
               };
           } else {
               // DOWNGRADE: Hide button, force them to use "Manage" link to prevent immediate feature loss
               return { 
                   text: "Manage in Portal", 
                   disabled: true, 
                   style: "hidden" 
               };
           }
      }

      // 3. Free User (Buy)
      return {
          text: defaultText,
          disabled: false,
          style: ""
      };
  };

  const starterProps = getButtonContent(SubscriptionTier.Starter, "Select Starter");
  const creatorProps = getButtonContent(SubscriptionTier.Creator, "Get Creator Access");
  const studioProps = getButtonContent(SubscriptionTier.Studio, "Select Studio");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      <div className="bg-black border border-zinc-800 rounded-xl w-full max-w-6xl overflow-hidden relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white z-20"><X size={20} /></button>
        
        <div className="p-8 lg:p-12 relative">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">
                    {isPaidUser ? "Manage Plan" : "Upgrade Plan"}
                </h2>
                <p className="text-zinc-500 text-sm">Unlock studio-quality AI generation.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-center mb-8">
                {/* FREE - Faded */}
                <div className="bg-zinc-950 border border-zinc-800/50 rounded-lg p-6 flex flex-col opacity-60 hover:opacity-100 transition-opacity scale-95 h-full">
                    <div className="mb-6">
                        <div className="text-zinc-600 font-bold uppercase text-[10px] mb-1">Entry</div>
                        <div className="text-2xl font-bold text-zinc-400">Guest</div>
                    </div>
                    <ul className="space-y-3 mb-6 flex-1 text-sm text-zinc-500">
                        <li>5 Daily Drafts</li>
                        <li>Gemini Flash 2.5 Model</li>
                    </ul>
                    {currentTier === SubscriptionTier.Free && (
                        <div className="w-full py-2.5 rounded-md border border-zinc-800 text-xs font-medium bg-zinc-900/50 text-zinc-500 text-center cursor-default">
                             Active
                        </div>
                    )}
                </div>

                {/* STARTER */}
                <div className="bg-black border border-zinc-800 rounded-lg p-6 flex flex-col hover:border-zinc-500 transition-colors h-full">
                     <div className="mb-6">
                        <div className="text-zinc-400 font-bold uppercase text-[10px] mb-1">Starter</div>
                        <div className="text-2xl font-bold text-white">$9<span className="text-sm text-zinc-500 font-normal">/mo</span></div>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1 text-sm text-zinc-400">
                        <li className="flex items-center gap-2"><Check size={12} className="text-zinc-500" /> <span className="text-zinc-200">100 Credits</span></li>
                        <li className="flex items-center gap-2"><Check size={12} className="text-zinc-500" /> 100 Fast Drafts</li>
                        <li className="flex items-center gap-2"><Check size={12} className="text-zinc-500" /> Gemini Flash 2.5 Model</li>
                    </ul>
                    {/* BUTTON */}
                    {(!isPaidUser || currentTier !== SubscriptionTier.Starter) && (
                         <button 
                            onClick={() => !starterProps.disabled && onUpgrade(SubscriptionTier.Starter)}
                            disabled={starterProps.disabled}
                            className={`w-full font-bold py-3 rounded-md border border-zinc-700 text-xs transition-all ${starterProps.style || 'bg-zinc-900 hover:bg-zinc-800 text-white'}`}
                        >
                            {starterProps.text}
                        </button>
                    )}
                    {currentTier === SubscriptionTier.Starter && (
                        <div className="w-full py-3 rounded-md border border-zinc-700 text-xs font-medium bg-zinc-900 text-zinc-500 text-center cursor-default">Current Plan</div>
                    )}
                </div>

                {/* CREATOR - HERO */}
                <div className="bg-white border border-transparent rounded-lg p-6 flex flex-col relative shadow-2xl shadow-white/10 transform scale-105 z-10 h-full justify-between">
                    <div className="absolute top-0 inset-x-0 h-1 bg-zinc-200 rounded-t-lg"></div>
                    <div>
                        <div className="flex justify-between items-start mb-2 mt-2">
                            <div>
                                <div className="text-black font-extrabold uppercase text-[10px] tracking-widest mb-1">Most Popular</div>
                                <div className="text-3xl font-black text-black tracking-tight">$29<span className="text-sm text-zinc-600 font-medium">/mo</span></div>
                            </div>
                            <Crown size={20} className="text-black fill-black/10" />
                        </div>
                        <div className="h-px bg-zinc-200 w-full my-4"></div>
                        <ul className="space-y-3 mb-8 text-sm text-zinc-800">
                             <li className="flex items-center gap-2"><Check size={14} className="text-black stroke-[3px]" /> <span className="font-bold">500 Credits</span></li>
                             <li className="flex items-center gap-2"><Check size={14} className="text-black" /> 50 Studio Quality</li>
                             <li className="flex items-center gap-2"><Check size={14} className="text-black" /> <span className="text-zinc-600">or 500 Fast Drafts</span></li>
                             <li className="flex items-center gap-2"><Check size={14} className="text-black" /> Gemini Pro V3</li>
                             <li className="flex items-center gap-2"><Check size={14} className="text-black" /> 2K Resolution</li>
                        </ul>
                    </div>
                    {/* BUTTON */}
                    {(!isPaidUser || currentTier !== SubscriptionTier.Creator) && (
                        <button 
                            onClick={() => !creatorProps.disabled && onUpgrade(SubscriptionTier.Creator)}
                            disabled={creatorProps.disabled}
                            className={`w-full font-bold py-3.5 rounded-md text-xs transition-all flex items-center justify-center gap-2 shadow-lg ${creatorProps.style || 'bg-black text-white hover:bg-zinc-800'}`}
                        >
                            {creatorProps.text} {creatorProps.text === "Get Creator Access" && <ArrowRight size={12} />}
                        </button>
                    )}
                    {currentTier === SubscriptionTier.Creator && (
                        <div className="w-full py-3.5 rounded-md text-xs font-medium bg-zinc-200 text-zinc-500 text-center cursor-default">Current Plan</div>
                    )}
                </div>

                {/* STUDIO */}
                <div className="bg-black border border-zinc-800 rounded-lg p-6 flex flex-col hover:border-zinc-500 transition-colors h-full">
                     <div className="mb-6">
                        <div className="text-zinc-400 font-bold uppercase text-[10px] mb-1">Agency</div>
                        <div className="text-2xl font-bold text-white">$99<span className="text-sm text-zinc-500 font-normal">/mo</span></div>
                    </div>
                    <ul className="space-y-3 mb-8 flex-1 text-sm text-zinc-400">
                        <li className="flex items-center gap-2"><Check size={12} className="text-zinc-500" /> <span className="text-zinc-200">2000 Credits</span></li>
                        <li className="flex items-center gap-2"><Check size={12} className="text-zinc-500" /> 200 Studio Quality</li>
                        <li className="flex items-center gap-2"><Check size={12} className="text-zinc-500" /> <span className="text-zinc-500">or 2000 Fast Drafts</span></li>
                        <li className="flex items-center gap-2"><Check size={12} className="text-zinc-500" /> Gemini Pro V3</li>
                        <li className="flex items-center gap-2"><Check size={12} className="text-zinc-500" /> 4K Resolution Available</li>
                    </ul>
                    {/* BUTTON */}
                    {(!isPaidUser || currentTier !== SubscriptionTier.Studio) && (
                        <button 
                            onClick={() => !studioProps.disabled && onUpgrade(SubscriptionTier.Studio)}
                            disabled={studioProps.disabled}
                            className={`w-full font-bold py-3 rounded-md border border-zinc-700 text-xs transition-all ${studioProps.style || 'bg-zinc-900 hover:bg-zinc-800 text-white'}`}
                        >
                            {studioProps.text}
                        </button>
                    )}
                    {currentTier === SubscriptionTier.Studio && (
                        <div className="w-full py-3 rounded-md border border-zinc-700 text-xs font-medium bg-zinc-900 text-zinc-500 text-center cursor-default">Current Plan</div>
                    )}
                </div>
            </div>

            {/* MANAGEMENT FOOTER FOR PAID USERS */}
            {isPaidUser && (
                <div className="mt-8 pt-8 border-t border-zinc-900 text-center">
                    <p className="text-zinc-400 text-xs mb-4">
                        To downgrade or cancel, please visit your account portal.
                    </p>
                    <button 
                        onClick={() => onUpgrade()} 
                        className="bg-zinc-900 border border-zinc-700 text-white hover:bg-zinc-800 px-6 py-2.5 rounded-md font-bold text-xs inline-flex items-center gap-2"
                    >
                        Manage Subscription <ExternalLink size={12} />
                    </button>
                </div>
            )}
            
            {/* STATS FOOTER (Hidden if Management Footer is showing to save space) */}
            {!isPaidUser && (
                <div className="mt-12 pt-8 border-t border-zinc-900 grid grid-cols-2 md:grid-cols-4 gap-4 text-center opacity-70">
                    <div><div className="text-xl font-bold text-white">100k+</div><div className="text-[10px] uppercase text-zinc-600">Generated</div></div>
                    <div><div className="text-xl font-bold text-white">99.9%</div><div className="text-[10px] uppercase text-zinc-600">Uptime</div></div>
                    <div><div className="text-xl font-bold text-white">&lt;15s</div><div className="text-[10px] uppercase text-zinc-600">Latency</div></div>
                    <div><div className="text-xl font-bold text-white">24/7</div><div className="text-[10px] uppercase text-zinc-600">Support</div></div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};