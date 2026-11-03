"use client";

import { notify } from '@/components/FeedbackHost';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { motion } from 'framer-motion';
import {
    Clock, Calendar, Users, BookOpen,
    CheckCircle,
    ArrowLeft, ChevronRight,
    ShieldCheck, Award, AlertCircle,
    Star, MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { sanitizeCourseHtml } from '@/lib/rich-text';

export default function FormationDetail() {
    const params = useParams();
    const router = useRouter();
    const { language, t } = useLanguage();
    const id = params.id as string;
    const [formation, setFormation] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    const [ratings, setRatings] = React.useState<any[]>([]);
    const [ratingStats, setRatingStats] = React.useState({ average: 0, total: 0 });
    const [userRating, setUserRating] = React.useState({ rating: 0, comment: '' });
    const [submittingRating, setSubmittingRating] = React.useState(false);
    const [userId, setUserId] = React.useState<string | null>(null);
    const [isEnrolled, setIsEnrolled] = React.useState(false);

    const bookSession = async (sessionId?: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        const currentPath = `/formations/${id}`;
        if (!session) {
            // Not logged in → go to login, then come back here
            router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
        } else {
            // Logged in → go to booking page
            const query = sessionId ? `?course=${id}&session=${sessionId}` : `?course=${id}`;
            router.push(`/book${query}`);
        }
    };

    React.useEffect(() => {
        const fetchFormationData = async () => {
            try {
                // Fetch course details (with instructor name) from database
                const { data: course, error: courseError } = await supabase
                    .from('courses')
                    .select('*, professeurs(nom, prenom), course_programs(id, content, position)')
                    .eq('id', id)
                    .single();

                if (courseError) throw courseError;

                // Fetch sessions with counts via RPC (parameterized v2)
                const { data: sessionsWithCounts, error: sessionsError } = await supabase
                    .rpc('get_course_sessions_v2', { p_course_id: id });

                console.log('TRACE - Detail Page ID:', id);
                console.log('TRACE - v2 RPC Data:', sessionsWithCounts);
                console.log('TRACE - v2 RPC Error:', sessionsError);

                if (sessionsError) {
                    console.error('FormationDetail RPC Error (detailed):', {
                        message: sessionsError.message,
                        details: sessionsError.details,
                        hint: sessionsError.hint,
                        code: sessionsError.code
                    });
                }
                // Riverside: Updated to v2 RPC.

                const sessionIds = (sessionsWithCounts || []).map((session: any) => session.id);
                const activeReservationsBySession = new Map<string, number>();

                if (sessionIds.length > 0) {
                    const { data: activeReservations } = await supabase
                        .from('enrollments')
                        .select('session_id, status')
                        .in('session_id', sessionIds)
                        .in('status', ['pending', 'approved']);

                    (activeReservations || []).forEach((reservation: any) => {
                        activeReservationsBySession.set(
                            reservation.session_id,
                            (activeReservationsBySession.get(reservation.session_id) || 0) + 1
                        );
                    });
                }

                if (course) {
                    const formattedData = {
                        title: { fr: course.title_fr, en: course.title_en },
                        longDesc: { fr: course.description_fr, en: course.description_en },
                        duration: course.duration,
                        base_price: course.base_price,
                        sold_price: course.sold_price,
                        price: course.sold_price ? `${course.sold_price} DT` : `${course.base_price} DT`,
                        image: course.image_url,
                        instructor: course.instructor_name,
                        category: course.category === 'Software'
                            ? 'Logiciel'
                            : course.category === 'Hardware' ? 'Matériel' : course.category,
                        level: course.level,
                        learning: [...(course.course_programs || [])]
                            .sort((a: any, b: any) => a.position - b.position),
                        sessions: (sessionsWithCounts || [])
                            .sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                            .map((s: any) => {
                                return {
                                    id: s.id,
                                    start: s.start_date,
                                    end: s.end_date,
                                    schedule: s.schedule || "Temps plein",
                                    seats: Math.max(
                                        0,
                                        s.seats_available - (
                                            activeReservationsBySession.get(s.id)
                                            ?? Number(s.approved_enrollments_count || 0)
                                        )
                                    )
                                };
                            })
                    };
                    setFormation(formattedData);
                }
            } catch (err) {
                console.error('Error fetching formation details:', err);
            } finally {
                setLoading(false);
            }
        };

        const checkUser = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
                // Check if user is enrolled in this course
                const { data: sessions } = await supabase.from('sessions').select('id').eq('course_id', id);
                if (sessions && sessions.length > 0) {
                    const sessionIds = sessions.map(s => s.id);
                    const { data: enrollment } = await supabase
                        .from('enrollments')
                        .select('id')
                        .eq('user_id', session.user.id)
                        .in('session_id', sessionIds)
                        .limit(1);
                    if (enrollment && enrollment.length > 0) setIsEnrolled(true);
                }
            }
        };

        const fetchRatings = async () => {
            try {
                const res = await fetch(`/api/courses/${id}/ratings`);
                const data = await res.json();
                if (data.ratings) setRatings(data.ratings);
                if (data.stats) setRatingStats(data.stats);
            } catch (err) {
                console.error('Error fetching ratings:', err);
            }
        };

        fetchFormationData();
        checkUser();
        fetchRatings();
    }, [id]);

    const submitRating = async () => {
        if (!userId || userRating.rating === 0) return;
        setSubmittingRating(true);
        try {
            const res = await fetch(`/api/courses/${id}/ratings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating: userRating.rating,
                    comment: userRating.comment,
                    userId
                })
            });
            if (res.ok) {
                // Refresh ratings
                const res2 = await fetch(`/api/courses/${id}/ratings`);
                const data2 = await res2.json();
                if (data2.ratings) setRatings(data2.ratings);
                if (data2.stats) setRatingStats(data2.stats);
                notify.success('Merci pour votre message !');
            }
        } catch (err) {
            console.error('Error submitting rating:', err);
        } finally {
            setSubmittingRating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] bg-site-muted" role="status">
                <div className="h-[400px] w-full animate-pulse bg-navy-950 md:h-[460px]" aria-hidden="true" />
                <div className="site-container relative z-10 -mt-16 md:-mt-20" aria-hidden="true">
                    <div className="site-card mb-8 grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-site-muted" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-2.5 w-16 animate-pulse rounded bg-site-muted" />
                                    <div className="h-3.5 w-24 animate-pulse rounded bg-site-muted" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
                        <div className="space-y-6 lg:col-span-2">
                            <div className="site-card h-40 animate-pulse" />
                            <div className="site-card h-64 animate-pulse" />
                        </div>
                        <div className="site-card hidden h-72 animate-pulse lg:block" />
                    </div>
                </div>
                <p className="sr-only">Chargement de la formation...</p>
            </div>
        );
    }

    if (!formation) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center bg-site-muted px-4 text-center">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-inset ring-slate-200">
                    <BookOpen size={20} aria-hidden="true" />
                </div>
                <h2 className="mb-2 text-2xl font-extrabold tracking-tight text-slate-900">Formation introuvable</h2>
                <p className="mb-6 text-sm text-slate-600">Cette formation n&apos;existe pas ou n&apos;est plus disponible.</p>
                <button onClick={() => router.push('/formations')} className="site-btn-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2">Retour aux formations</button>
            </div>
        );
    }

    // ---- Presentation helpers (display only) ----
    const dateLocale = language === 'en' ? 'en-US' : 'fr-FR';
    const now = new Date();
    const scheduleLabel = (schedule: string) => {
        try {
            const p = JSON.parse(schedule);
            return p.label || schedule;
        } catch (e) { return schedule; }
    };
    const isSessionOpen = (s: any) => new Date(s.start) >= now;
    const nextSession = [...formation.sessions]
        .filter((s: any) => isSessionOpen(s) && s.seats > 0)
        .sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];
    const priceBlock = (size: 'lg' | 'sm') => (
        <div className="flex flex-wrap items-baseline gap-x-2">
            {formation.sold_price ? (
                <>
                    <span className={`${size === 'lg' ? 'text-3xl md:text-4xl' : 'text-xl'} font-extrabold tracking-tight tabular-nums text-slate-900`}>{formation.sold_price} DT</span>
                    <span className={`${size === 'lg' ? 'text-base' : 'text-sm'} font-semibold tabular-nums text-slate-500 line-through`}>{formation.base_price} DT</span>
                </>
            ) : (
                <span className={`${size === 'lg' ? 'text-3xl md:text-4xl' : 'text-xl'} font-extrabold tracking-tight tabular-nums text-slate-900`}>{formation.base_price} DT</span>
            )}
        </div>
    );

    const sectionTitle = 'text-[13px] font-bold uppercase tracking-[0.02em] text-slate-900';
    const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2';

    const sessionsCard = (
        <div className="site-card p-5 md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h3 className={sectionTitle}>Toutes les sessions</h3>
                <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-700 ring-1 ring-inset ring-slate-200">{formation.sessions.length} session{formation.sessions.length > 1 ? 's' : ''}</span>
            </div>
            {formation.sessions.length === 0 ? (
                <div className="rounded-xl bg-site-muted px-5 py-8 text-center">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-inset ring-slate-200">
                        <Calendar size={18} aria-hidden="true" />
                    </div>
                    <p className="text-sm font-semibold text-slate-900">Aucune session programmée</p>
                    <p className="mt-1 text-xs text-slate-600">Réservez pour demander l&apos;ouverture d&apos;une nouvelle session.</p>
                </div>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {formation.sessions.map((s: any, i: number) => {
                        const open = isSessionOpen(s);
                        const full = s.seats <= 0;
                        const startDate = new Date(s.start);
                        return (
                            <li
                                key={i}
                                className={`flex gap-3.5 py-4 first:pt-0 last:pb-0 ${open ? '' : 'opacity-70'}`}
                            >
                                <div
                                    aria-hidden="true"
                                    className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border ${open ? 'border-slate-200 bg-white' : 'border-slate-200 bg-slate-50'}`}
                                >
                                    <span className={`text-xl leading-none font-extrabold tabular-nums ${open ? 'text-slate-900' : 'text-slate-500'}`}>
                                        {startDate.toLocaleDateString(dateLocale, { day: 'numeric' })}
                                    </span>
                                    <span className={`mt-1 text-[10px] leading-none font-bold uppercase tracking-[0.06em] ${open ? 'text-brand-blue' : 'text-slate-500'}`}>
                                        {startDate.toLocaleDateString(dateLocale, { month: 'short' }).replace('.', '')}
                                    </span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
                                        <div className={`text-sm font-bold tabular-nums ${open ? 'text-slate-900' : 'text-slate-500'}`}>
                                            {new Date(s.start).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })} – {new Date(s.end).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </div>
                                        {open ? (
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${full
                                                ? 'bg-rose-50 text-rose-700 ring-rose-200'
                                                : s.seats <= 5
                                                    ? 'bg-amber-50 text-amber-800 ring-amber-200'
                                                    : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                }`}>
                                                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${full ? 'bg-rose-500' : s.seats <= 5 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                                {full ? 'Complet' : <><span className="tabular-nums">{s.seats}</span> {t.sessions.seatsLeft}</>}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                                                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                                Terminée
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-2 flex items-center justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-1.5 text-xs text-slate-600">
                                            <Clock size={13} className="shrink-0 text-slate-400" aria-hidden="true" />
                                            <span className="truncate">{scheduleLabel(s.schedule)}</span>
                                        </div>
                                        {open && !full && (
                                            <button
                                                type="button"
                                                onClick={() => bookSession(s.id)}
                                                className={`inline-flex h-11 shrink-0 items-center gap-1 rounded-xl px-3 text-sm font-bold text-brand-green-700 transition-colors duration-150 hover:bg-brand-green-soft ${focusRing}`}
                                            >
                                                Réserver <ChevronRight size={15} aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <div className="mt-5 flex items-start gap-3 rounded-xl bg-brand-soft p-4 ring-1 ring-inset ring-brand-blue/10">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-brand-blue" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-slate-700">
                    Remarque : vous pouvez réserver votre place sans acompte et effectuer le paiement plus tard depuis votre espace étudiant.
                </p>
            </div>
        </div>
    );

    const helpBox = (
            <div className="site-card p-5 md:p-6">
                <h4 className={`mb-1.5 ${sectionTitle}`}>Besoin d&apos;aide ?</h4>
                <p className="mb-4 text-sm text-slate-600">Parlez à notre conseiller en carrière avant de vous inscrire.</p>
                <Link
                    href="/#contact"
                    className={`site-btn-secondary w-full ${focusRing}`}
                >
                    <MessageSquare size={16} className="text-brand-blue" aria-hidden="true" /> Support WhatsApp
                </Link>
            </div>
    );

    return (
        <div className="min-h-screen bg-site-muted pb-28 lg:pb-24">
            {/* Hero Section */}
            {/* Explicit hex text colors: the public site runs under data-theme="light", which forces `.text-white` to dark. */}
            <div className="relative flex min-h-[400px] w-full items-end overflow-hidden bg-navy-950 md:min-h-[460px]">
                {formation.image && (
                    <img src={formation.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
                )}
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-navy-950 via-[#0b1626d9] to-[#0b162666]" />
                <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-brand-blue/40 blur-3xl" />
                    <div className="absolute -right-16 -bottom-32 h-96 w-96 rounded-full bg-brand-green/20 blur-3xl" />
                </div>

                <div className="site-container relative pt-10 pb-24 md:pb-28">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <button
                            onClick={() => router.back()}
                            className="mb-6 inline-flex h-11 items-center gap-2 rounded-xl border border-[#ffffff26] bg-[#ffffff14] px-3.5 text-sm font-semibold text-[#fff] backdrop-blur-md transition-colors duration-150 hover:bg-[#ffffff26] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fff]/70"
                        >
                            <ArrowLeft size={18} aria-hidden="true" /> {t.common.back}
                        </button>

                        <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap gap-2">
                                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-green-600 px-3 py-1 text-xs font-semibold text-[#fff] ring-1 ring-inset ring-[#ffffff26]">
                                    <BookOpen size={13} aria-hidden="true" /> Meilleure vente
                                </span>
                                {formation.category && (
                                    <span className="inline-flex w-fit items-center rounded-full bg-[#ffffff14] px-3 py-1 text-xs font-semibold text-[#fff] ring-1 ring-inset ring-[#ffffff33] backdrop-blur">
                                        {formation.category}
                                    </span>
                                )}
                                {formation.level && (
                                    <span className="inline-flex w-fit items-center rounded-full bg-[#ffffff14] px-3 py-1 text-xs font-semibold text-[#fff] ring-1 ring-inset ring-[#ffffff33] backdrop-blur">
                                        {formation.level}
                                    </span>
                                )}
                            </div>
                            <h1 className="max-w-4xl text-[2.25rem] font-extrabold leading-[1.1] tracking-tight text-balance text-[#fff] md:text-5xl">
                                {formation.title[language]}
                            </h1>
                            {ratingStats.total > 0 && (
                                <div className="flex items-center gap-2" aria-label={`Note ${ratingStats.average} sur 5, ${ratingStats.total} avis`}>
                                    <div className="flex items-center gap-0.5" aria-hidden="true">
                                        {[1, 2, 3, 4, 5].map((s) => (
                                            <Star
                                                key={s}
                                                size={16}
                                                className={s <= Math.round(ratingStats.average) ? "fill-amber-400 text-amber-400" : "text-[#64748b]"}
                                            />
                                        ))}
                                    </div>
                                    <span className="font-bold tabular-nums text-[#fff]">{ratingStats.average}</span>
                                    <span className="text-sm text-[#cbd5e1]">({ratingStats.total} avis)</span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="site-container relative z-10 -mt-16 md:-mt-20">
                {/* Key facts */}
                <dl className="site-card mb-8 grid grid-cols-1 gap-4 p-4 shadow-[var(--shadow-lift)] min-[420px]:grid-cols-2 md:grid-cols-4 md:gap-0 md:divide-x md:divide-slate-100 md:p-0">
                    {[
                        { icon: Clock, label: 'Durée', value: formation.duration || '—', tile: 'bg-brand-blue' },
                        { icon: Award, label: 'Formateur', value: formation.instructor || 'Ing. Academy', tile: 'bg-violet-500' },
                        { icon: Calendar, label: 'Prochaine session', value: nextSession ? new Date(nextSession.start).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sur demande', tile: 'bg-brand-green' },
                        { icon: Users, label: 'Taille de la classe', value: '12 Personnes', tile: 'bg-amber-500' },
                    ].map(({ icon: Icon, label, value, tile }) => (
                        <div key={label} className="flex min-w-0 items-center gap-3 md:p-5">
                            <div className={`site-icon-tile h-10 w-10 rounded-xl ${tile}`}>
                                <Icon size={18} aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                                <dt className="text-xs font-medium text-slate-500">{label}</dt>
                                <dd className="truncate text-sm font-bold text-slate-900 md:text-base">{value}</dd>
                            </div>
                        </div>
                    ))}
                </dl>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
                    {/* Left Column: Info */}
                    <div className="min-w-0 space-y-6 lg:col-span-2">
                        {/* Summary Card */}
                        <section className="site-card p-5 md:p-7" aria-labelledby="pricing-title">
                            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                                <div className="max-w-md">
                                    <p id="pricing-title" className={`mb-2 ${sectionTitle}`}>Investissement</p>
                                    {priceBlock('lg')}
                                    {formation.sold_price && (
                                        <span className="mt-2 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                                            Économisez <span className="mx-1 tabular-nums">{Number(formation.base_price) - Number(formation.sold_price)} DT</span>
                                        </span>
                                    )}
                                    <p className="mt-3 text-sm text-slate-600">Les frais complets du cours incluent toutes les taxes et les supports de formation.</p>
                                </div>
                                <button
                                    onClick={() => bookSession()}
                                    className={`site-btn-primary w-full px-8 md:w-auto ${focusRing}`}
                                >
                                    Réserver ma place <ChevronRight size={18} aria-hidden="true" />
                                </button>
                            </div>
                            <div className="mt-6 flex items-start gap-3 border-t border-slate-100 pt-5 text-sm text-slate-600">
                                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden="true" />
                                <span>Réservation possible sans acompte. Le paiement pourra être effectué plus tard.</span>
                            </div>
                        </section>

                        {/* Sessions (mobile/tablet: shown early for conversion) */}
                        <div className="lg:hidden">{sessionsCard}</div>

                        <section className="site-card p-5 md:p-7">
                            <h2 className={`mb-4 ${sectionTitle}`}>
                                Aperçu du cours
                            </h2>
                            <div
                                dir="auto"
                                className="course-rich-text max-w-3xl break-words text-start text-base leading-relaxed text-slate-700 [unicode-bidi:plaintext] [&_a]:text-brand-blue [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-brand-green [&_blockquote]:pl-4 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:tracking-tight [&_h1]:text-slate-900 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-900 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-7 [&_p]:mb-4 [&_p:last-child]:mb-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-7 [&_li]:mb-1"
                                dangerouslySetInnerHTML={{ __html: sanitizeCourseHtml(formation.longDesc[language]) }}
                            />
                        </section>

                        {formation.learning.length > 0 && (
                            <section className="site-card p-5 md:p-7">
                                <h2 className={`mb-4 flex items-center gap-2 ${sectionTitle}`}>
                                    Programme du cours
                                    <span className="rounded-full bg-slate-50 px-2 py-0.5 text-xs font-semibold normal-case tracking-normal tabular-nums text-slate-600 ring-1 ring-inset ring-slate-200">({formation.learning.length} modules)</span>
                                </h2>
                                <ol className="divide-y divide-slate-100">
                                    {formation.learning.map((item: any, idx: number) => (
                                        <li
                                            key={item.id}
                                            className="flex items-start gap-3.5 py-3.5 first:pt-0 last:pb-0"
                                        >
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-sm font-bold tabular-nums text-brand-blue ring-1 ring-inset ring-brand-blue/15">
                                                {idx + 1}
                                            </span>
                                            <span
                                                dir="auto"
                                                className="pt-1 text-start text-sm font-medium leading-relaxed text-slate-800 [unicode-bidi:plaintext]"
                                            >
                                                {item.content}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        )}

                        <section className="site-card p-5 md:p-7">
                            <h2 className={`mb-5 ${sectionTitle}`}>Avantages inclus</h2>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                <div className="space-y-3 rounded-xl bg-site-muted p-5">
                                    <div className="site-icon-tile bg-brand-blue"><ShieldCheck size={20} aria-hidden="true" /></div>
                                    <h3 className="font-bold text-slate-900">Diplôme officiel</h3>
                                    <p className="text-sm text-slate-600">Certificat reconnu pour lancer votre propre activité.</p>
                                </div>
                                <div className="space-y-3 rounded-xl bg-site-muted p-5">
                                    <div className="site-icon-tile bg-emerald-500"><Users size={20} aria-hidden="true" /></div>
                                    <h3 className="font-bold text-slate-900">Ateliers quotidiens</h3>
                                    <p className="text-sm text-slate-600">90 % d’apprentissage pratique dans nos ateliers modernes.</p>
                                </div>
                                <div className="space-y-3 rounded-xl bg-site-muted p-5">
                                    <div className="site-icon-tile bg-amber-500"><Award size={20} aria-hidden="true" /></div>
                                    <h3 className="font-bold text-slate-900">Accompagnement professionnel</h3>
                                    <p className="text-sm text-slate-600">Aide à l’emploi et accès permanent à notre communauté.</p>
                                </div>
                            </div>
                            <ul className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 md:grid-cols-2">
                                <li className="flex items-center gap-3 text-sm font-semibold text-slate-800">
                                    <CheckCircle className="shrink-0 text-emerald-600" size={18} aria-hidden="true" />
                                    <span>Boîte à outils offerte à chaque étudiant</span>
                                </li>
                                <li className="flex items-center gap-3 text-sm font-semibold text-slate-800">
                                    <CheckCircle className="shrink-0 text-emerald-600" size={18} aria-hidden="true" />
                                    <span>Utilisation de matériel de diagnostic moderne</span>
                                </li>
                            </ul>
                        </section>

                        {/* Ratings & Reviews Section */}
                        <section className="site-card space-y-5 p-5 md:p-7">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <h2 className={sectionTitle}>
                                    Avis des étudiants
                                </h2>
                                {ratingStats.total > 0 && (
                                    <div className="flex items-center gap-3 rounded-xl bg-site-muted px-4 py-2">
                                        <div className="text-2xl font-extrabold tabular-nums text-slate-900">{ratingStats.average}</div>
                                        <div className="flex flex-col">
                                            <div className="flex gap-0.5" aria-hidden="true">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Star key={s} size={13} className={s <= Math.round(ratingStats.average) ? "fill-amber-500 text-amber-500" : "text-[#cbd5e1]"} />
                                                ))}
                                            </div>
                                            <span className="text-xs font-semibold text-slate-600">{ratingStats.total} avis</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {userId ? (
                                isEnrolled ? (
                                    <div className="space-y-4 rounded-xl border border-slate-200 p-4 md:p-5">
                                        <h3 className="text-base font-bold text-slate-900">Laisser un avis</h3>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span id="rating-label" className="text-sm font-semibold text-slate-700">Votre note :</span>
                                            <div className="flex gap-1" role="radiogroup" aria-labelledby="rating-label">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        role="radio"
                                                        aria-checked={userRating.rating === s}
                                                        aria-label={`${s} sur 5`}
                                                        title={`${s} sur 5`}
                                                        onClick={() => setUserRating(prev => ({ ...prev, rating: s }))}
                                                        className={`flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-amber-50 ${focusRing}`}
                                                    >
                                                        <Star
                                                            size={26}
                                                            aria-hidden="true"
                                                            className={s <= userRating.rating ? "fill-amber-500 text-amber-500" : "text-[#cbd5e1]"}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="rating-comment" className="site-label">Commentaire <span className="font-normal text-slate-500">(optionnel)</span></label>
                                            <textarea
                                                id="rating-comment"
                                                placeholder="Partagez votre expérience avec cette formation..."
                                                value={userRating.comment}
                                                onChange={(e) => setUserRating(prev => ({ ...prev, comment: e.target.value }))}
                                                className="site-input min-h-[110px]"
                                            />
                                        </div>
                                        <button
                                            onClick={submitRating}
                                            disabled={submittingRating || userRating.rating === 0}
                                            title={userRating.rating === 0 ? 'Choisissez une note pour publier votre avis' : undefined}
                                            className={`site-btn-primary ${focusRing}`}
                                        >
                                            {submittingRating ? "Envoi..." : "Publier mon avis"}
                                        </button>
                                        {userRating.rating === 0 && (
                                            <p className="text-xs text-slate-500">Sélectionnez une note de 1 à 5 étoiles pour publier.</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
                                        <AlertCircle size={20} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-bold text-amber-900">Avis réservé aux inscrits</h3>
                                            <p className="text-sm leading-relaxed text-amber-900/80">
                                                Vous devez avoir validé votre inscription à cette formation pour pouvoir laisser un avis et partager votre expérience.
                                            </p>
                                        </div>
                                    </div>
                                )
                            ) : null}

                            {ratings.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {ratings.map((r, i) => (
                                        <div key={i} className="space-y-3 rounded-xl border border-slate-200 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold uppercase text-brand-blue">
                                                        {r.profiles?.full_name?.charAt(0) || 'E'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-bold text-slate-900">{r.profiles?.full_name || 'Étudiant'}</div>
                                                        <div className="text-xs tabular-nums text-slate-500">Posté le {new Date(r.created_at).toLocaleDateString('fr-FR')}</div>
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 gap-0.5" aria-label={`${r.rating} sur 5`}>
                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                        <Star key={s} size={13} aria-hidden="true" className={s <= r.rating ? "fill-amber-500 text-amber-500" : "text-[#cbd5e1]"} />
                                                    ))}
                                                </div>
                                            </div>
                                            {r.comment && (
                                                <p className="text-sm leading-relaxed text-slate-700">
                                                    “{r.comment}”
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="rounded-xl bg-site-muted py-10 text-center">
                                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-500 ring-1 ring-inset ring-slate-200">
                                        <MessageSquare size={18} aria-hidden="true" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-700">Soyez le premier à donner votre avis !</p>
                                </div>
                            )}
                        </section>

                        <div className="lg:hidden">{helpBox}</div>
                    </div>

                    {/* Right Column: Sessions Sidebar (desktop) */}
                    <aside className="hidden lg:col-span-1 lg:block">
                        <div className="space-y-6 lg:sticky lg:top-28">
                            <div className="site-card p-6 shadow-[var(--shadow-lift)]">
                                <p className={`mb-2 ${sectionTitle}`}>Prix de la formation</p>
                                {priceBlock('lg')}
                                <button
                                    onClick={() => bookSession()}
                                    className={`site-btn-primary mt-5 w-full ${focusRing}`}
                                >
                                    Réserver ma place <ChevronRight size={18} aria-hidden="true" />
                                </button>
                                <p className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-600">
                                    <ShieldCheck size={14} className="shrink-0 text-emerald-600" aria-hidden="true" /> Sans acompte · paiement plus tard
                                </p>
                            </div>

                            {sessionsCard}

                            {helpBox}
                        </div>
                    </aside>
                </div>
            </div>

            {/* Sticky booking bar (mobile/tablet) */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-[#ffffffF2] px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
                <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-500">
                            {nextSession
                                ? `Prochaine session · ${new Date(nextSession.start).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}`
                                : 'Prix de la formation'}
                        </p>
                        {priceBlock('sm')}
                    </div>
                    <button
                        onClick={() => bookSession()}
                        className={`site-btn-primary shrink-0 px-5 ${focusRing}`}
                    >
                        Réserver <ChevronRight size={16} aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    );
}
