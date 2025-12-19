import React from 'react';
import { X, Check } from 'lucide-react';
import { SubscriptionTier } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (tier?: SubscriptionTier) => void;
  currentTier: SubscriptionTier;
}

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

const PLAN_DETAILS = [
  { id: SubscriptionTier.Free, name: "The Guest", price: "0", subtext: "Daily limit" },
  { id: SubscriptionTier.Starter, name: "The Starter", price: "9", subtext: "Per month" },
  { id: SubscriptionTier.Creator, name: "The Creator", price: "29", subtext: "Per month", featured: true },
  { id: SubscriptionTier.Studio, name: "The Studio", price: "99", subtext: "Per month" }
];

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onUpgrade, currentTier }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-heritage-navy/95 backdrop-blur-md overflow-y-auto">
      <div className="w-full max-w-7xl my-auto relative animate-fade-in">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute -top-16 right-0 text-heritage-gold/60 hover:text-heritage-gold transition-colors flex items-center gap-3 group"
        >
          <span className="text-[10px] uppercase tracking-[0.4em] font-medium opacity-0 group-hover:opacity-100 transition-all duration-500">Close Gallery</span>
          <X size={24} strokeWidth={1} />
        </button>
        
        <div className="text-center mb-20 space-y-6">
          <h2 className="font-serif text-5xl md:text-6xl italic text-heritage-ivory tracking-tight">The Membership Collection</h2>
          <div className="flex items-center justify-center gap-6">
            <div className="h-[0.5px] w-12 bg-heritage-gold/40"></div>
            <p className="text-heritage-gold/60 text-[11px] uppercase tracking-[0.6em] font-medium">Bespoke Access for Professionals</p>
            <div className="h-[0.5px] w-12 bg-heritage-gold/40"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-heritage-gold/10 p-[0.5px]">
          {PLAN_DETAILS.map((plan) => {
            const features = TIER_FEATURES[plan.id];
            const isCurrent = plan.id === currentTier;
            
            return (
              <div 
                key={plan.id} 
                className={`flex flex-col h-full transition-all duration-1000 relative
                  ${plan.featured ? 'bg-heritage-ebony z-10' : 'bg-heritage-navy'}
                  p-12 group`}
              >
                {/* Plan Identity */}
                <div className="mb-12 text-center">
                  <span className="font-serif italic text-heritage-gold/80 text-xl block mb-8">{plan.name}</span>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-heritage-gold/40 text-lg font-light">$</span>
                    <span className="text-6xl font-light text-heritage-ivory tracking-tighter">{plan.price}</span>
                  </div>
                  <span className="text-[10px] text-heritage-gold/30 uppercase tracking-[0.3em] mt-4 block font-medium">{plan.subtext}</span>
                </div>

                {/* Horizontal Divider */}
                <div className="h-[0.5px] w-full bg-heritage-gold/10 mb-12"></div>

                {/* Features List */}
                <div className="space-y-6 flex-1 mb-16">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-start gap-4 group/item">
                      <Check size={12} className="text-heritage-gold/30 shrink-0 mt-0.5 transition-colors group-hover/item:text-heritage-gold" strokeWidth={3} />
                      <span className="text-[11px] leading-relaxed text-heritage-ivory/60 font-light tracking-wide group-hover/item:text-heritage-ivory transition-colors">
                        {f}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action Button */}
                <button 
                  onClick={() => onUpgrade(plan.id)}
                  disabled={isCurrent}
                  className={`w-full py-5 text-[10px] heritage-button border transition-all duration-700
                    ${isCurrent ? 'border-heritage-gold/10 text-heritage-gold/20 cursor-default' : 
                      plan.featured ? 'bg-heritage-gold text-heritage-ebony border-heritage-gold hover:bg-heritage-ivory hover:border-heritage-ivory' : 
                      'border-heritage-gold/20 text-heritage-gold/60 hover:border-heritage-gold hover:text-heritage-gold'}`}
                >
                  {isCurrent ? "Active Account" : "Select Membership"}
                </button>

                {/* Subtle Recommended Tag */}
                {plan.featured && !isCurrent && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 px-6 py-1.5 bg-heritage-gold text-heritage-ebony text-[8px] font-black uppercase tracking-[0.3em]">
                    Signature Tier
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Details */}
        <div className="mt-20 border-t border-heritage-gold/10 pt-10 flex flex-col md:flex-row justify-between items-center gap-8 opacity-40 hover:opacity-100 transition-all duration-1000">
            <div className="flex items-center gap-10">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-heritage-gold uppercase tracking-[0.4em] font-black">Private Studio</span>
                <span className="text-[8px] text-heritage-ivory/40 uppercase tracking-widest">End-to-end Encryption</span>
              </div>
              <div className="w-px h-6 bg-heritage-gold/10"></div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] text-heritage-gold uppercase tracking-[0.4em] font-black">Immediate Access</span>
                <span className="text-[8px] text-heritage-ivory/40 uppercase tracking-widest">Instant Provisioning</span>
              </div>
            </div>
            
            <p className="text-[8px] text-heritage-ivory/30 uppercase tracking-[0.5em] max-w-sm text-center md:text-right leading-loose">
              Membership confers access to the FashionStudio private engine. Standard terms of use and creative ownership apply.
            </p>
        </div>
      </div>
    </div>
  );
};
