"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle, Loader2, Calendar, Tag, CreditCard, ArrowLeft, ShieldCheck, Upload } from 'lucide-react';
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
    const [error, setError] = useState<string | null>(null);

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

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="animate-spin text-brand-blue" size={40} />
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full text-center premium-card p-12 bg-white dark:bg-slate-800"
                >
                    <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} className="text-green-500" />
                    </div>
                    <h1 className="text-2xl font-black mb-3 text-slate-900 dark:text-white">
                        Demande envoyée !
                    </h1>
                    <p className="text-slate-500 mb-8">
                        {paymentMode === 'later'
                            ? "Votre réservation sans paiement est en attente de validation par l’administration. Le montant reçu est de 0 DT."
                            : "Votre reçu a bien été transmis. Nous allons vérifier votre paiement et vous recevrez une confirmation après sa validation."}
                    </p>
                    <Link href="/dashboard" className="btn-primary w-full py-3 text-center block">
                        Mon Tableau de Bord
                    </Link>
                </motion.div>
            </div>
        );
    }

    if (!course || sessions.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
                <AlertCircle size={40} className="text-red-400 mb-4" />
                <h2 className="text-xl font-bold mb-2">Aucune session disponible</h2>
                <p className="text-slate-500 mb-6">Il n'y a actuellement aucune session ouverte pour cette formation.</p>
                <Link href="/formations" className="btn-primary px-6 py-2">Voir d'autres formations</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-32 px-6">
            <div className="max-w-2xl mx-auto">
                <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-brand-blue mb-8 transition-colors font-medium">
                    <ArrowLeft size={18} /> Retour
                </button>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="premium-card bg-white dark:bg-slate-800 p-10"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-blue/10 text-brand-blue font-bold text-xs uppercase tracking-widest mb-6">
                        <CreditCard size={14} /> Inscription Sécurisée
                    </div>

                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                        {language === 'fr' ? course.title_fr : course.title_en}
                    </h1>

                    <div className="mt-8 mb-8 space-y-4">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-widest">Étape 1 : Choisissez votre session</h3>
                        <div className="grid grid-cols-1 gap-3">
                            {sessions.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => s.real_seats_available > 0 && setSelectedSessionId(s.id)}
                                    disabled={s.real_seats_available <= 0}
                                    className={`flex items-center justify-between p-4 rounded-xl border-2 text-left transition-all ${selectedSessionId === s.id
                                        ? 'border-brand-blue bg-brand-blue/5 shadow-inner'
                                        : s.real_seats_available <= 0
                                            ? 'border-border bg-slate-100 dark:bg-slate-900 opacity-60 cursor-not-allowed'
                                            : 'border-border bg-white dark:bg-slate-800 hover:border-brand-blue/30'
                                        }`}
                                >
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Calendar size={16} className={selectedSessionId === s.id ? 'text-brand-blue' : 'text-slate-400'} />
                                            <span className={`font-bold ${selectedSessionId === s.id ? 'text-brand-blue' : 'text-slate-700 dark:text-slate-300'}`}>
                                                {new Date(s.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                                                {' → '}
                                                {new Date(s.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 flex items-center gap-2 ml-6">
                                            <span>Rythme: {(() => {
                                                try {
                                                    const p = JSON.parse(s.schedule);
                                                    const label = p.label || s.schedule;
                                                    return label === 'Full Time'
                                                        ? 'Temps plein'
                                                        : label === 'Part Time'
                                                            ? 'Temps partiel'
                                                            : label === 'Weekend' ? 'Week-end' : label;
                                                } catch (e) { return s.schedule; }
                                            })()}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                            <span className={s.real_seats_available <= 5 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                                                {s.real_seats_available > 0 ? `${s.real_seats_available} places restantes` : 'Session complète'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedSessionId === s.id ? 'border-brand-blue bg-brand-blue' : 'border-slate-300'}`}>
                                        {selectedSessionId === s.id && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <form onSubmit={handleBooking} className="space-y-8 mt-12 pt-8 border-t border-border">
                        <h3 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[10px] tracking-widest">Étape 2 : Choisissez quand payer</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => {
                                    setPaymentMode('later');
                                    setError(null);
                                }}
                                className={`p-5 rounded-2xl border-2 text-left transition-all ${paymentMode === 'later'
                                    ? 'border-brand-green bg-brand-green/10'
                                    : 'border-border hover:border-brand-green/40'
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <span className="font-black text-slate-900 dark:text-white">Réserver sans payer</span>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMode === 'later' ? 'border-brand-green bg-brand-green' : 'border-slate-300'}`}>
                                        {paymentMode === 'later' && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Votre place est bloquée maintenant. Vous pourrez payer plus tard depuis votre tableau de bord.
                                </p>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setPaymentMode('now');
                                    setError(null);
                                }}
                                className={`p-5 rounded-2xl border-2 text-left transition-all ${paymentMode === 'now'
                                    ? 'border-brand-blue bg-brand-blue/5'
                                    : 'border-border hover:border-brand-blue/40'
                                    }`}
                            >
                                <div className="flex items-center justify-between gap-3 mb-2">
                                    <span className="font-black text-slate-900 dark:text-white">J’ai déjà payé</span>
                                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${paymentMode === 'now' ? 'border-brand-blue bg-brand-blue' : 'border-slate-300'}`}>
                                        {paymentMode === 'now' && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    Saisissez le montant versé et joignez votre justificatif pour validation.
                                </p>
                            </button>
                        </div>

                        {paymentMode === 'now' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Montant versé (DT)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min={course.reservation_amount ?? 400}
                                            max={course.sold_price || course.base_price}
                                            step="0.01"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                        />
                                    </div>

                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                        Prix Total : {course.sold_price ? (
                                            <>
                                                <span className="text-brand-green">{course.sold_price} DT</span>
                                                <span className="ml-2 line-through opacity-50">{course.base_price} DT</span>
                                            </>
                                        ) : (
                                            <>{course.base_price} DT</>
                                        )}
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Photo du reçu / PDF</label>
                                    <div className={`relative border-2 border-dashed rounded-xl p-3 transition-all ${receiptFile ? 'border-brand-green bg-brand-green/5' : 'border-border bg-slate-50 dark:bg-slate-900'}`}>
                                        <input
                                            type="file"
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            onChange={handleFileChange}
                                            accept="image/*,.pdf"
                                        />
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${receiptFile ? 'bg-brand-green text-white' : 'bg-white dark:bg-slate-800 text-slate-400 shadow-sm'}`}>
                                                <Upload size={18} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 truncate">
                                                {receiptFile ? receiptFile.name : "Cliquez pour uploader"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className={`p-5 rounded-2xl border flex items-start gap-4 ${paymentMode === 'later'
                            ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200/50'
                            : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200/50'
                            }`}>
                            <ShieldCheck size={20} className={`${paymentMode === 'later' ? 'text-emerald-600' : 'text-amber-600'} shrink-0 mt-0.5`} />
                            <div className="space-y-1">
                                <p className={`text-sm font-bold ${paymentMode === 'later' ? 'text-emerald-800 dark:text-emerald-200' : 'text-amber-800 dark:text-amber-200'}`}>
                                    {paymentMode === 'later' ? 'Réservation sans paiement' : 'Paiement avec justificatif'}
                                </p>
                                <p className={`text-xs leading-relaxed ${paymentMode === 'later' ? 'text-emerald-700/80 dark:text-emerald-400/80' : 'text-amber-700/80 dark:text-amber-400/80'}`}>
                                    {paymentMode === 'later' ? (
                                        <>Aucun versement n’est demandé aujourd’hui. Le montant total de <strong>{course.sold_price || course.base_price} DT</strong> restera à régler depuis votre tableau de bord.</>
                                    ) : (
                                        <>Un versement minimal de <strong>{course.reservation_amount ?? 400} DT</strong> est demandé avec un reçu. Le reste ({Math.max(0, (course.sold_price || course.base_price) - paymentAmount)} DT) pourra être réglé plus tard. RIB : <strong>05 206 0000513003641 83</strong>.</>
                                    )}
                                </p>
                            </div>
                        </div>

                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-3 text-sm font-medium">
                                <AlertCircle size={18} />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting || !selectedSessionId}
                            className={`btn-primary w-full py-4 flex items-center justify-center gap-2 text-base transition-all ${submitting || !selectedSessionId ? 'opacity-70 cursor-not-allowed' : 'hover:scale-[1.01] active:scale-[0.99] shadow-xl shadow-brand-blue/20'}`}
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
                    </form>
                </motion.div>
            </div>
        </div>
    );
}

export default function BookPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="animate-spin text-brand-blue" size={40} />
            </div>
        }>
            <BookingContent />
        </Suspense>
    );
}
