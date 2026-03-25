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

    const inputClass = "w-full pl-12 pr-4 py-3 rounded-xl border focus:ring-2 outline-none transition-all";
    const labelClass = "block text-sm font-bold mb-2 ml-1";

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

    return (
        <div className="min-h-screen flex items-center justify-center py-16 px-6 bg-slate-50">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="premium-card p-10 bg-white">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 flex items-center justify-center mx-auto mb-4">
                            <KeyRound className="text-brand-blue" size={32} />
                        </div>
                        <h1 className="text-3xl font-black mb-2">Récupération</h1>
                        <p className="text-slate-500 text-sm">Réinitialisez votre accès en toute sécurité.</p>
                    </div>

                    <AnimatePresence mode="wait">
                        {step === 0 && (
                            <motion.form 
                                key="step0"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={handleSendCode}
                                className="space-y-6"
                                noValidate
                            >
                                <div>
                                    <label className={`${labelClass} ${showErrors && !email ? 'text-red-500' : ''}`}>Votre Email</label>
                                    <div className="relative">
                                        <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 ${showErrors && !email ? 'text-red-500' : 'text-slate-400'}`} size={18} />
                                        <input 
                                            type="email" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={`${inputClass} ${showErrors && !email ? 'border-red-500 ring-red-100' : 'border-slate-200'}`}
                                            placeholder="nom@exemple.com"
                                        />
                                    </div>
                                    {showErrors && !email && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">L'email est requis</p>}
                                    {error && <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs flex gap-2">
                                        <AlertCircle size={14} className="shrink-0" /> {error}
                                    </div>}
                                </div>
                                <button type="submit" disabled={loading} className="btn-primary w-full py-4 flex items-center justify-center gap-2">
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : <><ArrowRight size={20} /> Envoyer le code</>}
                                </button>
                            </motion.form>
                        )}

                        {step === 1 && (
                            <motion.form 
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={handleVerifyCode}
                                className="space-y-6"
                                noValidate
                            >
                                <div>
                                    <label className={`${labelClass} ${showErrors && code.length !== 6 ? 'text-red-500' : ''}`}>Code de Vérification</label>
                                    <div className="relative">
                                        <ShieldCheck className={`absolute left-4 top-1/2 -translate-y-1/2 ${showErrors && code.length !== 6 ? 'text-red-500' : 'text-slate-400'}`} size={18} />
                                        <input 
                                            type="text" 
                                            maxLength={6}
                                            value={code}
                                            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                                            className={`${inputClass} tracking-[0.5em] text-center font-black ${showErrors && code.length !== 6 ? 'border-red-500 ring-red-100' : 'border-slate-200'}`}
                                            placeholder="000000"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-500 mt-2 text-center">Un code a été envoyé à <b>{email}</b></p>
                                    {showErrors && code.length !== 6 && <p className="text-[10px] text-red-500 font-bold mt-1 text-center">Code incomplet (6 chiffres)</p>}
                                    {error && <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs flex gap-2">
                                        <AlertCircle size={14} className="shrink-0" /> {error}
                                    </div>}
                                </div>
                                <button type="submit" disabled={loading} className="btn-primary w-full py-4 flex items-center justify-center gap-2">
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} /> Continuer</>}
                                </button>
                            </motion.form>
                        )}

                        {step === 2 && (
                            <motion.form 
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                onSubmit={handleResetPassword}
                                className="space-y-5"
                                noValidate
                            >
                                <div>
                                    <label className={`${labelClass} ${showErrors && cinNumber.length !== 8 ? 'text-red-500' : ''}`}>Numéro de CIN *</label>
                                    <div className="relative">
                                        <CreditCard className={`absolute left-4 top-1/2 -translate-y-1/2 ${showErrors && cinNumber.length !== 8 ? 'text-red-500' : 'text-slate-400'}`} size={18} />
                                        <input 
                                            type="text" 
                                            maxLength={8}
                                            value={cinNumber}
                                            onChange={(e) => setCinNumber(e.target.value.replace(/\D/g, ''))}
                                            className={`${inputClass} ${showErrors && cinNumber.length !== 8 ? 'border-red-500 ring-red-100' : 'border-slate-200'}`}
                                            placeholder="CIN (8 chiffres)"
                                        />
                                    </div>
                                    {showErrors && cinNumber.length !== 8 && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">Doit contenir 8 chiffres</p>}
                                </div>

                                <div>
                                    <label className={`${labelClass} ${showErrors && newPassword.length < 8 ? 'text-red-500' : ''}`}>Nouveau Mot de passe</label>
                                    <div className="relative">
                                        <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 ${showErrors && newPassword.length < 8 ? 'text-red-500' : 'text-slate-400'}`} size={18} />
                                        <input 
                                            type={showPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className={`${inputClass} ${showErrors && newPassword.length < 8 ? 'border-red-500 ring-red-100' : 'border-slate-200'}`}
                                            placeholder="••••••••"
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {showErrors && newPassword.length < 8 && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">Min. 8 caractères</p>}
                                </div>

                                <div>
                                    <label className={`${labelClass} ${showErrors && confirmPassword !== newPassword ? 'text-red-500' : ''}`}>Conffirmez le Mot de passe</label>
                                    <div className="relative">
                                        <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 ${showErrors && confirmPassword !== newPassword ? 'text-red-500' : 'text-slate-400'}`} size={18} />
                                        <input 
                                            type="password" 
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={`${inputClass} ${showErrors && confirmPassword !== newPassword ? 'border-red-500 ring-red-100' : 'border-slate-200'}`}
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    {showErrors && confirmPassword !== newPassword && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">Les mots de passe ne correspondent pas</p>}
                                    {error && <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs flex gap-2 text-center">
                                         {error}
                                    </div>}
                                </div>

                                <button type="submit" disabled={loading} className="btn-primary w-full py-4 flex items-center justify-center gap-2 mt-4">
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : <><ShieldCheck size={20} /> Réinitialiser</>}
                                </button>
                            </motion.form>
                        )}

                        {step === 3 && (
                            <motion.div 
                                key="step3"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center py-6"
                            >
                                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 size={40} className="text-green-500" />
                                </div>
                                <h2 className="text-2xl font-black mb-2">Succès !</h2>
                                <p className="text-slate-500 mb-10">Votre mot de passe a été réinitialisé. Vous pouvez maintenant vous connecter.</p>
                                <button 
                                    onClick={() => router.push('/login')}
                                    className="btn-primary w-full py-4 flex items-center justify-center gap-2"
                                >
                                    Se Connecter
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="text-center mt-8">
                    <Link href="/login" className="text-sm font-bold text-brand-blue hover:underline">
                        Retour à la connexion
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
