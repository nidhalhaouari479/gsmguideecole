"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { UserPlus, Mail, Lock, User, Phone, AlertCircle, Loader2, ChevronDown, Calendar, Share2, Eye, EyeOff, CheckCircle2, XCircle, CreditCard, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const HOW_DID_YOU_HEAR = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'facebook', label: 'Facebook' },
    { value: 'youtube', label: 'YouTube' },
    { value: 'friend', label: 'Un ami / une connaissance' },
    { value: 'google', label: 'Google / Recherche internet' },
    { value: 'other', label: 'Autre' },
];

const inputClass = "site-input pl-11";
const fieldOk = "";
const fieldErr = "border-rose-400 hover:border-rose-500 focus:border-rose-500 focus:shadow-[0_0_0_4px_rgba(244,63,94,0.15)]";
const labelClass = "site-label";
const errText = "mt-1.5 text-xs font-medium text-rose-700";
const primaryBtn = "site-btn-primary w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2";
const eyeBtn = "absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50";

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
        <div className="min-h-[80vh] bg-site-muted py-8 md:py-14">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="site-container grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-stretch"
            >
                {/* Brand panel (desktop) */}
                <aside className="relative hidden overflow-hidden rounded-2xl bg-navy-950 p-10 shadow-[var(--shadow-pop)] lg:flex lg:flex-col">
                    <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-brand-blue/40 blur-3xl" aria-hidden="true" />
                    <div className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-brand-green/20 blur-3xl" aria-hidden="true" />
                    <div className="relative flex h-full flex-col">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fff] p-2 shadow-[var(--shadow-card)]">
                            <img src="/gsmlogo.png" alt="GSM Guide Academy" className="h-full w-full object-contain" />
                        </div>
                        <h2 className="mt-8 text-3xl font-extrabold leading-tight tracking-tight text-[#fff] text-balance">
                            Rejoignez GSM Guide Academy
                        </h2>
                        <p className="mt-3 text-base leading-relaxed text-[#B4C0D3]">
                            Commencez votre parcours vers l&apos;excellence technique.
                        </p>
                        <ul className="mt-8 space-y-4">
                            {['Formations pratiques en réparation de smartphones', 'Réservation de vos sessions en ligne', 'Suivi de vos paiements depuis votre espace étudiant'].map((point) => (
                                <li key={point} className="flex items-start gap-3 text-sm font-medium text-[#fff]">
                                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-green/20 ring-1 ring-brand-green/40" aria-hidden="true">
                                        <Check size={14} className="text-brand-green" strokeWidth={3} />
                                    </span>
                                    <span className="leading-relaxed">{point}</span>
                                </li>
                            ))}
                        </ul>
                        <p className="mt-auto pt-10 text-xs font-semibold uppercase tracking-wider text-[#B4C0D3]">
                            GSM Guide Academy
                        </p>
                    </div>
                </aside>

                {success ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="site-card flex flex-col justify-center p-6 text-center md:p-10"
                        role="status"
                    >
                        <div className="site-icon-tile mx-auto mb-6 h-16 w-16 rounded-2xl bg-emerald-500">
                            <CheckCircle2 size={34} aria-hidden="true" />
                        </div>

                        <h1 className="site-title mb-3">Bienvenue à bord !</h1>
                        <p className="mb-8 text-base leading-relaxed text-slate-600">
                            Votre compte a été créé avec succès. Vous faites maintenant partie de <strong className="text-slate-900">GSM Guide Academy</strong>. <br />
                            Préparez-vous à transformer votre carrière !
                        </p>

                        <button
                            onClick={() => router.push('/login')}
                            className={primaryBtn}
                        >
                            Accéder à mon espace <ChevronDown className="-rotate-90" size={20} aria-hidden="true" />
                        </button>
                    </motion.div>
                ) : (
                    <div className="site-card p-5 sm:p-8">
                        {/* Header */}
                        <div className="mb-6">
                            <div className="mb-5 flex items-center gap-3 lg:hidden">
                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff] p-1.5 ring-1 ring-slate-200">
                                    <img src="/gsmlogo.png" alt="GSM Guide Academy" className="h-full w-full object-contain" />
                                </div>
                                <span className="text-sm font-bold text-slate-900">GSM Guide Academy</span>
                            </div>
                            <div className="site-eyebrow mb-4">
                                <span className="h-1.5 w-1.5 rounded-full bg-brand-green" aria-hidden="true" />
                                <UserPlus size={14} aria-hidden="true" /> {verificationStep ? "Vérification" : "Rejoindre l'Académie"}
                            </div>
                            <h1 className="site-title mb-2">{verificationStep ? "Vérifiez votre email" : t.nav.register}</h1>
                            <p className="text-sm leading-relaxed text-slate-600 break-words md:text-base">
                                {verificationStep
                                    ? `Un code de vérification a été envoyé à ${email}`
                                    : "Commencez votre parcours vers l'excellence technique."}
                            </p>
                        </div>

                        {/* Step indicator */}
                        <ol className="mb-8 flex items-center gap-3 rounded-xl bg-site-muted p-3" aria-label="Étapes d'inscription">
                            {['Vos informations', 'Vérification email'].map((label, i) => {
                                const current = verificationStep ? 1 : 0;
                                const done = i < current;
                                const active = i === current;
                                return (
                                    <li key={label} className="flex min-w-0 flex-1 items-center gap-2.5" aria-current={active ? 'step' : undefined}>
                                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums transition-colors duration-200 ${done ? 'bg-brand-green-600 text-[#fff]' : active ? 'bg-[#fff] text-brand-blue ring-2 ring-brand-blue' : 'bg-[#fff] text-slate-500 ring-1 ring-slate-200'}`}>
                                            {done ? <Check size={16} strokeWidth={3} aria-hidden="true" /> : i + 1}
                                        </span>
                                        <span className={`truncate text-xs font-semibold sm:text-sm ${done || active ? 'text-slate-900' : 'text-slate-500'}`}>{label}</span>
                                        {i === 0 && <span className={`hidden h-0.5 flex-1 rounded-full sm:block ${done ? 'bg-brand-green-600' : 'bg-slate-200'}`} aria-hidden="true" />}
                                    </li>
                                );
                            })}
                        </ol>

                        {error && (
                            <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl bg-rose-50 p-4 text-rose-800 ring-1 ring-rose-200">
                                <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={18} aria-hidden="true" />
                                <p className="text-sm font-medium text-rose-800">{error}</p>
                            </div>
                        )}

                        {!verificationStep ? (
                            <form onSubmit={handleInitialSubmit} className="space-y-4" noValidate>
                                {/* Row 1: Name + Email */}
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label htmlFor="reg-name" className={`${labelClass} ${showErrors && !fullName ? 'text-rose-700' : ''}`}>Nom complet <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <User className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${showErrors && !fullName ? 'text-rose-500' : 'text-slate-400'}`} size={18} aria-hidden="true" />
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
                                        <label htmlFor="reg-email" className={`${labelClass} ${showErrors && (!email || !isValidEmail(email)) ? 'text-rose-700' : ''}`}>Adresse email <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <Mail className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${showErrors && (!email || !isValidEmail(email)) ? 'text-rose-500' : 'text-slate-400'}`} size={18} aria-hidden="true" />
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
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label htmlFor="reg-phone" className={`${labelClass} ${(showErrors || phone) && phone.length !== 8 ? 'text-rose-700' : ''}`}>Téléphone (8 chiffres) <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <Phone className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${(showErrors || phone) && phone.length !== 8 ? 'text-rose-500' : 'text-slate-400'}`} size={18} aria-hidden="true" />
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
                                        <label htmlFor="reg-age" className={`${labelClass} ${(showErrors || age) && (age === '' || parseInt(age) < 18) ? 'text-rose-700' : ''}`}>Âge (18+) <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <Calendar className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${(showErrors || age) && (age === '' || parseInt(age) < 18) ? 'text-rose-500' : 'text-slate-400'}`} size={18} aria-hidden="true" />
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
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                        <label htmlFor="reg-source" className={`${labelClass} ${showErrors && !source ? 'text-rose-700' : ''}`}>Comment nous avez-vous connus ? <span className="text-rose-500">*</span></label>
                                        <div className="relative">
                                            <Share2 className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${showErrors && !source ? 'text-rose-500' : 'text-slate-400'} pointer-events-none z-10`} size={18} aria-hidden="true" />
                                            <ChevronDown className={`pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 ${showErrors && !source ? 'text-rose-500' : 'text-slate-400'} pointer-events-none z-10`} size={18} aria-hidden="true" />
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
                                            Numéro CIN (8 chiffres) <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="relative group">
                                            <CreditCard className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10 ${(showErrors || cinNumber) && cinNumber.length !== 8 ? 'text-rose-500' : 'text-slate-400'}`} size={18} aria-hidden="true" />
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
                                    <p id="reg-gender" className={`${labelClass} ${showErrors && !gender ? 'text-rose-700' : ''}`}>Civilité <span className="text-rose-500">*</span></p>
                                    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby="reg-gender">
                                        {(['M', 'Mme'] as const).map((g) => (
                                            <button
                                                key={g}
                                                type="button"
                                                role="radio"
                                                aria-checked={gender === g}
                                                onClick={() => setGender(g)}
                                                className={`h-12 rounded-xl border text-sm font-bold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2 ${gender === g
                                                    ? 'border-transparent bg-brand-green-soft/40 text-brand-green-700 ring-2 ring-brand-green-600'
                                                    : showErrors && !gender ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-300 bg-[#fff] text-slate-700 shadow-[var(--shadow-card)] hover:border-slate-400 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {g === 'M' ? ' M.' : ' Mme'}
                                            </button>
                                        ))}
                                    </div>
                                    {showErrors && !gender && <p className={errText}>Veuillez choisir votre civilité</p>}
                                </div>

                                {/* Divider */}
                                <div className="border-t border-slate-200 pt-6">
                                    <p className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                                        <Lock size={14} className="text-brand-blue" aria-hidden="true" /> Sécurité du compte
                                    </p>

                                    {/* Row: Password + Confirm */}
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        {/* Password */}
                                        <div>
                                            <label htmlFor="reg-password" className={`${labelClass} ${showErrors && (!password || !isPasswordValid) ? 'text-rose-700' : ''}`}>Mot de passe <span className="text-rose-500">*</span></label>
                                            <div className="relative">
                                                <Lock className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${showErrors && (!password || !isPasswordValid) ? 'text-rose-500' : 'text-slate-400'}`} size={18} aria-hidden="true" />
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
                                                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
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
                                                                    {passed ? <CheckCircle2 size={13} aria-hidden="true" /> : <XCircle size={13} aria-hidden="true" />}
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
                                            <label htmlFor="reg-confirm" className={`${labelClass} ${showErrors && (!confirmPassword || confirmPassword !== password) ? 'text-rose-700' : ''}`}>Confirmer le mot de passe <span className="text-rose-500">*</span></label>
                                            <div className="relative">
                                                <Lock className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 ${showErrors && (!confirmPassword || confirmPassword !== password) ? 'text-rose-500' : 'text-slate-400'}`} size={18} aria-hidden="true" />
                                                <input
                                                    id="reg-confirm"
                                                    type={showConfirm ? 'text' : 'password'}
                                                    autoComplete="new-password"
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className={`${inputClass} pr-12 ${confirmPassword && confirmPassword !== password ? fieldErr : confirmPassword && confirmPassword === password ? 'border-emerald-500 hover:border-emerald-600 focus:border-emerald-600 focus:shadow-[0_0_0_4px_rgba(16,185,129,0.15)]' : showErrors && !confirmPassword ? fieldErr : fieldOk}`}
                                                    placeholder="••••••••"
                                                    required
                                                />
                                                <button type="button" onClick={() => setShowConfirm(v => !v)} className={eyeBtn} aria-label={showConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} title={showConfirm ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={showConfirm}>
                                                    {showConfirm ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
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
                                    className={`${primaryBtn} mt-2`}
                                >
                                    {verifying ? <Loader2 className="animate-spin" size={20} aria-hidden="true" /> : <UserPlus size={20} aria-hidden="true" />}
                                    Continuer vers la vérification
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                                <div className="rounded-xl bg-site-muted p-5 text-center sm:p-6">
                                    <div className="site-icon-tile mx-auto mb-4 bg-brand-blue">
                                        <Mail size={20} aria-hidden="true" />
                                    </div>
                                    <label htmlFor="reg-code" className="mb-4 block text-sm font-semibold text-slate-700">Veuillez saisir le code à 6 chiffres reçu par email.</label>
                                    <input
                                        id="reg-code"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        maxLength={6}
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                        className="site-input mx-auto block h-14 max-w-xs text-center text-2xl font-bold tabular-nums tracking-[0.4em]"
                                        placeholder="000000"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={primaryBtn}
                                >
                                    {loading ? <Loader2 className="animate-spin" size={20} aria-hidden="true" /> : <CheckCircle2 size={20} aria-hidden="true" />}
                                    Vérifier et Créer mon compte
                                </button>

                                <button
                                    type="button"
                                    onClick={sendVerificationCode}
                                    disabled={verifying}
                                    className="site-btn-secondary w-full text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2"
                                >
                                    {verifying ? "Envoi en cours..." : "Renvoyer le code"}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setVerificationStep(false)}
                                    className="flex min-h-11 w-full items-center justify-center rounded-xl text-sm font-semibold text-slate-600 transition-colors duration-150 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2"
                                >
                                    Modifier mes informations
                                </button>
                            </form>
                        )}

                        <p className="mt-6 border-t border-slate-200 pt-6 text-center text-sm text-slate-600">
                            Vous avez déjà un compte ?{' '}
                            <Link href="/login" className="rounded font-bold text-brand-blue hover:text-brand-blue-dark hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2">{t.nav.login}</Link>
                        </p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
