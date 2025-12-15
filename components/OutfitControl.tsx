
import React, { useState } from 'react';
import { ChevronDown, Image as ImageIcon } from 'lucide-react';
import { OutfitDetails, OutfitItem } from '../types';
import { ImageUploader } from './ImageUploader';

interface OutfitControlProps {
  outfit: OutfitDetails;
  onChange: (newOutfit: OutfitDetails) => void;
}

export const OutfitControl: React.FC<OutfitControlProps> = ({ outfit, onChange }) => {
  const [expandedItem, setExpandedItem] = useState<keyof OutfitDetails | null>('top');
  
  const [sizeChartMode, setSizeChartMode] = useState<Record<string, 'image' | 'text'>>({
    top: 'image',
    bottom: 'image',
    shoes: 'image',
    accessories: 'image'
  });

  const toggleItem = (key: keyof OutfitDetails) => {
    setExpandedItem(expandedItem === key ? null : key);
  };

  const updateItem = (key: keyof OutfitDetails, field: keyof OutfitItem, value: any) => {
    onChange({
      ...outfit,
      [key]: {
        ...outfit[key],
        [field]: value
      }
    });
  };

  const setMode = (key: string, mode: 'image' | 'text') => {
      setSizeChartMode(prev => ({ ...prev, [key]: mode }));
  };

  const items: { key: keyof OutfitDetails; label: string; placeholder: string; id: string }[] = [
    { key: 'top', label: 'Top', placeholder: 'Silk Blouse', id: '01' },
    { key: 'bottom', label: 'Bottom', placeholder: 'Pleated Skirt', id: '02' },
    { key: 'shoes', label: 'Footwear', placeholder: 'Leather Boots', id: '03' },
    { key: 'accessories', label: 'Accessory', placeholder: 'Gold Chain', id: '04' },
  ];

  return (
    <div className="space-y-4">
       <div className="flex flex-col gap-2">
          {items.map(({ key, label, placeholder, id }) => {
              const item = outfit[key];
              const isExpanded = expandedItem === key;
              const hasImage = item.images && item.images.length > 0;

              return (
                  <div key={key} className={`bg-black border ${hasImage ? 'border-zinc-600' : 'border-zinc-800'} hover:border-zinc-600 transition-all group`}>
                      {/* Header */}
                      <button 
                        onClick={() => toggleItem(key)}
                        className="w-full flex items-center justify-between p-3 pl-4 text-left focus:outline-none"
                      >
                          <div className="flex items-center gap-4">
                              <span className="text-[10px] font-mono text-zinc-600">{id}</span>
                              <div>
                                <span className={`text-xs font-bold uppercase tracking-widest block transition-colors ${isExpanded ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{label}</span>
                                {!isExpanded && item.garmentType && (
                                    <span className="text-[10px] text-brand-400 font-mono mt-0.5 block">{item.garmentType}</span>
                                )}
                              </div>
                          </div>
                          <div className="flex items-center gap-3">
                              {!isExpanded && hasImage && (
                                <div className="flex items-center gap-1 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                                    <ImageIcon size={10} className="text-zinc-400" />
                                    <span className="text-[9px] font-mono text-zinc-300">{item.images.length}</span>
                                </div>
                              )}
                              <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                                  <ChevronDown size={12} className="text-zinc-600" />
                              </div>
                          </div>
                      </button>

                      {/* Content */}
                      {isExpanded && (
                          <div className="p-4 pt-0 space-y-5 animate-slide-up border-t border-dashed border-zinc-800 mt-2">
                                
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                            Type
                                        </label>
                                        <input 
                                            type="text" 
                                            value={item.garmentType}
                                            onChange={(e) => updateItem(key, 'garmentType', e.target.value)}
                                            placeholder={placeholder}
                                            className="w-full bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-xs text-white focus:border-white focus:outline-none transition-all placeholder:text-zinc-700 font-mono"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                            Visuals
                                        </label>
                                        <input 
                                            type="text" 
                                            value={item.description}
                                            onChange={(e) => updateItem(key, 'description', e.target.value)}
                                            placeholder="Texture, color..."
                                            className="w-full bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-xs text-white focus:border-white focus:outline-none transition-all placeholder:text-zinc-700 font-mono"
                                        />
                                    </div>
                                </div>

                                {/* Images & Size Chart Row - ALIGNED */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Reference Imagery */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2 h-5">
                                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                                                Reference Imagery
                                            </label>
                                            <span className="text-[9px] text-zinc-600 font-normal">Multiple angles</span>
                                        </div>
                                        <div className="min-h-[7rem]">
                                            <ImageUploader 
                                                images={item.images || []}
                                                onImagesChange={(imgs) => updateItem(key, 'images', imgs)}
                                                compact={true}
                                                allowMultiple={true}
                                            />
                                        </div>
                                    </div>

                                    {/* Size Chart */}
                                    <div>
                                         <div className="flex justify-between items-center mb-2 h-5">
                                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                                                Size Chart
                                            </label>
                                            <div className="flex bg-zinc-900 rounded border border-zinc-800 p-[1px]">
                                                <button 
                                                    onClick={() => setMode(key, 'image')} 
                                                    className={`px-2 py-0.5 text-[8px] uppercase font-bold rounded-sm transition-colors ${sizeChartMode[key] === 'image' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                >
                                                    Upload
                                                </button>
                                                <button 
                                                    onClick={() => setMode(key, 'text')} 
                                                    className={`px-2 py-0.5 text-[8px] uppercase font-bold rounded-sm transition-colors ${sizeChartMode[key] === 'text' ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                >
                                                    Text
                                                </button>
                                            </div>
                                         </div>
                                         
                                         <div className="min-h-[7rem]"> 
                                            {sizeChartMode[key] === 'image' ? (
                                                <ImageUploader 
                                                    images={item.sizeChart ? [item.sizeChart] : []}
                                                    onImagesChange={(imgs) => updateItem(key, 'sizeChart', imgs[0] || null)}
                                                    compact={true}
                                                />
                                            ) : (
                                                <textarea 
                                                    value={item.sizeChartDetails}
                                                    onChange={(e) => updateItem(key, 'sizeChartDetails', e.target.value)}
                                                    placeholder="Paste size specs (e.g. Chest 40cm, Length 60cm)..."
                                                    className="w-full h-28 bg-zinc-900/30 border border-zinc-800 rounded-lg px-3 py-2 text-[10px] text-white focus:border-white focus:outline-none resize-none font-mono placeholder:text-zinc-700"
                                                />
                                            )}
                                         </div>
                                    </div>
                                </div>

                                {/* Fit Notes Row */}
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                                        Fit Requirements
                                    </label>
                                    <input 
                                        type="text" 
                                        value={item.fitNotes}
                                        onChange={(e) => updateItem(key, 'fitNotes', e.target.value)}
                                        placeholder="Specific fit notes (e.g. 'Oversized fit', 'Cropped length', 'Tight around waist')"
                                        className="w-full bg-zinc-900/50 border border-zinc-800 px-3 py-2 text-xs text-white focus:border-white focus:outline-none transition-all placeholder:text-zinc-700 font-mono"
                                    />
                                </div>

                          </div>
                      )}
                  </div>
              );
          })}
       </div>
    </div>
  );
};
