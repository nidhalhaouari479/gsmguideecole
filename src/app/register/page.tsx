"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { UserPlus, Mail, Lock, User, Phone, AlertCircle, Loader2, ChevronDown, Calendar, Share2, Eye, EyeOff, CheckCircle2, XCircle, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

const HOW_DID_YOU_HEAR = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'friend', label: 'Un ami / une connaissance' },
    { value: 'google', label: 'Google / Recherche internet' },
    { value: 'other', label: 'Autre' },
];

const inputClass = "w-full pl-12 pr-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-brand-blue outline-none transition-all bg-transparent dark:text-white placeholder-slate-400";
const labelClass = "block text-sm font-bold mb-2 ml-1 text-slate-700 dark:text-slate-200";

// Password rules
const passwordRules = [
    { id: 'length', label: 'Au moins 8 caractères', test: (p: string) => p.length >= 8 },
    { id: 'uppercase', label: 'Au moins une majuscule (A-Z)', test: (p: string) => /[A-Z]/.test(p) },
    { id: 'lowercase', label: 'Au moins une minuscule (a-z)', test: (p: string) => /[a-z]/.test(p) },
    { id: 'number', label: 'Au moins un chiffre (0-9)', test: (p: string) => /[0-9]/.test(p) },
    { id: 'special', label: 'Au moins un caractère spécial (!@#$...)', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function RegisterPage() {
    const { t } = useLanguage();
    const router = useRouter();

    const [gender, setGender] = useState<'M' | 'Mme' | ''>('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [age, setAge] = useState('');
    const [source, setSource] = useState('');
    const [cinNumber, setCinNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [verificationStep, setVerificationStep] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showErrors, setShowErrors] = useState(false);

    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const passedRules = passwordRules.filter(r => r.test(password));
    const passwordStrength = passedRules.length; // 0-5
    const isPasswordValid = passwordStrength === passwordRules.length;

    const strengthLabel = ['', 'Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'][passwordStrength];
    const strengthColor = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-400', 'bg-green-600'][passwordStrength];

    const sendVerificationCode = async () => {
        if (phone.length !== 8 || cinNumber.length !== 8 || parseInt(age) < 18) {
            setError("Veuillez corriger les erreurs dans le formulaire (CIN/Téléphone: 8 chiffres, Âge: 18+).");
            return;
        }

        setVerifying(true);
        setError(null);
        try {
            const res = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const contentType = res.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setVerificationSent(true);
                setVerificationStep(true);
            } else {
                const text = await res.text();
                console.error("Non-JSON response:", text);
                throw new Error("Le serveur a retourné une erreur inattendue (HTML). Veuillez consulter la console.");
            }
        } catch (err: any) {
            setError(err.message || "Erreur lors de l'envoi du code.");
        } finally {
            setVerifying(false);
        }
    };

    const handleVerifyAndRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Confirm Code
            const confirmRes = await fetch('/api/auth/confirm-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: verificationCode })
            });
            const confirmData = await confirmRes.json();
            if (confirmData.error) throw new Error(confirmData.error);

            // 2. Proceed with Registration
            await createAccount();
        } catch (err: any) {
            setError(err.message || "Erreur de vérification.");
            setLoading(false);
        }
    };

    const createAccount = async () => {
        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    phone: phone,
                },
            },
        });

        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
            return;
        }

        if (data?.user) {
            try {
                const profileRes = await fetch('/api/auth/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: data.user.id,
                        full_name: `${gender} ${fullName}`.trim(),
                        phone: phone,
                        email: email,
                        gender: gender,
                        age: age ? parseInt(age) : null,
                        source: source,
                        cin_number: cinNumber
                    })
                });
                const profileData = await profileRes.json();
                if (profileData.error) {
                    console.error("Profile API error:", profileData);
                    setError(`Erreur de sauvegarde du profil: ${profileData.error}`);
                    setLoading(false);
                    return;
                }
            } catch (err) {
                console.error("Profile API network error:", err);
            }
        }

        setSuccess(true);
        // We don't push immediately anymore, let the user see the success message
    };

    const handleInitialSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowErrors(true);

        const isEmailValid = isValidEmail(email);
        const isPhoneValid = phone.length === 8;
        const isCinValid = cinNumber.length === 8;
        const isAgeValid = age !== '' && parseInt(age) >= 18;
        const isFormFilled = fullName && email && phone && source && cinNumber && gender && password && confirmPassword;

        if (!isFormFilled || !isEmailValid || !isPhoneValid || !isCinValid || !isAgeValid || !isPasswordValid || password !== confirmPassword) {
            return;
        }

        setVerifying(true);
        setError(null);

        try {
            // Check if email or CIN already exists
            const checkRes = await fetch('/api/auth/check-exists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, cinNumber })
            });
            
            const checkData = await checkRes.json();
            
            if (checkData.exists) {
                if (checkData.reason === 'CIN_EXISTS') {
                    setError("Ce numéro CIN est déjà utilisé par un autre compte.");
                } else if (checkData.reason === 'EMAIL_EXISTS') {
                    setError("Cette adresse email est déjà utilisée.");
                } else {
                    setError("Ce compte existe déjà. Vous ne pouvez pas vous inscrire avec ces informations.");
                }
                setVerifying(false);
                return;
            }
        } catch (err) {
            console.error("Erreur lors de la vérification du compte:", err);
            setError("Une erreur s'est produite lors de la vérification. Veuillez réessayer.");
            setVerifying(false);
            return;
        }

        await sendVerificationCode();
    };

    return (
        <div className="min-h-screen flex items-center justify-center py-16 px-6 bg-slate-50 dark:bg-slate-950">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-2xl"
            >
                {success ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="premium-card p-12 bg-white dark:bg-slate-800 text-center shadow-2xl"
                    >
                        <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center mx-auto mb-8 relative">
                            <motion.div
                                animate={{ scale: [1, 1.2, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute inset-0 rounded-full bg-green-400/20"
                            />
                            <CheckCircle2 size={48} className="text-green-500 relative z-10" />
                        </div>

                        <h1 className="text-4xl font-black mb-4 text-slate-900 dark:text-white tracking-tight">Bienvenue à bord !</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-lg mb-10 leading-relaxed">
                            Votre compte a été créé avec succès. Vous faites maintenant partie de **GSM Guide Academy**. <br />
                            Préparez-vous à transformer votre carrière !
                        </p>

                        <button
                            onClick={() => router.push('/login')}
                            className="btn-primary w-full py-4 text-lg font-black tracking-tight flex items-center justify-center gap-3 shadow-xl shadow-brand-blue/20"
                        >
                            Accéder à mon espace <ChevronDown className="-rotate-90" size={20} />
                        </button>
                    </motion.div>
                ) : (
                    <div className="premium-card p-10 bg-white dark:bg-slate-800 shadow-2xl shadow-slate-200/60 dark:shadow-none">
                        {/* Header */}
                        <div className="text-center mb-10">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-blue/10 text-brand-blue font-bold text-xs uppercase tracking-widest mb-4">
                                <UserPlus size={14} /> {verificationStep ? "Vérification" : "Rejoindre l'Académie"}
                            </div>
                            <h1 className="text-2xl xs:text-3xl font-black mb-2">{verificationStep ? "Vérifiez votre Email" : t.nav.register}</h1>
                            <p className="text-slate-500">
                                {verificationStep
                                    ? `Un code de vérification a été envoyé à ${email}`
                                    : "Commencez votre parcours vers l'excellence technique."}
                            </p>
                        </div>

                        {error && (
                            <div className="bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl flex items-start gap-3">
                                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                                <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                            </div>
                        )}

                        {!verificationStep ? (
                            <form onSubmit={handleInitialSubmit} className="space-y-6" noValidate>
                                {/* Row 1: Name + Email */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className={`${labelClass} ${showErrors && !fullName ? 'text-red-500' : ''}`}>Nom complet *</label>
                                        <div className="relative">
                                            <User className={`absolute left-4 top-1/2 -translate-y-1/2 ${showErrors && !fullName ? 'text-red-500' : 'text-slate-400'}`} size={18} />
                                            <input
                                                type="text"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className={`${inputClass} ${showErrors && !fullName ? 'border-red-500 ring-red-100 focus:ring-red-200' : ''}`}
                                                placeholder="Ahmed Ben Ali"
                                                required
                                            />
                                        </div>
                                        {showErrors && !fullName && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">Ce champ est obligatoire</p>}
                                    </div>
                                    <div>
                                        <label className={`${labelClass} ${showErrors && (!email || !isValidEmail(email)) ? 'text-red-500' : ''}`}>Adresse Email *</label>
                                        <div className="relative">
                                            <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 ${showErrors && (!email || !isValidEmail(email)) ? 'text-red-500' : 'text-slate-400'}`} size={18} />
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className={`${inputClass} ${showErrors && (!email || !isValidEmail(email)) ? 'border-red-500 ring-red-100 focus:ring-red-200' : ''}`}
                                                placeholder="votre@email.com"
                                                required
                                            />
                                        </div>
                                        {showErrors && !email && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">L'email est obligatoire</p>}
                                        {showErrors && email && !isValidEmail(email) && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">Veuillez saisir une adresse email valide</p>}
                                    </div>
                                </div>

                                {/* Row 2: Phone + Age */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className={`${labelClass} ${(showErrors || phone) && phone.length !== 8 ? 'text-red-500' : ''}`}>Numéro de téléphone (8 chiffres) *</label>
                                        <div className="relative">
                                            <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 ${(showErrors || phone) && phone.length !== 8 ? 'text-red-500' : 'text-slate-400'}`} size={18} />
                                            <input
                                                type="tel"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                                className={`${inputClass} ${(showErrors || phone) && phone.length !== 8 ? 'border-red-500 ring-red-100 focus:ring-red-200' : ''}`}
                                                placeholder="Ex: 22 123 456"
                                                required
                                            />
                                        </div>
                                        {(showErrors || phone) && phone.length !== 8 && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">Doit contenir exactement 8 chiffres</p>}
                                    </div>
                                    <div>
                                        <label className={`${labelClass} ${(showErrors || age) && (age === '' || parseInt(age) < 18) ? 'text-red-500' : ''}`}>Âge (18+) *</label>
                                        <div className="relative">
                                            <Calendar className={`absolute left-4 top-1/2 -translate-y-1/2 ${(showErrors || age) && (age === '' || parseInt(age) < 18) ? 'text-red-500' : 'text-slate-400'}`} size={18} />
                                            <input
                                                type="number"
                                                value={age}
                                                onChange={(e) => setAge(e.target.value)}
                                                className={`${inputClass} ${(showErrors || age) && (age === '' || parseInt(age) < 18) ? 'border-red-500 ring-red-100 focus:ring-red-200' : ''}`}
                                                placeholder="Ex: 22"
                                                min={18}
                                                max={99}
                                                required
                                            />
                                        </div>
                                        {(showErrors || age) && age === '' && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">L'âge est obligatoire</p>}
                                        {(showErrors || age) && age !== '' && parseInt(age) < 18 && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">Âge minimum requis : 18 ans</p>}
                                    </div>
                                </div>

                                {/* Row 3: Source + CIN */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className={`${labelClass} ${showErrors && !source ? 'text-red-500' : ''}`}>Comment avez-vous connu ? *</label>
                                        <div className="relative">
                                            <Share2 className={`absolute left-4 top-1/2 -translate-y-1/2 ${showErrors && !source ? 'text-red-500' : 'text-slate-400'} pointer-events-none z-10`} size={18} />
                                            <ChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 ${showErrors && !source ? 'text-red-500' : 'text-slate-400'} pointer-events-none z-10`} size={18} />
                                            <select
                                                value={source}
                                                onChange={(e) => setSource(e.target.value)}
                                                className={`${inputClass} pr-12 appearance-none cursor-pointer ${showErrors && !source ? 'border-red-500 ring-red-100 focus:ring-red-200' : ''}`}
                                                required
                                            >
                                                <option value="" disabled>Choisir une option...</option>
                                                {HOW_DID_YOU_HEAR.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {showErrors && !source && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">Veuillez choisir une option</p>}
                                    </div>
                                    <div className="space-y-2">
                                        <label className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 ml-1 ${(showErrors || cinNumber) && cinNumber.length !== 8 ? 'text-red-500' : 'text-slate-500'}`}>
                                            Numéro CIN (8 chiffres) *
                                        </label>
                                        <div className="relative group">
                                            <CreditCard className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10 ${(showErrors || cinNumber) && cinNumber.length !== 8 ? 'text-red-500' : 'text-slate-400'}`} size={18} />
                                            <input
                                                type="text"
                                                placeholder="Ex: 01234567"
                                                value={cinNumber}
                                                onChange={(e) => setCinNumber(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                                className={`w-full bg-slate-50 dark:bg-slate-900 border-2 rounded-xl py-3 pl-12 pr-4 text-sm focus:outline-none transition-all font-bold placeholder:font-medium ${(showErrors || cinNumber) && cinNumber.length !== 8 ? 'border-red-500 focus:border-red-600' : 'border-slate-100 dark:border-slate-800 focus:border-brand-blue/30'}`}
                                                required
                                            />
                                            {(showErrors || cinNumber) && cinNumber.length !== 8 && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">Le CIN doit contenir exactement 8 chiffres</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Gender selector */}
                                <div>
                                    <label className={`${labelClass} ${showErrors && !gender ? 'text-red-500' : ''}`}>Civilité *</label>
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        {(['M', 'Mme'] as const).map((g) => (
                                            <button
                                                key={g}
                                                type="button"
                                                onClick={() => setGender(g)}
                                                className={`flex-1 py-3 rounded-xl border-2 font-black text-sm transition-all ${gender === g
                                                    ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                                                    : showErrors && !gender ? 'border-red-500 text-red-500 bg-red-50' : 'border-border text-slate-500 hover:border-brand-blue/50'
                                                    }`}
                                            >
                                                {g === 'M' ? ' M.' : ' Mme'}
                                            </button>
                                        ))}
                                    </div>
                                    {showErrors && !gender && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">Veuillez choisir votre civilité</p>}
                                </div>

                                {/* Divider */}
                                <div className="border-t border-border pt-6">
                                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-4">Sécurité du compte</p>

                                    {/* Row: Password + Confirm */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Password */}
                                        <div>
                                            <label className={`${labelClass} ${showErrors && (!password || !isPasswordValid) ? 'text-red-500' : ''}`}>Mot de passe *</label>
                                            <div className="relative">
                                                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 ${showErrors && (!password || !isPasswordValid) ? 'text-red-500' : 'text-slate-400'}`} size={18} />
                                                <input
                                                    type={showPassword ? 'text' : 'password'}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className={`${inputClass} pr-12 ${showErrors && (!password || !isPasswordValid) ? 'border-red-500 ring-red-100 focus:ring-red-200' : ''}`}
                                                    placeholder="••••••••"
                                                    required
                                                />
                                                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-blue transition-colors">
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>

                                            {/* Strength meter */}
                                            {password.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    <div className="flex gap-1 h-1.5">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i < passwordStrength ? strengthColor : 'bg-slate-200 dark:bg-slate-700'}`} />
                                                        ))}
                                                    </div>
                                                    <p className="text-xs font-bold" style={{ color: passwordStrength >= 4 ? '#22c55e' : passwordStrength >= 2 ? '#f59e0b' : '#ef4444' }}>{strengthLabel}</p>
                                                    <div className="grid grid-cols-1 gap-1 mt-2">
                                                        {passwordRules.map(rule => {
                                                            const passed = rule.test(password);
                                                            return (
                                                                <div key={rule.id} className={`flex items-center gap-2 text-xs font-medium transition-colors ${passed ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                                                                    {passed ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                                                                    {rule.label}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Confirm Password */}
                                        <div>
                                            <label className={`${labelClass} ${showErrors && (!confirmPassword || confirmPassword !== password) ? 'text-red-500' : ''}`}>Confirmer le mot de passe *</label>
                                            <div className="relative">
                                                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 ${showErrors && (!confirmPassword || confirmPassword !== password) ? 'text-red-500' : 'text-slate-400'}`} size={18} />
                                                <input
                                                    type={showConfirm ? 'text' : 'password'}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className={`${inputClass} pr-12 ${confirmPassword && confirmPassword !== password ? 'border-red-400 focus:ring-red-400' : confirmPassword && confirmPassword === password ? 'border-green-400 focus:ring-green-400' : showErrors && !confirmPassword ? 'border-red-500' : ''}`}
                                                    placeholder="••••••••"
                                                    required
                                                />
                                                <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-blue transition-colors">
                                                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            {(showErrors || confirmPassword) && confirmPassword !== password && (
                                                <p className="text-xs text-red-500 font-medium mt-1.5 ml-1">Les mots de passe ne correspondent pas.</p>
                                            )}
                                            {confirmPassword && confirmPassword === password && (
                                                <p className="text-xs text-green-500 font-medium mt-1.5 ml-1">✓ Les mots de passe correspondent.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={verifying}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base mt-2"
                                >
                                    {verifying ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                                    Continuer vers la vérification
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyAndRegister} className="space-y-6">
                                <div className="bg-brand-blue/5 border border-brand-blue/10 p-6 rounded-2xl text-center">
                                    <p className="text-sm font-medium mb-4">Veuillez saisir le code à 6 chiffres reçu par email.</p>
                                    <input
                                        type="text"
                                        maxLength={6}
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                        className="w-full text-center text-3xl font-black tracking-[0.5em] py-4 rounded-xl border-2 border-slate-200 focus:border-brand-blue outline-none transition-all dark:bg-slate-900"
                                        placeholder="000000"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                    Vérifier et Créer mon compte
                                </button>

                                <button
                                    type="button"
                                    onClick={sendVerificationCode}
                                    disabled={verifying}
                                    className="w-full text-center text-sm font-bold text-slate-500 hover:text-brand-blue transition-colors"
                                >
                                    {verifying ? "Envoi en cours..." : "Renvoyer le code"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setVerificationStep(false)}
                                    className="w-full text-center text-xs text-slate-400 hover:underline"
                                >
                                    Modifier mes informations
                                </button>
                            </form>
                        )}

                        <p className="mt-8 text-center text-sm text-slate-500">
                            Vous avez déjà un compte ?{' '}
                            <Link href="/login" className="text-brand-blue font-bold hover:underline">{t.nav.login}</Link>
                        </p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
