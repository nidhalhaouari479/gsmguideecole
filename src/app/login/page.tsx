"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { LogIn, Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, BookOpen, CalendarDays, ShieldCheck } from 'lucide-react';
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
    const inputBase = "site-input pl-11";
    const inputOk = "";
    const inputErr = "border-rose-400 hover:border-rose-500 focus:border-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.15)]";
    const brandPoints = [
        { icon: BookOpen, text: 'Suivez vos formations et votre progression' },
        { icon: CalendarDays, text: 'Consultez le calendrier de vos séances' },
        { icon: ShieldCheck, text: 'Gérez vos paiements et reçus en toute sécurité' },
    ];

    return (
        <div className="flex min-h-[80vh] items-center bg-site-muted py-8 md:py-12">
            <div className="site-container">
                <div className="mx-auto grid w-full max-w-6xl items-stretch gap-8 lg:grid-cols-2 lg:gap-10">
                    {/* Brand panel (desktop only) */}
                    <aside className="relative hidden overflow-hidden rounded-2xl bg-navy-950 p-10 shadow-[var(--shadow-pop)] lg:flex lg:flex-col lg:justify-between">
                        <span className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-blue/40 blur-3xl" aria-hidden="true" />
                        <span className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-brand-green/20 blur-3xl" aria-hidden="true" />
                        <div className="relative flex items-center gap-3">
                            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#fff] shadow-[var(--shadow-card)]">
                                <img src="/gsmlogo.png" alt="" className="h-9 w-9 object-contain" />
                            </span>
                            <span className="text-[15px] font-bold text-[#fff]">GSM Guide Academy</span>
                        </div>
                        <div className="relative mt-16">
                            <h2 className="text-balance text-[30px] font-extrabold leading-tight tracking-tight text-[#fff]">
                                Votre espace étudiant, au même endroit.
                            </h2>
                            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#B4C0D3]">
                                Retrouvez vos inscriptions, vos séances et vos paiements en quelques clics.
                            </p>
                            <ul className="mt-8 space-y-4">
                                {brandPoints.map(({ icon: Icon, text }) => (
                                    <li key={text} className="flex items-center gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#fff]/10 text-brand-green ring-1 ring-[#fff]/10">
                                            <Icon size={18} aria-hidden="true" />
                                        </span>
                                        <span className="text-[14px] font-medium text-[#fff]">{text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <p className="relative mt-12 text-xs text-[#B4C0D3]">© GSM Guide Academy</p>
                    </aside>

                    {/* Form */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex w-full flex-col items-center justify-center"
                    >
                        <div className="mb-6 flex items-center gap-2.5 lg:hidden">
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200/80 bg-[#fff] shadow-[var(--shadow-card)]">
                                <img src="/gsmlogo.png" alt="" className="h-8 w-8 object-contain" />
                            </span>
                            <span className="text-[15px] font-bold text-slate-900">GSM Guide Academy</span>
                        </div>
                        <div className="site-card w-full max-w-md p-6 md:p-8">
                            <div className="mb-7">
                                <span className="site-icon-tile mb-4 bg-brand-green" aria-hidden="true">
                                    <LogIn size={20} />
                                </span>
                                <h1 className="text-[24px] font-semibold tracking-tight text-slate-900 md:text-[26px]">{t.nav.login}</h1>
                                <p className="mt-1 text-sm text-slate-500">Bon retour parmi nous ! Accédez à votre espace étudiant.</p>
                            </div>

                            {error && (
                                <div role="alert" className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 p-3.5 text-sm font-medium text-rose-800 ring-1 ring-rose-200">
                                    <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-600" aria-hidden="true" />
                                    Email ou mot de passe incorrect
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-5" noValidate>
                                <div>
                                    <label htmlFor="login-email" className="site-label">Email</label>
                                    <div className="relative">
                                        <Mail className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${emailErr ? 'text-rose-500' : 'text-slate-400'}`} size={18} aria-hidden="true" />
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
                                    {showErrors && !email && <p id="login-email-err" className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-700"><AlertCircle size={13} aria-hidden="true" /> L&apos;email est requis</p>}
                                </div>

                                <div>
                                    <div className="mb-1.5 flex items-center justify-between gap-3">
                                        <label htmlFor="login-password" className="site-label mb-0">Mot de passe</label>
                                        <Link href="/forgot-password" className="-my-3 inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-brand-green-700 transition-colors duration-150 hover:text-brand-green-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2">Mot de passe oublié ?</Link>
                                    </div>
                                    <div className="relative">
                                        <Lock className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${passwordErr ? 'text-rose-500' : 'text-slate-400'}`} size={18} aria-hidden="true" />
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
                                            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                                            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                            title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                            aria-pressed={showPassword}
                                        >
                                            {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                                        </button>
                                    </div>
                                    {showErrors && !password && <p id="login-password-err" className="mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-700"><AlertCircle size={13} aria-hidden="true" /> Le mot de passe est requis</p>}
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="site-btn-primary w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} aria-hidden="true" /> : <LogIn size={20} aria-hidden="true" />}
                                    {loading ? 'Connexion...' : t.nav.login}
                                </button>
                            </form>

                            <p className="mt-6 border-t border-slate-100 pt-6 text-center text-sm text-slate-600">
                                Pas encore de compte ? <Link href="/register" className="rounded-md font-semibold text-brand-green-700 transition-colors duration-150 hover:text-brand-green-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2">{t.nav.register}</Link>
                            </p>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
