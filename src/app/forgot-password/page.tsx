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
    Loader2
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

    const inputClass = "h-11 w-full rounded-xl border bg-white pl-11 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-2";
    const labelClass = "mb-1.5 block text-sm font-semibold text-slate-900";
    const primaryBtn = "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-green text-base font-bold text-black transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

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

    const okBorder = 'border-slate-200 focus:border-brand-green focus:ring-brand-green/20';
    const errBorder = 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20';
    const errText = 'mt-1.5 flex items-center gap-1 text-xs font-medium text-rose-700';
    const iconClass = (bad: boolean) => `pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${bad ? 'text-rose-500' : 'text-slate-400'}`;
    const steps = ['Email', 'Code', 'Nouveau mot de passe'];
    const errorBox = error && (
        <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
    );

    return (
        <div className="flex min-h-[80vh] items-center justify-center bg-slate-50 px-4 py-10 md:py-16">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-md"
            >
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                    <div className="mb-6 text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue/10">
                            <KeyRound className="text-brand-blue" size={24} />
                        </div>
                        <h1 className="mb-1 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Récupération</h1>
                        <p className="text-sm text-slate-600">Réinitialisez votre accès en toute sécurité.</p>
                    </div>

                    {step < 3 && (
                        <ol className="mb-6 flex items-center gap-2" aria-label="Étapes de récupération">
                            {steps.map((label, i) => (
                                <li key={label} className="flex min-w-0 flex-1 flex-col gap-1.5" aria-current={i === step ? 'step' : undefined}>
                                    <span className={`h-1.5 rounded-full ${i < step ? 'bg-emerald-600' : i === step ? 'bg-brand-green' : 'bg-slate-200'}`} />
                                    <span className={`truncate text-[11px] font-bold ${i <= step ? 'text-slate-900' : 'text-slate-500'}`}>{i + 1}. {label}</span>
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
                                        <Mail className={iconClass(showErrors && !email)} size={18} />
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
                                    <p className="mt-1.5 text-xs text-slate-600">Nous vous enverrons un code de vérification à 6 chiffres.</p>
                                    {showErrors && !email && <p className={errText}><AlertCircle size={13} /> L&apos;email est requis</p>}
                                    {errorBox}
                                </div>
                                <button type="submit" disabled={loading} className={primaryBtn}>
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : <><ArrowRight size={20} /> Envoyer le code</>}
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
                                        <ShieldCheck className={iconClass(showErrors && code.length !== 6)} size={18} />
                                        <input
                                            id="fp-code"
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            maxLength={6}
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                            className={`${inputClass} h-12 text-center text-lg font-black tabular-nums tracking-[0.4em] ${showErrors && code.length !== 6 ? errBorder : okBorder}`}
                                            placeholder="000000"
                                            aria-invalid={(showErrors && code.length !== 6) || undefined}
                                        />
                                    </div>
                                    <p className="mt-2 text-center text-xs text-slate-600">Un code a été envoyé à <b className="text-slate-900">{email}</b></p>
                                    {showErrors && code.length !== 6 && <p className={`${errText} justify-center`}><AlertCircle size={13} /> Code incomplet (6 chiffres)</p>}
                                    {errorBox}
                                </div>
                                <button type="submit" disabled={loading} className={primaryBtn}>
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} /> Continuer</>}
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
                                        <CreditCard className={iconClass(showErrors && cinNumber.length !== 8)} size={18} />
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
                                    {showErrors && cinNumber.length !== 8 && <p className={errText}><AlertCircle size={13} /> Doit contenir 8 chiffres</p>}
                                </div>

                                <div>
                                    <label htmlFor="fp-new" className={labelClass}>Nouveau mot de passe</label>
                                    <div className="relative">
                                        <Lock className={iconClass(showErrors && newPassword.length < 8)} size={18} />
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
                                            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                                            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                            title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                                            aria-pressed={showPassword}
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {showErrors && newPassword.length < 8
                                        ? <p className={errText}><AlertCircle size={13} /> Min. 8 caractères</p>
                                        : <p className="mt-1.5 text-xs text-slate-600">Au moins 8 caractères.</p>}
                                </div>

                                <div>
                                    <label htmlFor="fp-confirm" className={labelClass}>Confirmez le mot de passe</label>
                                    <div className="relative">
                                        <Lock className={iconClass(showErrors && confirmPassword !== newPassword)} size={18} />
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
                                    {showErrors && confirmPassword !== newPassword && <p className={errText}><AlertCircle size={13} /> Les mots de passe ne correspondent pas</p>}
                                    {errorBox}
                                </div>

                                <button type="submit" disabled={loading} className={primaryBtn}>
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : <><ShieldCheck size={20} /> Réinitialiser</>}
                                </button>
                            </motion.form>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="py-4 text-center"
                                role="status"
                            >
                                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                                    <CheckCircle2 size={36} className="text-emerald-600" />
                                </div>
                                <h2 className="mb-2 text-2xl font-black text-slate-900">Succès !</h2>
                                <p className="mb-8 text-sm text-slate-600">Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.</p>
                                <button
                                    onClick={() => router.push('/login')}
                                    className={primaryBtn}
                                >
                                    Se connecter
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mt-6 text-center">
                    <Link href="/login" className="inline-flex h-10 items-center text-sm font-bold text-brand-blue hover:underline">
                        Retour à la connexion
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
