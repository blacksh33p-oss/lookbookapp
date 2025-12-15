
import React from 'react';
import { ChevronDown } from 'lucide-react';

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
  return (
    <div className="flex flex-col gap-2">
      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{label}</label>
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          disabled={disabled}
          className="w-full appearance-none bg-black border border-zinc-800 text-white text-xs font-mono uppercase rounded-none px-4 py-2.5 focus:border-white focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed group-hover:border-zinc-700"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600">
          <ChevronDown size={14} />
        </div>
      </div>
    </div>
  );
};
