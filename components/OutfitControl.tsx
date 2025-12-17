
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
    <div className="flex flex-col border border-zinc-800 rounded-md overflow-hidden">
          {items.map(({ key, label, placeholder, id }) => {
              const item = outfit[key];
              const isExpanded = expandedItem === key;
              const hasImage = item.images && item.images.length > 0;

              return (
                  <div key={key} className="bg-black border-b border-zinc-800 last:border-b-0">
                      <button 
                        onClick={() => toggleItem(key)}
                        className={`w-full flex items-center justify-between p-3 text-left focus:outline-none transition-colors ${isExpanded ? 'bg-zinc-900' : 'hover:bg-zinc-900/50'}`}
                      >
                          <div className="flex items-center gap-3">
                              <span className="text-[10px] font-mono text-zinc-600">{id}</span>
                              <span className={`text-xs font-bold uppercase tracking-wide ${isExpanded ? 'text-white' : 'text-zinc-400'}`}>{label}</span>
                          </div>
                          <div className="flex items-center gap-3">
                              {!isExpanded && hasImage && (
                                <div className="flex items-center gap-1 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                    <ImageIcon size={10} className="text-zinc-400" />
                                    <span className="text-[9px] font-mono text-zinc-300">{item.images.length}</span>
                                </div>
                              )}
                              <ChevronDown size={14} className={`text-zinc-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                      </button>

                      {isExpanded && (
                          <div className="p-4 bg-black border-t border-zinc-800">
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Type</label>
                                        <input 
                                            type="text" 
                                            value={item.garmentType}
                                            onChange={(e) => updateItem(key, 'garmentType', e.target.value)}
                                            placeholder={placeholder}
                                            className="w-full bg-black border border-zinc-800 px-3 py-2 text-xs text-white focus:border-zinc-500 font-mono rounded-md"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Details</label>
                                        <input 
                                            type="text" 
                                            value={item.description}
                                            onChange={(e) => updateItem(key, 'description', e.target.value)}
                                            placeholder="Texture, color..."
                                            className="w-full bg-black border border-zinc-800 px-3 py-2 text-xs text-white focus:border-zinc-500 font-mono rounded-md"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-2 h-5">
                                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Reference</label>
                                        </div>
                                        <ImageUploader 
                                            images={item.images || []}
                                            onImagesChange={(imgs) => updateItem(key, 'images', imgs)}
                                            compact={true}
                                            allowMultiple={true}
                                        />
                                    </div>

                                    <div>
                                         <div className="flex justify-between items-center mb-2 h-5">
                                            <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wide">Size Chart</label>
                                            <div className="flex bg-black rounded border border-zinc-800 p-[1px]">
                                                <button onClick={() => setMode(key, 'image')} className={`px-1.5 py-0.5 text-[8px] uppercase font-medium rounded-sm ${sizeChartMode[key] === 'image' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Img</button>
                                                <button onClick={() => setMode(key, 'text')} className={`px-1.5 py-0.5 text-[8px] uppercase font-medium rounded-sm ${sizeChartMode[key] === 'text' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-white'}`}>Txt</button>
                                            </div>
                                         </div>
                                         
                                         <div className="min-h-[6rem]"> 
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
                                                    placeholder="Size specs..."
                                                    className="w-full h-24 bg-black border border-zinc-800 rounded-md px-3 py-2 text-[10px] text-white focus:border-zinc-500 resize-none font-mono"
                                                />
                                            )}
                                         </div>
                                    </div>
                                </div>
                          </div>
                      )}
                  </div>
              );
          })}
    </div>
  );
};
