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
    "Pro 3 Model Access",
    "2K High Detail",
    "Premium Styles",
    "Model & Identity Locking",
    "Manual Pose Selection"
  ],
  [SubscriptionTier.Studio]: [
    "2000 Monthly Credits",
    "Pro 3 Model Access",
    "4K Production Upscale",
    "Premium Styles",
    "Model & Identity Locking",
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-heritage-navy/98 backdrop-blur-xl overflow-y-auto">
      <div className="w-full max-w-6xl my-auto relative animate-fade-in">
        
        {/* Close Button */}
        <button onClick={onClose} className="absolute -top-12 right-0 text-heritage-gold/40 hover:text-heritage-gold transition-colors flex items-center gap-2 group">
          <span className="text-[10px] uppercase tracking-[0.3em] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Close</span>
          <X size={20} strokeWidth={1} />
        </button>
        
        <div className="text-center mb-16 space-y-4">
          <h2 className="font-serif text-4xl md:text-5xl italic text-heritage-ivory tracking-tight">Membership Collection</h2>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-8 bg-heritage-gold/30"></div>
            <p className="text-heritage-gold/60 text-[10px] uppercase tracking-[0.5em] font-medium">Select your preferred access tier</p>
            <div className="h-px w-8 bg-heritage-gold/30"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLAN_DETAILS.map((plan) => {
            const features = TIER_FEATURES[plan.id];
            const isCurrent = plan.id === currentTier;
            
            return (
              <div 
                key={plan.id} 
                className={`flex flex-col h-full transition-all duration-700 relative overflow-hidden
                  ${plan.featured ? 'bg-heritage-ebony border-heritage-gold/40 shadow-2xl scale-[1.02]' : 'bg-transparent border-heritage-gold/10 hover:border-heritage-gold/30'}
                  border p-10 group`}
              >
                {/* Visual Accent */}
                <div className={`absolute top-0 left-0 w-full h-[2px] transition-colors duration-500 ${plan.featured ? 'bg-heritage-gold' : 'bg-transparent group-hover:bg-heritage-gold/20'}`}></div>
                
                <div className="mb-10 text-center">
                  <span className="font-serif italic text-heritage-gold/90 text-xl block mb-6">{plan.name}</span>
                  <div className="flex items-start justify-center">
                    <span className="text-heritage-gold/60 text-sm mt-1">$</span>
                    <span className="text-5xl font-light text-heritage-ivory tracking-tighter">{plan.price}</span>
                  </div>
                  <span className="text-[9px] text-heritage-gold/40 uppercase tracking-widest mt-2 block">{plan.subtext}</span>
                </div>

                <div className="h-px w-full bg-heritage-gold/10 mb-10"></div>

                <div className="space-y-4 flex-1 mb-12">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 group/item">
                      <Check size={10} className="text-heritage-gold/40 shrink-0 mt-1 transition-colors group-hover/item:text-heritage-gold" strokeWidth={3} />
                      <span className="text-[11px] leading-relaxed text-heritage-ivory/60 font-light tracking-wide group-hover/item:text-heritage-ivory transition-colors">{f}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => onUpgrade(plan.id)}
                  disabled={isCurrent}
                  className={`w-full py-5 text-[9px] heritage-button border transition-all duration-500
                    ${isCurrent ? 'border-heritage-gold/10 text-heritage-gold/20 cursor-default' : 
                      plan.featured ? 'bg-heritage-ivory text-heritage-ebony border-heritage-ivory hover:bg-white' : 
                      'border-heritage-gold/40 text-heritage-gold hover:border-heritage-gold hover:bg-heritage-gold/5'}`}
                >
                  {isCurrent ? "ACTIVE STATUS" : "CHOOSE PLAN"}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-20 text-center opacity-40 hover:opacity-100 transition-opacity">
            <p className="text-[9px] text-heritage-gold uppercase tracking-[0.4em] mb-4">Terms and conditions apply to all memberships</p>
            <div className="flex items-center justify-center gap-8 text-[8px] text-heritage-ivory/40 uppercase tracking-widest">
              <span>Encrypted Checkout</span>
              <div className="w-1 h-1 rounded-full bg-heritage-gold/20"></div>
              <span>Immediate Activation</span>
              <div className="w-1 h-1 rounded-full bg-heritage-gold/20"></div>
              <span>Cancel Anytime</span>
            </div>
        </div>
      </div>
    </div>
  );
};
