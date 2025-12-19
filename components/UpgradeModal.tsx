
import React from 'react';
import { X, Check, Zap, Crown, Building2, User, ArrowRight, ExternalLink, Info, Lock, Sparkles, Monitor, Layout, ShieldCheck, Clock, Circle } from 'lucide-react';
import { SubscriptionTier } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (tier?: SubscriptionTier) => void;
  currentTier: SubscriptionTier;
}

interface PlanFeature {
  text: string;
  starter: boolean;
  creator: boolean;
  studio: boolean;
  highlight?: boolean;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onUpgrade, currentTier }) => {
  if (!isOpen) return null;

  const features: PlanFeature[] = [
    { text: "Gemini 2.5 Flash Access", starter: true, creator: true, studio: true },
    { text: "Gemini 3 Pro Access", starter: false, creator: true, studio: true },
    { text: "2K High Detail Rendering", starter: false, creator: true, studio: true },
    { text: "4K Production Upscaling", starter: false, creator: false, studio: true, highlight: true },
    { text: "Diptych Editorial Layouts", starter: false, creator: false, studio: true, highlight: true },
    { text: "Premium Style Collection", starter: false, creator: true, studio: true },
    { text: "Priority Rendering Queue", starter: false, creator: false, studio: true, highlight: true },
    { text: "Commercial Usage Rights", starter: true, creator: true, studio: true },
  ];

  const isPaidUser = currentTier !== SubscriptionTier.Free;

  const getButtonProps = (tier: SubscriptionTier) => {
    if (tier === currentTier) {
      return { text: "Current Plan", disabled: true, className: "bg-zinc-800 text-zinc-500 border-zinc-700 cursor-default" };
    }
    const tierOrder = { [SubscriptionTier.Free]: 0, [SubscriptionTier.Starter]: 1, [SubscriptionTier.Creator]: 2, [SubscriptionTier.Studio]: 3 };
    const isUpgrade = tierOrder[tier] > tierOrder[currentTier];
    
    if (isPaidUser && !isUpgrade) {
      return { text: "Manage in Portal", disabled: false, className: "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white" };
    }

    const baseStyle = tier === SubscriptionTier.Creator || tier === SubscriptionTier.Studio 
      ? "bg-white text-black hover:bg-zinc-200 shadow-lg shadow-white/5" 
      : "bg-zinc-900 text-white hover:bg-zinc-800 border-zinc-800";
      
    return { text: isUpgrade ? "Upgrade Now" : "Get Started", disabled: false, className: baseStyle };
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md overflow-y-auto">
      <div className="bg-black border border-zinc-800 rounded-2xl w-full max-w-6xl my-auto relative shadow-[0_0_100px_rgba(255,255,255,0.05)]">
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white z-20 p-2 hover:bg-zinc-900 rounded-full transition-colors">
          <X size={20} />
        </button>
        
        <div className="p-6 md:p-12">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-white mb-3 tracking-tighter uppercase font-mono text-gradient">Select Studio Tier</h2>
            <p className="text-zinc-500 text-sm max-w-lg mx-auto">Elevate your fashion production with the most advanced AI models and high-resolution output.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {/* TIER CARDS */}
            {[
              { id: SubscriptionTier.Free, name: "Guest", price: "Free", credits: "5/day", desc: "For quick experiments" },
              { id: SubscriptionTier.Starter, name: "Starter", price: "$9", credits: "100", desc: "For hobbyists" },
              { id: SubscriptionTier.Creator, name: "Creator", price: "$29", credits: "500", desc: "The pro standard", popular: true },
              { id: SubscriptionTier.Studio, name: "Studio", price: "$99", credits: "2000", desc: "Agency scale", premium: true }
            ].map((plan) => {
              const btn = getButtonProps(plan.id);
              return (
                <div key={plan.id} className={`flex flex-col p-6 rounded-xl border transition-all duration-300 ${plan.popular ? 'bg-zinc-900/50 border-zinc-500 scale-105 z-10' : plan.premium ? 'bg-white border-transparent' : 'bg-black border-zinc-800 hover:border-zinc-700'}`}>
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
                    <p className={`text-[11px] font-bold mt-1 ${plan.premium ? 'text-black/60' : 'text-zinc-400'}`}>{plan.credits} Credits Included</p>
                  </div>

                  <div className={`h-px w-full mb-6 ${plan.premium ? 'bg-zinc-200' : 'bg-zinc-800'}`}></div>

                  {/* Fixed height container for feature parity across cards */}
                  <div className="space-y-4 mb-8 flex-1 min-h-[300px]">
                    {features.map((f, i) => {
                      const isIncluded = plan.id === SubscriptionTier.Studio ? f.studio : plan.id === SubscriptionTier.Creator ? f.creator : plan.id === SubscriptionTier.Starter ? f.starter : false;
                      
                      return (
                        <div key={i} className={`flex items-center gap-3 text-[10px] transition-colors ${!isIncluded ? 'text-zinc-500' : plan.premium ? 'text-black font-bold' : 'text-white'}`}>
                          <div className="w-4 h-4 flex items-center justify-center shrink-0">
                            {isIncluded ? (
                                <Check size={14} className={plan.premium && f.highlight ? "text-black" : "text-emerald-500"} strokeWidth={4} />
                            ) : (
                                <Circle size={10} className="text-zinc-800" strokeWidth={2} />
                            )}
                          </div>
                          <span className="truncate">{f.text}</span>
                        </div>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => btn.disabled ? null : onUpgrade(plan.id)}
                    className={`w-full py-3 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${btn.className}`}
                  >
                    {btn.text}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-zinc-900">
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
  );
};
