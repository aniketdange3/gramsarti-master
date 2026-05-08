import React, { useState, useRef } from 'react';
import { Upload, Download, CheckCircle2, AlertTriangle, FileSpreadsheet, X, Loader2, Info } from 'lucide-react';
import { API_BASE_URL } from '@/utils/config';

const MN = (v: number | string) => String(v ?? '').replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

interface ImportResult {
    success: boolean;
    message: string;
    updated: number;
    skipped: number;
    not_found: number;
    total_rows: number;
    errors?: string[];
}

interface Props {
    onDone?: () => void;
}

export default function ReceiptImport({ onDone }: Props) {
    const [file, setFile]           = useState<File | null>(null);
    const [dragging, setDragging]   = useState(false);
    const [loading, setLoading]     = useState(false);
    const [result, setResult]       = useState<ImportResult | null>(null);
    const [error, setError]         = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const authHeaders = () => ({
        Authorization: `Bearer ${localStorage.getItem('gp_token')}`
    });

    const handleFile = (f: File) => {
        setFile(f);
        setResult(null);
        setError('');
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setError('');
        setResult(null);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch(`${API_BASE_URL}/api/properties/import-receipts`, {
                method: 'POST',
                headers: authHeaders(),
                body: fd,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Import अयशस्वी');
            setResult(data);
            setFile(null);
            if (onDone && data.updated > 0) setTimeout(onDone, 2000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTemplate = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/properties/import-receipts/template`, {
                headers: authHeaders()
            });
            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url; a.download = 'receipt_import_template.xlsx'; a.click();
            URL.revokeObjectURL(url);
        } catch { setError('Template download अयशस्वी'); }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                        <FileSpreadsheet className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-white font-black text-base leading-none">पावती डेटा Import</h2>
                        <p className="text-indigo-200 text-xs mt-0.5">Excel मधून पावती बुक क्र. • पावती क्र. • दिनांक</p>
                    </div>
                </div>
                <button
                    onClick={handleTemplate}
                    className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-xs font-black px-3 py-1.5 rounded-lg transition-all border border-white/30"
                >
                    <Download className="w-3.5 h-3.5" />
                    नमुना Excel
                </button>
            </div>

            <div className="p-6 space-y-5">
                {/* Column Guide */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-blue-800 font-black text-xs mb-2">Excel मध्ये खालील columns असावेत:</p>
                            <div className="grid grid-cols-2 gap-1.5">
                                {[
                                    ['अ.क्र. (srNo)', 'मालमत्ता जोडण्यासाठी'],
                                    ['वस्ती (wastiName)', 'Matching साठी'],
                                    ['प्लॉट क्र. (plotNo)', 'Matching साठी'],
                                    ['पावती बुक क्र.', 'receiptBook'],
                                    ['पावती क्र. ✓', 'receiptNo — आवश्यक'],
                                    ['दिनांक (DD/MM/YYYY)', 'paymentDate — आवश्यक'],
                                    ['वसुली रक्कम', 'paidAmount (optional)'],
                                ].map(([col, desc]) => (
                                    <div key={col} className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1 border border-blue-100">
                                        <span className="font-black text-blue-700 text-[10px]">{col}</span>
                                        <span className="text-slate-400 text-[9px]">— {desc}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Drop Zone */}
                <div
                    onDragOver={e => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                        dragging
                            ? 'border-indigo-500 bg-indigo-50 scale-[1.01]'
                            : file
                            ? 'border-emerald-400 bg-emerald-50'
                            : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50'
                    }`}
                >
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                    />
                    {file ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                                <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                            </div>
                            <p className="font-black text-emerald-700 text-sm">{file.name}</p>
                            <p className="text-slate-400 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                            <button
                                onClick={e => { e.stopPropagation(); setFile(null); setResult(null); }}
                                className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-700 font-bold"
                            >
                                <X className="w-3 h-3" /> फाईल काढा
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center">
                                <Upload className="w-7 h-7 text-indigo-500" />
                            </div>
                            <div>
                                <p className="font-black text-slate-700 text-sm">Excel file येथे drag करा</p>
                                <p className="text-slate-400 text-xs mt-0.5">किंवा <span className="text-indigo-600 font-black">click करा</span> — .xlsx / .xls / .csv</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Error */}
                {error && (
                    <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <p className="text-rose-700 text-xs font-bold">{error}</p>
                    </div>
                )}

                {/* Result */}
                {result && (
                    <div className={`rounded-xl border p-4 ${result.updated > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                        <div className="flex items-center gap-2 mb-3">
                            <CheckCircle2 className={`w-5 h-5 ${result.updated > 0 ? 'text-emerald-600' : 'text-amber-500'}`} />
                            <span className="font-black text-sm text-slate-800">{result.message}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { label: 'एकूण rows', val: result.total_rows, color: 'text-slate-700' },
                                { label: 'Update झाले', val: result.updated, color: 'text-emerald-700' },
                                { label: 'Skip झाले', val: result.skipped, color: 'text-slate-500' },
                                { label: 'सापडले नाही', val: result.not_found, color: 'text-rose-600' },
                            ].map(({ label, val, color }) => (
                                <div key={label} className="bg-white rounded-lg border border-slate-100 px-3 py-2 text-center">
                                    <p className={`text-lg font-black ${color}`}>{MN(val)}</p>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wide">{label}</p>
                                </div>
                            ))}
                        </div>
                        {result.errors && result.errors.length > 0 && (
                            <div className="mt-3 bg-rose-50 rounded-lg border border-rose-100 p-3">
                                <p className="text-[10px] font-black text-rose-700 mb-1">सापडले नाहीत (पहिले {result.errors.length}):</p>
                                {result.errors.map((e, i) => (
                                    <p key={i} className="text-[9px] text-rose-600 font-mono">{e}</p>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Upload Button */}
                <button
                    onClick={handleUpload}
                    disabled={!file || loading}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl transition-all shadow-lg shadow-indigo-200 text-sm"
                >
                    {loading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Import होत आहे...</>
                    ) : (
                        <><Upload className="w-4 h-4" /> पावती डेटा Import करा</>
                    )}
                </button>
            </div>
        </div>
    );
}
