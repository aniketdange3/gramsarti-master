import React, { useState } from 'react';
import { LogIn, Eye, EyeOff, Building2, Receipt, UserPlus, AlertCircle, KeyRound, HelpCircle, User, Shield } from 'lucide-react';
import { API_BASE_URL } from '../config';

interface LoginProps {
    onLogin: (token: string, user: any) => void;
}

export const ROLES = [
    { value: 'operator', label: 'डाटा एन्ट्री ऑपरेटर' },
    { value: 'collection_officer', label: 'कर वसुली अधिकारी' },
    { value: 'clerk', label: 'लिपीक' },
    { value: 'bill_operator', label: 'बिल ऑपरेटर' },
    { value: 'gram_sachiv', label: 'ग्राम सचिव' },
    { value: 'gram_sevak', label: 'ग्रामसेवक' },
];

export default function Login({ onLogin }: LoginProps) {
    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('operator');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const BASE_URL = `${API_BASE_URL}/api/auth`;

    const [age, setAge] = useState('');
    const [mobile, setMobile] = useState('');
    const [address, setAddress] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (isSignUp) {
            if (!name.trim()) return setError('कृपया नाव टाका');
            if (!mobile.trim()) return setError('कृपया संपर्क क्रमांक टाका');
            if (!age.trim()) return setError('कृपया वय टाका');
            if (!address.trim()) return setError('कृपया पत्ता टाका');
        }
        if (!username.trim() || !password.trim()) {
            setError('वापरकर्तानाव आणि पासवर्ड टाका');
            return;
        }

        setLoading(true);
        try {
            const endpoint = isSignUp ? '/register' : '/login';
            const body = isSignUp
                ? {
                    name: name.trim(),
                    username: username.trim(),
                    password,
                    role,
                    mobile: mobile.trim(),
                    age: parseInt(age),
                    address: address.trim()
                }
                : { username: username.trim(), password };

            const res = await fetch(`${BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || (isSignUp ? 'नोंदणी अयशस्वी' : 'लॉगिन अयशस्वी'));
                return;
            }

            if (isSignUp) {
                setSuccess(data.message);
                setIsSignUp(false);
                setName('');
                setUsername('');
                setPassword('');
                setMobile('');
                setAge('');
                setAddress('');
            } else {
                onLogin(data.token, data.user);
            }
        } catch (err) {
            setError('सर्व्हरशी कनेक्ट होऊ शकत नाही');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-screen p-5 bg-[#e2e8f0] overflow-hidden font-sans select-none">
            <div className="w-full h-full rounded-3xl overflow-hidden shadow-2xl flex relative bg-white">

                {/* Left Side: Branding (Hidden on Small Screens) */}
                <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-center p-[10%] text-white"
                    style={{ background: 'linear-gradient(135deg, #302C80 0%, #544CE6 100%)' }}>

                    {/* Abstract Shapes for Texture */}
                    <div className="absolute inset-0 opacity-20 overflow-hidden pointer-events-none">
                        <div className="absolute -top-20 -left-20 w-96 h-96 bg-white rounded-full blur-3xl opacity-20" />
                        <div className="absolute top-1/2 -right-20 w-80 h-80 bg-primary-light rounded-full blur-3xl opacity-30" />
                    </div>

                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/10 backdrop-blur-xl p-3 rounded-2xl border border-white/20">
                                <img src="/images/logo.png" alt="Logo" className="w-12 h-12 object-contain" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black tracking-tight leading-none">GramSarthi</h1>
                                <p className="text-primary-light text-[10px] uppercase font-black tracking-widest mt-1">Village Governance Solutions</p>
                            </div>
                        </div>

                        <div className="mt-auto">
                            <h2 className="text-5xl font-black leading-[1.1] mb-6 tracking-tight">
                                ग्रामपंचायत <br />
                                मालमत्ता कर <br />
                                <span className="text-white/60">स्वयंचलन प्रणाली</span>
                            </h2>

                            <div className="space-y-4 max-w-sm">
                                {[
                                    { icon: <Building2 className="w-5 h-5" />, text: 'नमुना ८ आणि नमुना ९ अचूक नोंदणी' },
                                    { icon: <Receipt className="w-5 h-5" />, text: 'डिजिटल मागणी बिले व कर वसुली' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
                                        <div className="text-primary-light">{item.icon}</div>
                                        <p className="text-sm font-bold text-white/90">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-auto pt-10 border-t border-white/10">
                            <p className="text-xs font-medium text-white/40 italic">समृद्ध गाव, विकसित महाराष्ट्र ...</p>
                        </div>
                    </div>
                </div>

                {/* Right Side: Login Form */}
                <div className="w-full lg:w-1/2 overflow-y-auto bg-white flex flex-col items-center hide-scrollbar">
                    <div className="w-full max-w-[500px] px-10 py-12 my-auto transition-all duration-500">
                        <div className="mb-10 text-center lg:text-left">
                            <div className="lg:hidden inline-flex items-center justify-center mb-6 p-4 bg-indigo-50 rounded-3xl text-indigo-600 shadow-sm border border-indigo-100">
                                <Building2 className="w-10 h-10" />
                            </div>
                            <h3 className="text-[32px] font-black text-slate-800 tracking-tight mb-2">
                                {isSignUp ? 'नवीन खाते' : 'स्वागत आहे !'}
                            </h3>
                            <p className="text-slate-500 font-bold text-sm tracking-wide">
                                {isSignUp ? 'नोंदणी करण्यासाठी खालील माहिती भरा.' : 'लॉगिन करण्यासाठी आपले क्रेडेंशियल्स प्रविष्ट करा.'}
                            </p>
                        </div>

                        {/* Success Message */}
                        {success && (
                            <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 px-5 py-4 rounded-2xl mb-8 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="bg-emerald-100 p-2 rounded-xl mt-0.5">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-black mb-1">अभिनंदन!</p>
                                    <p className="text-xs font-bold leading-relaxed">{success}</p>
                                </div>
                            </div>
                        )}

                        {/* Compact Toggle */}
                        <div className="flex bg-slate-100 p-1 rounded-2xl mb-8">
                            <button
                                onClick={() => { setIsSignUp(false); setError(''); setSuccess(''); }}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${!isSignUp ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                लॉगिन
                            </button>
                            <button
                                onClick={() => { setIsSignUp(true); setError(''); setSuccess(''); }}
                                className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${isSignUp ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                            >
                                साइन-अप
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                            <div className={isSignUp ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "flex flex-col gap-6"}>
                                {isSignUp && (
                                    <div className="space-y-2 transition-all group col-span-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-indigo-500 transition-colors">पूर्ण नाव</label>
                                        <div className="relative group/input text-slate-500 focus-within:text-indigo-500">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                value={name}
                                                onChange={e => setName(e.target.value)}
                                                className="w-full pl-11 pr-5 py-3 rounded-2xl bg-white border-2 border-slate-100 hover:border-slate-200 outline-none focus:border-indigo-500 transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-sm"
                                                placeholder="उदा. राजेश विनायकराव देशमुख"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2 group">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-indigo-500 transition-colors">वापरकर्ता नाव</label>
                                    <div className="relative group/input text-slate-500 focus-within:text-indigo-500">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            required
                                            value={username}
                                            onChange={e => setUsername(e.target.value)}
                                            className="w-full pl-11 pr-5 py-3 rounded-2xl bg-white border-2 border-slate-100 hover:border-slate-200 outline-none focus:border-indigo-500 transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-sm"
                                            placeholder="username"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 group">
                                    <div className="flex justify-between items-center ml-1">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest group-focus-within:text-indigo-500 transition-colors">पासवर्ड</label>
                                        {!isSignUp && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setError('येथे पासवर्ड पुनर्प्राप्ती जोडलेली नाही, कृपया आपल्या प्रशासकाशी संपर्क साधा.');
                                                }}
                                                className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors uppercase tracking-wider flex items-center gap-1 bg-indigo-50/50 hover:bg-indigo-100/50 px-2 py-1 rounded-md"
                                            >
                                                <HelpCircle className="w-3 h-3" /> विसरलात?
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative group/input text-slate-500 focus-within:text-indigo-500">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors">
                                            <KeyRound className="w-4 h-4" />
                                        </div>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            className="w-full pl-11 pr-12 py-3 rounded-2xl bg-white border-2 border-slate-100 hover:border-slate-200 outline-none focus:border-indigo-500 transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-sm"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl transition-all ${showPassword ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                                                }`}
                                            title={showPassword ? "पासवर्ड लपवा" : "पासवर्ड पहा"}
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {isSignUp && (
                                    <>
                                        <div className="space-y-2 group">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-indigo-500 transition-colors">भूमिका (Role)</label>
                                            <div className="relative group/input text-slate-500 focus-within:text-indigo-500">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors">
                                                    <Shield className="w-4 h-4" />
                                                </div>
                                                <select
                                                    value={role}
                                                    onChange={e => setRole(e.target.value)}
                                                    className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white border-2 border-slate-100 hover:border-slate-200 outline-none focus:border-indigo-500 transition-all font-bold text-slate-700 shadow-sm appearance-none cursor-pointer"
                                                >
                                                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                                </select>
                                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2 group">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-indigo-500 transition-colors">संपर्क क्रमांक</label>
                                            <div className="relative group/input text-slate-500 focus-within:text-indigo-500">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors font-bold text-xs">+91</div>
                                                <input
                                                    type="tel"
                                                    required
                                                    maxLength={10}
                                                    value={mobile}
                                                    onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                                                    className="w-full pl-12 pr-5 py-3 rounded-2xl bg-white border-2 border-slate-100 hover:border-slate-200 outline-none focus:border-indigo-500 transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-sm"
                                                    placeholder="9876543210"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2 group">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-indigo-500 transition-colors">वय</label>
                                            <div className="relative group/input text-slate-500 focus-within:text-indigo-500">
                                                <input
                                                    type="number"
                                                    required
                                                    value={age}
                                                    onChange={e => setAge(e.target.value)}
                                                    className="w-full px-5 py-3 rounded-2xl bg-white border-2 border-slate-100 hover:border-slate-200 outline-none focus:border-indigo-500 transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-sm text-center"
                                                    placeholder="25"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2 group col-span-2">
                                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-indigo-500 transition-colors">पत्ता</label>
                                            <div className="relative group/input text-slate-500 focus-within:text-indigo-500">
                                                <textarea
                                                    required
                                                    value={address}
                                                    onChange={e => setAddress(e.target.value)}
                                                    rows={2}
                                                    className="w-full px-5 py-3 rounded-2xl bg-white border-2 border-slate-100 hover:border-slate-200 outline-none focus:border-indigo-500 transition-all font-bold text-slate-700 placeholder:text-slate-300 shadow-sm resize-none"
                                                    placeholder="तुमचा पूर्ण पत्ता टाका..."
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>


                            {error && (
                                <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-2xl">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <p className="text-xs font-black">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3.5 rounded-2xl text-white font-black text-sm tracking-wide bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 shadow-lg shadow-indigo-600/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none mt-8 group"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {isSignUp ? <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" /> : <KeyRound className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                                        {isSignUp ? 'साइन-अप करा' : 'लॉगिन करा'}
                                    </>
                                )}
                            </button>
                        </form>

                        {/* <p className="mt-10 mb-8 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest leading-relaxed">
                            Powered by Clumatrix <br />
                        </p> */}
                    </div>
                </div>
            </div>

            {/* Bottom Text
            <div className="absolute bottom-0 left-0 w-full bg-indigo-600 text-indigo-50 py-1.5 z-50 text-center">
                <div className="text-[10px] font-black tracking-[0.2em] uppercase">
                    Powered by Clumatrix &nbsp; • &nbsp; Developed by Aniket Dange 2026
                </div>
            </div> */}
        </div>
    );
}
