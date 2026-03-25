"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { LogIn, Mail, Lock, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
    const { t } = useLanguage();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showErrors, setShowErrors] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowErrors(true);

        if (!email || !password) return;

        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.push('/dashboard');
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center py-12 px-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md"
            >
                <div className="premium-card p-10 bg-white dark:bg-slate-800">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-black mb-2">{t.nav.login}</h1>
                        <p className="text-slate-500">Welcome back to the academy</p>
                    </div>


                    <form onSubmit={handleLogin} className="space-y-6" noValidate>
                        <div>
                            <label className={`block text-sm font-bold mb-2 ml-1 ${(showErrors && !email) || error ? 'text-red-500' : ''}`}>Email</label>
                            <div className="relative">
                                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 ${(showErrors && !email) || error ? 'text-red-500' : 'text-slate-400'}`} size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`w-full pl-12 pr-4 py-3 rounded-xl border focus:ring-2 outline-none transition-all ${(showErrors && !email) || error ? 'border-red-500 focus:ring-red-100' : 'border-border focus:ring-brand-blue'}`}
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                            {showErrors && !email && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">L'email est requis</p>}
                        </div>

                        <div>
                            <div className="flex justify-between mb-2 ml-1">
                                <label className={`text-sm font-bold ${(showErrors && !password) || error ? 'text-red-500' : ''}`}>Password</label>
                                <Link href="/forgot-password" className="text-xs text-brand-blue font-bold hover:underline">Forgot password?</Link>
                            </div>
                            <div className="relative">
                                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 ${(showErrors && !password) || error ? 'text-red-500' : 'text-slate-400'}`} size={18} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full pl-12 pr-12 py-3 rounded-xl border focus:ring-2 outline-none transition-all ${(showErrors && !password) || error ? 'border-red-500 focus:ring-red-100' : 'border-border focus:ring-brand-blue'}`}
                                    placeholder="••••••••"
                                    required
                                />
                                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-blue transition-colors">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {showErrors && !password && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">Le mot de passe est requis</p>}
                            {error && <p className="text-[10px] text-red-500 font-bold mt-2 ml-1 text-center">Email ou mot de passe incorrect</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
                            {t.nav.login}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-sm text-slate-500">
                        Don't have an account? <Link href="/register" className="text-brand-blue font-bold hover:underline">{t.nav.register}</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
