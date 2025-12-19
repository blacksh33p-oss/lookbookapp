import React from 'react';
import { X, Check, Crown, ExternalLink, ShieldCheck, Clock } from 'lucide-react';
import { SubscriptionTier } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: (tier?: SubscriptionTier) => void;
  currentTier: SubscriptionTier;
}

const ACCOUNT_PORTAL_URL = (import.meta as any).env?.VITE_ACCOUNT_PORTAL_URL || 'https://lookbook.test.onfastspring.com/account';

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

const PLAN_DETAILS = [
  { id: SubscriptionTier.Free, name: "The Guest", price: "Free", credits: "5 Daily" },
  { id: SubscriptionTier.Starter, name: "The Starter", price: "$9", credits: "100 Monthly" },
  { id: SubscriptionTier.Creator, name: "The Creator", price: "$29", credits: "500 Monthly", popular: true },
  { id: SubscriptionTier.Studio, name: "The Studio", price: "$99", credits: "2000 Monthly", premium: true }
];

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, onUpgrade, currentTier }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-heritage-navy/95 backdrop-blur-md overflow-y-auto">
      <div className="bg-heritage-navy border border-heritage-gold/20 w-full max-w-7xl my-auto relative shadow-[0_40px_100px_rgba(0,0,0,0.8)] overflow-hidden">
        {/* Background Decorative Element */}
        <div className="absolute top-0 left-0 w-full h-1 bg-heritage-gold/30"></div>
        
        <button onClick={onClose} className="absolute top-8 right-8 text-heritage-gold/40 hover:text-heritage-gold z-20 transition-colors">
          <X size={24} strokeWidth={1} />
        </button>
        
        <div className="p-12 md:p-16">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-serif text-4xl md:text-5xl italic text-heritage-ivory tracking-tight">The Membership Collection</h2>
            <p className="text-heritage-gold/60 text-[11px] uppercase tracking-[0.6em] font-medium">Bespoke Access to Generative Excellence</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {PLAN_DETAILS.map((plan) => {
              const features = TIER_FEATURES[plan.id];
              const isCurrent = plan.id === currentTier;
              const isCreator = plan.id === SubscriptionTier.Creator;
              const isStudio = plan.id === SubscriptionTier.Studio;

              return (
                <div 
                  key={plan.id} 
                  className={`flex flex-col p-8 transition-all duration-700 relative h-full
                    ${isCreator ? 'bg-heritage-ebony border border-heritage-gold/40 shadow-2xl scale-[1.02] z-10' : 'bg-heritage-ebony/40 border border-heritage-gold/10'}
                    ${isStudio ? 'ring-1 ring-heritage-gold/20' : ''}`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-heritage-gold text-heritage-ebony text-[8px] font-black px-4 py-1.5 uppercase tracking-widest whitespace-nowrap">
                      Active Status
                    </div>
                  )}

                  {plan.popular && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-heritage-ivory text-heritage-ebony text-[8px] font-black px-4 py-1.5 uppercase tracking-widest whitespace-nowrap">
                      Recommended
                    </div>
                  )}
                  
                  <div className="mb-10 text-center">
                    <span className="font-serif italic text-heritage-gold/80 text-lg block mb-4">{plan.name}</span>
                    <div className="flex items-baseline justify-center gap-1 mb-2">
                      <span className="text-4xl font-light text-heritage-ivory">{plan.price}</span>
                      {plan.id !== SubscriptionTier.Free && (
                        <span className="text-heritage-gold/40 text-[10px] uppercase tracking-widest">/mo</span>
                      )}
                    </div>
                    <p className="text-[10px] text-heritage-gold/40 uppercase tracking-[0.2em]">{plan.credits} Credits</p>
                  </div>

                  <div className="h-px w-full bg-heritage-gold/10 mb-8"></div>

                  <div className="space-y-5 flex-1 mb-10">
                    {features.map((f, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <Check size={12} className="text-heritage-gold shrink-0 mt-0.5" strokeWidth={3} />
                        <span className="text-[11px] leading-relaxed text-heritage-ivory/70 font-light tracking-wide">{f}</span>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={() => onUpgrade(plan.id)}
                    disabled={isCurrent}
                    className={`w-full py-4 text-[10px] heritage-button border transition-all duration-500
                      ${isCurrent ? 'border-heritage-gold/20 text-heritage-gold/20 cursor-default' : 
                        plan.popular ? 'bg-heritage-gold text-heritage-ebony border-heritage-gold hover:bg-heritage-ivory hover:border-heritage-ivory' : 
                        'border-heritage-gold/30 text-heritage-gold hover:border-heritage-gold hover:bg-heritage-gold/5'}`}
                  >
                    {isCurrent ? "Current Tier" : "Select Plan"}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-16 border-t border-heritage-gold/10">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 border border-heritage-gold/20 flex items-center justify-center rounded-full">
                <ShieldCheck size={20} strokeWidth={1} className="text-heritage-gold" />
              </div>
              <h4 className="font-serif italic text-heritage-ivory text-lg">Elite Privacy</h4>
              <p className="text-[10px] text-heritage-gold/40 uppercase tracking-widest leading-relaxed">Your creative data remains strictly confidential and exclusive.</p>
            </div>
            
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 border border-heritage-gold/20 flex items-center justify-center rounded-full">
                <Clock size={20} strokeWidth={1} className="text-heritage-gold" />
              </div>
              <h4 className="font-serif italic text-heritage-ivory text-lg">Priority Support</h4>
              <p className="text-[10px] text-heritage-gold/40 uppercase tracking-widest leading-relaxed">Members receive expedited assistance from our technical concierge.</p>
            </div>

            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 border border-heritage-gold/20 flex items-center justify-center rounded-full">
                <Crown size={20} strokeWidth={1} className="text-heritage-gold" />
              </div>
              <h4 className="font-serif italic text-heritage-ivory text-lg">Bespoke Updates</h4>
              <p className="text-[10px] text-heritage-gold/40 uppercase tracking-widest leading-relaxed">Early access to experimental models and couture rendering tools.</p>
            </div>
          </div>

          <div className="mt-16 text-center">
            <a 
              href={ACCOUNT_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 text-[10px] heritage-button text-heritage-gold/60 hover:text-heritage-gold transition-colors"
            >
              Access Member Dashboard <ExternalLink size={14} strokeWidth={1} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
