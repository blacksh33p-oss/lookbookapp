
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
  const { measurementUnit, height, bodyType, measurements } = options;

  const updateMeasurements = (key: keyof typeof measurements, value: string) => {
      onChange({
          ...options,
          measurements: {
              ...measurements,
              [key]: value
          }
      });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
          <div className="space-y-2">
             <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider flex items-center justify-between">
                <span>Model Height</span>
                <div className="flex bg-black rounded-sm border border-zinc-800">
                    <button
                        onClick={() => onChange({ ...options, measurementUnit: MeasurementUnit.CM })}
                        className={`px-2 py-0.5 text-[9px] font-medium rounded-sm transition-all ${measurementUnit === MeasurementUnit.CM ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
                    >
                        CM
                    </button>
                    <button
                        onClick={() => onChange({ ...options, measurementUnit: MeasurementUnit.INCH })}
                        className={`px-2 py-0.5 text-[9px] font-medium rounded-sm transition-all ${measurementUnit === MeasurementUnit.INCH ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}
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
                    className="w-full bg-black border border-zinc-800 text-white rounded-md px-3 py-2.5 focus:border-zinc-500 transition-all font-mono text-xs placeholder:text-zinc-700"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 text-xs font-mono pointer-events-none">
                    {measurementUnit}
                </div>
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                Body Type
            </label>
            <div className="relative">
                <select
                    value={bodyType}
                    onChange={(e) => onChange({ ...options, bodyType: e.target.value as BodyType })}
                    className="w-full appearance-none bg-black border border-zinc-800 text-white rounded-md px-3 py-2.5 pr-10 focus:border-zinc-500 transition-all text-xs"
                >
                    {Object.values(BodyType).map((type) => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={14} />
            </div>
          </div>

          {/* Detailed Measurements - Logic Fix: Apply Unit Context */}
          <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                  { key: 'bust', label: 'Bust' },
                  { key: 'waist', label: 'Waist' },
                  { key: 'hips', label: 'Hips' }
              ].map(({key, label}) => (
                  <div key={key} className="space-y-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">{label}</label>
                      <div className="relative">
                        <input
                            type="text"
                            value={measurements[key as keyof typeof measurements]}
                            onChange={(e) => updateMeasurements(key as keyof typeof measurements, e.target.value)}
                            placeholder={measurementUnit === MeasurementUnit.CM ? "90" : "36"}
                            className="w-full bg-black border border-zinc-800 text-white rounded-md px-2 py-2 text-xs focus:border-zinc-500 font-mono text-center"
                        />
                         <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-zinc-600">{measurementUnit}</span>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
};
