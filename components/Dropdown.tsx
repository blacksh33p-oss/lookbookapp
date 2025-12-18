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
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</label>
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          disabled={disabled}
          className="w-full appearance-none bg-black border border-zinc-800 text-white text-xs rounded-md px-3 py-2.5 focus:border-zinc-500 focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed font-sans"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
          <ChevronDown size={14} />
        </div>
      </div>
    </div>
  );
};