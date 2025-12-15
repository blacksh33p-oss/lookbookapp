
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
    
    // Filter for images only
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => file.type.startsWith('image/'));

    if (validFiles.length === 0) return;

    // Read all files as Data URLs concurrently
    const promises = validFiles.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve(e.target?.result as string);
        };
        reader.onerror = () => {
          console.error("Failed to read file", file.name);
          resolve('');
        };
        reader.readAsDataURL(file);
      });
    });

    try {
        const results = await Promise.all(promises);
        const successResults = results.filter(r => r && r.length > 0);
        
        if (successResults.length > 0) {
            if (allowMultiple) {
                // In multiple mode, append to existing images
                onImagesChange([...images, ...successResults]);
            } else {
                // In single mode, replace with the first new image
                onImagesChange([successResults[0]]);
            }
        }
    } catch (error) {
        console.error("Error processing files:", error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    // Reset value so same file can be selected again if needed
    if (e.target) e.target.value = '';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    processFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newImages = [...images];
    newImages.splice(index, 1);
    onImagesChange(newImages);
  };

  // Adjusted heights for a cleaner, less dominant look
  const containerHeight = compact ? 'h-28' : 'h-40';

  return (
    <div className="w-full">
      {label && (
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
           {!compact && <ImageIcon size={12} className="text-brand-400" />} {label}
        </label>
      )}

      {/* Hidden Input - Always rendered so it can be triggered by ref */}
      <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept="image/png, image/jpeg, image/webp" 
            multiple={allowMultiple}
            onChange={handleChange}
      />
      
      {/* Grid for existing images (Multiple Mode) */}
      {allowMultiple && images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
             {images.map((img, idx) => (
                 <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-700 bg-slate-800">
                     <img src={img} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                     <button 
                        onClick={(e) => removeImage(idx, e)}
                        className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                     >
                         <X size={10} />
                     </button>
                 </div>
             ))}
             {/* Add Button in Grid */}
             <button 
                onClick={() => inputRef.current?.click()}
                className="aspect-square rounded-lg border border-dashed border-slate-700 hover:border-brand-500 hover:bg-slate-800/50 flex flex-col items-center justify-center text-slate-500 hover:text-brand-400 transition-all gap-1"
             >
                 <Plus size={16} />
             </button>
          </div>
      )}

      {/* Main Area: Single Preview */}
      {!allowMultiple && images.length > 0 && (
        <div className={`relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 ${containerHeight} flex items-center justify-center`}>
          <img 
            src={images[0]} 
            alt="Uploaded" 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" 
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
             <button 
              onClick={(e) => removeImage(0, e)}
              className="bg-red-500/90 hover:bg-red-500 text-white p-2 rounded-full shadow-lg transform hover:scale-110 transition-all"
             >
               <X size={16} />
             </button>
          </div>
        </div>
      )}
      
      {/* Dropzone - ONLY SHOW IF NO IMAGES EXIST */}
      {images.length === 0 && (
         <div
          className={`relative border border-dashed rounded-lg ${containerHeight} flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden group
            ${dragActive ? 'border-brand-500 bg-brand-500/5' : 'border-slate-700 bg-slate-900/30 hover:border-brand-500/50 hover:bg-slate-800/50'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <div className="flex flex-col items-center justify-center gap-2 relative z-10 p-2 text-center w-full">
            <div className={`transition-all duration-300 transform group-hover:scale-110 ${dragActive ? 'text-brand-400' : 'text-slate-600 group-hover:text-brand-400'}`}>
                <Upload size={compact ? 18 : 22} />
            </div>
            
            <p className={`font-medium transition-colors ${dragActive ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300'} ${compact ? 'text-[10px]' : 'text-xs'}`}>
                {compact ? 'Upload' : 'Drop Image Here'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
