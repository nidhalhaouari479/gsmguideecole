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

    const emailErr = (showErrors && !email) || !!error;
    const passwordErr = (showErrors && !password) || !!error;
    const inputBase = "h-11 w-full rounded-xl border bg-white pl-11 text-sm text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-2";
    const inputOk = "border-slate-200 focus:border-brand-green focus:ring-brand-green/20";
    const inputErr = "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20";

    return (
        <div className="flex min-h-[80vh] items-center justify-center bg-slate-50 px-4 py-10 md:py-16">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md"
            >
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                    <div className="mb-8 text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green/15 text-slate-900">
                            <LogIn size={22} />
                        </div>
                        <h1 className="mb-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">{t.nav.login}</h1>
                        <p className="text-sm text-slate-600">Bon retour parmi nous ! Accédez à votre espace étudiant.</p>
                    </div>

                    {error && (
                        <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-sm font-medium text-rose-800">
                            <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-600" />
                            Email ou mot de passe incorrect
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5" noValidate>
                        <div>
                            <label htmlFor="login-email" className="mb-1.5 block text-sm font-semibold text-slate-900">Email</label>
                            <div className="relative">
                                <Mail className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${emailErr ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
                                <input
                                    id="login-email"
                                    type="email"
                                    autoComplete="email"
                                    inputMode="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`${inputBase} pr-3 ${emailErr ? inputErr : inputOk}`}
                                    placeholder="votre@email.com"
                                    aria-invalid={emailErr || undefined}
                                    aria-describedby={showErrors && !email ? 'login-email-err' : undefined}
                                    required
                                />
                            </div>
                            {showErrors && !email && <p id="login-email-err" className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-700"><AlertCircle size={13} /> L&apos;email est requis</p>}
                        </div>

                        <div>
                            <div className="mb-1.5 flex items-center justify-between gap-3">
                                <label htmlFor="login-password" className="text-sm font-semibold text-slate-900">Mot de passe</label>
                                <Link href="/forgot-password" className="text-sm font-semibold text-brand-blue hover:underline">Mot de passe oublié ?</Link>
                            </div>
                            <div className="relative">
                                <Lock className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${passwordErr ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
                                <input
                                    id="login-password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`${inputBase} pr-12 ${passwordErr ? inputErr : inputOk}`}
                                    placeholder="••••••••"
                                    aria-invalid={passwordErr || undefined}
                                    aria-describedby={showErrors && !password ? 'login-password-err' : undefined}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                    title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                    aria-pressed={showPassword}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {showErrors && !password && <p id="login-password-err" className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-700"><AlertCircle size={13} /> Le mot de passe est requis</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-green text-base font-bold text-black transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
                            {loading ? 'Connexion...' : t.nav.login}
                        </button>
                    </form>

                    <p className="mt-6 border-t border-slate-200 pt-6 text-center text-sm text-slate-600">
                        Pas encore de compte ? <Link href="/register" className="font-bold text-brand-blue hover:underline">{t.nav.register}</Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
