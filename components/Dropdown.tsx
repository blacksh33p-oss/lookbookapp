
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Lock } from 'lucide-react';

interface DropdownProps<T> {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  disabled?: boolean;
  lockedOptions?: T[];
  onLockedClick?: () => void;
  lockReason?: string;
}

export const Dropdown = <T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
  lockedOptions = [],
  onLockedClick,
  lockReason = "Upgrade to unlock"
}: DropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
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
                  onClick={() => handleOptionClick(opt)}
                  className={`w-full relative flex items-center justify-between px-4 py-3 text-xs text-left transition-all group ${opt === value ? 'bg-zinc-900 text-white font-bold' : 'text-zinc-400 hover:bg-zinc-900/80 hover:text-zinc-200'}`}
                >
                  <span className={`truncate ${isLocked ? 'opacity-30' : ''}`}>{opt}</span>
                  
                  {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-0.5">
                            <Lock size={10} className="text-amber-500" />
                            <span className="text-[7px] font-black uppercase text-amber-500 tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Unlock</span>
                        </div>
                    </div>
                  )}

                  {opt === value && !isLocked && (
                    <Check size={12} className="text-white shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
