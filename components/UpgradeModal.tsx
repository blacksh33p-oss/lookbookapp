import React from 'react';
import { X, Check, Crown, Clock, ShieldCheck, ExternalLink } from 'lucide-react';
import { SubscriptionTier } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (tier?: SubscriptionTier) => void;
  currentTier: SubscriptionTier;
}

const ACCOUNT_PORTAL_URL = (import.meta as any).env?.VITE_ACCOUNT_PORTAL_URL || 'https://fashionstudio.onfastspring.com/account';

const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  [SubscriptionTier.Free]: [
    "5 Daily Drafts",
    "Gemini 2.5 Flash Access"
  ],
  [SubscriptionTier.Starter]: [
    "100 Monthly Credits",
    "Gemini 2.5 Flash Access"
  ],
  [SubscriptionTier.Creator]: [
    "500 Monthly Credits",
    "Gemini 2.5 Flash Access",
    "Gemini 3 Pro Access",
    "2K High Detail Rendering",
    "Premium Style Collection"
  ],
  [SubscriptionTier.Studio]: [
    "2000 Monthly Credits",
    "Gemini 2.5 Flash Access",
    "Gemini 3 Pro Access",
    "2K High Detail Rendering",
    "4K Production Upscaling",
    "Diptych Editorial Layouts",
    "Premium Style Collection"
  ]
};

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onUpgrade, currentTier }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-y-auto">
      <div className="bg-black border border-zinc-800 rounded-2xl w-full max-w-6xl my-auto relative shadow-[0_0_100px_rgba(255,255,255,0.05)]">
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white z-20 p-2 hover:bg-zinc-900 rounded-full transition-colors">
          <X size={20} />
        </button>
        
        <div className="p-6 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {[
              { id: SubscriptionTier.Free, name: "Guest", price: "Free", credits: "5/day", desc: "For experiments" },
              { id: SubscriptionTier.Starter, name: "Starter", price: "$9", credits: "100", desc: "For hobbyists" },
              { id: SubscriptionTier.Creator, name: "Creator", price: "$29", credits: "500", desc: "The pro standard", popular: true },
              { id: SubscriptionTier.Studio, name: "Studio", price: "$99", credits: "2000", desc: "Agency scale", premium: true }
            ].map((plan) => {
              const tierFeatures = TIER_FEATURES[plan.id];

              return (
                <div key={plan.id} className={`flex flex-col p-6 rounded-xl border transition-all duration-300 h-full ${plan.popular ? 'bg-zinc-900/50 border-zinc-500 scale-105 z-10 shadow-2xl shadow-zinc-500/10' : plan.premium ? 'bg-white border-transparent' : 'bg-black border-zinc-800 hover:border-zinc-700'}`}>
                  <div className="mb-6">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${plan.premium ? 'text-zinc-500' : 'text-zinc-400'}`}>{plan.name}</span>
                      {plan.popular && <span className="bg-zinc-100 text-black text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter">Popular</span>}
                      {plan.premium && <Crown size={14} className="text-black fill-black/10" />}
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-3xl font-black ${plan.premium ? 'text-black' : 'text-white'}`}>{plan.price}</span>
                      <span className={`text-xs font-medium ${plan.premium ? 'text-zinc-500' : 'text-zinc-500'}`}>{plan.id !== SubscriptionTier.Free && "/mo"}</span>
                    </div>
                    <p className={`text-[11px] font-bold mt-1 ${plan.premium ? 'text-black/60' : 'text-zinc-400'}`}>{plan.credits} Credits</p>
                  </div>

                  <div className={`h-px w-full mb-6 ${plan.premium ? 'bg-zinc-200' : 'bg-zinc-800'}`}></div>

                  <div className="space-y-4 flex-1 min-h-[340px]">
                    {tierFeatures.map((f, i) => (
                      <div key={i} className={`flex items-center gap-3 text-[10px] ${plan.premium ? 'text-black font-bold' : 'text-white'}`}>
                        <div className="w-4 h-4 flex items-center justify-center shrink-0">
                          <Check size={14} className={plan.premium ? "text-black" : "text-emerald-500"} strokeWidth={4} />
                        </div>
                        <span className="leading-tight">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-10">
            <button 
              onClick={() => window.open(ACCOUNT_PORTAL_URL, '_blank')}
              className="px-12 py-4 bg-white text-black rounded-md text-xs font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-zinc-200 transition-all flex items-center gap-3 active:scale-[0.98]"
            >
               Manage Subscription <ExternalLink size={14} />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-zinc-900 w-full">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-800">
                  <Clock size={16} className="text-zinc-400" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-white uppercase mb-1">Priority Support</h4>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">Studio tier users receive dedicated support and early access to experimental features.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-800">
                  <ShieldCheck size={16} className="text-zinc-400" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-white uppercase mb-1">Enterprise Privacy</h4>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">Your data and generated assets are never used to train our base models on paid tiers.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-800">
                  <ExternalLink size={16} className="text-zinc-400" />
                </div>
                <div>
                  <h4 className="text-[11px] font-bold text-white uppercase mb-1">Flexible Usage</h4>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">Switch plans anytime. Unused credits rollover for as long as your subscription is active.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};