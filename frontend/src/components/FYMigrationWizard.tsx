import { API_BASE_URL } from '@/utils/config';
import React, { useState } from 'react';
import {
    IndianRupee, X, Search, RotateCcw, CheckCircle2, AlertTriangle
} from 'lucide-react';

// ─── Marathi numeral helper ────────────────────────────────────────────────────
const MN = (v: number | string | undefined) =>
    String(v ?? 0).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);

// ─── FY option generator ───────────────────────────────────────────────────────
const generateFYOptions = () => {
    const now = new Date();
    const yr = now.getFullYear();
    const base = now.getMonth() >= 3 ? yr : yr - 1;
    const toM = (n: number) => String(n).replace(/[0-9]/g, d => '०१२३४५६७८९'[+d]);
    const toFY = (y: number) => `${y}-${String(y + 1).slice(-2)}`;
    const toFYM = (y: number) => `${toM(y)}-${toM(y + 1).slice(-2)}`;
    return [
        { value: toFY(base - 1), label: toFYM(base - 1), sublabel: `${toFY(base - 1)} (मागील)` },
        { value: toFY(base),     label: toFYM(base),     sublabel: `${toFY(base)} (चालू)` },
        { value: toFY(base + 1), label: toFYM(base + 1), sublabel: `${toFY(base + 1)} (पुढील ✓)` },
    ];
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
    currentFY: string;
    onClose: () => void;
    onDone: () => void;
    addToast: (msg: string, type: string) => void;
    onAuthError?: () => void;
}

export default function FYMigrationWizard({ currentFY, onClose, onDone, addToast, onAuthError }: Props) {
    const [selectedFY, setSelectedFY] = useState('');
    const [analysis, setAnalysis]     = useState<any>(null);
    const [loading, setLoading]       = useState(false);
    const [confirmed, setConfirmed]   = useState(false);
    const [migrating, setMigrating]   = useState(false);

    const headers = () => ({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('gp_token')}`,
    });

    // Step 2 — call /api/fy/analyze
    const handleAnalyze = async () => {
        if (!selectedFY) return;
        setLoading(true);
        setAnalysis(null);
        setConfirmed(false);
        try {
            const res = await fetch(`${API_BASE_URL}/api/fy/analyze`, { headers: headers() });
            if (res.status === 401) { onAuthError?.(); return; }
            if (res.ok) setAnalysis(await res.json());
            else addToast('विश्लेषण अयशस्वी झाले.', 'error');
        } catch { addToast('सर्व्हर उत्तर देत नाही.', 'error'); }
        finally { setLoading(false); }
    };

    // Step 3 — call /api/fy/migrate
    const handleMigrate = async () => {
        if (!confirmed) return;
        setMigrating(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/fy/migrate`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({ newFY: selectedFY }),
            });
            if (res.status === 401) { onAuthError?.(); return; }
            const data = await res.json();
            if (res.ok) {
                addToast(data.message || `${data.migrated_count} मालमत्तांचे स्थलांतर यशस्वी!`, 'success');
                onDone();
                onClose();
            } else {
                addToast(data.error || 'स्थलांतर अयशस्वी झाले.', 'error');
            }
        } catch { addToast('सर्व्हर एरर', 'error'); }
        finally { setMigrating(false); }
    };

    // Build wasti-grouped map from preview array
    const wastiGroups: Record<string, any[]> = {};
    (analysis?.preview || []).forEach((r: any) => {
        const w = r.wastiName || 'इतर';
        if (!wastiGroups[w]) wastiGroups[w] = [];
        wastiGroups[w].push(r);
    });
    const sm = (rows: any[], key: string) => rows.reduce((s, r) => s + (r[key] || 0), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
                onClick={() => !migrating && onClose()}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden"
                style={{ animation: 'fySlideUp .3s ease' }}>

                {/* ── Header ── */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                            <IndianRupee className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white tracking-tight">
                                आर्थिक वर्ष बदल — FY Migration Wizard
                            </h2>
                            <div className="flex items-center gap-1.5 mt-1">
                                {['१. वर्ष निवडा', '२. विश्लेषण', '३. पुष्टी'].map((s, i) => (
                                    <span key={i} className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider transition-all ${
                                        (i === 0 && !analysis) ||
                                        (i === 1 && analysis && !confirmed) ||
                                        (i === 2 && confirmed)
                                            ? 'bg-white text-amber-600' : 'bg-white/20 text-amber-100'
                                    }`}>{s}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                    {!migrating && (
                        <button onClick={onClose} className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-all">
                            <X className="w-4 h-4 text-white" />
                        </button>
                    )}
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">

                    {/* STEP 1 — Select Year */}
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">१</span>
                                <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">नवीन आर्थिक वर्ष निवडा</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                                चालू: <span className="font-black text-slate-700 ml-1">{currentFY || '—'}</span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            {generateFYOptions().map(opt => (
                                <button key={opt.value}
                                    onClick={() => { setSelectedFY(opt.value); setAnalysis(null); setConfirmed(false); }}
                                    className={`px-4 py-3 rounded-xl border-2 text-left transition-all select-none ${
                                        selectedFY === opt.value
                                            ? 'bg-amber-500 border-amber-500 text-white shadow-lg scale-105'
                                            : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-sm'
                                    }`}>
                                    <p className={`text-[9px] font-black uppercase tracking-wider leading-none mb-0.5 ${selectedFY === opt.value ? 'text-amber-100' : 'text-slate-400'}`}>
                                        आर्थिक वर्ष
                                    </p>
                                    <p className="text-base font-black leading-none">{opt.label}</p>
                                    <p className={`text-[9px] font-bold mt-1 ${selectedFY === opt.value ? 'text-amber-100' : 'text-slate-400'}`}>{opt.sublabel}</p>
                                </button>
                            ))}
                            <button
                                onClick={handleAnalyze}
                                disabled={!selectedFY || loading}
                                className="ml-auto flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-xl font-black text-[11px] uppercase tracking-wider hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                            >
                                {loading
                                    ? <><RotateCcw className="w-3.5 h-3.5 animate-spin" /> विश्लेषण होत आहे...</>
                                    : <><Search className="w-3.5 h-3.5" /> विश्लेषण करा</>
                                }
                            </button>
                        </div>
                    </div>

                    {/* Loading spinner */}
                    {loading && (
                        <div className="flex items-center justify-center py-10 gap-3 text-slate-400">
                            <RotateCcw className="w-5 h-5 animate-spin text-indigo-500" />
                            <span className="font-black text-sm uppercase tracking-widest">डेटा विश्लेषण होत आहे...</span>
                        </div>
                    )}

                    {/* STEP 2 — Wasti-wise Soft Preview */}
                    {analysis && !loading && (
                        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">२</span>
                                <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                                    वस्ती-निहाय पूर्वावलोकन — {analysis.current_fy} → {analysis.next_fy}
                                </span>
                                <span className="ml-auto text-[10px] font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                                    एकूण {MN(analysis.summary?.total_properties || 0)} मालमत्ता
                                </span>
                            </div>

                            {analysis.already_migrated ? (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                                    <p className="text-sm font-black text-emerald-700">{analysis.message}</p>
                                </div>
                            ) : (
                                <>
                                    {/* Summary pills */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-wider mb-1">एकूण मालमत्ता</p>
                                            <p className="text-2xl font-black text-blue-700">{MN(analysis.summary?.total_properties)}</p>
                                        </div>
                                        <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-center">
                                            <p className="text-[9px] font-black text-rose-400 uppercase tracking-wider mb-1">नवीन मागील थकबाकी</p>
                                            <p className="text-lg font-black text-rose-700">₹{MN(Math.round(analysis.summary?.total_new_magil || 0))}</p>
                                        </div>
                                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                                            <p className="text-[9px] font-black text-amber-400 uppercase tracking-wider mb-1">नवीन चालू मागणी</p>
                                            <p className="text-lg font-black text-amber-700">₹{MN(Math.round(analysis.summary?.total_new_chalu || 0))}</p>
                                        </div>
                                    </div>

                                    {/* Wasti-wise table */}
                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    <th className="px-4 py-2.5 text-left text-[9px] font-black uppercase tracking-widest text-slate-500">वस्ती</th>
                                                    <th className="px-4 py-2.5 text-right text-[9px] font-black uppercase tracking-widest text-rose-400">जुनी मागील</th>
                                                    <th className="px-4 py-2.5 text-right text-[9px] font-black uppercase tracking-widest text-amber-500">चालू कर</th>
                                                    <th className="px-4 py-2.5 text-right text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50/60">→ नवीन मागील ✓</th>
                                                    <th className="px-4 py-2.5 text-right text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50/60">नवीन चालू</th>
                                                    <th className="px-4 py-2.5 text-center text-[9px] font-black uppercase tracking-widest text-slate-400">संख्या</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {Object.entries(wastiGroups).map(([wasti, rows]) => (
                                                    <tr key={wasti} className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-4 py-3">
                                                            <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-100 text-amber-800 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">
                                                                🏘️ {wasti}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-rose-500 text-[11px] tabular-nums">₹{MN(Math.round(sm(rows, 'cur_magil')))}</td>
                                                        <td className="px-4 py-3 text-right font-bold text-amber-600 text-[11px] tabular-nums">₹{MN(Math.round(sm(rows, 'cur_chalu')))}</td>
                                                        <td className="px-4 py-3 text-right font-black text-emerald-700 text-[12px] tabular-nums bg-emerald-50/40">₹{MN(Math.round(sm(rows, 'new_magil')))}</td>
                                                        <td className="px-4 py-3 text-right font-black text-blue-700 text-[12px] tabular-nums bg-blue-50/40">₹{MN(Math.round(sm(rows, 'new_chalu')))}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-black">{MN(rows.length)}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {/* Grand total */}
                                                <tr className="bg-slate-800">
                                                    <td className="px-4 py-3 font-black text-white text-[10px] uppercase tracking-wider">📊 एकूण</td>
                                                    <td className="px-4 py-3 text-right font-black text-rose-300 text-[11px] tabular-nums">—</td>
                                                    <td className="px-4 py-3 text-right font-black text-amber-300 text-[11px] tabular-nums">₹{MN(Math.round(analysis.summary?.total_new_chalu || 0))}</td>
                                                    <td className="px-4 py-3 text-right font-black text-emerald-400 text-[12px] tabular-nums bg-emerald-950/20">₹{MN(Math.round(analysis.summary?.total_new_magil || 0))}</td>
                                                    <td className="px-4 py-3 text-right font-black text-blue-300 text-[12px] tabular-nums bg-blue-950/20">₹{MN(Math.round(analysis.summary?.total_new_chalu || 0))}</td>
                                                    <td className="px-4 py-3 text-center font-black text-white text-[11px]">{MN(analysis.summary?.total_properties || 0)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Warning */}
                                    <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex gap-2.5">
                                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] font-bold text-rose-700 leading-relaxed">
                                            <span className="font-black">सावधान:</span> हे बदल कायमस्वरूपी आहेत. चालू कर → मागील थकबाकीत जोडला जाईल. पावती व वसुली रीसेट होईल. फक्त Admin हे करू शकतात.
                                        </p>
                                    </div>

                                    {/* STEP 3 — Confirm */}
                                    <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shrink-0">३</span>
                                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">अंतिम पुष्टी</span>
                                        </div>
                                        <label className="flex items-start gap-3 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={confirmed}
                                                onChange={e => setConfirmed(e.target.checked)}
                                                className="w-5 h-5 rounded accent-rose-600 cursor-pointer mt-0.5 shrink-0"
                                            />
                                            <span className="text-[11px] font-black text-slate-700 leading-relaxed">
                                                मी वरील सर्व डेटा तपासला आहे.{' '}
                                                <span className="text-amber-600">{analysis.current_fy}</span> वरून{' '}
                                                <span className="text-emerald-600">{analysis.next_fy}</span> मध्ये{' '}
                                                <span className="text-indigo-600">{MN(analysis.summary?.total_properties || 0)} मालमत्तांचे</span>{' '}
                                                स्थलांतर करण्यास माझी संपूर्ण संमती आहे.
                                            </span>
                                        </label>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="shrink-0 bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex justify-between items-center">
                    <button
                        onClick={onClose}
                        disabled={migrating}
                        className="flex items-center gap-2 px-4 py-2 text-slate-500 border border-slate-200 bg-white rounded-xl font-black uppercase text-[10px] hover:bg-slate-100 transition-all disabled:opacity-40"
                    >
                        <X className="w-3.5 h-3.5" /> रद्द करा
                    </button>
                    <button
                        onClick={handleMigrate}
                        disabled={!confirmed || migrating || !analysis || analysis?.already_migrated}
                        className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 text-white rounded-xl font-black uppercase text-[11px] hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-rose-600/20 active:scale-95"
                    >
                        {migrating
                            ? <><RotateCcw className="w-3.5 h-3.5 animate-spin" /> प्रक्रिया सुरू आहे...</>
                            : <><CheckCircle2 className="w-3.5 h-3.5" /> {analysis?.next_fy || '—'} मध्ये स्थलांतर करा</>
                        }
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes fySlideUp {
                    from { opacity: 0; transform: translateY(40px) scale(0.97); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
            `}</style>
        </div>
    );
}
