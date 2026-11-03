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
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-site-muted" role="status">
                <Loader2 className="animate-spin text-brand-blue" size={36} aria-hidden="true" />
                <p className="text-sm font-medium text-slate-600">Chargement de votre réservation...</p>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center bg-site-muted px-4 py-10">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="site-card w-full max-w-md p-6 text-center md:p-10"
                    role="status"
                >
                    <div className="site-icon-tile mx-auto mb-6 h-16 w-16 rounded-2xl bg-emerald-500">
                        <CheckCircle size={34} aria-hidden="true" />
                    </div>
                    <h1 className="mb-3 text-2xl font-extrabold tracking-tight text-slate-900">
                        Demande envoyée !
                    </h1>
                    <p className="mb-8 text-sm leading-relaxed text-slate-600">
                        {requestSubmitted
                            ? "Votre demande de session a bien été transmise. L’administration vous contactera dès qu’une session pourra être programmée."
                            : paymentMode === 'later'
                            ? "Votre réservation sans paiement est en attente de validation par l’administration. Le montant reçu est de 0 DT."
                            : "Votre reçu a bien été transmis. Nous allons vérifier votre paiement et vous recevrez une confirmation après sa validation."}
                    </p>
                    <Link href={requestSubmitted ? "/formations" : "/dashboard"} className="site-btn-primary w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2">
                        {requestSubmitted ? 'Voir les formations' : 'Mon tableau de bord'}
                    </Link>
                </motion.div>
            </div>
        );
    }

    if (!course) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center bg-site-muted px-4 py-10">
                <div className="site-card flex w-full max-w-md flex-col items-center p-8 text-center">
                    <div className="site-icon-tile mb-4 bg-amber-500">
                        <AlertCircle size={22} aria-hidden="true" />
                    </div>
                    <p className="text-lg font-bold text-slate-900">Formation introuvable.</p>
                    <Link href="/formations" className="site-btn-secondary mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2">Voir les formations</Link>
                </div>
            </div>
        );
    }

    const fieldLabel = "site-label";
    const fieldInput = "site-input";

    if (sessions.length === 0) {
        return (
            <div className="min-h-screen bg-site-muted px-4 py-10 md:py-16">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="site-card mx-auto max-w-xl p-5 sm:p-8 md:p-10">
                    <div className="site-icon-tile mb-5 bg-brand-blue"><Calendar size={22} aria-hidden="true" /></div>
                    <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Demander une nouvelle session</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">Aucune session n’est actuellement ouverte pour <strong className="text-slate-900">{course.title_fr}</strong>. Remplissez ce formulaire et notre équipe vous contactera.</p>

                    <form onSubmit={handleSessionRequest} className="mt-8 space-y-4">
                        <div>
                            <label htmlFor="req-type" className={fieldLabel}>Votre demande <span className="text-rose-500">*</span></label>
                            <select id="req-type" required value={requestForm.requestType} onChange={e => setRequestForm({ ...requestForm, requestType: e.target.value })} className={fieldInput}>
                                <option value="create_session">Demander la création d’une session</option>
                                <option value="next_session">M’enregistrer pour la prochaine session</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div><label htmlFor="req-phone" className={fieldLabel}>Téléphone <span className="text-rose-500">*</span></label><input id="req-phone" required type="tel" autoComplete="tel" value={requestForm.phone} onChange={e => setRequestForm({ ...requestForm, phone: e.target.value })} placeholder="Ex. +216 20 000 000" className={fieldInput} /></div>
                            <div><label htmlFor="req-avail" className={fieldLabel}>Disponibilité <span className="text-rose-500">*</span></label><input id="req-avail" required value={requestForm.availability} onChange={e => setRequestForm({ ...requestForm, availability: e.target.value })} placeholder="Ex. week-end, septembre" className={fieldInput} /></div>
                        </div>
                        <div><label htmlFor="req-msg" className={fieldLabel}>Message <span className="font-normal text-slate-500">(optionnel)</span></label><textarea id="req-msg" rows={4} value={requestForm.message} onChange={e => setRequestForm({ ...requestForm, message: e.target.value })} placeholder="Précisez vos préférences..." className={`${fieldInput} min-h-28 resize-none py-3`} /></div>
                        {error && <div role="alert" className="flex items-start gap-3 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-800 ring-1 ring-rose-200"><AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-600" aria-hidden="true" />{error}</div>}
                        <button disabled={submitting} type="submit" className="site-btn-primary w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2">{submitting ? <Loader2 size={19} className="animate-spin" aria-hidden="true" /> : <Send size={19} aria-hidden="true" />}{submitting ? 'Envoi en cours...' : 'Envoyer ma demande'}</button>
                    </form>
                    <Link href="/formations" className="mt-4 flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold text-slate-600 transition-colors duration-150 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2">Voir d’autres formations</Link>
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
        <div className="min-h-screen bg-site-muted py-6 md:py-10">
            <div className="site-container max-w-6xl">
                <button onClick={() => router.back()} className="site-btn-secondary mb-6 min-h-11 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2">
                    <ArrowLeft size={18} aria-hidden="true" /> Retour
                </button>

                <div className="mb-6">
                    <div className="site-eyebrow mb-3">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-green" aria-hidden="true" />
                        <ShieldCheck size={14} aria-hidden="true" /> Inscription sécurisée
                    </div>
                    <h1 className="site-title">
                        {language === 'fr' ? course.title_fr : course.title_en}
                    </h1>
                </div>

                {/* Stepper */}
                <ol className="site-card mb-6 flex items-center gap-2 p-3 sm:gap-3 md:p-4" aria-label="Étapes de réservation">
                    {steps.map((label, i) => {
                        const n = i + 1;
                        const done = n < currentStep;
                        const active = n === currentStep;
                        return (
                            <li key={label} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5" aria-current={active ? 'step' : undefined}>
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums transition-colors duration-200 ${done ? 'bg-brand-green-600 text-[#fff]' : active ? 'bg-[#fff] text-brand-blue ring-2 ring-brand-blue' : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200'}`}>
                                    {done ? <Check size={16} strokeWidth={3} aria-hidden="true" /> : n}
                                </span>
                                <span className={`truncate text-xs font-semibold sm:text-sm ${active || done ? 'text-slate-900' : 'text-slate-500'}`}>{label}</span>
                                {n < steps.length && <span className={`hidden h-0.5 flex-1 rounded-full sm:block ${done ? 'bg-brand-green-600' : 'bg-slate-200'}`} aria-hidden="true" />}
                            </li>
                        );
                    })}
                </ol>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                    >
                        {/* Step 1 */}
                        <section className="site-card p-5 md:p-6" aria-labelledby="step1-title">
                            <h2 id="step1-title" className="mb-1 flex items-center gap-2.5 text-lg font-bold text-slate-900">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-blue text-xs font-bold text-[#fff]" aria-hidden="true">1</span>
                                Choisissez votre session
                            </h2>
                            <p className="mb-5 text-sm text-slate-600">Sélectionnez les dates qui vous conviennent.</p>
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
                                            className={`flex w-full items-center justify-between gap-3 rounded-xl border p-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2 ${selected
                                                ? 'border-transparent bg-brand-green-soft/40 ring-2 ring-brand-green-600'
                                                : full
                                                    ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-70'
                                                    : 'border-slate-200 bg-[#fff] hover:border-slate-300 hover:bg-slate-50'
                                                }`}
                                        >
                                            <div className="min-w-0">
                                                <div className="mb-1 flex items-center gap-2">
                                                    <Calendar size={16} className={selected ? 'text-brand-green-700' : 'text-slate-500'} aria-hidden="true" />
                                                    <span className="font-bold tabular-nums text-slate-900">
                                                        {new Date(s.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                                                        {' → '}
                                                        {new Date(s.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                                                    </span>
                                                </div>
                                                <div className="ml-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                                                    <span>Rythme : {formatSchedule(s.schedule)}</span>
                                                    <span className="h-1 w-1 rounded-full bg-slate-300" aria-hidden="true"></span>
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-bold tabular-nums ring-1 ${full ? 'bg-rose-50 text-rose-700 ring-rose-200' : s.real_seats_available <= 5 ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-emerald-50 text-emerald-700 ring-emerald-200'}`}>
                                                        {s.real_seats_available > 0 ? `${s.real_seats_available} places restantes` : 'Session complète'}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150 ${selected ? 'border-brand-green-600 bg-brand-green-600' : 'border-slate-300 bg-[#fff]'}`} aria-hidden="true">
                                                {selected && <Check size={14} strokeWidth={3} className="text-[#fff]" />}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Step 2 */}
                        <form onSubmit={handleBooking} className="site-card space-y-5 p-5 md:p-6" aria-labelledby="step2-title">
                            <div>
                                <h2 id="step2-title" className="mb-1 flex items-center gap-2.5 text-lg font-bold text-slate-900">
                                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-blue text-xs font-bold text-[#fff]" aria-hidden="true">2</span>
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
                                    className={`rounded-xl border p-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2 ${paymentMode === 'later'
                                        ? 'border-transparent bg-brand-green-soft/40 ring-2 ring-brand-green-600'
                                        : 'border-slate-200 bg-[#fff] hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="mb-1.5 flex items-center justify-between gap-3">
                                        <span className="flex items-center gap-2 font-bold text-slate-900">
                                            <Calendar size={16} className="text-brand-green-700" aria-hidden="true" />
                                            Réserver sans payer
                                        </span>
                                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150 ${paymentMode === 'later' ? 'border-brand-green-600 bg-brand-green-600' : 'border-slate-300 bg-[#fff]'}`} aria-hidden="true">
                                            {paymentMode === 'later' && <Check size={14} strokeWidth={3} className="text-[#fff]" />}
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
                                    className={`rounded-xl border p-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2 ${paymentMode === 'now'
                                        ? 'border-transparent bg-brand-green-soft/40 ring-2 ring-brand-green-600'
                                        : 'border-slate-200 bg-[#fff] hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    <div className="mb-1.5 flex items-center justify-between gap-3">
                                        <span className="flex items-center gap-2 font-bold text-slate-900">
                                            <CreditCard size={16} className="text-brand-blue" aria-hidden="true" />
                                            J’ai déjà payé
                                        </span>
                                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-150 ${paymentMode === 'now' ? 'border-brand-green-600 bg-brand-green-600' : 'border-slate-300 bg-[#fff]'}`} aria-hidden="true">
                                            {paymentMode === 'now' && <Check size={14} strokeWidth={3} className="text-[#fff]" />}
                                        </span>
                                    </div>
                                    <p className="text-xs leading-relaxed text-slate-600">
                                        Saisissez le montant versé et joignez votre justificatif pour validation.
                                    </p>
                                </button>
                            </div>

                            {paymentMode === 'now' && (
                                <div className="space-y-5 rounded-xl bg-site-muted p-4 sm:p-5">
                                    {/* Bank details */}
                                    <div className="site-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="flex min-w-0 items-start gap-3">
                                            <div className="site-icon-tile bg-brand-blue">
                                                <CreditCard size={20} aria-hidden="true" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Virement · Banque de Tunisie · RIB</p>
                                                <p className="mt-1 break-all rounded-lg bg-site-muted px-2.5 py-1.5 font-mono text-base font-bold tabular-nums text-slate-900 ring-1 ring-slate-200">{RIB}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={copyRib}
                                            className="site-btn-secondary min-h-11 shrink-0 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2"
                                            aria-live="polite"
                                        >
                                            {ribCopied ? <><Check size={16} className="text-emerald-600" aria-hidden="true" /> Copié</> : <><Copy size={16} aria-hidden="true" /> Copier le RIB</>}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 gap-5">
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
                                            <div className={`relative flex min-h-32 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors duration-200 focus-within:border-brand-green-600 focus-within:ring-4 focus-within:ring-brand-green/20 ${receiptFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-[#fff] hover:border-brand-green-600'}`}>
                                                <input
                                                    id="receipt-file"
                                                    type="file"
                                                    className="absolute inset-0 z-10 cursor-pointer opacity-0"
                                                    onChange={handleFileChange}
                                                    accept="image/*,.pdf"
                                                />
                                                <div className={`site-icon-tile mb-3 ${receiptFile ? 'bg-emerald-500' : 'bg-brand-green-600'}`}>
                                                    {receiptFile ? <CheckCircle size={20} aria-hidden="true" /> : <Upload size={20} aria-hidden="true" />}
                                                </div>
                                                <span className={`block max-w-full truncate text-sm font-semibold ${receiptFile ? 'text-emerald-800' : 'text-slate-700'}`}>
                                                    {receiptFile ? receiptFile.name : "Cliquez pour uploader"}
                                                </span>
                                            </div>
                                            <p className="mt-1.5 text-xs text-slate-600">Image ou PDF du reçu de virement.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className={`flex items-start gap-3 rounded-xl p-4 ring-1 ${paymentMode === 'later'
                                ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                                : 'bg-amber-50 text-amber-800 ring-amber-200'
                                }`}>
                                <ShieldCheck size={20} className={`${paymentMode === 'later' ? 'text-emerald-700' : 'text-amber-700'} mt-0.5 shrink-0`} aria-hidden="true" />
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
                                <div role="alert" className="flex items-start gap-3 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-800 ring-1 ring-rose-200">
                                    <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-600" aria-hidden="true" />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={submitting || !selectedSessionId}
                                title={!selectedSessionId ? 'Aucune session disponible : choisissez une session ouverte' : undefined}
                                className="site-btn-primary w-full whitespace-normal text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={20} aria-hidden="true" /> : <CheckCircle size={20} aria-hidden="true" />}
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
                        <div className="site-card p-5 md:p-6">
                            <h2 className="mb-4 flex items-center gap-3 text-lg font-bold text-slate-900">
                                <span className="site-icon-tile h-9 w-9 rounded-xl bg-brand-blue"><CreditCard size={18} aria-hidden="true" /></span> Récapitulatif
                            </h2>
                            <dl className="space-y-3 rounded-xl bg-site-muted p-4 text-sm">
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
                                <div className="flex items-end justify-between gap-4 border-t border-slate-200 pt-3">
                                    <dt className="font-semibold text-slate-900">À payer aujourd’hui</dt>
                                    <dd className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900">{fmt(dueToday)}</dd>
                                </div>
                                <div className="flex items-start justify-between gap-4">
                                    <dt className="text-slate-600">Reste à payer ensuite</dt>
                                    <dd className="font-bold tabular-nums text-amber-800">{fmt(remainingAfter)}</dd>
                                </div>
                            </dl>
                            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-brand-soft p-3 text-xs leading-relaxed text-brand-blue-dark">
                                <Tag size={14} className="mt-0.5 shrink-0 text-brand-blue" aria-hidden="true" />
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
            <div className="flex min-h-[60vh] items-center justify-center bg-site-muted" role="status">
                <Loader2 className="animate-spin text-brand-blue" size={36} aria-hidden="true" />
            </div>
        }>
            <BookingContent />
        </Suspense>
    );
}
