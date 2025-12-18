import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface DropdownProps<T> {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

export const Dropdown = <T extends string>({
  label,
  value,
  options,
  onChange,
  disabled
}: DropdownProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex flex-col gap-1.5" ref={containerRef}>
      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full flex items-center justify-between bg-black border rounded-md px-3 py-2.5 transition-all duration-200 outline-none
            ${disabled ? 'opacity-50 cursor-not-allowed border-zinc-900' : 'border-zinc-800 hover:border-zinc-600 focus:border-white'}
            ${isOpen ? 'border-white' : ''}
          `}
        >
          <span className="text-white text-xs font-mono tracking-tight truncate">{value}</span>
          <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-white' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-black border border-zinc-800 rounded-md shadow-2xl z-[80] overflow-hidden animate-fade-in max-h-64 overflow-y-auto custom-scrollbar">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 text-xs font-mono transition-colors flex items-center justify-between
                  ${value === opt ? 'bg-zinc-900 text-white' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white'}
                `}
              >
                {opt}
                {value === opt && <Check size={12} className="text-white" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};