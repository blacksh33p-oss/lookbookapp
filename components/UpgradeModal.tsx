import React from 'react';
import { X, Check, Zap, Crown, Shield, Rocket } from 'lucide-react';
import { SubscriptionTier } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (tier?: SubscriptionTier) => void;
  currentTier: SubscriptionTier;
}

const TIER_FEATURES: Record<SubscriptionTier, string[]> = {
  [SubscriptionTier.Free]: [
    "50 One-Time Credits",
    "Flash 2.5 Access",
    "Community Support"
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
    "Lookbook Composition"
  ]
};

const PLAN_DETAILS = [
  { id: SubscriptionTier.Free, name: "Trial", price: "0", subtext: "One-time credits" },
  { id: SubscriptionTier.Starter, name: "Starter", price: "9", subtext: "For hobbyists" },
  { id: SubscriptionTier.Creator, name: "Creator", price: "29", subtext: "Professional use", featured: true },
  { id: SubscriptionTier.Studio, name: "Studio", price: "99", subtext: "Agency power" }
];

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onUpgrade, currentTier }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 bg-black/95 backdrop-blur-xl overflow-y-auto">
      <div className="w-full max-w-6xl my-auto relative animate-fade-in flex flex-col">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-12 sm:mb-16">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-white text-black rounded-md flex items-center justify-center shadow-lg shadow-white/10">
                <Crown size={16} fill="currentColor" />
             </div>
             <h2 className="text-xl font-black text-white uppercase tracking-tighter font-mono">Subscription <span className="text-zinc-500">Tiers</span></h2>
          </div>
          
          <button 
            onClick={onClose} 
            className="p-3 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 hover:text-white hover:border-zinc-600 transition-all flex items-center justify-center group"
            aria-label="Close"
          >
            <X size={20} className="group-hover:rotate-90 transition-transform duration-300" />
          </button>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLAN_DETAILS.map((plan) => {
            const features = TIER_FEATURES[plan.id];
            const isCurrent = plan.id === currentTier;
            
            return (
              <div 
                key={plan.id} 
                className={`flex flex-col h-full transition-all duration-300 relative border rounded-xl overflow-hidden
                  ${plan.featured 
                    ? 'bg-zinc-900/40 border-zinc-500 shadow-[0_0_40px_rgba(255,255,255,0.03)] scale-[1.02] z-10' 
                    : 'bg-zinc-950/20 border-zinc-800 hover:border-zinc-700'
                  }
                  p-8 sm:p-10 group`}
              >
                {/* Visual Accent */}
                {plan.featured && (
                   <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-zinc-500 via-white to-zinc-500"></div>
                )}
                
                <div className="mb-10 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">{plan.name}</span>
                    {isCurrent && (
                      <span className="text-[8px] bg-white/10 text-white px-2 py-0.5 rounded border border-white/20 font-black uppercase">Current</span>
                    )}
                  </div>
                  
                  <div className="flex items-baseline justify-center sm:justify-start gap-1">
                    <span className="text-zinc-600 text-xl font-mono">$</span>
                    <span className="text-5xl font-black text-white tracking-tighter font-mono">{plan.price}</span>
                    <span className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest ml-1">/mo</span>
                  </div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest mt-4 font-bold">{plan.subtext}</p>
                </div>

                <div className="h-px w-full bg-zinc-800 mb-10"></div>

                <div className="space-y-5 flex-1 mb-12">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-start gap-3 group/item">
                      <div className="mt-1 w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover/item:bg-white transition-colors"></div>
                      <span className="text-[11px] leading-relaxed text-zinc-400 font-bold uppercase tracking-tight group-hover/item:text-white transition-colors">
                        {f}
                      </span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => onUpgrade(plan.id)}
                  disabled={isCurrent}
                  className={`w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all duration-300
                    ${isCurrent ? 'bg-zinc-900 text-zinc-700 border border-zinc-800 cursor-not-allowed' : 
                      plan.featured ? 'bg-white text-black hover:bg-zinc-200' : 
                      'bg-zinc-900/50 border border-zinc-800 text-white hover:bg-white hover:text-black'}`}
                >
                  {isCurrent ? "Active" : "Select Tier"}
                </button>
              </div>
            );
          })}
        </div>

        {/* System Footer Info */}
        <div className="mt-16 flex flex-col sm:flex-row items-center justify-between gap-8 border-t border-zinc-900 pt-8 opacity-40 hover:opacity-100 transition-all duration-700">
            <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-zinc-600" />
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Encrypted Checkout</span>
                </div>
                <div className="flex items-center gap-3">
                  <Zap size={16} className="text-zinc-600" />
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Instant Activation</span>
                </div>
            </div>
            
            <div className="flex items-center gap-4 text-[9px] font-black text-zinc-700 uppercase tracking-tighter">
              <span>Privacy Policy</span>
              <span className="w-1 h-1 bg-zinc-800 rounded-full"></span>
              <span>Terms of Service</span>
              <span className="w-1 h-1 bg-zinc-800 rounded-full"></span>
              <span>System Status: Optimal</span>
            </div>
        </div>
      </div>
    </div>
  );
};