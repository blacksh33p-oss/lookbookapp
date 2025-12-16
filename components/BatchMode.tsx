import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Play } from 'lucide-react';

export const BatchMode: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-black rounded-lg border border-zinc-800">
      <div className="w-full max-w-xl">
        <div className="text-center mb-10">
          <div className="inline-block px-3 py-1 rounded-sm bg-zinc-900 border border-zinc-800 text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-4">
             Enterprise API
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Bulk Processing</h2>
          <p className="text-zinc-500 text-sm">Upload CSV catalog for overnight generation.</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
            {[{icon:FileSpreadsheet, label:"1. Upload"}, {icon:Play, label:"2. Start"}, {icon:CheckCircle2, label:"3. Download"}].map((step, i) => (
                <div key={i} className="bg-black p-4 rounded-md border border-zinc-800 flex flex-col items-center text-center">
                    <step.icon className="text-zinc-400 mb-2" size={20} />
                    <h4 className="text-white font-medium text-xs">{step.label}</h4>
                </div>
            ))}
        </div>

        <div 
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            className={`border border-dashed rounded-lg p-12 flex flex-col items-center justify-center transition-all cursor-pointer bg-zinc-950/50
            ${file ? 'border-white' : 'border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900'}`}
        >
             {file ? (
                 <div className="text-center">
                     <FileSpreadsheet className="h-10 w-10 text-white mx-auto mb-2" />
                     <p className="text-sm font-medium text-white">{file.name}</p>
                     <p className="text-xs text-zinc-500 mb-4">{(file.size / 1024).toFixed(1)} KB</p>
                     <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-xs text-red-500 hover:text-red-400">Remove</button>
                 </div>
             ) : (
                 <>
                    <Upload className="h-8 w-8 text-zinc-600 mb-4" />
                    <p className="text-sm font-medium text-white mb-1">Drop CSV</p>
                    <p className="text-xs text-zinc-500">or click to browse</p>
                 </>
             )}
        </div>

        <div className="mt-8 flex justify-center">
            <button 
                disabled={!file || isProcessing}
                onClick={() => setIsProcessing(true)}
                className={`w-full py-3 rounded-md font-bold text-sm transition-all
                ${!file ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed' : 'bg-white text-black hover:bg-zinc-200'}`}
            >
                {isProcessing ? 'Processing...' : 'Start Job'}
            </button>
        </div>
      </div>
    </div>
  );
};