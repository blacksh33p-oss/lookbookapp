import React, { useState } from 'react';
import { ChevronDown, Image as ImageIcon, Info, Sparkles } from 'lucide-react';
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
    { key: 'top', label: 'Tops', placeholder: 'Garment Specification', id: 'A' },
    { key: 'bottom', label: 'Bottoms', placeholder: 'Garment Specification', id: 'B' },
    { key: 'shoes', label: 'Footwear', placeholder: 'Garment Specification', id: 'C' },
    { key: 'accessories', label: 'Accents', placeholder: 'Garment Specification', id: 'D' },
  ];

  return (
    <div className="flex flex-col gap-6">
        <div className="p-4 border border-white/5 flex items-start gap-4">
            <Sparkles size={14} className="text-zinc-500 mt-1 shrink-0" />
            <div className="text-[10px] text-zinc-500 uppercase tracking-[0.15em] leading-relaxed">
                Reference images override text specifications. Use descriptions for stylistic fine-tuning only.
            </div>
        </div>

        <div className="flex flex-col border-t border-white/10">
            {items.map(({ key, label, id }) => {
                const item = outfit[key];
                const isExpanded = expandedItem === key;
                const hasImage = item.images && item.images.length > 0;
                const hasText = item.description.length > 0 || item.garmentType.length > 0;

                return (
                    <div key={key} className="border-b border-white/10">
                        <button 
                            onClick={() => toggleItem(key)}
                            className={`w-full flex items-center justify-between py-6 px-2 text-left transition-all ${isExpanded ? 'bg-white/5' : 'hover:bg-white/[0.02]'}`}
                        >
                            <div className="flex items-center gap-6">
                                <span className="text-[9px] font-mono text-zinc-700 tracking-widest">{id}</span>
                                <span className={`text-[10px] font-bold uppercase tracking-[0.3em] ${isExpanded ? 'text-white' : 'text-zinc-500'}`}>{label}</span>

                                {!isExpanded && (
                                  <div className="flex gap-4">
                                    {hasImage && <span className="text-[8px] text-zinc-700 font-black uppercase tracking-widest">IMAGE_REF</span>}
                                    {hasText && <span className="text-[8px] text-zinc-700 font-black uppercase tracking-widest">DATA_SPEC</span>}
                                  </div>
                                )}
                            </div>
                            <ChevronDown size={14} className={`text-zinc-800 transition-transform duration-500 ${isExpanded ? 'rotate-180 text-white' : ''}`} />
                        </button>

                        {isExpanded && (
                            <div className="p-8 space-y-8 bg-transparent animate-fade-in">
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center h-4">
                                                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Reference</label>
                                            </div>
                                            <ImageUploader 
                                                images={item.images || []}
                                                onImagesChange={(imgs) => updateItem(key, 'images', imgs)}
                                                compact={true}
                                                allowMultiple={true}
                                            />
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center h-4">
                                                <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Size Chart</label>
                                                <div className="flex gap-4">
                                                    <button onClick={() => setMode(key, 'image')} className={`text-[8px] uppercase font-black tracking-widest ${sizeChartMode[key] === 'image' ? 'text-white' : 'text-zinc-700 hover:text-zinc-500'}`}>Visual</button>
                                                    <button onClick={() => setMode(key, 'text')} className={`text-[8px] uppercase font-black tracking-widest ${sizeChartMode[key] === 'text' ? 'text-white' : 'text-zinc-700 hover:text-zinc-500'}`}>Data</button>
                                                </div>
                                            </div>
                                            
                                            <div className="h-24"> 
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
                                                        placeholder="Paste technical measurements..."
                                                        className="w-full h-full bg-black border border-white/10 rounded-sm py-4 px-5 text-[10px] text-white focus:border-white resize-none font-mono"
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        <div className="col-span-2 pt-6 border-t border-white/5 space-y-6">
                                            <div className="grid grid-cols-2 gap-8">
                                                <div className="space-y-3">
                                                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Garment Type</label>
                                                    <input 
                                                        type="text" 
                                                        value={item.garmentType}
                                                        onChange={(e) => updateItem(key, 'garmentType', e.target.value)}
                                                        placeholder="e.g. Silk Organza Blouse"
                                                        className="w-full bg-black border border-white/10 rounded-sm py-4 px-5 text-xs text-white focus:border-white font-mono"
                                                    />
                                                </div>
                                                <div className="space-y-3">
                                                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em]">Detail Spec</label>
                                                    <input 
                                                        type="text" 
                                                        value={item.description}
                                                        onChange={(e) => updateItem(key, 'description', e.target.value)}
                                                        placeholder="e.g. Asymmetric collar"
                                                        className="w-full bg-black border border-white/10 rounded-sm py-4 px-5 text-xs text-white focus:border-white font-mono"
                                                    />
                                                </div>
                                            </div>
                                        </div>
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