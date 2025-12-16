import React, { useRef, useState } from 'react';
import { Upload, X, Plus, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  label?: string;
  compact?: boolean;
  allowMultiple?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ 
  images = [], 
  onImagesChange, 
  label,
  compact = false,
  allowMultiple = false
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const processFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    const promises = validFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
      });
    });

    try {
        const results = await Promise.all(promises);
        const successResults = results.filter(r => r && r.length > 0);
        if (successResults.length > 0) {
            if (allowMultiple) onImagesChange([...images, ...successResults]);
            else onImagesChange([successResults[0]]);
        }
    } catch (error) { console.error("Error processing files:", error); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (e.target) e.target.value = '';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    processFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number, e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    const newImages = [...images];
    newImages.splice(index, 1);
    onImagesChange(newImages);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const containerHeight = compact ? 'h-24' : 'h-32';

  return (
    <div className="w-full">
      {label && (
        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
           {!compact && <ImageIcon size={12} />} {label}
        </label>
      )}

      <input ref={inputRef} type="file" className="hidden" accept="image/png, image/jpeg, image/webp" multiple={allowMultiple} onChange={handleChange} />
      
      {/* Grid Mode */}
      {allowMultiple && images.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
             {images.map((img, idx) => (
                 <div key={idx} className="relative group aspect-square rounded-md overflow-hidden border border-zinc-800 bg-black">
                     <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all" />
                     <button 
                        onClick={(e) => removeImage(idx, e)} 
                        aria-label={`Remove image ${idx + 1}`}
                        className="absolute top-1 right-1 bg-black text-white p-0.5 rounded-sm opacity-0 group-hover:opacity-100 transition-all border border-zinc-800 focus:opacity-100"
                     >
                         <X size={10} />
                     </button>
                 </div>
             ))}
             <button 
                onClick={() => inputRef.current?.click()} 
                className="aspect-square rounded-md border border-dashed border-zinc-800 hover:border-zinc-500 hover:bg-zinc-900 flex flex-col items-center justify-center text-zinc-600 hover:text-white transition-all focus:border-white focus:text-white outline-none"
             >
                 <Plus size={14} />
             </button>
          </div>
      )}

      {/* Single Mode Preview */}
      {!allowMultiple && images.length > 0 && (
        <div className={`relative group rounded-md overflow-hidden border border-zinc-800 bg-black ${containerHeight} flex items-center justify-center`}>
          <img src={images[0]} alt="Uploaded" className="h-full object-contain opacity-80 group-hover:opacity-50 transition-opacity" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
             <button 
                onClick={(e) => removeImage(0, e)} 
                className="bg-zinc-900 border border-zinc-700 text-white p-2 rounded-md shadow-sm hover:bg-zinc-800 focus:outline-none focus:border-white"
                aria-label="Remove image"
             >
               <X size={14} />
             </button>
          </div>
        </div>
      )}
      
      {/* Empty Dropzone */}
      {images.length === 0 && (
         <div
          role="button"
          tabIndex={0}
          onKeyDown={handleKeyDown}
          aria-label={label ? `Upload ${label}` : "Upload image"}
          className={`relative border border-dashed rounded-md ${containerHeight} flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group outline-none
            ${dragActive ? 'border-white bg-zinc-900' : 'border-zinc-800 bg-black hover:bg-zinc-900/50 hover:border-zinc-600 focus:border-white focus:bg-zinc-900/30'}`}
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} onClick={() => inputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center gap-2 p-2 text-center w-full">
            <Upload size={16} className={`transition-colors ${dragActive ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
            <p className={`font-medium transition-colors ${dragActive ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'} text-[10px] uppercase tracking-wide`}>
                {compact ? 'Upload' : 'Drop Image'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};