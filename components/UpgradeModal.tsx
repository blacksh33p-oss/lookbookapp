import React from 'react';
import { X, Check, Crown, Clock, ShieldCheck, ChevronRight } from 'lucide-react';
import { SubscriptionTier } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (tier?: SubscriptionTier) => void;
  currentTier: SubscriptionTier;
}

const TIER_RANK = {
  [SubscriptionTier.Free]: 0,
  [SubscriptionTier.Starter]: 1,
  [SubscriptionTier.Creator]: 2,
  [SubscriptionTier.Studio]: 3,
};

const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  [SubscriptionTier.Free]: [
    "5 Daily Draft Credits",
    "Gemini 2.5 Flash Rendering",
    "Standard Style Library",
    "Basic Layout Mode"
  ],
  [SubscriptionTier.Starter]: [
    "100 Monthly Credits",
    "Gemini 2.5 Flash Rendering",
    "Standard Style Library",
    "Basic Layout Mode"
  ],
  [SubscriptionTier.Creator]: [
    "500 Monthly Credits",
    "Gemini 3 Pro Precision Engine",
    "2K Editorial High-Detail",
    "Premium Style Collection",
    "Identity Locking Technology",
    "Manual Pose Selection"
  ],
  [SubscriptionTier.Studio]: [
    "2000 Monthly Credits",
    "Gemini 3 Pro Precision Engine",
    "4K Production Upscaling",
    "Diptych Editorial Layouts",
    "Premium Style Collection",
    "Priority Rendering Pipeline",
    "Full Commercial Rights"
  ]
};

const PLAN_DATA = [
  { id: SubscriptionTier.Free, name: "Guest", price: "0", label: "FREE FOREVER" },
  { id: SubscriptionTier.Starter, name: "Starter", price: "9", label: "FOR BEGINNERS" },
  { id: SubscriptionTier.Creator, name: "Creator", price: "29", label: "RECOMMENDED", popular: true },
  { id: SubscriptionTier.Studio, name: "Studio", price: "99", label: "FOR AGENCIES", premium: true }
];

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onUpgrade, currentTier }) => {
  if (!isOpen) return null;

  const currentRank = TIER_RANK[currentTier] ?? 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/98 backdrop-blur-xl overflow-y-auto">
      <div className="w-full max-w-[1400px] my-auto relative flex flex-col items-center">
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute -top-12 right-0 md:right-4 text-zinc-500 hover:text-white transition-colors flex items-center gap-2 group"
        >
          <span className="text-[10px] font-black uppercase tracking-[0.3em] group-hover:mr-2 transition-all">Close</span>
          <X size={20} strokeWidth={1} />
        </button>

        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-sm font-black uppercase tracking-[0.5em] text-zinc-500 mb-6">Select Your Access Tier</h2>
          <p className="font-serif text-4xl md:text-6xl text-white italic">The Collection</p>
        </div>
        
        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full px-4">
          {PLAN_DATA.map((plan) => {
            const planRank = TIER_RANK[plan.id];
            const isCurrent = plan.id === currentTier;
            const isDowngrade = planRank < currentRank;
            const isUpgrade = planRank > currentRank;
            
            const features = TIER_FEATURES[plan.id];

            return (
              <div 
                key={plan.id} 
                className={`flex flex-col p-10 bg-neutral-950 border transition-all duration-500 relative group
                  ${plan.popular ? 'border-white shadow-[0_0_40px_rgba(255,255,255,0.05)]' : 
                    plan.premium ? 'border-yellow-600 shadow-[0_0_40px_rgba(202,138,4,0.05)]' : 
                    'border-neutral-900 hover:border-neutral-700'}
                `}
              >
                {/* Visual Accent for Studio */}
                {plan.premium && (
                  <div className="absolute inset-0 opacity-20 pointer-events-none overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_#ca8a04_0%,_transparent_70%)]" />
                  </div>
                )}

                {/* Card Label */}
                <div className="mb-12 h-4">
                  <span className={`text-[9px] font-black uppercase tracking-[0.25em] 
                    ${plan.premium ? 'text-yellow-600' : 'text-zinc-500'}`}
                  >
                    {plan.label}
                  </span>
                </div>

                {/* Plan Identity */}
                <div className="mb-10">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">{plan.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-zinc-500 font-serif text-2xl">$</span>
                    <span className="font-serif text-7xl text-white">{plan.price}</span>
                    {plan.id !== SubscriptionTier.Free && (
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">/mo</span>
                    )}
                  </div>
                </div>

                {/* Feature List */}
                <div className="space-y-5 flex-1 mb-12">
                  {features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <Check size={12} className={`shrink-0 mt-0.5 ${plan.premium ? 'text-yellow-600' : 'text-white'}`} strokeWidth={3} />
                      <span className="text-[11px] font-medium leading-relaxed text-zinc-300">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Smart Action Button */}
                <div className="mt-auto">
                  {isCurrent ? (
                    <div className="w-full py-4 border border-zinc-800 flex items-center justify-center gap-2">
                      <Check size={14} className="text-emerald-500" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Current Plan</span>
                    </div>
                  ) : isDowngrade ? (
                    <div className="w-full py-4 border border-transparent flex items-center justify-center">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Included</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onUpgrade(plan.id)}
                      className={`w-full py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2 group/btn
                        ${plan.premium ? 'bg-yellow-600 text-black hover:bg-yellow-500 shadow-xl shadow-yellow-600/10' : 
                          plan.popular ? 'bg-white text-black hover:bg-zinc-200 shadow-xl' : 
                          'bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800'}
                      `}
                    >
                      {plan.id === SubscriptionTier.Free ? 'Join Community' : 'Upgrade Access'}
                      <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Fine Print / Footer */}
        <div className="mt-16 flex flex-col items-center gap-4 opacity-30 hover:opacity-100 transition-opacity">
           <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">FastSpring Secure Checkout & Enterprise Privacy Standard</p>
           <div className="flex items-center gap-6">
              <ShieldCheck size={16} strokeWidth={1.5} />
              <div className="h-px w-12 bg-zinc-800" />
              <Crown size={16} strokeWidth={1.5} />
              <div className="h-px w-12 bg-zinc-800" />
              <Clock size={16} strokeWidth={1.5} />
           </div>
        </div>
      </div>
    </div>
  );
};