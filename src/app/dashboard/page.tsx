"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { supabase } from '@/lib/supabase';
import {
    User,
    BookOpen,
    CreditCard,
    Calendar as CalendarIcon,
    Upload,
    CheckCircle,
    Clock,
    AlertCircle,
    ChevronRight,
    Eye,
    History,
    X,
    Download,
    ExternalLink,
    Loader2,
    LogOut,
    Link as LinkIcon,
    Copy,
    Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DashboardPage() {
    const { t, language } = useLanguage();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
    const [trancheFile, setTrancheFile] = useState<File | null>(null);
    const [trancheAmount, setTrancheAmount] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [historyModalEnrollment, setHistoryModalEnrollment] = useState<any | null>(null);
    const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null);
    const [scheduleAttendance, setScheduleAttendance] = useState<Record<string, any>>({});
    const [loadingScheduleAttendance, setLoadingScheduleAttendance] = useState(false);
    const [scheduleAttendanceError, setScheduleAttendanceError] = useState<string | null>(null);
    const [ribCopied, setRibCopied] = useState(false); // UI only

    useEffect(() => {
        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            setUser(session.user);

            // Fetch real enrollments from Supabase
            const { data, error } = await supabase
                .from('enrollments')
                .select(`
                    id,
                    status,
                    total_price,
                    amount_paid,
                    receipt_url,
                    created_at,
                    sessions (
                        id,
                        start_date,
                        end_date,
                        schedule,
                        courses (
                            title_fr,
                            title_en,
                            category
                        )
                    )
                `)
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching enrollments:', error);
            } else if (data) {
                const formatted = data.map((en: any) => {
                    let history = [];
                    try {
                        if (en.receipt_url && en.receipt_url.startsWith('[')) {
                            history = JSON.parse(en.receipt_url);
                        }
                    } catch (e) { }

                    // Calculate accurate paid amount from history (only approved ones)
                    const confirmedPaid = history.length > 0
                        ? history.filter((h: any) => h.status === 'approved').reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0)
                        : en.amount_paid;

                    return {
                        id: en.id,
                        course_name: en.sessions?.courses?.title_fr || 'Formation',
                        category: en.sessions?.courses?.category || '',
                        status: en.status === 'approved'
                            ? (!en.receipt_url && Number(en.amount_paid) === 0 ? 'Place réservée' : 'Approuvé')
                            : en.status === 'rejected'
                                ? 'Rejeté'
                                : en.receipt_url ? 'Paiement en attente' : 'Réservation en attente',
                        status_raw: en.status,
                        total_price: en.total_price,
                        paid: confirmedPaid,
                        remaining: en.total_price - confirmedPaid,
                        schedule_raw: en.sessions?.schedule ? JSON.parse(en.sessions.schedule) : null,
                        session_id: en.sessions?.id,
                        schedule_text: en.sessions
                            ? `${new Date(en.sessions.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - ${new Date(en.sessions.end_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`
                            : 'À définir',
                        receipt_url: en.receipt_url,
                        receipt_status: en.receipt_url ? 'Reçu soumis' : 'En attente de paiement',
                        created_at: en.created_at
                    };
                });
                setEnrollments(formatted);
            }

            setLoading(false);
        };

        checkUser();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setTrancheFile(e.target.files[0]);
            setUploadError(null);
        }
    };

    const handleOpenSchedule = async (enrollment: any) => {
        setSelectedSchedule({
            name: enrollment.course_name,
            sessionId: enrollment.session_id,
            ...enrollment.schedule_raw,
        });
        setScheduleAttendance({});
        setScheduleAttendanceError(null);

        if (!enrollment.session_id) return;

        setLoadingScheduleAttendance(true);
        try {
            const response = await fetch(
                `/api/enrollments/attendance?sessionId=${encodeURIComponent(enrollment.session_id)}`
            );
            const data = await response.json();
            if (!response.ok || data.error) {
                throw new Error(data.error || 'Impossible de charger les présences.');
            }

            const attendanceBySeance = (data || []).reduce((acc: Record<string, any>, record: any) => {
                acc[record.seance_key] = record;
                return acc;
            }, {});
            setScheduleAttendance(attendanceBySeance);
        } catch (attendanceError) {
            setScheduleAttendanceError(
                attendanceError instanceof Error
                    ? attendanceError.message
                    : 'Impossible de charger les présences.'
            );
        } finally {
            setLoadingScheduleAttendance(false);
        }
    };

    const handleTrancheSubmit = async (enrollmentId: string) => {
        if (!trancheFile || !user) {
            setUploadError("Veuillez sélectionner un fichier.");
            return;
        }

        setIsSubmitting(true);
        setUploadError(null);
        setUploadSuccess(null);

        try {
            // 1. Upload receipt
            const fileExt = trancheFile.name.split('.').pop();
            const fileName = `${user.id}_tranche_${Date.now()}.${fileExt}`;
            const filePath = `receipts/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('receipts')
                .upload(filePath, trancheFile);

            if (uploadError) throw new Error("Erreur upload: " + uploadError.message);

            const { data: { publicUrl } } = supabase.storage
                .from('receipts')
                .getPublicUrl(filePath);

            const finalUrl = `${publicUrl}#amount=${trancheAmount}`;

            // 2. Update enrollment via secure API (to bypass RLS)
            const response = await fetch('/api/enrollments/tranche', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enrollmentId,
                    receiptUrl: finalUrl,
                    amount: parseInt(trancheAmount) || 0,
                    studentName: user.user_metadata?.full_name || user.email || 'Étudiant',
                    studentEmail: user.email || '',
                    courseName: enrollments.find((e: any) => e.id === enrollmentId)?.course_name || 'Formation'
                })
            });

            const result = await response.json();
            if (result.error) throw new Error(result.error);

            setUploadSuccess("Reçu téléchargé avec succès ! En attente de validation.");
            setActiveUploadId(null);
            setTrancheFile(null);
            setTrancheAmount('');

            // 3. Refresh enrollments
            // This is a simple way to refresh the list
            window.location.reload();
        } catch (err: any) {
            setUploadError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-slate-50" role="status">
                <Loader2 className="animate-spin text-brand-blue" size={36} />
                <p className="text-sm font-medium text-slate-600">Chargement de votre espace...</p>
            </div>
        );
    }

    // ---- Presentation helpers (display only) ----
    const money = (n: any) => `${(Number(n) || 0).toLocaleString('fr-FR')} DT`;
    const RIB = '05 206 0000513003641 83';
    const copyRib = async () => {
        try {
            await navigator.clipboard.writeText(RIB.replace(/\s/g, ''));
            setRibCopied(true);
            setTimeout(() => setRibCopied(false), 2000);
        } catch { /* clipboard unavailable: ignore */ }
    };
    const totals = enrollments.reduce(
        (acc, en) => {
            if (en.status_raw === 'rejected') return acc;
            acc.total += Number(en.total_price) || 0;
            acc.paid += Number(en.paid) || 0;
            return acc;
        },
        { total: 0, paid: 0 }
    );
    const totalRemaining = Math.max(0, totals.total - totals.paid);
    const statusBadge = (en: any) => {
        const tone = en.status_raw === 'approved'
            ? { wrap: 'border-emerald-200 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' }
            : en.status_raw === 'rejected'
                ? { wrap: 'border-rose-200 bg-rose-50 text-rose-700', dot: 'bg-rose-500' }
                : { wrap: 'border-amber-200 bg-amber-50 text-amber-800', dot: 'bg-amber-500' };
        return (
            <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${tone.wrap}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                {en.status}
            </span>
        );
    };
    const historyRows = (enrollment: any) => {
        let history: any[] = [];
        const raw = enrollment.receipt_url;
        if (raw && raw.startsWith('[')) {
            try { history = JSON.parse(raw); } catch (e) { history = []; }
        } else if (raw) {
            history = [{
                url: raw,
                amount: Number(enrollment.paid) || 0,
                date: enrollment.created_at,
                status: enrollment.status_raw || 'approved'
            }];
        }
        return history;
    };
    const paymentStatusBadge = (status: string) => (
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${status === 'approved'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : status === 'pending'
                ? 'border-amber-200 bg-amber-50 text-amber-800'
                : 'border-rose-200 bg-rose-50 text-rose-700'
            }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status === 'approved' ? 'bg-emerald-500' : status === 'pending' ? 'bg-amber-500' : 'bg-rose-500'}`} />
            {status === 'approved' ? 'Validé' : status === 'pending' ? 'En attente' : 'Rejeté'}
        </span>
    );
    const displayName = user?.user_metadata?.full_name || "Étudiant";

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            <div className="border-b border-slate-200 bg-white py-6 md:py-8">
                <div className="container mx-auto px-4 sm:px-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-blue text-2xl font-black uppercase text-[#fff] shadow-lg shadow-brand-blue/20 md:h-16 md:w-16">
                                {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t.nav.dashboard}</p>
                                <h1 className="truncate text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                                    {displayName}
                                </h1>
                                <p className="truncate text-sm text-slate-600">{user?.email}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Link href="/formations" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue">
                                <BookOpen size={16} className="text-brand-blue" /> Formations
                            </Link>
                            <button onClick={handleLogout} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500">
                                <LogOut size={16} /> {t.nav.logout}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto mt-6 px-4 sm:px-6 md:mt-8">
                {uploadSuccess && (
                    <div role="status" className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                        <CheckCircle size={18} className="shrink-0" /> {uploadSuccess}
                    </div>
                )}

                {/* KPI tiles */}
                {enrollments.length > 0 && (
                    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 md:mb-8 md:gap-4">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Inscriptions</p>
                            <p className="mt-1 text-2xl font-black tabular-nums text-slate-900">{enrollments.length}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total payé (validé)</p>
                            <p className="mt-1 text-2xl font-black tabular-nums text-emerald-700">{money(totals.paid)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Reste à payer</p>
                            <p className={`mt-1 text-2xl font-black tabular-nums ${totalRemaining > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>{money(totalRemaining)}</p>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">

                    {/* Main Dashboard Area */}
                    <div className="space-y-6 lg:col-span-2">
                        <section>
                            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
                                <BookOpen size={20} className="text-brand-blue" /> Mes inscriptions
                            </h2>
                            <div className="space-y-4">
                                {enrollments.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center md:p-12">
                                        <BookOpen size={40} className="mx-auto mb-4 text-[#cbd5e1]" />
                                        <h3 className="mb-1 text-lg font-bold text-slate-900">Aucune formation inscrite</h3>
                                        <p className="mb-6 text-sm text-slate-600">Vous n&apos;êtes pas encore inscrit à une formation.</p>
                                        <Link href="/formations" className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-green px-5 text-sm font-bold text-black transition hover:brightness-95">
                                            Voir les formations <ChevronRight size={16} />
                                        </Link>
                                    </div>
                                ) : (
                                    enrollments.map((en) => {
                                        const total = Number(en.total_price) || 0;
                                        const paid = Number(en.paid) || 0;
                                        const remaining = Number(en.remaining) || 0;
                                        const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
                                        const complete = total > 0 && remaining <= 0;
                                        return (
                                            <motion.article
                                                key={en.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
                                            >
                                                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="min-w-0">
                                                        <h3 className="mb-1 text-lg font-bold leading-snug text-slate-900">{en.course_name}</h3>
                                                        <div className="flex items-center gap-2 text-sm tabular-nums text-slate-600">
                                                            <CalendarIcon size={15} className="shrink-0" /> {en.schedule_text}
                                                        </div>
                                                    </div>
                                                    {statusBadge(en)}
                                                </div>

                                                {/* Payment progress */}
                                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                                                        <p className="text-sm text-slate-600">
                                                            <span className="font-bold tabular-nums text-slate-900">{money(paid)}</span> payés sur <span className="font-semibold tabular-nums text-slate-900">{money(total)}</span>
                                                        </p>
                                                        <span className={`text-sm font-black tabular-nums ${complete ? 'text-emerald-700' : 'text-slate-900'}`}>{pct} %</span>
                                                    </div>
                                                    <div
                                                        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
                                                        role="progressbar"
                                                        aria-valuemin={0}
                                                        aria-valuemax={100}
                                                        aria-valuenow={pct}
                                                        aria-label={`Paiement : ${pct} %`}
                                                    >
                                                        <div className={`h-full rounded-full transition-all ${complete ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                                        <div>
                                                            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Prix total</dt>
                                                            <dd className="font-bold tabular-nums text-slate-900">{money(en.total_price)}</dd>
                                                        </div>
                                                        <div>
                                                            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Montant payé</dt>
                                                            <dd className="font-bold tabular-nums text-emerald-700">{money(en.paid)}</dd>
                                                        </div>
                                                        <div>
                                                            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Reste à payer</dt>
                                                            <dd className={`font-bold tabular-nums ${remaining > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>{money(Math.max(0, remaining))}</dd>
                                                        </div>
                                                        <div>
                                                            <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Reçu</dt>
                                                            <dd className="text-sm font-semibold text-slate-900">{en.receipt_status}</dd>
                                                        </div>
                                                    </dl>
                                                </div>

                                                <div className="mt-5">
                                                    {activeUploadId === en.id ? (
                                                        <div className="space-y-4 rounded-xl border border-brand-blue/20 bg-white p-4 md:p-5">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <h4 className="text-sm font-bold text-slate-900">Payer une autre tranche</h4>
                                                                <button
                                                                    onClick={() => setActiveUploadId(null)}
                                                                    className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                                                >
                                                                    Annuler
                                                                </button>
                                                            </div>
                                                            <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                                                                <AlertCircle size={14} className="mt-0.5 shrink-0 text-brand-blue" />
                                                                <span>Effectuez le virement sur le RIB <strong className="tabular-nums text-slate-900">{RIB}</strong>, puis joignez le reçu ci-dessous.</span>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                                <div>
                                                                    <label htmlFor={`tranche-amount-${en.id}`} className="mb-1.5 block text-sm font-semibold text-slate-900">Montant payé (DT)</label>
                                                                    <div className="relative">
                                                                        <CreditCard className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                                        <input
                                                                            id={`tranche-amount-${en.id}`}
                                                                            type="number"
                                                                            inputMode="decimal"
                                                                            placeholder="Montant payé (DT)"
                                                                            value={trancheAmount}
                                                                            onChange={(e) => setTrancheAmount(e.target.value)}
                                                                            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-bold tabular-nums text-slate-900 placeholder:font-normal placeholder:text-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                                                                        />
                                                                    </div>
                                                                    {remaining > 0 && <p className="mt-1.5 text-xs text-slate-600">Reste à payer : <span className="font-bold tabular-nums text-slate-900">{money(remaining)}</span></p>}
                                                                </div>
                                                                <div>
                                                                    <label htmlFor={`tranche-file-${en.id}`} className="mb-1.5 block text-sm font-semibold text-slate-900">Reçu (image ou PDF)</label>
                                                                    <div className={`relative flex h-11 items-center rounded-xl border-2 border-dashed px-3 transition focus-within:ring-2 focus-within:ring-brand-green/30 ${trancheFile ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-white hover:border-slate-400'}`}>
                                                                        <input
                                                                            id={`tranche-file-${en.id}`}
                                                                            type="file"
                                                                            className="absolute inset-0 z-10 cursor-pointer opacity-0"
                                                                            onChange={handleFileChange}
                                                                            accept="image/*,.pdf"
                                                                        />
                                                                        <div className="flex min-w-0 items-center gap-2.5">
                                                                            {trancheFile ? <CheckCircle size={18} className="shrink-0 text-emerald-600" /> : <Upload size={18} className="shrink-0 text-slate-500" />}
                                                                            <span className={`truncate text-sm font-semibold ${trancheFile ? 'text-emerald-800' : 'text-slate-600'}`}>
                                                                                {trancheFile ? trancheFile.name : "Cliquez pour uploader le reçu"}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {uploadError && (
                                                                <p role="alert" className="flex items-center gap-1.5 text-sm font-medium text-rose-700">
                                                                    <AlertCircle size={15} /> {uploadError}
                                                                </p>
                                                            )}
                                                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                                                                {(!trancheFile || !trancheAmount) && !isSubmitting && (
                                                                    <p className="text-xs text-slate-500 sm:mr-auto">Indiquez le montant et joignez le reçu pour continuer.</p>
                                                                )}
                                                                <button
                                                                    onClick={() => handleTrancheSubmit(en.id)}
                                                                    disabled={isSubmitting || !trancheFile || !trancheAmount}
                                                                    title={!trancheFile || !trancheAmount ? 'Indiquez le montant et joignez le reçu' : undefined}
                                                                    className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-green px-6 text-sm font-bold text-black transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                >
                                                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                                                    Soumettre le reçu
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                                                            {en.remaining > 0 && !(en.status_raw === 'pending' && en.receipt_url) && (
                                                                <button
                                                                    onClick={() => setActiveUploadId(en.id)}
                                                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brand-green px-5 text-sm font-bold text-black transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
                                                                >
                                                                    <CreditCard size={16} /> Payer une tranche
                                                                </button>
                                                            )}
                                                            {en.schedule_raw && (
                                                                <button
                                                                    onClick={() => handleOpenSchedule(en)}
                                                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                                                                >
                                                                    <CalendarIcon size={16} className="text-brand-blue" /> Voir calendrier
                                                                </button>
                                                            )}
                                                            {en.receipt_url && (
                                                                <button
                                                                    onClick={() => setHistoryModalEnrollment(en)}
                                                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                                                                >
                                                                    <History size={16} className="text-slate-500" /> Voir historique
                                                                </button>
                                                            )}
                                                            {en.status_raw === 'pending' && (
                                                                <div className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800">
                                                                    <Clock size={15} className="shrink-0" />
                                                                    {en.receipt_url
                                                                        ? 'Paiement en cours de vérification'
                                                                        : 'Réservation en attente de validation'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.article>
                                        );
                                    })
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Sidebar Area */}
                    <div className="space-y-6 lg:col-span-1">
                        <div className="rounded-2xl border border-brand-blue/20 bg-white p-5 shadow-sm md:p-6">
                            <h3 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900">
                                <CreditCard size={20} className="text-brand-blue" /> Informations de paiement
                            </h3>
                            <p className="mb-5 text-sm leading-relaxed text-slate-600">
                                Votre place peut être réservée sans acompte. Lorsque vous êtes prêt à payer, effectuez le transfert puis téléchargez le reçu depuis votre inscription.
                            </p>
                            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nom de la banque</p>
                                    <p className="font-bold text-slate-900">BANQUE DE TUNISIE</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Numéro de compte (RIB)</p>
                                    <p className="break-all font-mono font-bold tabular-nums text-slate-900">{RIB}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={copyRib}
                                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                                    aria-live="polite"
                                >
                                    {ribCopied ? <><Check size={16} className="text-emerald-600" /> RIB copié</> : <><Copy size={16} /> Copier le RIB</>}
                                </button>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                            <h3 className="mb-3 text-lg font-bold text-slate-900">Liens rapides</h3>
                            <ul className="divide-y divide-slate-100">
                                <li>
                                    <Link href="/formations" className="group flex h-11 items-center justify-between">
                                        <span className="font-medium text-slate-700 transition-colors group-hover:text-brand-blue">Parcourir plus de cours</span>
                                        <ChevronRight size={18} className="text-slate-400 transition-transform group-hover:translate-x-1" />
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/#contact" className="group flex h-11 items-center justify-between">
                                        <span className="font-medium text-slate-700 transition-colors group-hover:text-brand-blue">Centre d&apos;assistance</span>
                                        <LinkIcon size={18} className="text-slate-400 transition-transform group-hover:translate-x-1" />
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>

                </div>
            </div>

            {/* History Modal */}
            <AnimatePresence>
                {historyModalEnrollment && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setHistoryModalEnrollment(null)}>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="history-title"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white p-5">
                                <div className="min-w-0">
                                    <h3 id="history-title" className="text-lg font-bold text-slate-900">Historique de paiement</h3>
                                    <p className="truncate text-sm text-slate-600">Formation : {historyModalEnrollment.course_name}</p>
                                </div>
                                <button
                                    onClick={() => setHistoryModalEnrollment(null)}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                                    aria-label="Fermer"
                                    title="Fermer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="overflow-y-auto p-5">
                                {/* Desktop table */}
                                <table className="hidden w-full text-left sm:table">
                                    <thead>
                                        <tr className="border-b border-slate-200">
                                            <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Date</th>
                                            <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Montant</th>
                                            <th className="pb-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">Statut</th>
                                            <th className="pb-3 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500">Reçu</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {historyRows(historyModalEnrollment).map((item: any, idx: number) => (
                                            <tr key={idx} className="transition-colors hover:bg-slate-50">
                                                <td className="whitespace-nowrap py-3 text-sm tabular-nums text-slate-700">
                                                    {new Date(item.date).toLocaleDateString('fr-FR', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </td>
                                                <td className="whitespace-nowrap py-3 text-sm font-bold tabular-nums text-slate-900">
                                                    {money(item.amount)}
                                                </td>
                                                <td className="py-3">{paymentStatusBadge(item.status)}</td>
                                                <td className="py-3 text-right">
                                                    <a
                                                        href={item.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-bold text-brand-blue hover:bg-slate-100"
                                                    >
                                                        <ExternalLink size={14} /> Voir
                                                    </a>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Mobile cards */}
                                <ul className="space-y-3 sm:hidden">
                                    {historyRows(historyModalEnrollment).map((item: any, idx: number) => (
                                        <li key={idx} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3">
                                            <div className="min-w-0">
                                                <p className="font-bold tabular-nums text-slate-900">{money(item.amount)}</p>
                                                <p className="text-xs tabular-nums text-slate-600">
                                                    {new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                                <div className="mt-1.5">{paymentStatusBadge(item.status)}</div>
                                            </div>
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-bold text-brand-blue"
                                            >
                                                <ExternalLink size={14} /> Voir
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-slate-200 bg-slate-50 p-5">
                                <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total payé</p>
                                    <p className="text-lg font-black tabular-nums text-emerald-700">{money(historyModalEnrollment.paid || 0)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Reste à payer</p>
                                    <p className="text-lg font-black tabular-nums text-amber-800">{money((historyModalEnrollment.total_price || 0) - (historyModalEnrollment.paid || 0))}</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Session Calendar Modal */}
            <AnimatePresence>
                {selectedSchedule && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setSelectedSchedule(null)}>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="schedule-title"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white p-5">
                                <div className="min-w-0">
                                    <h3 id="schedule-title" className="text-lg font-bold text-slate-900">Calendrier de session</h3>
                                    <p className="truncate text-sm text-slate-600">{selectedSchedule.name}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedSchedule(null)}
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                                    aria-label="Fermer"
                                    title="Fermer"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="overflow-y-auto p-5">
                                <div className="space-y-3">
                                    {selectedSchedule.seances && selectedSchedule.seances.length > 0 ? (
                                        selectedSchedule.seances.map((se: any, idx: number) => {
                                            const seDate = new Date(`${se.date}T00:00:00`);
                                            const endTime = (se.end_time || se.start_time || '23:59').slice(0, 5);
                                            const startTime = (se.start_time || '00:00').slice(0, 5);
                                            const startsAt = new Date(`${se.date}T${startTime}:00`);
                                            const endsAt = new Date(`${se.date}T${endTime}:00`);
                                            const now = new Date();
                                            const isPast = endsAt < now;
                                            const isInProgress = startsAt <= now && !isPast;
                                            const seanceKey = `${se.date}|${se.start_time}|${se.end_time || ''}`;
                                            const attendance = scheduleAttendance[seanceKey];
                                            const attendanceBadge: Record<string, { label: string; className: string }> = {
                                                present: {
                                                    label: 'Présent',
                                                    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                                },
                                                absent: {
                                                    label: 'Absent',
                                                    className: 'bg-rose-50 text-rose-700 border-rose-200',
                                                },
                                                late: {
                                                    label: 'Retard',
                                                    className: 'bg-amber-50 text-amber-800 border-amber-200',
                                                },
                                                excused: {
                                                    label: 'Excusé',
                                                    className: 'bg-sky-50 text-sky-700 border-sky-200',
                                                },
                                            };
                                            const recordedStatus = attendanceBadge[attendance?.status];
                                            const pill = 'inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider';
                                            return (
                                                <div
                                                    key={idx}
                                                    className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-all ${isPast
                                                        ? 'border-slate-200 bg-slate-50'
                                                        : isInProgress ? 'border-brand-blue/40 bg-white shadow-sm' : 'border-slate-200 bg-white'
                                                        }`}
                                                >
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl font-bold ${isPast ? 'bg-slate-200 text-slate-600' : 'bg-brand-blue/10 text-brand-blue'
                                                            }`}>
                                                            <span className="mb-0.5 text-[10px] uppercase leading-none">
                                                                {seDate.toLocaleDateString('fr-FR', { month: 'short' })}
                                                            </span>
                                                            <span className="text-lg leading-none tabular-nums">
                                                                {seDate.getDate()}
                                                            </span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-bold capitalize text-slate-900">
                                                                {seDate.toLocaleDateString('fr-FR', { weekday: 'long' })}
                                                            </p>
                                                            <p className="flex items-center gap-1 text-xs tabular-nums text-slate-600">
                                                                <Clock size={12} /> {se.start_time} - {se.end_time || (parseInt(se.start_time.split(':')[0]) + 4) + ':' + se.start_time.split(':')[1]}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {isPast ? (
                                                        loadingScheduleAttendance ? (
                                                            <span className={`${pill} border-slate-200 bg-slate-100 text-slate-600`}>
                                                                Chargement
                                                            </span>
                                                        ) : recordedStatus ? (
                                                            <span className={`${pill} ${recordedStatus.className}`}>
                                                                {recordedStatus.label}
                                                            </span>
                                                        ) : (
                                                            <span className={`${pill} border-slate-200 bg-white text-slate-600`}>
                                                                Non renseigné
                                                            </span>
                                                        )
                                                    ) : isInProgress ? (
                                                        <span className={`${pill} border-sky-200 bg-sky-50 text-sky-700`}>
                                                            En cours
                                                        </span>
                                                    ) : (
                                                        <span className={`${pill} border-emerald-200 bg-emerald-50 text-emerald-700`}>
                                                            À venir
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="py-12 text-center">
                                            <CalendarIcon size={40} className="mx-auto mb-4 text-[#cbd5e1]" />
                                            <p className="text-sm text-slate-600">Aucun calendrier détaillé disponible.</p>
                                        </div>
                                    )}
                                </div>
                                {scheduleAttendanceError && (
                                    <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                                        {scheduleAttendanceError}
                                    </div>
                                )}
                            </div>

                            <div className="flex shrink-0 items-start gap-3 border-t border-slate-200 bg-slate-50 p-5">
                                <AlertCircle size={18} className="mt-0.5 shrink-0 text-brand-blue" />
                                <p className="text-xs leading-relaxed text-slate-600">
                                    Veuillez noter que le calendrier peut être sujet à des modifications mineures. Consultez régulièrement votre boîte mail.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
