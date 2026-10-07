"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader2, Calendar, Tag, CreditCard, ArrowLeft, ShieldCheck, Upload, Send, Copy, Check } from 'lucide-react';
import Link from 'next/link';

function BookingContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { language } = useLanguage();

    const courseId = searchParams.get('course');
    const sessionId = searchParams.get('session');

    const [course, setCourse] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [selectedSessionId, setSelectedSessionId] = useState<string>('');
    const [paymentMode, setPaymentMode] = useState<'later' | 'now'>('later');
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [requestSubmitted, setRequestSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [requestForm, setRequestForm] = useState({ requestType: 'create_session', phone: '', availability: '', message: '' });
    const [ribCopied, setRibCopied] = useState(false); // UI only

    useEffect(() => {
        const init = async () => {
            // Auth check
            const { data: { session: authSession } } = await supabase.auth.getSession();
            if (!authSession) {
                router.push(`/login?redirect=/book?course=${courseId}&session=${sessionId}`);
                return;
            }
            setUser(authSession.user);

            // Fetch course
            if (courseId) {
                const { data: courseData } = await supabase
                    .from('courses')
                    .select('*')
                    .eq('id', courseId)
                    .single();
                setCourse(courseData);
                setPaymentAmount(Number(courseData?.reservation_amount ?? 400));
            }

            // Fetch all upcoming sessions for this course with enrollment counts
            if (courseId) {
                const { data: sessionsData } = await supabase
                    .from('sessions')
                    .select('*, enrollments(status, receipt_url)')
                    .eq('course_id', courseId)
                    .gte('start_date', new Date().toISOString().split('T')[0])
                    .order('start_date', { ascending: true });

                if (sessionsData && sessionsData.length > 0) {
                    const sessionsWithRealSeats = sessionsData.map((s: any) => {
                        const reservedCount = s.enrollments?.filter((e: any) =>
                            e.status === 'approved' || e.status === 'pending'
                        ).length || 0;
                        return {
                            ...s,
                            real_seats_available: Math.max(0, s.seats_available - reservedCount)
                        };
                    });
                    setSessions(sessionsWithRealSeats);
                    // Pre-select if valid session ID in URL, otherwise select the first one automatically
                    if (sessionId && sessionsWithRealSeats.some((s: any) => s.id === sessionId && s.real_seats_available > 0)) {
                        setSelectedSessionId(sessionId);
                    } else {
                        setSelectedSessionId(sessionsWithRealSeats.find((s: any) => s.real_seats_available > 0)?.id || '');
                    }
                }
            }

            setLoading(false);
        };

        init();
    }, [courseId, sessionId, router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setReceiptFile(e.target.files[0]);
        }
    };

    const handleBooking = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSessionId || !user) return;

        const selectedSession = sessions.find((session) => session.id === selectedSessionId);
        const reservationAmount = Number(course?.reservation_amount ?? 400);
        const totalPrice = Number(course?.sold_price || course?.base_price || 0);

        if (!selectedSession || selectedSession.real_seats_available <= 0) {
            setError("Cette session est complète. Veuillez choisir une autre session.");
            return;
        }

        if (paymentMode === 'now') {
            if (paymentAmount < reservationAmount) {
                setError(`Le montant minimum pour cette formation est de ${reservationAmount} DT.`);
                return;
            }
            if (paymentAmount > totalPrice) {
                setError(`Le montant versé ne peut pas dépasser le prix total de ${totalPrice} DT.`);
                return;
            }
            if (!receiptFile) {
                setError("Veuillez télécharger le reçu de paiement.");
                return;
            }
        }

        setSubmitting(true);
        setError(null);

        try {
            let receiptUrl: string | null = null;

            if (paymentMode === 'now' && receiptFile) {
                const fileExt = receiptFile.name.split('.').pop();
                const fileName = `${user.id}_${Date.now()}.${fileExt}`;
                const filePath = `receipts/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('receipts')
                    .upload(filePath, receiptFile);

                if (uploadError) {
                    throw new Error("Erreur lors du téléchargement du reçu : " + uploadError.message);
                }

                const { data: { publicUrl } } = supabase.storage
                    .from('receipts')
                    .getPublicUrl(filePath);

                receiptUrl = JSON.stringify([{
                    url: publicUrl,
                    amount: paymentAmount,
                    date: new Date().toISOString(),
                    status: 'pending'
                }]);
            }

            const response = await fetch('/api/enrollments/reserve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: selectedSessionId,
                    receiptUrl,
                    declaredAmount: paymentMode === 'now' ? paymentAmount : 0,
                }),
            });

            const result = await response.json();
            if (!response.ok || result.error) {
                throw new Error(result.error || 'Erreur lors de la réservation.');
            }

            setSuccess(true);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSessionRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!courseId) return;
        setSubmitting(true);
        setError(null);
        try {
            const response = await fetch('/api/session-requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ courseId, ...requestForm })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Impossible d’envoyer la demande.');
            setRequestSubmitted(true);
            setSuccess(true);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Une erreur est survenue.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-slate-50" role="status">
                <Loader2 className="animate-spin text-brand-blue" size={36} />
                <p className="text-sm font-medium text-slate-600">Chargement de votre réservation...</p>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 py-10">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm md:p-10"
                    role="status"
                >
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                        <CheckCircle size={36} className="text-emerald-600" />
                    </div>
                    <h1 className="mb-3 text-2xl font-black text-slate-900">
                        Demande envoyée !
                    </h1>
                    <p className="mb-8 text-sm leading-relaxed text-slate-600">
                        {requestSubmitted
                            ? "Votre demande de session a bien été transmise. L’administration vous contactera dès qu’une session pourra être programmée."
                            : paymentMode === 'later'
                            ? "Votre réservation sans paiement est en attente de validation par l’administration. Le montant reçu est de 0 DT."
                            : "Votre reçu a bien été transmis. Nous allons vérifier votre paiement et vous recevrez une confirmation après sa validation."}
                    </p>
                    <Link href={requestSubmitted ? "/formations" : "/dashboard"} className="flex h-12 w-full items-center justify-center rounded-xl bg-brand-green text-base font-bold text-black transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2">
                        {requestSubmitted ? 'Voir les formations' : 'Mon tableau de bord'}
                    </Link>
                </motion.div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center bg-slate-50 px-4 text-center">
                <AlertCircle size={36} className="mb-3 text-[#cbd5e1]" />
                <p className="font-bold text-slate-900">Formation introuvable.</p>
                <Link href="/formations" className="mt-5 inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 hover:bg-slate-50">Voir les formations</Link>
            </div>
        );
    }

    const fieldLabel = "mb-1.5 block text-sm font-semibold text-slate-900";
    const fieldInput = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20";

    if (sessions.length === 0) {
        return (
            <div className="min-h-screen bg-slate-50 px-4 py-10 md:py-16">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-10">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green/15 text-slate-900"><Calendar size={24} /></div>
                    <h2 className="text-2xl font-black text-slate-900">Demander une nouvelle session</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">Aucune session n’est actuellement ouverte pour <strong className="text-slate-900">{course.title_fr}</strong>. Remplissez ce formulaire et notre équipe vous contactera.</p>

                    <form onSubmit={handleSessionRequest} className="mt-8 space-y-5">
                        <div>
                            <label htmlFor="req-type" className={fieldLabel}>Votre demande <span className="text-rose-600">*</span></label>
                            <select id="req-type" required value={requestForm.requestType} onChange={e => setRequestForm({ ...requestForm, requestType: e.target.value })} className={fieldInput}>
                                <option value="create_session">Demander la création d’une session</option>
                                <option value="next_session">M’enregistrer pour la prochaine session</option>
                            </select>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
                            <div><label htmlFor="req-phone" className={fieldLabel}>Téléphone <span className="text-rose-600">*</span></label><input id="req-phone" required type="tel" autoComplete="tel" value={requestForm.phone} onChange={e => setRequestForm({ ...requestForm, phone: e.target.value })} placeholder="Ex. +216 20 000 000" className={fieldInput} /></div>
                            <div><label htmlFor="req-avail" className={fieldLabel}>Disponibilité <span className="text-rose-600">*</span></label><input id="req-avail" required value={requestForm.availability} onChange={e => setRequestForm({ ...requestForm, availability: e.target.value })} placeholder="Ex. week-end, septembre" className={fieldInput} /></div>
                        </div>
                        <div><label htmlFor="req-msg" className={fieldLabel}>Message <span className="font-normal text-slate-500">(optionnel)</span></label><textarea id="req-msg" rows={4} value={requestForm.message} onChange={e => setRequestForm({ ...requestForm, message: e.target.value })} placeholder="Précisez vos préférences..." className={`${fieldInput} h-auto resize-none py-3`} /></div>
                        {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-medium text-rose-800"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
                        <button disabled={submitting} type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-green text-base font-bold text-black transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? <Loader2 size={19} className="animate-spin" /> : <Send size={19} />}{submitting ? 'Envoi en cours...' : 'Envoyer ma demande'}</button>
                    </form>
                    <Link href="/formations" className="mt-5 flex h-10 items-center justify-center text-sm font-bold text-slate-600 hover:text-slate-900">Voir d’autres formations</Link>
                </motion.div>
            </div>
        );
    }

    // ---- Presentation helpers (display only) ----
    const totalPrice = Number(course.sold_price || course.base_price || 0);
    const minDeposit = Number(course.reservation_amount ?? 400);
    const selectedSession = sessions.find((s) => s.id === selectedSessionId);
    const dueToday = paymentMode === 'now' ? Number(paymentAmount) || 0 : 0;
    const remainingAfter = Math.max(0, totalPrice - dueToday);
    const fmt = (n: number) => `${Number(n || 0).toLocaleString('fr-FR')} DT`;
    const formatSchedule = (schedule: string) => {
        try {
            const p = JSON.parse(schedule);
            const label = p.label || schedule;
            return label === 'Full Time'
                ? 'Temps plein'
                : label === 'Part Time'
                    ? 'Temps partiel'
                    : label === 'Weekend' ? 'Week-end' : label;
        } catch (e) { return schedule; }
    };
    const currentStep = !selectedSessionId ? 1 : 2;
    const steps = ['Session', 'Paiement', 'Confirmation'];
    const RIB = '05 206 0000513003641 83';
    const copyRib = async () => {
        try {
            await navigator.clipboard.writeText(RIB.replace(/\s/g, ''));
            setRibCopied(true);
            setTimeout(() => setRibCopied(false), 2000);
        } catch { /* clipboard unavailable: ignore */ }
    };

    return (
        <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 md:py-10">
            <div className="mx-auto max-w-5xl">
                <button onClick={() => router.back()} className="mb-5 inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue">
                    <ArrowLeft size={18} /> Retour
                </button>

                <div className="mb-6">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue/5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-blue">
                        <ShieldCheck size={14} /> Inscription sécurisée
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                        {language === 'fr' ? course.title_fr : course.title_en}
                    </h1>
                </div>

                {/* Stepper */}
                <ol className="mb-6 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4" aria-label="Étapes de réservation">
                    {steps.map((label, i) => {
                        const n = i + 1;
                        const done = n < currentStep;
                        const active = n === currentStep;
                        return (
                            <li key={label} className="flex min-w-0 flex-1 items-center gap-2" aria-current={active ? 'step' : undefined}>
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black tabular-nums ${done ? 'bg-emerald-600 text-[#fff]' : active ? 'bg-brand-green text-black' : 'bg-slate-100 text-slate-500'}`}>
                                    {done ? <CheckCircle size={16} /> : n}
                                </span>
                                <span className={`truncate text-xs font-bold sm:text-sm ${active || done ? 'text-slate-900' : 'text-slate-500'}`}>{label}</span>
                                {n < steps.length && <span className={`hidden h-0.5 flex-1 rounded-full sm:block ${done ? 'bg-emerald-600' : 'bg-slate-200'}`} />}
                            </li>
                        );
                    })}
                </ol>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                    >
                        {/* Step 1 */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6" aria-labelledby="step1-title">
                            <h2 id="step1-title" className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0f172a] text-xs font-black text-[#fff]">1</span>
                                Choisissez votre session
                            </h2>
                            <p className="mb-4 text-sm text-slate-600">Sélectionnez les dates qui vous conviennent.</p>
                            <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-labelledby="step1-title">
                                {sessions.map((s) => {
                                    const selected = selectedSessionId === s.id;
                                    const full = s.real_seats_available <= 0;
                                    return (
                                        <button
                                            key={s.id}
                                            type="button"
                                            role="radio"
                                            aria-checked={selected}
                                            onClick={() => s.real_seats_available > 0 && setSelectedSessionId(s.id)}
                                            disabled={s.real_seats_available <= 0}
                                            title={full ? 'Session complète' : undefined}
                                            className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1 ${selected
                                                ? 'border-brand-blue bg-brand-blue/5'
                                                : full
                                                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-70'
                                                    : 'border-slate-200 bg-white hover:border-brand-blue/40'
                                                }`}
                                        >
                                            <div className="min-w-0">
                                                <div className="mb-1 flex items-center gap-2">
                                                    <Calendar size={16} className={selected ? 'text-brand-blue' : 'text-slate-500'} />
                                                    <span className="font-bold tabular-nums text-slate-900">
                                                        {new Date(s.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                                                        {' → '}
                                                        {new Date(s.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                                                    </span>
                                                </div>
                                                <div className="ml-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                                                    <span>Rythme : {formatSchedule(s.schedule)}</span>
                                                    <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                                                    <span className={`font-bold ${full ? 'text-rose-700' : s.real_seats_available <= 5 ? 'text-amber-800' : 'text-emerald-700'}`}>
                                                        {s.real_seats_available > 0 ? `${s.real_seats_available} places restantes` : 'Session complète'}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? 'border-brand-blue bg-brand-blue' : 'border-slate-300'}`}>
                                                {selected && <span className="h-2 w-2 rounded-full bg-[#fff]" />}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Step 2 */}
                        <form onSubmit={handleBooking} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6" aria-labelledby="step2-title">
                            <div>
                                <h2 id="step2-title" className="mb-1 flex items-center gap-2 text-lg font-bold text-slate-900">
                                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0f172a] text-xs font-black text-[#fff]">2</span>
                                    Choisissez quand payer
                                </h2>
                                <p className="text-sm text-slate-600">Réservez gratuitement ou envoyez directement votre justificatif.</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2" role="radiogroup" aria-labelledby="step2-title">
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={paymentMode === 'later'}
                                    onClick={() => {
                                        setPaymentMode('later');
                                        setError(null);
                                    }}
                                    className={`rounded-xl border-2 p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-1 ${paymentMode === 'later'
                                        ? 'border-brand-green bg-brand-green/10'
                                        : 'border-slate-200 hover:border-brand-green/50'
                                        }`}
                                >
                                    <div className="mb-1.5 flex items-center justify-between gap-3">
                                        <span className="font-bold text-slate-900">Réserver sans payer</span>
                                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${paymentMode === 'later' ? 'border-[#0f172a] bg-[#0f172a]' : 'border-slate-300'}`}>
                                            {paymentMode === 'later' && <span className="h-2 w-2 rounded-full bg-[#fff]" />}
                                        </span>
                                    </div>
                                    <p className="text-xs leading-relaxed text-slate-600">
                                        Votre place est bloquée maintenant. Vous pourrez payer plus tard depuis votre tableau de bord.
                                    </p>
                                </button>

                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={paymentMode === 'now'}
                                    onClick={() => {
                                        setPaymentMode('now');
                                        setError(null);
                                    }}
                                    className={`rounded-xl border-2 p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1 ${paymentMode === 'now'
                                        ? 'border-brand-blue bg-brand-blue/5'
                                        : 'border-slate-200 hover:border-brand-blue/40'
                                        }`}
                                >
                                    <div className="mb-1.5 flex items-center justify-between gap-3">
                                        <span className="font-bold text-slate-900">J’ai déjà payé</span>
                                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${paymentMode === 'now' ? 'border-brand-blue bg-brand-blue' : 'border-slate-300'}`}>
                                            {paymentMode === 'now' && <span className="h-2 w-2 rounded-full bg-[#fff]" />}
                                        </span>
                                    </div>
                                    <p className="text-xs leading-relaxed text-slate-600">
                                        Saisissez le montant versé et joignez votre justificatif pour validation.
                                    </p>
                                </button>
                            </div>

                            {paymentMode === 'now' && (
                                <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                    {/* Bank details */}
                                    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Virement · Banque de Tunisie · RIB</p>
                                            <p className="break-all font-mono text-base font-bold tabular-nums text-slate-900">{RIB}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={copyRib}
                                            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                                            aria-live="polite"
                                        >
                                            {ribCopied ? <><Check size={16} className="text-emerald-600" /> Copié</> : <><Copy size={16} /> Copier le RIB</>}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                        <div>
                                            <label htmlFor="payment-amount" className={fieldLabel}>Montant versé (DT)</label>
                                            <div className="relative">
                                                <input
                                                    id="payment-amount"
                                                    type="number"
                                                    inputMode="decimal"
                                                    min={course.reservation_amount ?? 400}
                                                    max={course.sold_price || course.base_price}
                                                    step="0.01"
                                                    value={paymentAmount}
                                                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                                    className={`${fieldInput} pr-12 font-bold tabular-nums`}
                                                    aria-describedby="payment-amount-help"
                                                />
                                                <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">DT</span>
                                            </div>
                                            <p id="payment-amount-help" className="mt-1.5 text-xs text-slate-600">
                                                Min. <span className="font-bold tabular-nums text-slate-900">{fmt(minDeposit)}</span> · Prix total{' '}
                                                {course.sold_price ? (
                                                    <>
                                                        <span className="font-bold tabular-nums text-slate-900">{course.sold_price} DT</span>
                                                        <span className="ml-1.5 tabular-nums text-slate-500 line-through">{course.base_price} DT</span>
                                                    </>
                                                ) : (
                                                    <span className="font-bold tabular-nums text-slate-900">{course.base_price} DT</span>
                                                )}
                                            </p>
                                        </div>

                                        <div>
                                            <label htmlFor="receipt-file" className={fieldLabel}>Photo du reçu / PDF</label>
                                            <div className={`relative flex h-11 items-center rounded-xl border-2 border-dashed px-3 transition focus-within:ring-2 focus-within:ring-brand-green/30 ${receiptFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
                                                <input
                                                    id="receipt-file"
                                                    type="file"
                                                    className="absolute inset-0 z-10 cursor-pointer opacity-0"
                                                    onChange={handleFileChange}
                                                    accept="image/*,.pdf"
                                                />
                                                <div className="flex min-w-0 items-center gap-2.5">
                                                    {receiptFile ? <CheckCircle size={18} className="shrink-0 text-emerald-600" /> : <Upload size={18} className="shrink-0 text-slate-500" />}
                                                    <span className={`truncate text-sm font-semibold ${receiptFile ? 'text-emerald-800' : 'text-slate-600'}`}>
                                                        {receiptFile ? receiptFile.name : "Cliquez pour uploader"}
                                                    </span>
                                                </div>
                                            </div>
                                            <p className="mt-1.5 text-xs text-slate-600">Image ou PDF du reçu de virement.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className={`flex items-start gap-3 rounded-xl border p-4 ${paymentMode === 'later'
                                ? 'border-emerald-200 bg-emerald-50'
                                : 'border-amber-200 bg-amber-50'
                                }`}>
                                <ShieldCheck size={20} className={`${paymentMode === 'later' ? 'text-emerald-700' : 'text-amber-700'} mt-0.5 shrink-0`} />
                                <div className="space-y-1">
                                    <p className={`text-sm font-bold ${paymentMode === 'later' ? 'text-emerald-900' : 'text-amber-900'}`}>
                                        {paymentMode === 'later' ? 'Réservation sans paiement' : 'Paiement avec justificatif'}
                                    </p>
                                    <p className={`text-xs leading-relaxed ${paymentMode === 'later' ? 'text-emerald-900/80' : 'text-amber-900/80'}`}>
                                        {paymentMode === 'later' ? (
                                            <>Aucun versement n’est demandé aujourd’hui. Le montant total de <strong className="tabular-nums">{course.sold_price || course.base_price} DT</strong> restera à régler depuis votre tableau de bord.</>
                                        ) : (
                                            <>Un versement minimal de <strong className="tabular-nums">{course.reservation_amount ?? 400} DT</strong> est demandé avec un reçu. Le reste (<span className="tabular-nums">{Math.max(0, (course.sold_price || course.base_price) - paymentAmount)} DT</span>) pourra être réglé plus tard. RIB : <strong className="tabular-nums">05 206 0000513003641 83</strong>.</>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {error && (
                                <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
                                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={submitting || !selectedSessionId}
                                title={!selectedSessionId ? 'Aucune session disponible : choisissez une session ouverte' : undefined}
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-green text-base font-bold text-black shadow-lg shadow-brand-green/20 transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                                {submitting
                                    ? "Traitement en cours..."
                                    : !selectedSessionId
                                        ? "Aucune place disponible"
                                        : paymentMode === 'later'
                                            ? "Réserver ma place sans payer"
                                            : "Envoyer mon justificatif"}
                            </button>
                            <p className="text-center text-xs text-slate-500">Votre réservation sera confirmée après validation par l’administration.</p>
                        </form>
                    </motion.div>

                    {/* Order summary */}
                    <aside className="lg:sticky lg:top-32">
                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                                <CreditCard size={18} className="text-brand-blue" /> Récapitulatif
                            </h2>
                            <dl className="space-y-3 text-sm">
                                <div className="flex items-start justify-between gap-4">
                                    <dt className="text-slate-600">Formation</dt>
                                    <dd className="text-right font-semibold text-slate-900">{language === 'fr' ? course.title_fr : course.title_en}</dd>
                                </div>
                                <div className="flex items-start justify-between gap-4">
                                    <dt className="text-slate-600">Session</dt>
                                    <dd className="text-right font-semibold tabular-nums text-slate-900">
                                        {selectedSession
                                            ? `${new Date(selectedSession.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} → ${new Date(selectedSession.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`
                                            : '—'}
                                    </dd>
                                </div>
                                <div className="flex items-start justify-between gap-4">
                                    <dt className="text-slate-600">Prix total</dt>
                                    <dd className="text-right">
                                        <span className="font-bold tabular-nums text-slate-900">{fmt(totalPrice)}</span>
                                        {course.sold_price && <span className="ml-1.5 text-xs tabular-nums text-slate-500 line-through">{course.base_price} DT</span>}
                                    </dd>
                                </div>
                                <div className="flex items-start justify-between gap-4 border-t border-slate-200 pt-3">
                                    <dt className="font-semibold text-slate-900">À payer aujourd’hui</dt>
                                    <dd className="text-lg font-black tabular-nums text-slate-900">{fmt(dueToday)}</dd>
                                </div>
                                <div className="flex items-start justify-between gap-4">
                                    <dt className="text-slate-600">Reste à payer ensuite</dt>
                                    <dd className="font-bold tabular-nums text-amber-800">{fmt(remainingAfter)}</dd>
                                </div>
                            </dl>
                            <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                                <Tag size={14} className="mt-0.5 shrink-0 text-brand-blue" />
                                Paiement en plusieurs tranches possible depuis votre espace étudiant.
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}

export default function BookPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-[60vh] items-center justify-center bg-slate-50" role="status">
                <Loader2 className="animate-spin text-brand-blue" size={36} />
            </div>
        }>
            <BookingContent />
        </Suspense>
    );
}
