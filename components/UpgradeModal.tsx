import React from 'react';
import { X, Check, ChevronRight } from 'lucide-react';
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
    "5 Daily Credits",
    "Flash Rendering Engine",
    "Standard Styles",
    "Basic Layout Mode"
  ],
  [SubscriptionTier.Starter]: [
    "100 Monthly Credits",
    "Flash Rendering Engine",
    "Standard Styles",
    "Basic Layout Mode"
  ],
  [SubscriptionTier.Creator]: [
    "500 Monthly Credits",
    "Pro Precision Engine",
    "2K High-Detail Output",
    "Premium Style Collection",
    "Manual Pose Selection"
  ],
  [SubscriptionTier.Studio]: [
    "2000 Monthly Credits",
    "Pro Precision Engine",
    "4K Production Upscaling",
    "Diptych Editorial Layouts",
    "Premium Style Collection"
  ]
};

const PLAN_DATA = [
  { id: SubscriptionTier.Free, name: "GUEST", price: "0", label: "FREE" },
  { id: SubscriptionTier.Starter, name: "STARTER", price: "9", label: "STARTER" },
  { id: SubscriptionTier.Creator, name: "CREATOR", price: "29", label: "POPULAR" },
  { id: SubscriptionTier.Studio, name: "STUDIO", price: "99", label: "PROFESSIONAL", premium: true }
];

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onUpgrade, currentTier }) => {
  if (!isOpen) return null;

  const currentRank = TIER_RANK[currentTier] ?? 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/98 backdrop-blur-2xl overflow-y-auto">
      <div className="w-full max-w-[1400px] my-auto relative flex flex-col items-center py-12">
        
        {/* Editorial Close Button */}
        <button 
          onClick={onClose} 
          className="fixed top-8 right-8 text-zinc-500 hover:text-white transition-all z-50 p-2 group"
          aria-label="Close pricing"
        >
          <X size={32} strokeWidth={1} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-20 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-[0.6em] text-zinc-600">Investment Selection</p>
          <h2 className="font-serif text-5xl md:text-7xl text-white italic">The Pricing Suite</h2>
        </div>
        
        {/* Editorial Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full px-4">
          {PLAN_DATA.map((plan) => {
            const planRank = TIER_RANK[plan.id];
            const isCurrent = plan.id === currentTier;
            const isDowngrade = planRank < currentRank;
            const isUpgrade = planRank > currentRank;
            
            // Border Logic
            let borderClass = 'border-neutral-800';
            if (isCurrent) borderClass = 'border-white';
            else if (plan.id === SubscriptionTier.Studio) borderClass = 'border-yellow-600';

            return (
              <div 
                key={plan.id} 
                className={`flex flex-col p-12 bg-neutral-950 border transition-all duration-700 relative group min-h-[600px] ${borderClass}`}
              >
                {/* Visual Label */}
                <div className="mb-14 h-4">
                  <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${plan.premium ? 'text-yellow-600' : 'text-zinc-500'}`}>
                    {plan.label}
                  </span>
                </div>

                {/* Plan Header */}
                <div className="mb-12">
                  <h3 className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400 mb-6">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-zinc-600 font-serif text-3xl">$</span>
                    <span className="font-serif text-7xl text-white">{plan.price}</span>
                    {plan.id !== SubscriptionTier.Free && (
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-700 ml-2">/MO</span>
                    )}
                  </div>
                </div>

                {/* Separator */}
                <div className="h-px w-full bg-neutral-900 mb-10" />

                {/* Feature List */}
                <div className="space-y-6 flex-1 mb-12">
                  {TIER_FEATURES[plan.id].map((feature, i) => (
                    <div key={i} className="flex items-start gap-4">
                      <Check size={14} className={`shrink-0 mt-0.5 ${plan.premium ? 'text-yellow-600' : 'text-white'}`} strokeWidth={2} />
                      <span className="text-[11px] font-medium leading-relaxed text-zinc-400 tracking-wide uppercase">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Smart Action Button */}
                <div className="mt-auto">
                  {isCurrent ? (
                    <button
                      onClick={() => onUpgrade()}
                      className="w-full py-5 border border-white flex items-center justify-center gap-3 group/btn hover:bg-white transition-all"
                    >
                      <Check size={14} className="text-emerald-500" strokeWidth={3} />
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white group-hover/btn:text-black">Current Plan</span>
                    </button>
                  ) : isDowngrade ? (
                    <div className="w-full py-5 border border-transparent flex items-center justify-center">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700">Included</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onUpgrade(plan.id)}
                      className={`w-full py-5 text-[10px] font-black uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-2 group/btn
                        ${plan.id === SubscriptionTier.Studio 
                          ? 'bg-yellow-600 text-black hover:bg-yellow-500' 
                          : 'bg-white text-black hover:bg-zinc-300'}
                      `}
                    >
                      Upgrade
                      <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Editorial Footer */}
        <div className="mt-24 pb-12 text-center space-y-8 max-w-lg">
           <div className="flex items-center justify-center gap-12 opacity-20">
              <div className="h-px w-24 bg-zinc-500" />
              <div className="h-px w-24 bg-zinc-500" />
           </div>
           <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-zinc-500 leading-loose">
             Secure payment via FastSpring. All prices in USD. Subscription terms are billed monthly and subject to archival policy.
           </p>
        </div>
      </div>
    </div>
  );
};