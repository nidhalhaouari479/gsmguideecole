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
            <div className="min-h-[60vh] bg-site-muted pb-24" role="status" aria-busy="true">
                <p className="sr-only">Chargement de votre espace...</p>
                <div className="site-container pt-6 md:pt-8" aria-hidden="true">
                    <div className="flex animate-pulse items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-white shadow-[var(--shadow-card)]" />
                        <div className="space-y-2">
                            <div className="h-3 w-28 rounded bg-white" />
                            <div className="h-6 w-48 rounded bg-white" />
                            <div className="h-3 w-36 rounded bg-white" />
                        </div>
                    </div>
                    <div className="mt-6 grid animate-pulse grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="site-card h-[112px] p-4 md:h-[132px] md:p-5">
                                <div className="h-9 w-9 rounded-xl bg-slate-50" />
                                <div className="mt-4 h-6 w-20 rounded bg-slate-50" />
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 grid animate-pulse grid-cols-1 gap-5 lg:grid-cols-3">
                        <div className="space-y-4 lg:col-span-2">
                            {[0, 1].map((i) => (
                                <div key={i} className="site-card p-5">
                                    <div className="h-5 w-2/3 rounded bg-slate-50" />
                                    <div className="mt-2 h-4 w-1/3 rounded bg-slate-50" />
                                    <div className="mt-6 h-1.5 w-full rounded-full bg-slate-50" />
                                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                        {[0, 1, 2, 3].map((j) => <div key={j} className="h-10 rounded bg-slate-50" />)}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="site-card h-64" />
                    </div>
                </div>
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
            ? { wrap: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-500' }
            : en.status_raw === 'rejected'
                ? { wrap: 'bg-rose-50 text-rose-700 ring-rose-200', dot: 'bg-rose-500' }
                : { wrap: 'bg-amber-50 text-amber-800 ring-amber-200', dot: 'bg-amber-500' };
        return (
            <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-inset ${tone.wrap}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
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
        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-inset ${status === 'approved'
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
            : status === 'pending'
                ? 'bg-amber-50 text-amber-800 ring-amber-200'
                : 'bg-rose-50 text-rose-700 ring-rose-200'
            }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status === 'approved' ? 'bg-emerald-500' : status === 'pending' ? 'bg-amber-500' : 'bg-rose-500'}`} aria-hidden="true" />
            {status === 'approved' ? 'Validé' : status === 'pending' ? 'En attente' : 'Rejeté'}
        </span>
    );
    const displayName = user?.user_metadata?.full_name || "Étudiant";
    const amountOnly = (n: number) => (Number(n) || 0).toLocaleString('fr-FR');
    const sectionTitle = 'text-[13px] font-bold uppercase tracking-[0.02em] text-slate-900';
    const fieldLabel = 'text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500';
    const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2';
    const kpis = [
        { label: 'Inscriptions', value: String(enrollments.length), unit: undefined as string | undefined, icon: BookOpen, tile: 'bg-brand-blue', tone: 'text-slate-900' },
        { label: 'Montant total', value: amountOnly(totals.total), unit: 'DT', icon: CreditCard, tile: 'bg-violet-500', tone: 'text-slate-900' },
        { label: 'Total payé (validé)', value: amountOnly(totals.paid), unit: 'DT', icon: CheckCircle, tile: 'bg-emerald-500', tone: 'text-emerald-700' },
        { label: 'Reste à payer', value: amountOnly(totalRemaining), unit: 'DT', icon: Clock, tile: totalRemaining > 0 ? 'bg-amber-500' : 'bg-emerald-500', tone: totalRemaining > 0 ? 'text-amber-800' : 'text-emerald-700' },
    ];

    return (
        <div className="min-h-screen bg-site-muted pb-24">
            <div className="site-container pt-6 md:pt-8">
                {/* Header */}
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-blue text-2xl font-bold uppercase text-[#fff] shadow-[var(--shadow-brand)] md:h-16 md:w-16" aria-hidden="true">
                            {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">{t.nav.dashboard}</p>
                            <h1 className="truncate text-[20px] font-extrabold tracking-[-0.01em] text-slate-900 md:text-[24px]">
                                {displayName}
                            </h1>
                            <p className="truncate text-[13.5px] text-slate-500">{user?.email}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                        <Link href="/formations" className={`site-btn-secondary min-h-11 px-4 text-sm ${focusRing}`}>
                            <BookOpen size={16} className="text-brand-blue" aria-hidden="true" /> Formations
                        </Link>
                        <button onClick={handleLogout} className={`site-btn-secondary min-h-11 px-4 text-sm text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 ${focusRing}`}>
                            <LogOut size={16} aria-hidden="true" /> {t.nav.logout}
                        </button>
                    </div>
                </header>

                {uploadSuccess && (
                    <div role="status" className="mt-6 flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
                        <CheckCircle size={18} className="shrink-0 text-emerald-600" aria-hidden="true" /> {uploadSuccess}
                    </div>
                )}

                {/* KPI tiles */}
                {enrollments.length > 0 && (
                    <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                        {kpis.map(({ label, value, unit, icon: Icon, tile, tone }) => (
                            <div key={label} className="site-card flex min-w-0 flex-col p-4 md:p-5">
                                <div className="flex items-center gap-2.5">
                                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#fff] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] ${tile}`} aria-hidden="true">
                                        <Icon size={18} />
                                    </span>
                                    <span className="min-w-0 text-[11px] font-semibold uppercase leading-tight tracking-[0.02em] text-slate-600">{label}</span>
                                </div>
                                <p className={`mt-3 text-[22px] font-bold leading-none tracking-tight tabular-nums md:mt-4 md:text-[28px] ${tone}`}>
                                    {value}
                                    {unit && <span className="ml-1 text-[13px] font-semibold text-slate-500 md:text-[15px]">{unit}</span>}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-6 grid grid-cols-1 gap-5 md:mt-8 lg:grid-cols-3 lg:gap-6">

                    {/* Main Dashboard Area */}
                    <div className="min-w-0 space-y-4 lg:col-span-2">
                        <section aria-labelledby="enrollments-title">
                            <div className="mb-3 flex items-center justify-between gap-3">
                                <h2 id="enrollments-title" className={`flex items-center gap-2 ${sectionTitle}`}>
                                    <BookOpen size={16} className="text-brand-blue" aria-hidden="true" /> Mes inscriptions
                                </h2>
                                <Link href="/formations" className={`inline-flex min-h-11 items-center gap-1 rounded-md text-[13px] font-semibold text-brand-green-700 transition-colors duration-150 hover:text-brand-green-600 ${focusRing}`}>
                                    Formations <ChevronRight size={15} aria-hidden="true" />
                                </Link>
                            </div>
                            <div className="space-y-4">
                                {enrollments.length === 0 ? (
                                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-8 text-center md:p-12">
                                        <span className="site-icon-tile mx-auto mb-4 bg-brand-blue" aria-hidden="true">
                                            <BookOpen size={20} />
                                        </span>
                                        <h3 className="mb-1 text-[17px] font-semibold text-slate-900">Aucune formation inscrite</h3>
                                        <p className="mb-6 text-sm text-slate-500">Vous n&apos;êtes pas encore inscrit à une formation.</p>
                                        <Link href="/formations" className={`site-btn-primary ${focusRing}`}>
                                            Voir les formations <ChevronRight size={16} aria-hidden="true" />
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
                                                className="site-card overflow-hidden"
                                            >
                                                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between md:p-5">
                                                    <div className="flex min-w-0 items-start gap-3">
                                                        <span className="site-icon-tile bg-brand-blue" aria-hidden="true">
                                                            <BookOpen size={20} />
                                                        </span>
                                                        <div className="min-w-0">
                                                            <h3 className="text-[16px] font-semibold leading-snug text-slate-900 md:text-[17px]">{en.course_name}</h3>
                                                            <div className="mt-1 flex items-center gap-1.5 text-[13px] tabular-nums text-slate-500">
                                                                <CalendarIcon size={14} className="shrink-0" aria-hidden="true" /> {en.schedule_text}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {statusBadge(en)}
                                                </div>

                                                {/* Payment progress */}
                                                <div className="px-4 pb-4 md:px-5 md:pb-5">
                                                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                                                        <p className="text-[13px] text-slate-500">
                                                            <span className="font-semibold tabular-nums text-slate-900">{money(paid)}</span> payés sur <span className="font-semibold tabular-nums text-slate-900">{money(total)}</span>
                                                        </p>
                                                        <span className={`text-[13px] font-bold tabular-nums ${complete ? 'text-emerald-700' : 'text-slate-900'}`}>{pct} %</span>
                                                    </div>
                                                    <div
                                                        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-50 ring-1 ring-inset ring-slate-200/70"
                                                        role="progressbar"
                                                        aria-valuemin={0}
                                                        aria-valuemax={100}
                                                        aria-valuenow={pct}
                                                        aria-label={`Paiement : ${pct} %`}
                                                    >
                                                        <div className={`h-full rounded-full transition-[width] duration-300 ${complete ? 'bg-emerald-500' : 'bg-brand-green'}`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                                <dl className="grid grid-cols-2 border-t border-slate-100 sm:grid-cols-4">
                                                    <div className="min-w-0 border-b border-r border-slate-100 px-4 py-3 sm:border-b-0 md:px-5">
                                                        <dt className={fieldLabel}>Prix total</dt>
                                                        <dd className="mt-1 text-[14px] font-bold tabular-nums text-slate-900">{money(en.total_price)}</dd>
                                                    </div>
                                                    <div className="min-w-0 border-b border-slate-100 px-4 py-3 sm:border-b-0 sm:border-r md:px-5">
                                                        <dt className={fieldLabel}>Montant payé</dt>
                                                        <dd className="mt-1 text-[14px] font-bold tabular-nums text-emerald-700">{money(en.paid)}</dd>
                                                    </div>
                                                    <div className="min-w-0 border-r border-slate-100 px-4 py-3 md:px-5">
                                                        <dt className={fieldLabel}>Reste à payer</dt>
                                                        <dd className={`mt-1 text-[14px] font-bold tabular-nums ${remaining > 0 ? 'text-amber-800' : 'text-emerald-700'}`}>{money(Math.max(0, remaining))}</dd>
                                                    </div>
                                                    <div className="min-w-0 px-4 py-3 md:px-5">
                                                        <dt className={fieldLabel}>Reçu</dt>
                                                        <dd className="mt-1 text-[13px] font-semibold text-slate-900">{en.receipt_status}</dd>
                                                    </div>
                                                </dl>

                                                <div className="border-t border-slate-100 bg-slate-50/60 p-4 md:p-5">
                                                    {activeUploadId === en.id ? (
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <h4 className={sectionTitle}>Payer une autre tranche</h4>
                                                                <button
                                                                    onClick={() => setActiveUploadId(null)}
                                                                    className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-slate-600 transition-colors duration-150 hover:bg-white hover:text-slate-900 ${focusRing}`}
                                                                >
                                                                    Annuler
                                                                </button>
                                                            </div>
                                                            <div className="flex items-start gap-2 rounded-xl bg-brand-soft p-3 text-[13px] text-brand-blue-dark">
                                                                <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
                                                                <span>Effectuez le virement sur le RIB <strong className="tabular-nums">{RIB}</strong>, puis joignez le reçu ci-dessous.</span>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                                <div>
                                                                    <label htmlFor={`tranche-amount-${en.id}`} className="site-label">Montant payé (DT)</label>
                                                                    <div className="relative">
                                                                        <CreditCard className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
                                                                        <input
                                                                            id={`tranche-amount-${en.id}`}
                                                                            type="number"
                                                                            inputMode="decimal"
                                                                            placeholder="Montant payé (DT)"
                                                                            value={trancheAmount}
                                                                            onChange={(e) => setTrancheAmount(e.target.value)}
                                                                            className="site-input pl-10 font-semibold tabular-nums placeholder:font-normal"
                                                                        />
                                                                    </div>
                                                                    {remaining > 0 && <p className="mt-1.5 text-xs text-slate-500">Reste à payer : <span className="font-bold tabular-nums text-slate-900">{money(remaining)}</span></p>}
                                                                </div>
                                                                <div>
                                                                    <label htmlFor={`tranche-file-${en.id}`} className="site-label">Reçu (image ou PDF)</label>
                                                                    <div className={`relative flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-3 py-3 text-center transition-colors duration-150 focus-within:ring-2 focus-within:ring-focus/50 focus-within:ring-offset-2 ${trancheFile ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-white hover:border-brand-green hover:bg-brand-green-soft/40'}`}>
                                                                        <input
                                                                            id={`tranche-file-${en.id}`}
                                                                            type="file"
                                                                            className="absolute inset-0 z-10 cursor-pointer opacity-0"
                                                                            onChange={handleFileChange}
                                                                            accept="image/*,.pdf"
                                                                        />
                                                                        {trancheFile
                                                                            ? <CheckCircle size={20} className="shrink-0 text-emerald-600" aria-hidden="true" />
                                                                            : <Upload size={20} className="shrink-0 text-slate-500" aria-hidden="true" />}
                                                                        <span className={`max-w-full truncate text-[13px] font-semibold ${trancheFile ? 'text-emerald-800' : 'text-slate-600'}`}>
                                                                            {trancheFile ? trancheFile.name : "Cliquez pour uploader le reçu"}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            {uploadError && (
                                                                <p role="alert" className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm font-medium text-rose-800 ring-1 ring-rose-200">
                                                                    <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" aria-hidden="true" /> {uploadError}
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
                                                                    className={`site-btn-primary min-h-11 text-sm ${focusRing}`}
                                                                >
                                                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Upload size={16} aria-hidden="true" />}
                                                                    Soumettre le reçu
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                                                            {en.remaining > 0 && !(en.status_raw === 'pending' && en.receipt_url) && (
                                                                <button
                                                                    onClick={() => setActiveUploadId(en.id)}
                                                                    className={`site-btn-primary min-h-11 px-5 text-sm ${focusRing}`}
                                                                >
                                                                    <CreditCard size={16} aria-hidden="true" /> Payer une tranche
                                                                </button>
                                                            )}
                                                            {en.schedule_raw && (
                                                                <button
                                                                    onClick={() => handleOpenSchedule(en)}
                                                                    className={`site-btn-secondary min-h-11 px-5 text-sm ${focusRing}`}
                                                                >
                                                                    <CalendarIcon size={16} className="text-brand-blue" aria-hidden="true" /> Voir calendrier
                                                                </button>
                                                            )}
                                                            {en.receipt_url && (
                                                                <button
                                                                    onClick={() => setHistoryModalEnrollment(en)}
                                                                    className={`site-btn-secondary min-h-11 px-5 text-sm ${focusRing}`}
                                                                >
                                                                    <History size={16} className="text-slate-500" aria-hidden="true" /> Voir historique
                                                                </button>
                                                            )}
                                                            {en.status_raw === 'pending' && (
                                                                <div className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                                                                    <Clock size={15} className="shrink-0" aria-hidden="true" />
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
                    <div className="min-w-0 space-y-4 lg:col-span-1 lg:pt-14">
                        <div className="site-card p-5">
                            <div className="mb-3 flex items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-green text-[#fff] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]" aria-hidden="true">
                                    <CreditCard size={18} />
                                </span>
                                <h3 className={sectionTitle}>Informations de paiement</h3>
                            </div>
                            <p className="mb-4 text-[13.5px] leading-relaxed text-slate-500">
                                Votre place peut être réservée sans acompte. Lorsque vous êtes prêt à payer, effectuez le transfert puis téléchargez le reçu depuis votre inscription.
                            </p>
                            <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50 p-4">
                                <div>
                                    <p className={fieldLabel}>Nom de la banque</p>
                                    <p className="mt-0.5 text-[14px] font-bold text-slate-900">BANQUE DE TUNISIE</p>
                                </div>
                                <div>
                                    <p className={fieldLabel}>Numéro de compte (RIB)</p>
                                    <p className="mt-0.5 break-all font-mono text-[14px] font-bold tabular-nums text-slate-900">{RIB}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={copyRib}
                                    className={`site-btn-secondary min-h-11 w-full text-sm ${focusRing}`}
                                    aria-live="polite"
                                >
                                    {ribCopied ? <><Check size={16} className="text-emerald-600" aria-hidden="true" /> RIB copié</> : <><Copy size={16} aria-hidden="true" /> Copier le RIB</>}
                                </button>
                            </div>
                        </div>

                        <div className="site-card p-5">
                            <h3 className={`mb-2 ${sectionTitle}`}>Liens rapides</h3>
                            <ul className="divide-y divide-slate-100">
                                <li>
                                    <Link href="/formations" className={`group -mx-2 flex min-h-12 items-center justify-between rounded-lg px-2 transition-colors duration-150 hover:bg-slate-50 ${focusRing}`}>
                                        <span className="text-[14px] font-medium text-slate-700 transition-colors duration-150 group-hover:text-slate-900">Parcourir plus de cours</span>
                                        <ChevronRight size={18} className="text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/#contact" className={`group -mx-2 flex min-h-12 items-center justify-between rounded-lg px-2 transition-colors duration-150 hover:bg-slate-50 ${focusRing}`}>
                                        <span className="text-[14px] font-medium text-slate-700 transition-colors duration-150 group-hover:text-slate-900">Centre d&apos;assistance</span>
                                        <LinkIcon size={18} className="text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
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
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setHistoryModalEnrollment(null)}>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-[var(--shadow-pop)] sm:rounded-2xl"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="history-title"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue text-[#fff]" aria-hidden="true">
                                        <History size={18} />
                                    </span>
                                    <div className="min-w-0">
                                        <h3 id="history-title" className="text-[16px] font-semibold text-slate-900">Historique de paiement</h3>
                                        <p className="truncate text-[13px] text-slate-500">Formation : {historyModalEnrollment.course_name}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setHistoryModalEnrollment(null)}
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                                    aria-label="Fermer"
                                    title="Fermer"
                                >
                                    <X size={20} aria-hidden="true" />
                                </button>
                            </div>

                            <div className="overflow-y-auto p-4 sm:p-5">
                                {/* Desktop table */}
                                <div className="hidden overflow-x-auto rounded-xl border border-slate-200/80 sm:block">
                                    <table className="w-full text-left text-[13px]">
                                        <thead className="bg-slate-50/80">
                                            <tr className="border-b border-slate-200/80">
                                                <th className="px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Date</th>
                                                <th className="px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Montant</th>
                                                <th className="px-4 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Statut</th>
                                                <th className="px-4 py-2.5 text-right text-[11.5px] font-semibold uppercase tracking-[0.04em] text-slate-500">Reçu</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {historyRows(historyModalEnrollment).map((item: any, idx: number) => (
                                                <tr key={idx} className="transition-colors duration-150 hover:bg-slate-50/80">
                                                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-700">
                                                        {new Date(item.date).toLocaleDateString('fr-FR', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 font-bold tabular-nums text-slate-900">
                                                        {money(item.amount)}
                                                    </td>
                                                    <td className="px-4 py-3">{paymentStatusBadge(item.status)}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <a
                                                            href={item.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-[13px] font-semibold text-brand-blue transition-colors duration-150 hover:bg-brand-soft hover:text-brand-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                                                        >
                                                            <ExternalLink size={14} aria-hidden="true" /> Voir
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile cards */}
                                <ul className="space-y-3 sm:hidden">
                                    {historyRows(historyModalEnrollment).map((item: any, idx: number) => (
                                        <li key={idx} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 p-3.5">
                                            <div className="min-w-0">
                                                <p className="text-[15px] font-bold tabular-nums text-slate-900">{money(item.amount)}</p>
                                                <p className="text-xs tabular-nums text-slate-500">
                                                    {new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                                <div className="mt-2">{paymentStatusBadge(item.status)}</div>
                                            </div>
                                            <a
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex h-11 shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-brand-blue transition-colors duration-150 hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                                            >
                                                <ExternalLink size={14} aria-hidden="true" /> Voir
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
                                <div>
                                    <p className={fieldLabel}>Total payé</p>
                                    <p className="mt-0.5 text-[18px] font-bold tabular-nums text-emerald-700">{money(historyModalEnrollment.paid || 0)}</p>
                                </div>
                                <div className="text-right">
                                    <p className={fieldLabel}>Reste à payer</p>
                                    <p className="mt-0.5 text-[18px] font-bold tabular-nums text-amber-800">{money((historyModalEnrollment.total_price || 0) - (historyModalEnrollment.paid || 0))}</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Session Calendar Modal */}
            <AnimatePresence>
                {selectedSchedule && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setSelectedSchedule(null)}>
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.2 }}
                            className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-[var(--shadow-pop)] sm:rounded-2xl"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="schedule-title"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue text-[#fff]" aria-hidden="true">
                                        <CalendarIcon size={18} />
                                    </span>
                                    <div className="min-w-0">
                                        <h3 id="schedule-title" className="text-[16px] font-semibold text-slate-900">Calendrier de session</h3>
                                        <p className="truncate text-[13px] text-slate-500">{selectedSchedule.name}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedSchedule(null)}
                                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-500 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                                    aria-label="Fermer"
                                    title="Fermer"
                                >
                                    <X size={20} aria-hidden="true" />
                                </button>
                            </div>

                            <div className="overflow-y-auto p-4 sm:p-5">
                                <ul className="divide-y divide-slate-100">
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
                                                    className: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
                                                },
                                                absent: {
                                                    label: 'Absent',
                                                    className: 'bg-rose-50 text-rose-700 ring-rose-200',
                                                },
                                                late: {
                                                    label: 'Retard',
                                                    className: 'bg-amber-50 text-amber-800 ring-amber-200',
                                                },
                                                excused: {
                                                    label: 'Excusé',
                                                    className: 'bg-brand-soft text-brand-blue-dark ring-brand-blue/20',
                                                },
                                            };
                                            const recordedStatus = attendanceBadge[attendance?.status];
                                            const pill = 'inline-flex shrink-0 items-center whitespace-nowrap rounded-lg px-2.5 py-1 text-[11.5px] font-semibold ring-1 ring-inset';
                                            return (
                                                <li
                                                    key={idx}
                                                    className={`flex items-center justify-between gap-3 py-3 ${isPast ? 'opacity-80' : ''}`}
                                                >
                                                    <div className="flex min-w-0 items-center gap-3.5">
                                                        <div className={`flex w-14 shrink-0 flex-col items-center rounded-xl border py-2 text-center leading-none ${isInProgress
                                                            ? 'border-brand-blue/40 bg-brand-soft'
                                                            : isPast ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'
                                                            }`}>
                                                            <span className={`text-[20px] font-bold tabular-nums ${isPast ? 'text-slate-500' : 'text-slate-900'}`}>
                                                                {seDate.getDate()}
                                                            </span>
                                                            <span className="mt-1 text-[10px] font-semibold uppercase text-slate-500">
                                                                {seDate.toLocaleDateString('fr-FR', { month: 'short' })}
                                                            </span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[14px] font-semibold capitalize text-slate-900">
                                                                {seDate.toLocaleDateString('fr-FR', { weekday: 'long' })}
                                                            </p>
                                                            <p className="mt-0.5 flex items-center gap-1.5 text-xs tabular-nums text-slate-500">
                                                                <Clock size={12} aria-hidden="true" /> {se.start_time} - {se.end_time || (parseInt(se.start_time.split(':')[0]) + 4) + ':' + se.start_time.split(':')[1]}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {isPast ? (
                                                        loadingScheduleAttendance ? (
                                                            <span className={`${pill} animate-pulse bg-slate-50 text-slate-500 ring-slate-200`}>
                                                                Chargement
                                                            </span>
                                                        ) : recordedStatus ? (
                                                            <span className={`${pill} ${recordedStatus.className}`}>
                                                                {recordedStatus.label}
                                                            </span>
                                                        ) : (
                                                            <span className={`${pill} bg-white text-slate-500 ring-slate-200`}>
                                                                Non renseigné
                                                            </span>
                                                        )
                                                    ) : isInProgress ? (
                                                        <span className={`${pill} bg-brand-soft text-brand-blue-dark ring-brand-blue/20`}>
                                                            En cours
                                                        </span>
                                                    ) : (
                                                        <span className={`${pill} bg-emerald-50 text-emerald-700 ring-emerald-200`}>
                                                            À venir
                                                        </span>
                                                    )}
                                                </li>
                                            );
                                        })
                                    ) : (
                                        <li className="py-12 text-center">
                                            <span className="site-icon-tile mx-auto mb-4 bg-slate-400" aria-hidden="true">
                                                <CalendarIcon size={20} />
                                            </span>
                                            <p className="text-sm text-slate-500">Aucun calendrier détaillé disponible.</p>
                                        </li>
                                    )}
                                </ul>
                                {scheduleAttendanceError && (
                                    <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
                                        <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                                        {scheduleAttendanceError}
                                    </div>
                                )}
                            </div>

                            <div className="flex shrink-0 items-start gap-3 border-t border-slate-100 bg-brand-soft px-5 py-4">
                                <AlertCircle size={18} className="mt-0.5 shrink-0 text-brand-blue" aria-hidden="true" />
                                <p className="text-xs leading-relaxed text-brand-blue-dark">
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
