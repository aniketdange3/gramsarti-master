import React from 'react';

export default function GlobalLoader() {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] flex items-center justify-center font-sans animate-in fade-in duration-300">
      <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 border border-slate-100">
        {/* GramSarthi Logo Element */}
        <div className="mb-6 flex flex-col items-center">
          <img
            src="./logo.png"
            onError={(e) => { e.currentTarget.src = '/images/logo.png'; }}
            alt="GramSarthi Logo"
            className="w-20  h-20 object-contain bg-transparent mb-3 "
          />
          <h1 className="font-black text-slate-800 text-4xl tracking-tight leading-none uppercase ">
            Gram<span className="text-indigo-600">Sarthi</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="h-[2px] w-8 bg-indigo-500 rounded-full"></span>
            <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.25em] leading-none">
              मालमत्ता कर प्रणाली
            </p>
            <span className="h-[2px] w-8 bg-indigo-500 rounded-full"></span>
          </div>
        </div>

        {/* Animated Loading Bar */}
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4 relative">
          <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 w-1/2 rounded-full animate-[progress_1.5s_ease-in-out_infinite_alternate]" />
        </div>

        {/* Processing Text */}
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest animate-pulse">
          डेटा लोड होत आहे...
        </p>
        <p className="text-[10px] text-slate-400 mt-1">
          कृपया प्रतीक्षा करा, प्रक्रियेस वेळ लागू शकतो
        </p>
      </div>

      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
