
import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Play } from 'lucide-react';

export const BatchMode: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-900/50 rounded-2xl border border-slate-800 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.05]"></div>
      
      <div className="relative z-10 w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 px-3 py-1 rounded-full mb-4">
             <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse"></span>
             <span className="text-xs font-bold text-brand-300 tracking-wide uppercase">Enterprise Batch API</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Bulk Studio Processing</h2>
          <p className="text-slate-400">
            Upload your product catalog CSV to generate hundreds of lookbook images overnight.
            <br />
            <span className="text-brand-400 font-medium">50% Discount applied automatically ($0.12 / image)</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center text-center">
                <FileSpreadsheet className="text-blue-400 mb-2" size={24} />
                <h4 className="text-white font-semibold text-sm">1. Upload CSV</h4>
                <p className="text-xs text-slate-500 mt-1">Links to product images & metadata</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center text-center">
                <Play className="text-brand-400 mb-2" size={24} />
                <h4 className="text-white font-semibold text-sm">2. Start Batch</h4>
                <p className="text-xs text-slate-500 mt-1">Processed in queue (12-24h)</p>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center text-center">
                <CheckCircle2 className="text-green-400 mb-2" size={24} />
                <h4 className="text-white font-semibold text-sm">3. Bulk Download</h4>
                <p className="text-xs text-slate-500 mt-1">Get 4K masters via secure link</p>
            </div>
        </div>

        {/* Upload Zone */}
        <div 
            onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer group
            ${file ? 'border-green-500/50 bg-green-500/5' : 'border-slate-700 hover:border-brand-500 bg-slate-950/50 hover:bg-slate-900'}`}
        >
             {file ? (
                 <div className="text-center">
                     <FileSpreadsheet className="h-12 w-12 text-green-500 mx-auto mb-3" />
                     <p className="text-lg font-medium text-white">{file.name}</p>
                     <p className="text-sm text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB • Ready to process</p>
                     <button 
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="mt-4 text-xs text-red-400 hover:text-red-300 underline"
                     >
                        Remove file
                     </button>
                 </div>
             ) : (
                 <>
                    <div className="h-16 w-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                        <Upload className="h-8 w-8 text-slate-400 group-hover:text-brand-400 transition-colors" />
                    </div>
                    <p className="text-lg font-medium text-white mb-2">Drop Product CSV Here</p>
                    <p className="text-sm text-slate-500">or click to browse filesystem</p>
                 </>
             )}
        </div>

        {/* Action Bar */}
        <div className="mt-8 flex justify-center">
            <button 
                disabled={!file || isProcessing}
                onClick={() => setIsProcessing(true)}
                className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all
                ${!file ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900 hover:bg-slate-200 shadow-xl shadow-white/10'}`}
            >
                {isProcessing ? 'Validating Catalog...' : 'Initialize Batch Job'}
            </button>
        </div>

        <div className="mt-6 flex items-start gap-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
            <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-slate-300">Note:</strong> Batch processing requires a minimum of 50 items. Billing is processed post-generation. Ensure your payment method has sufficient limits for high-volume runs.
            </p>
        </div>

      </div>
    </div>
  );
};
