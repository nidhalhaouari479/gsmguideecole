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

const inputClass = "h-11 w-full pl-11 pr-3 rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-400 transition focus:outline-none focus:ring-2";
const fieldOk = "border-slate-200 focus:border-brand-green focus:ring-brand-green/20";
const fieldErr = "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20";
const labelClass = "block text-sm font-semibold mb-1.5 text-slate-900";
const errText = "mt-1.5 text-xs font-medium text-rose-700";
const primaryBtn = "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-green text-base font-bold text-black transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60";
const eyeBtn = "absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue";

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
        <div className="min-h-[80vh] flex items-center justify-center py-10 md:py-16 px-4 bg-slate-50">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-2xl"
            >
                {success ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm md:p-10"
                        role="status"
                    >
                        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                            <CheckCircle2 size={36} className="text-emerald-600" />
                        </div>

                        <h1 className="mb-3 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">Bienvenue à bord !</h1>
                        <p className="mb-8 text-base leading-relaxed text-slate-600">
                            Votre compte a été créé avec succès. Vous faites maintenant partie de <strong className="text-slate-900">GSM Guide Academy</strong>. <br />
                            Préparez-vous à transformer votre carrière !
                        </p>

                        <button
                            onClick={() => router.push('/login')}
                            className={primaryBtn}
                        >
                            Accéder à mon espace <ChevronDown className="-rotate-90" size={20} />
                        </button>
                    </motion.div>
                ) : (
                    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                        {/* Header */}
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-blue/20 bg-brand-blue/5 text-brand-blue font-bold text-[11px] uppercase tracking-wider mb-4">
                                <UserPlus size={14} /> {verificationStep ? "Vérification" : "Rejoindre l'Académie"}
                            </div>
                            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mb-1">{verificationStep ? "Vérifiez votre email" : t.nav.register}</h1>
                            <p className="text-sm text-slate-600 break-words">
                                {verificationStep
                                    ? `Un code de vérification a été envoyé à ${email}`
                                    : "Commencez votre parcours vers l'excellence technique."}
                            </p>
                        </div>

                        {/* Step indicator */}
                        <ol className="mb-8 flex items-center gap-2" aria-label="Étapes d'inscription">
                            {['Vos informations', 'Vérification email'].map((label, i) => {
                                const current = verificationStep ? 1 : 0;
                                return (
                                    <li key={label} className="flex min-w-0 flex-1 flex-col gap-1.5" aria-current={i === current ? 'step' : undefined}>
                                        <span className={`h-1.5 rounded-full ${i < current ? 'bg-emerald-600' : i === current ? 'bg-brand-green' : 'bg-slate-200'}`} />
                                        <span className={`truncate text-[11px] font-bold ${i <= current ? 'text-slate-900' : 'text-slate-500'}`}>{i + 1}. {label}</span>
                                    </li>
                                );
                            })}
                        </ol>

                        {error && (
                            <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
                                <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={18} />
                                <p className="text-sm font-medium text-rose-800">{error}</p>
                            </div>
                        )}

                        {!verificationStep ? (
                            <form onSubmit={handleInitialSubmit} className="space-y-5" noValidate>
                                {/* Row 1: Name + Email */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label htmlFor="reg-name" className={`${labelClass} ${showErrors && !fullName ? 'text-rose-700' : ''}`}>Nom complet <span className="text-rose-600">*</span></label>
                                        <div className="relative">
                                            <User className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${showErrors && !fullName ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
                                            <input
                                                id="reg-name"
                                                type="text"
                                                autoComplete="name"
                                                value={fullName}
                                                onChange={(e) => setFullName(e.target.value)}
                                                className={`${inputClass} ${showErrors && !fullName ? fieldErr : fieldOk}`}
                                                placeholder="Ahmed Ben Ali"
                                                required
                                            />
                                        </div>
                                        {showErrors && !fullName && <p className={errText}>Ce champ est obligatoire</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="reg-email" className={`${labelClass} ${showErrors && (!email || !isValidEmail(email)) ? 'text-rose-700' : ''}`}>Adresse email <span className="text-rose-600">*</span></label>
                                        <div className="relative">
                                            <Mail className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${showErrors && (!email || !isValidEmail(email)) ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
                                            <input
                                                id="reg-email"
                                                type="email"
                                                autoComplete="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className={`${inputClass} ${showErrors && (!email || !isValidEmail(email)) ? fieldErr : fieldOk}`}
                                                placeholder="votre@email.com"
                                                required
                                            />
                                        </div>
                                        {showErrors && !email && <p className={errText}>L&apos;email est obligatoire</p>}
                                        {showErrors && email && !isValidEmail(email) && <p className={errText}>Veuillez saisir une adresse email valide</p>}
                                    </div>
                                </div>

                                {/* Row 2: Phone + Age */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label htmlFor="reg-phone" className={`${labelClass} ${(showErrors || phone) && phone.length !== 8 ? 'text-rose-700' : ''}`}>Téléphone (8 chiffres) <span className="text-rose-600">*</span></label>
                                        <div className="relative">
                                            <Phone className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${(showErrors || phone) && phone.length !== 8 ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
                                            <input
                                                id="reg-phone"
                                                type="tel"
                                                inputMode="numeric"
                                                autoComplete="tel-national"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                                className={`${inputClass} ${(showErrors || phone) && phone.length !== 8 ? fieldErr : fieldOk}`}
                                                placeholder="Ex: 22 123 456"
                                                required
                                            />
                                        </div>
                                        {(showErrors || phone) && phone.length !== 8 && <p className={errText}>Doit contenir exactement 8 chiffres</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="reg-age" className={`${labelClass} ${(showErrors || age) && (age === '' || parseInt(age) < 18) ? 'text-rose-700' : ''}`}>Âge (18+) <span className="text-rose-600">*</span></label>
                                        <div className="relative">
                                            <Calendar className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${(showErrors || age) && (age === '' || parseInt(age) < 18) ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
                                            <input
                                                id="reg-age"
                                                type="number"
                                                inputMode="numeric"
                                                value={age}
                                                onChange={(e) => setAge(e.target.value)}
                                                className={`${inputClass} ${(showErrors || age) && (age === '' || parseInt(age) < 18) ? fieldErr : fieldOk}`}
                                                placeholder="Ex: 22"
                                                min={18}
                                                max={99}
                                                required
                                            />
                                        </div>
                                        {(showErrors || age) && age === '' && <p className={errText}>L&apos;âge est obligatoire</p>}
                                        {(showErrors || age) && age !== '' && parseInt(age) < 18 && <p className={errText}>Âge minimum requis : 18 ans</p>}
                                    </div>
                                </div>

                                {/* Row 3: Source + CIN */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div>
                                        <label htmlFor="reg-source" className={`${labelClass} ${showErrors && !source ? 'text-rose-700' : ''}`}>Comment nous avez-vous connus ? <span className="text-rose-600">*</span></label>
                                        <div className="relative">
                                            <Share2 className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${showErrors && !source ? 'text-rose-500' : 'text-slate-400'} pointer-events-none z-10`} size={18} />
                                            <ChevronDown className={`pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 ${showErrors && !source ? 'text-rose-500' : 'text-slate-400'} pointer-events-none z-10`} size={18} />
                                            <select
                                                id="reg-source"
                                                value={source}
                                                onChange={(e) => setSource(e.target.value)}
                                                className={`${inputClass} pr-12 appearance-none cursor-pointer ${showErrors && !source ? fieldErr : fieldOk}`}
                                                required
                                            >
                                                <option value="" disabled>Choisir une option...</option>
                                                {HOW_DID_YOU_HEAR.map(opt => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {showErrors && !source && <p className={errText}>Veuillez choisir une option</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="reg-cin" className={`${labelClass} ${(showErrors || cinNumber) && cinNumber.length !== 8 ? 'text-rose-700' : ''}`}>
                                            Numéro CIN (8 chiffres) <span className="text-rose-600">*</span>
                                        </label>
                                        <div className="relative group">
                                            <CreditCard className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10 ${(showErrors || cinNumber) && cinNumber.length !== 8 ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
                                            <input
                                                id="reg-cin"
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="Ex: 01234567"
                                                value={cinNumber}
                                                onChange={(e) => setCinNumber(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                                className={`${inputClass} tabular-nums ${(showErrors || cinNumber) && cinNumber.length !== 8 ? fieldErr : fieldOk}`}
                                                required
                                            />
                                                                                    </div>
                                        {(showErrors || cinNumber) && cinNumber.length !== 8 && <p className={errText}>Le CIN doit contenir exactement 8 chiffres</p>}
                                    </div>
                                </div>

                                {/* Gender selector */}
                                <div>
                                    <p id="reg-gender" className={`${labelClass} ${showErrors && !gender ? 'text-rose-700' : ''}`}>Civilité <span className="text-rose-600">*</span></p>
                                    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby="reg-gender">
                                        {(['M', 'Mme'] as const).map((g) => (
                                            <button
                                                key={g}
                                                type="button"
                                                role="radio"
                                                aria-checked={gender === g}
                                                onClick={() => setGender(g)}
                                                className={`h-11 rounded-xl border-2 font-bold text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1 ${gender === g
                                                    ? 'border-brand-blue bg-brand-blue/10 text-brand-blue'
                                                    : showErrors && !gender ? 'border-rose-400 text-rose-700 bg-rose-50' : 'border-slate-200 text-slate-700 hover:border-brand-blue/50'
                                                    }`}
                                            >
                                                {g === 'M' ? ' M.' : ' Mme'}
                                            </button>
                                        ))}
                                    </div>
                                    {showErrors && !gender && <p className={errText}>Veuillez choisir votre civilité</p>}
                                </div>

                                {/* Divider */}
                                <div className="border-t border-slate-200 pt-5">
                                    <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-4">Sécurité du compte</p>

                                    {/* Row: Password + Confirm */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {/* Password */}
                                        <div>
                                            <label htmlFor="reg-password" className={`${labelClass} ${showErrors && (!password || !isPasswordValid) ? 'text-rose-700' : ''}`}>Mot de passe <span className="text-rose-600">*</span></label>
                                            <div className="relative">
                                                <Lock className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${showErrors && (!password || !isPasswordValid) ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
                                                <input
                                                    id="reg-password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    autoComplete="new-password"
                                                    aria-describedby="reg-password-rules"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className={`${inputClass} pr-12 ${showErrors && (!password || !isPasswordValid) ? fieldErr : fieldOk}`}
                                                    placeholder="••••••••"
                                                    required
                                                />
                                                <button type="button" onClick={() => setShowPassword(v => !v)} className={eyeBtn} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} title={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={showPassword}>
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>

                                            {/* Strength meter */}
                                            {password.length > 0 && (
                                                <div className="mt-3 space-y-2" id="reg-password-rules">
                                                    <div className="flex gap-1 h-1.5">
                                                        {Array.from({ length: 5 }).map((_, i) => (
                                                            <div key={i} className={`flex-1 rounded-full transition-all duration-300 ${i < passwordStrength ? strengthColor : 'bg-slate-200'}`} />
                                                        ))}
                                                    </div>
                                                    <p className="text-xs font-bold" style={{ color: passwordStrength >= 4 ? '#047857' : passwordStrength >= 2 ? '#b45309' : '#be123c' }}>{strengthLabel}</p>
                                                    <div className="grid grid-cols-1 gap-1 mt-2">
                                                        {passwordRules.map(rule => {
                                                            const passed = rule.test(password);
                                                            return (
                                                                <div key={rule.id} className={`flex items-center gap-2 text-xs font-medium transition-colors ${passed ? 'text-emerald-700' : 'text-slate-500'}`}>
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
                                            <label htmlFor="reg-confirm" className={`${labelClass} ${showErrors && (!confirmPassword || confirmPassword !== password) ? 'text-rose-700' : ''}`}>Confirmer le mot de passe <span className="text-rose-600">*</span></label>
                                            <div className="relative">
                                                <Lock className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${showErrors && (!confirmPassword || confirmPassword !== password) ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
                                                <input
                                                    id="reg-confirm"
                                                    type={showConfirm ? 'text' : 'password'}
                                                    autoComplete="new-password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className={`${inputClass} pr-12 ${confirmPassword && confirmPassword !== password ? fieldErr : confirmPassword && confirmPassword === password ? 'border-emerald-500 focus:border-emerald-600 focus:ring-emerald-500/20' : showErrors && !confirmPassword ? fieldErr : fieldOk}`}
                                                    placeholder="••••••••"
                                                    required
                                                />
                                                <button type="button" onClick={() => setShowConfirm(v => !v)} className={eyeBtn} aria-label={showConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} title={showConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={showConfirm}>
                                                    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            {(showErrors || confirmPassword) && confirmPassword !== password && (
                                                <p className={errText}>Les mots de passe ne correspondent pas.</p>
                                            )}
                                            {confirmPassword && confirmPassword === password && (
                                                <p className="mt-1.5 text-xs font-medium text-emerald-700">✓ Les mots de passe correspondent.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={verifying}
                                    className={primaryBtn}
                                >
                                    {verifying ? <Loader2 className="animate-spin" size={20} /> : <UserPlus size={20} />}
                                    Continuer vers la vérification
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyAndRegister} className="space-y-5">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                                    <label htmlFor="reg-code" className="mb-3 block text-sm font-semibold text-slate-900">Veuillez saisir le code à 6 chiffres reçu par email.</label>
                                    <input
                                        id="reg-code"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        maxLength={6}
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                        className="h-14 w-full rounded-xl border-2 border-slate-200 bg-white text-center text-2xl font-black tabular-nums tracking-[0.4em] text-slate-900 transition focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                                        placeholder="000000"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={primaryBtn}
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                                    Vérifier et Créer mon compte
                                </button>

                                <button
                                    type="button"
                                    onClick={sendVerificationCode}
                                    disabled={verifying}
                                    className="flex h-10 w-full items-center justify-center rounded-xl text-sm font-bold text-brand-blue transition-colors hover:bg-slate-50 disabled:opacity-60"
                                >
                                    {verifying ? "Envoi en cours..." : "Renvoyer le code"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setVerificationStep(false)}
                                    className="flex h-10 w-full items-center justify-center text-sm font-medium text-slate-600 hover:text-slate-900 hover:underline"
                                >
                                    Modifier mes informations
                                </button>
                            </form>
                        )}

                        <p className="mt-6 border-t border-slate-200 pt-6 text-center text-sm text-slate-600">
                            Vous avez déjà un compte ?{' '}
                            <Link href="/login" className="text-brand-blue font-bold hover:underline">{t.nav.login}</Link>
                        </p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
