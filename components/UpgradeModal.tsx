import React from 'react';
import { X, ChevronRight } from 'lucide-react';
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
    "5 Daily Drafts",
    "Flash 2.5 Access"
  ],
  [SubscriptionTier.Starter]: [
    "100 Monthly Credits",
    "Flash 2.5 Access",
    "Manual Pose Selection"
  ],
  [SubscriptionTier.Creator]: [
    "500 Monthly Credits",
    "Pro 3 Model",
    "2K High Detail",
    "Premium Styles",
    "Model & Identity",
    "Manual Pose Selection"
  ],
  [SubscriptionTier.Studio]: [
    "2000 Monthly Credits",
    "Pro 3 Model",
    "4K Upscale",
    "Premium Styles",
    "Model & Identity",
    "Manual Pose Selection",
    "Layout Selection"
  ]
};

const PLAN_DATA = [
  { id: SubscriptionTier.Free, name: "GUEST", price: "0" },
  { id: SubscriptionTier.Starter, name: "STARTER", price: "9" },
  { id: SubscriptionTier.Creator, name: "CREATOR", price: "29" },
  { id: SubscriptionTier.Studio, name: "STUDIO", price: "99" }
];

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onUpgrade, currentTier }) => {
  if (!isOpen) return null;

  const currentRank = TIER_RANK[currentTier] ?? 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/98 backdrop-blur-2xl overflow-y-auto">
      <div className="w-full max-w-[1200px] my-auto relative py-16">
        
        {/* Editorial Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-0 right-0 p-4 text-zinc-500 hover:text-white transition-all z-50 group"
          aria-label="Close"
        >
          <X size={40} strokeWidth={1} className="group-hover:scale-110 transition-transform" />
        </button>

        {/* Brand Header */}
        <div className="mb-20 px-4">
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-zinc-600 mb-2">ACCESS CONTROL</p>
          <h2 className="font-serif text-4xl md:text-5xl text-white font-light italic">Subscription Specification</h2>
        </div>
        
        {/* Spec Sheet Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 w-full border-t border-white/10">
          {PLAN_DATA.map((plan, idx) => {
            const planRank = TIER_RANK[plan.id];
            const isCurrent = plan.id === currentTier;
            const isDowngrade = planRank < currentRank;
            const isUpgrade = planRank > currentRank;
            
            return (
              <div 
                key={plan.id} 
                className={`flex flex-col p-8 md:p-10 border-b md:border-b-0 md:border-r border-white/10 last:border-r-0 transition-colors hover:bg-white/[0.02]`}
              >
                {/* Plan Header */}
                <div className="mb-12">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 mb-8">{plan.name}</h3>
                  <div className="flex items-baseline">
                    <span className="font-serif text-6xl text-white font-light">{plan.price}</span>
                    <span className="text-[10px] font-bold text-zinc-700 ml-3 tracking-widest">USD / MO</span>
                  </div>
                </div>

                {/* Technical Features List */}
                <div className="space-y-4 flex-1 mb-16">
                  {TIER_FEATURES[plan.id].map((feature, i) => (
                    <div key={i} className="text-[11px] font-medium text-zinc-400 tracking-wide uppercase">
                      {feature}
                    </div>
                  ))}
                </div>

                {/* Logic Driven Actions */}
                <div className="mt-auto pt-8 border-t border-white/5">
                  {isCurrent ? (
                    <button
                      onClick={() => onUpgrade()}
                      className="text-[10px] font-black uppercase tracking-[0.3em] text-white underline underline-offset-8 hover:text-zinc-400 transition-colors"
                    >
                      Manage Plan
                    </button>
                  ) : isDowngrade ? (
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-700 opacity-50 cursor-default">
                      Included
                    </span>
                  ) : (
                    <button
                      onClick={() => onUpgrade(plan.id)}
                      className="w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                    >
                      Upgrade
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Specification Details */}
        <div className="mt-16 px-4 grid grid-cols-1 md:grid-cols-2 gap-8 opacity-20">
           <div className="space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-500">Service Standards</p>
              <p className="text-[9px] leading-relaxed text-zinc-600 uppercase">
                All monthly tiers include encrypted archival and priority GPU processing.
                Cancellations take effect at the end of the current billing cycle.
              </p>
           </div>
           <div className="flex items-end md:justify-end">
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-600">
                Secure Deployment &copy; 2025 FashionStudio.ai
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};