
import React from 'react';
import { Ruler, ChevronDown, User } from 'lucide-react';
import { MeasurementUnit, PhotoshootOptions, BodyType } from '../types';

interface SizeControlProps {
  options: PhotoshootOptions;
  onChange: (newOptions: PhotoshootOptions) => void;
  isPremium: boolean;
  onUpgradeRequest: () => void;
}

export const SizeControl: React.FC<SizeControlProps> = ({ options, onChange, isPremium, onUpgradeRequest }) => {
  const { measurementUnit, height, bodyType } = options;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
          
          {/* Height Input */}
          <div className="space-y-2">
             <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2"><Ruler size={12} /> Model Height</span>
                <div className="flex bg-slate-900 rounded-md p-0.5 border border-slate-700">
                    <button
                        onClick={() => onChange({ ...options, measurementUnit: MeasurementUnit.CM })}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${measurementUnit === MeasurementUnit.CM ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        CM
                    </button>
                    <button
                        onClick={() => onChange({ ...options, measurementUnit: MeasurementUnit.INCH })}
                        className={`px-2 py-0.5 text-[10px] font-bold rounded transition-all ${measurementUnit === MeasurementUnit.INCH ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        IN
                    </button>
                </div>
             </label>
             <div className="relative">
                <input 
                    type="text"
                    value={height}
                    onChange={(e) => onChange({...options, height: e.target.value})}
                    placeholder={measurementUnit === MeasurementUnit.CM ? "e.g. 175" : "e.g. 5'9\""}
                    className="w-full bg-slate-950 border border-slate-700 hover:border-brand-500 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all font-medium placeholder:text-slate-600"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium pointer-events-none">
                    {measurementUnit}
                </div>
             </div>
          </div>

          {/* Body Type Dropdown */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <User size={12} /> Body Type
            </label>
            <div className="relative">
                <select
                    value={bodyType}
                    onChange={(e) => onChange({ ...options, bodyType: e.target.value as BodyType })}
                    className="w-full appearance-none bg-slate-950 border border-slate-700 hover:border-brand-500 text-white rounded-lg px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                >
                    {Object.values(BodyType).map((type) => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
            </div>
          </div>
      </div>
    </div>
  );
};
