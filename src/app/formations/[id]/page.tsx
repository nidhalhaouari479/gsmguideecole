"use client";

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
                alert('Merci pour votre message !');
            }
        } catch (err) {
            console.error('Error submitting rating:', err);
        } finally {
            setSubmittingRating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-slate-50" role="status">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-blue border-t-transparent"></div>
                <p className="text-sm font-medium text-slate-600">Chargement de la formation...</p>
            </div>
        );
    }

    if (!formation) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center bg-slate-50 px-4 text-center">
                <BookOpen size={40} className="mb-4 text-[#cbd5e1]" />
                <h2 className="mb-2 text-2xl font-black text-slate-900">Formation introuvable</h2>
                <p className="mb-6 text-sm text-slate-600">Cette formation n&apos;existe pas ou n&apos;est plus disponible.</p>
                <button onClick={() => router.push('/formations')} className="inline-flex h-11 items-center rounded-xl bg-brand-green px-5 text-sm font-bold text-black hover:brightness-95">Retour aux formations</button>
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
                    <span className={`${size === 'lg' ? 'text-3xl md:text-4xl' : 'text-xl'} font-black tabular-nums text-slate-900`}>{formation.sold_price} DT</span>
                    <span className={`${size === 'lg' ? 'text-lg' : 'text-sm'} font-semibold tabular-nums text-slate-500 line-through`}>{formation.base_price} DT</span>
                </>
            ) : (
                <span className={`${size === 'lg' ? 'text-3xl md:text-4xl' : 'text-xl'} font-black tabular-nums text-slate-900`}>{formation.base_price} DT</span>
            )}
        </div>
    );

    const sessionsCard = (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-slate-900">Toutes les sessions</h3>
                <span className="text-xs font-semibold tabular-nums text-slate-500">{formation.sessions.length} session{formation.sessions.length > 1 ? 's' : ''}</span>
            </div>
            {formation.sessions.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                    <Calendar size={28} className="mx-auto mb-2 text-[#cbd5e1]" />
                    <p className="text-sm font-semibold text-slate-900">Aucune session programmée</p>
                    <p className="mt-1 text-xs text-slate-600">Réservez pour demander l&apos;ouverture d&apos;une nouvelle session.</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {formation.sessions.map((s: any, i: number) => {
                        const open = isSessionOpen(s);
                        const full = s.seats <= 0;
                        return (
                            <li
                                key={i}
                                className={`rounded-xl border p-4 transition-colors ${open ? 'border-slate-200 hover:border-brand-blue/40' : 'border-slate-200 bg-slate-50'}`}
                            >
                                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                                    <div className={`font-bold tabular-nums ${open ? 'text-slate-900' : 'text-slate-500'}`}>
                                        {new Date(s.start).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' })} – {new Date(s.end).toLocaleDateString(dateLocale, { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                    {open ? (
                                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${full
                                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                                            : s.seats <= 5
                                                ? 'border-amber-200 bg-amber-50 text-amber-800'
                                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                            }`}>
                                            <span className={`h-1.5 w-1.5 rounded-full ${full ? 'bg-rose-500' : s.seats <= 5 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                            {full ? 'Complet' : <><span className="tabular-nums">{s.seats}</span> {t.sessions.seatsLeft}</>}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                            Terminée
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2 text-sm text-slate-600">
                                        <Clock size={14} className="shrink-0 text-brand-blue" />
                                        <span className="truncate">{scheduleLabel(s.schedule)}</span>
                                    </div>
                                    {open && !full && (
                                        <button
                                            type="button"
                                            onClick={() => bookSession(s.id)}
                                            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-brand-green px-3 text-xs font-bold text-black transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-1"
                                        >
                                            Réserver <ChevronRight size={14} />
                                        </button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}

            <div className="mt-5 flex items-start gap-3 rounded-xl bg-sky-50 p-4">
                <AlertCircle size={18} className="mt-0.5 shrink-0 text-sky-700" />
                <p className="text-xs leading-relaxed text-sky-900">
                    Remarque : vous pouvez réserver votre place sans acompte et effectuer le paiement plus tard depuis votre espace étudiant.
                </p>
            </div>
        </div>
    );

    const helpBox = (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                <h4 className="mb-1 text-lg font-bold text-slate-900">Besoin d&apos;aide ?</h4>
                <p className="mb-4 text-sm text-slate-600">Parlez à notre conseiller en carrière avant de vous inscrire.</p>
                <Link
                    href="/#contact"
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                >
                    <MessageSquare size={16} className="text-brand-blue" /> Support WhatsApp
                </Link>
            </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 pb-28 lg:pb-24">
            {/* Hero Section */}
            {/* Explicit hex text colors: the public site runs under data-theme="light", which forces `.text-white` to dark. */}
            <div className="relative flex min-h-[400px] w-full items-end overflow-hidden bg-[#0b1220] md:min-h-[460px]">
                {formation.image && (
                    <img src={formation.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b1220] via-[#0b1220cc] to-[#0b122033]" />

                <div className="container relative mx-auto px-4 pt-10 pb-24 sm:px-6 md:pb-28">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <button
                            onClick={() => router.back()}
                            className="mb-6 inline-flex h-10 items-center gap-2 rounded-xl border border-[#ffffff33] bg-[#ffffff1a] px-3.5 text-sm font-semibold text-[#fff] backdrop-blur-md transition-colors hover:bg-[#ffffff33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fff]"
                        >
                            <ArrowLeft size={18} /> {t.common.back}
                        </button>

                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap gap-2">
                                <span className="inline-flex w-fit items-center gap-2 rounded-full bg-brand-green px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-black">
                                    <BookOpen size={13} /> Meilleure vente
                                </span>
                                {formation.category && (
                                    <span className="inline-flex w-fit items-center rounded-full border border-[#ffffff4d] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#fff]">
                                        {formation.category}
                                    </span>
                                )}
                                {formation.level && (
                                    <span className="inline-flex w-fit items-center rounded-full border border-[#ffffff4d] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#fff]">
                                        {formation.level}
                                    </span>
                                )}
                            </div>
                            <h1 className="max-w-4xl text-3xl font-black leading-tight tracking-tight text-[#fff] md:text-5xl">
                                {formation.title[language]}
                            </h1>
                            {ratingStats.total > 0 && (
                                <div className="flex items-center gap-2" aria-label={`Note ${ratingStats.average} sur 5, ${ratingStats.total} avis`}>
                                    <div className="flex items-center gap-0.5">
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

            <div className="container relative z-10 mx-auto -mt-16 px-4 sm:px-6 md:-mt-20">
                {/* Key facts */}
                <dl className="mb-8 grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg md:grid-cols-4 md:gap-0 md:divide-x md:divide-slate-200 md:p-0">
                    {[
                        { icon: Clock, label: 'Durée', value: formation.duration || '—' },
                        { icon: Award, label: 'Formateur', value: formation.instructor || 'Ing. Academy' },
                        { icon: Calendar, label: 'Prochaine session', value: nextSession ? new Date(nextSession.start).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sur demande' },
                        { icon: Users, label: 'Taille de la classe', value: '12 Personnes' },
                    ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex min-w-0 items-center gap-3 md:p-5">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                                <Icon size={18} />
                            </div>
                            <div className="min-w-0">
                                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</dt>
                                <dd className="truncate text-sm font-bold text-slate-900 md:text-base">{value}</dd>
                            </div>
                        </div>
                    ))}
                </dl>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:gap-10">
                    {/* Left Column: Info */}
                    <div className="space-y-10 lg:col-span-2 md:space-y-12">
                        {/* Summary Card */}
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-8" aria-labelledby="pricing-title">
                            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
                                <div className="max-w-md">
                                    <p id="pricing-title" className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Investissement</p>
                                    {priceBlock('lg')}
                                    {formation.sold_price && (
                                        <span className="mt-2 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                                            Économisez <span className="mx-1 tabular-nums">{Number(formation.base_price) - Number(formation.sold_price)} DT</span>
                                        </span>
                                    )}
                                    <p className="mt-3 text-sm text-slate-600">Les frais complets du cours incluent toutes les taxes et les supports de formation.</p>
                                </div>
                                <button
                                    onClick={() => bookSession()}
                                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-8 text-base font-bold text-black shadow-lg shadow-brand-green/25 transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 md:w-auto"
                                >
                                    Réserver ma place <ChevronRight size={18} />
                                </button>
                            </div>
                            <div className="mt-6 flex items-start gap-3 border-t border-slate-200 pt-5 text-sm text-slate-600">
                                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                                <span>Réservation possible sans acompte. Le paiement pourra être effectué plus tard.</span>
                            </div>
                        </section>

                        {/* Sessions (mobile/tablet: shown early for conversion) */}
                        <div className="lg:hidden">{sessionsCard}</div>

                        <section className="space-y-4">
                            <h2 className="flex items-center gap-3 text-xl font-black text-slate-900 md:text-2xl">
                                <span className="h-6 w-1.5 rounded-full bg-brand-blue"></span>
                                Aperçu du cours
                            </h2>
                            <div
                                dir="auto"
                                className="course-rich-text max-w-3xl break-words text-start text-base leading-relaxed text-slate-700 [unicode-bidi:plaintext] [&_a]:text-brand-blue [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-brand-green [&_blockquote]:pl-4 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-black [&_h1]:text-slate-900 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-slate-900 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-900 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-7 [&_p]:mb-4 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-7 [&_li]:mb-1"
                                dangerouslySetInnerHTML={{ __html: sanitizeCourseHtml(formation.longDesc[language]) }}
                            />
                        </section>

                        {formation.learning.length > 0 && (
                            <section className="space-y-4">
                                <h2 className="flex items-center gap-3 text-xl font-black text-slate-900 md:text-2xl">
                                    <span className="h-6 w-1.5 rounded-full bg-brand-green"></span>
                                    Programme du cours
                                    <span className="ml-1 text-sm font-semibold tabular-nums text-slate-500">({formation.learning.length} modules)</span>
                                </h2>
                                <ol className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                    {formation.learning.map((item: any, idx: number) => (
                                        <li
                                            key={item.id}
                                            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-brand-blue/40"
                                        >
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-sm font-black tabular-nums text-brand-blue">
                                                {idx + 1}
                                            </span>
                                            <span
                                                dir="auto"
                                                className="pt-1 text-start text-sm font-semibold text-slate-800 [unicode-bidi:plaintext]"
                                            >
                                                {item.content}
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </section>
                        )}

                        <section className="space-y-6 rounded-2xl border border-brand-blue/15 bg-brand-blue/5 p-5 md:p-8">
                            <h2 className="text-xl font-black text-slate-900 md:text-2xl">Avantages inclus</h2>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
                                    <div className="w-fit rounded-xl bg-sky-50 p-2.5 text-sky-700"><ShieldCheck size={24} /></div>
                                    <h3 className="font-bold text-slate-900">Diplôme officiel</h3>
                                    <p className="text-sm text-slate-600">Certificat reconnu pour lancer votre propre activité.</p>
                                </div>
                                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
                                    <div className="w-fit rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><Users size={24} /></div>
                                    <h3 className="font-bold text-slate-900">Ateliers quotidiens</h3>
                                    <p className="text-sm text-slate-600">90 % d’apprentissage pratique dans nos ateliers modernes.</p>
                                </div>
                                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
                                    <div className="w-fit rounded-xl bg-orange-50 p-2.5 text-orange-700"><Award size={24} /></div>
                                    <h3 className="font-bold text-slate-900">Accompagnement professionnel</h3>
                                    <p className="text-sm text-slate-600">Aide à l’emploi et accès permanent à notre communauté.</p>
                                </div>
                            </div>
                            <ul className="grid grid-cols-1 gap-3 border-t border-brand-blue/15 pt-5 md:grid-cols-2">
                                <li className="flex items-center gap-3 text-sm font-semibold text-slate-800">
                                    <CheckCircle className="shrink-0 text-emerald-600" size={18} />
                                    <span>Boîte à outils offerte à chaque étudiant</span>
                                </li>
                                <li className="flex items-center gap-3 text-sm font-semibold text-slate-800">
                                    <CheckCircle className="shrink-0 text-emerald-600" size={18} />
                                    <span>Utilisation de matériel de diagnostic moderne</span>
                                </li>
                            </ul>
                        </section>

                        {/* Ratings & Reviews Section */}
                        <section className="space-y-6">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <h2 className="flex items-center gap-3 text-xl font-black text-slate-900 md:text-2xl">
                                    <span className="h-6 w-1.5 rounded-full bg-amber-500"></span>
                                    Avis des étudiants
                                </h2>
                                {ratingStats.total > 0 && (
                                    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2">
                                        <div className="text-2xl font-black tabular-nums text-slate-900">{ratingStats.average}</div>
                                        <div className="flex flex-col">
                                            <div className="flex gap-0.5">
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
                                    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                                        <h3 className="text-lg font-bold text-slate-900">Laisser un avis</h3>
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
                                                        className="flex h-10 w-10 items-center justify-center rounded-lg transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                                                    >
                                                        <Star
                                                            size={26}
                                                            className={s <= userRating.rating ? "fill-amber-500 text-amber-500" : "text-[#cbd5e1]"}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="rating-comment" className="mb-1.5 block text-sm font-semibold text-slate-900">Commentaire <span className="font-normal text-slate-500">(optionnel)</span></label>
                                            <textarea
                                                id="rating-comment"
                                                placeholder="Partagez votre expérience avec cette formation..."
                                                value={userRating.comment}
                                                onChange={(e) => setUserRating(prev => ({ ...prev, comment: e.target.value }))}
                                                className="min-h-[100px] w-full rounded-xl border border-slate-200 bg-white p-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                                            />
                                        </div>
                                        <button
                                            onClick={submitRating}
                                            disabled={submittingRating || userRating.rating === 0}
                                            title={userRating.rating === 0 ? 'Choisissez une note pour publier votre avis' : undefined}
                                            className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-green px-6 text-sm font-bold text-black transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {submittingRating ? "Envoi..." : "Publier mon avis"}
                                        </button>
                                        {userRating.rating === 0 && (
                                            <p className="text-xs text-slate-500">Sélectionnez une note de 1 à 5 étoiles pour publier.</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                                        <AlertCircle size={22} className="mt-0.5 shrink-0 text-amber-700" />
                                        <div className="space-y-1">
                                            <h3 className="font-bold text-amber-900">Avis réservé aux inscrits</h3>
                                            <p className="text-sm leading-relaxed text-amber-900/80">
                                                Vous devez avoir validé votre inscription à cette formation pour pouvoir laisser un avis et partager votre expérience.
                                            </p>
                                        </div>
                                    </div>
                                )
                            ) : null}

                            {ratings.length > 0 ? (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {ratings.map((r, i) => (
                                        <div key={i} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold uppercase text-slate-700">
                                                        {r.profiles?.full_name?.charAt(0) || 'E'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="truncate text-sm font-bold text-slate-900">{r.profiles?.full_name || 'Étudiant'}</div>
                                                        <div className="text-xs tabular-nums text-slate-500">Posté le {new Date(r.created_at).toLocaleDateString('fr-FR')}</div>
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 gap-0.5" aria-label={`${r.rating} sur 5`}>
                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                        <Star key={s} size={13} className={s <= r.rating ? "fill-amber-500 text-amber-500" : "text-[#cbd5e1]"} />
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
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-10 text-center">
                                    <MessageSquare size={32} className="mx-auto mb-3 text-[#cbd5e1]" />
                                    <p className="text-sm font-semibold text-slate-700">Soyez le premier à donner votre avis !</p>
                                </div>
                            )}
                        </section>

                        <div className="lg:hidden">{helpBox}</div>
                    </div>

                    {/* Right Column: Sessions Sidebar (desktop) */}
                    <aside className="hidden lg:col-span-1 lg:block">
                        <div className="sticky top-32 space-y-6">
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                                <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Prix de la formation</p>
                                {priceBlock('lg')}
                                <button
                                    onClick={() => bookSession()}
                                    className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-6 text-base font-bold text-black transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
                                >
                                    Réserver ma place <ChevronRight size={18} />
                                </button>
                                <p className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                                    <ShieldCheck size={14} className="shrink-0 text-emerald-600" /> Sans acompte · paiement plus tard
                                </p>
                            </div>

                            {sessionsCard}

                            {helpBox}
                        </div>
                    </aside>
                </div>
            </div>

            {/* Sticky booking bar (mobile/tablet) */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
                <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            {nextSession
                                ? `Prochaine session · ${new Date(nextSession.start).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}`
                                : 'Prix de la formation'}
                        </p>
                        {priceBlock('sm')}
                    </div>
                    <button
                        onClick={() => bookSession()}
                        className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-green px-5 text-sm font-bold text-black transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
                    >
                        Réserver <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
