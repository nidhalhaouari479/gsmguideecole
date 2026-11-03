"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Mail,
    Lock,
    ShieldCheck,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    KeyRound,
    CreditCard,
    Eye,
    EyeOff,
    Loader2,
    Check,
    ArrowLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState(0); // 0: Email, 1: Code, 2: CIN & New Pass, 3: Success

    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [cinNumber, setCinNumber] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [verifyToken, setVerifyToken] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showErrors, setShowErrors] = useState(false);

    const inputClass = "site-input pl-11 pr-3";
    const labelClass = "site-label";
    const primaryBtn = "site-btn-primary w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2";

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowErrors(true);
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erreur lors de l'envoi du code");

            // Store the signed verification token returned by the server
            if (data.verifyToken) setVerifyToken(data.verifyToken);
            setStep(1);
            setShowErrors(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowErrors(true);
        if (code.length !== 6) return;

        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/auth/confirm-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Code incorrect");

            setStep(2);
            setShowErrors(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowErrors(true);

        const isCinValid = cinNumber.length === 8;
        const isPassValid = newPassword.length >= 8;
        const isConfirmValid = newPassword === confirmPassword;

        if (!isCinValid || !isPassValid || !isConfirmValid) return;

        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, cinNumber, newPassword, verifyToken })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erreur lors de la réinitialisation");

            setStep(3);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const okBorder = '';
    const errBorder = 'border-rose-400 hover:border-rose-500 focus:border-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.15)]';
    const errText = 'mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-700';
    const iconClass = (bad: boolean) => `pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${bad ? 'text-rose-500' : 'text-slate-400'}`;
    const steps = ['Email', 'Code', 'Nouveau mot de passe'];
    const errorBox = error && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-800 ring-1 ring-rose-200">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" aria-hidden="true" /> {error}
        </div>
    );
    const brandPoints = [
        { icon: Mail, text: 'Recevez un code de vérification par email' },
        { icon: ShieldCheck, text: 'Confirmez votre identité avec votre CIN' },
        { icon: Lock, text: 'Choisissez un nouveau mot de passe sécurisé' },
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
                                Retrouvez l&apos;accès à votre espace.
                            </h2>
                            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#B4C0D3]">
                                Trois étapes rapides pour réinitialiser votre mot de passe en toute sécurité.
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
                            <div className="mb-6">
                                <span className="site-icon-tile mb-4 bg-brand-blue" aria-hidden="true">
                                    <KeyRound size={20} />
                                </span>
                                <h1 className="text-[24px] font-semibold tracking-tight text-slate-900 md:text-[26px]">Récupération</h1>
                                <p className="mt-1 text-sm text-slate-500">Réinitialisez votre accès en toute sécurité.</p>
                            </div>

                            {step < 3 && (
                                <ol className="mb-7 flex items-start gap-2" aria-label="Étapes de récupération">
                                    {steps.map((label, i) => (
                                        <li key={label} className="flex min-w-0 flex-1 flex-col gap-2" aria-current={i === step ? 'step' : undefined}>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums transition-colors duration-200 ${i < step
                                                        ? 'bg-emerald-500 text-[#fff]'
                                                        : i === step
                                                            ? 'bg-brand-green-600 text-[#fff]'
                                                            : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200'
                                                        }`}
                                                    aria-hidden="true"
                                                >
                                                    {i < step ? <Check size={13} strokeWidth={3} /> : i + 1}
                                                </span>
                                                <span className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${i < step ? 'bg-emerald-500' : i === step ? 'bg-brand-green' : 'bg-slate-50 ring-1 ring-inset ring-slate-200'}`} aria-hidden="true" />
                                            </div>
                                            <span className={`truncate text-[11.5px] font-semibold uppercase tracking-[0.02em] ${i <= step ? 'text-slate-900' : 'text-slate-500'}`}>
                                                <span className="sr-only">{i + 1}. </span>{label}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            )}

                            <AnimatePresence mode="wait">
                                {step === 0 && (
                                    <motion.form
                                        key="step0"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.2 }}
                                        onSubmit={handleSendCode}
                                        className="space-y-5"
                                        noValidate
                                    >
                                        <div>
                                            <label htmlFor="fp-email" className={labelClass}>Votre email</label>
                                            <div className="relative">
                                                <Mail className={iconClass(showErrors && !email)} size={18} aria-hidden="true" />
                                                <input
                                                    id="fp-email"
                                                    type="email"
                                                    autoComplete="email"
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    className={`${inputClass} ${showErrors && !email ? errBorder : okBorder}`}
                                                    placeholder="nom@exemple.com"
                                                    aria-invalid={(showErrors && !email) || undefined}
                                                />
                                            </div>
                                            <p className="mt-1.5 text-xs text-slate-500">Nous vous enverrons un code de vérification à 6 chiffres.</p>
                                            {showErrors && !email && <p className={errText}><AlertCircle size={13} aria-hidden="true" /> L&apos;email est requis</p>}
                                            {errorBox}
                                        </div>
                                        <button type="submit" disabled={loading} className={primaryBtn}>
                                            {loading ? <Loader2 className="animate-spin" size={20} aria-hidden="true" /> : <><ArrowRight size={20} aria-hidden="true" /> Envoyer le code</>}
                                        </button>
                                    </motion.form>
                                )}

                                {step === 1 && (
                                    <motion.form
                                        key="step1"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.2 }}
                                        onSubmit={handleVerifyCode}
                                        className="space-y-5"
                                        noValidate
                                    >
                                        <div>
                                            <label htmlFor="fp-code" className={labelClass}>Code de vérification</label>
                                            <div className="relative">
                                                <ShieldCheck className={iconClass(showErrors && code.length !== 6)} size={18} aria-hidden="true" />
                                                <input
                                                    id="fp-code"
                                                    type="text"
                                                    inputMode="numeric"
                                                    autoComplete="one-time-code"
                                                    maxLength={6}
                                                    value={code}
                                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                                    className={`${inputClass} h-14 text-center text-xl font-bold tabular-nums tracking-[0.4em] ${showErrors && code.length !== 6 ? errBorder : okBorder}`}
                                                    placeholder="000000"
                                                    aria-invalid={(showErrors && code.length !== 6) || undefined}
                                                />
                                            </div>
                                            <p className="mt-2 rounded-lg bg-brand-soft px-3 py-2 text-center text-xs text-brand-blue-dark">Un code a été envoyé à <b className="break-all font-semibold">{email}</b></p>
                                            {showErrors && code.length !== 6 && <p className={`${errText} justify-center`}><AlertCircle size={13} aria-hidden="true" /> Code incomplet (6 chiffres)</p>}
                                            {errorBox}
                                        </div>
                                        <button type="submit" disabled={loading} className={primaryBtn}>
                                            {loading ? <Loader2 className="animate-spin" size={20} aria-hidden="true" /> : <><CheckCircle2 size={20} aria-hidden="true" /> Continuer</>}
                                        </button>
                                    </motion.form>
                                )}

                                {step === 2 && (
                                    <motion.form
                                        key="step2"
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        transition={{ duration: 0.2 }}
                                        onSubmit={handleResetPassword}
                                        className="space-y-5"
                                        noValidate
                                    >
                                        <div>
                                            <label htmlFor="fp-cin" className={labelClass}>Numéro de CIN <span className="text-rose-600">*</span></label>
                                            <div className="relative">
                                                <CreditCard className={iconClass(showErrors && cinNumber.length !== 8)} size={18} aria-hidden="true" />
                                                <input
                                                    id="fp-cin"
                                                    type="text"
                                                    inputMode="numeric"
                                                    maxLength={8}
                                                    value={cinNumber}
                                                    onChange={(e) => setCinNumber(e.target.value.replace(/\D/g, ''))}
                                                    className={`${inputClass} tabular-nums ${showErrors && cinNumber.length !== 8 ? errBorder : okBorder}`}
                                                    placeholder="CIN (8 chiffres)"
                                                    aria-invalid={(showErrors && cinNumber.length !== 8) || undefined}
                                                />
                                            </div>
                                            {showErrors && cinNumber.length !== 8 && <p className={errText}><AlertCircle size={13} aria-hidden="true" /> Doit contenir 8 chiffres</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="fp-new" className={labelClass}>Nouveau mot de passe</label>
                                            <div className="relative">
                                                <Lock className={iconClass(showErrors && newPassword.length < 8)} size={18} aria-hidden="true" />
                                                <input
                                                    id="fp-new"
                                                    type={showPassword ? 'text' : 'password'}
                                                    autoComplete="new-password"
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className={`${inputClass} pr-12 ${showErrors && newPassword.length < 8 ? errBorder : okBorder}`}
                                                    placeholder="••••••••"
                                                    aria-invalid={(showErrors && newPassword.length < 8) || undefined}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                                                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                                    title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                                    aria-pressed={showPassword}
                                                >
                                                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                                                </button>
                                            </div>
                                            {showErrors && newPassword.length < 8
                                                ? <p className={errText}><AlertCircle size={13} aria-hidden="true" /> Min. 8 caractères</p>
                                                : <p className="mt-1.5 text-xs text-slate-500">Au moins 8 caractères.</p>}
                                        </div>

                                        <div>
                                            <label htmlFor="fp-confirm" className={labelClass}>Confirmez le mot de passe</label>
                                            <div className="relative">
                                                <Lock className={iconClass(showErrors && confirmPassword !== newPassword)} size={18} aria-hidden="true" />
                                                <input
                                                    id="fp-confirm"
                                                    type={showPassword ? 'text' : 'password'}
                                                    autoComplete="new-password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className={`${inputClass} ${showErrors && confirmPassword !== newPassword ? errBorder : okBorder}`}
                                                    placeholder="••••••••"
                                                    aria-invalid={(showErrors && confirmPassword !== newPassword) || undefined}
                                                />
                                            </div>
                                            {showErrors && confirmPassword !== newPassword && <p className={errText}><AlertCircle size={13} aria-hidden="true" /> Les mots de passe ne correspondent pas</p>}
                                            {errorBox}
                                        </div>

                                        <button type="submit" disabled={loading} className={primaryBtn}>
                                            {loading ? <Loader2 className="animate-spin" size={20} aria-hidden="true" /> : <><ShieldCheck size={20} aria-hidden="true" /> Réinitialiser</>}
                                        </button>
                                    </motion.form>
                                )}

                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="py-2 text-center"
                                        role="status"
                                    >
                                        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-200">
                                            <CheckCircle2 size={34} className="text-emerald-600" aria-hidden="true" />
                                        </div>
                                        <h2 className="mb-2 text-[22px] font-semibold tracking-tight text-slate-900">Succès !</h2>
                                        <p className="mb-8 text-sm text-slate-500">Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.</p>
                                        <button
                                            onClick={() => router.push('/login')}
                                            className={primaryBtn}
                                        >
                                            Se connecter
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                                <Link href="/login" className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-semibold text-brand-green-700 transition-colors duration-150 hover:text-brand-green-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2">
                                    <ArrowLeft size={16} aria-hidden="true" /> Retour à la connexion
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
