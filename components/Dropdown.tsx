import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

interface DropdownProps<T> {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  disabled?: boolean;
  lockedOptions?: T[];
  onLockedClick?: () => void;
  requiredTier?: 'CREATOR' | 'STUDIO';
}

/**
 * DropdownTooltip Component
 * Internal component to handle portaled tooltips for restricted dropdown options.
 */
const DropdownTooltip: React.FC<{ tier: string; anchorRect: DOMRect | null }> = ({ tier, anchorRect }) => {
  if (!anchorRect) return null;

  return createPortal(
    <div 
      className="fixed z-[9999] pointer-events-none animate-fade-in -translate-x-full -translate-y-1/2"
      style={{ left: anchorRect.left - 12, top: anchorRect.top + anchorRect.height / 2 }}
    >
      <div className="bg-black/90 backdrop-blur-[12px] border-[0.5px] border-white/10 text-white text-[10px] font-bold px-3 py-1.5 rounded-md whitespace-nowrap uppercase tracking-wider shadow-2xl">
        Unlock with {tier} Tier
      </div>
      <div className="w-1.5 h-1.5 bg-black/90 border-r border-t border-white/10 rotate-45 absolute top-1/2 right-[-4px] -translate-y-1/2" />
    </div>,
    document.body
  );
};

export const Dropdown = <T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  lockedOptions = [],
  onLockedClick,
  requiredTier = 'CREATOR'
}: DropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredOptionRect, setHoveredOptionRect] = useState<DOMRect | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionClick = (opt: T) => {
    if (lockedOptions.includes(opt)) {
        if (onLockedClick) onLockedClick();
        return;
    }
    onChange(opt);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col gap-1.5" ref={dropdownRef}>
      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between bg-black border border-zinc-800 rounded-md px-3 py-2.5 text-xs text-white transition-all hover:border-zinc-600 focus:outline-none focus:border-white ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="truncate">{value}</span>
          <ChevronDown size={14} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-950 border border-zinc-800 rounded-md shadow-[0_25px_50px_-12px_rgba(0,0,0,1)] z-[100] py-1 animate-fade-in overflow-hidden max-h-[250px] overflow-y-auto custom-scrollbar">
            {options.map((opt) => {
              const isLocked = lockedOptions.includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  onMouseEnter={(e) => isLocked && setHoveredOptionRect(e.currentTarget.getBoundingClientRect())}
                  onMouseLeave={() => setHoveredOptionRect(null)}
                  onClick={() => handleOptionClick(opt)}
                  className={`w-full relative flex items-center justify-between px-4 py-3 text-xs text-left transition-all group 
                    ${opt === value ? 'bg-zinc-900 text-white font-bold' : 'text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200'}
                    ${isLocked ? 'grayscale opacity-40 hover:opacity-70 cursor-pointer' : ''}`}
                >
                  <div className="flex-1 min-w-0 mr-2">
                    <span className="block truncate">{opt}</span>
                  </div>
                  
                  {opt === value && !isLocked && (
                    <Check size={12} className="text-white shrink-0" />
                  )}
                </button>
              );
            })}
            {hoveredOptionRect && (
              <DropdownTooltip tier={requiredTier} anchorRect={hoveredOptionRect} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};