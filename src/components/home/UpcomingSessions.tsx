"use client";

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Calendar, Users, ArrowRight, CalendarX } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { supabase } from '@/lib/supabase';

const UpcomingSessions = () => {
    const { t, language } = useLanguage();
    const [sessions, setSessions] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchSessions = async () => {
            try {
                // Fetch sessions with counts via RPC v2
                const { data, error } = await supabase
                    .rpc('get_course_sessions_v2', {});

                if (error) {
                    console.error('UpcomingSessions RPC Error:', error);
                    throw error;
                }
                // Riverside: Updated to parameterized RPC.

                // Count both pending and approved reservations because both
                // temporarily occupy a place until the admin rejects them.
                const sessionIds = data.map((s: any) => s.id);
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

                // Now we need the course details for these sessions
                const { data: coursesData, error: coursesError } = await supabase
                    .from('courses')
                    .select('id, title_fr, title_en, base_price, sold_price, image_url, category')
                    .in('id', data.map((s: any) => s.course_id));

                if (coursesError) throw coursesError;

                // Map courses for easy lookup
                const courseMap = (coursesData || []).reduce((acc: any, c: any) => {
                    acc[c.id] = c;
                    return acc;
                }, {});

                const todayStr = new Date().toISOString().split('T')[0];

                const formattedSessions = data
                    .filter((s: any) => courseMap[s.course_id] && s.start_date >= todayStr)
                    .map((s: any) => {
                        const course = courseMap[s.course_id];
                        return {
                            id: course.id,
                            sessionId: s.id,
                            name: { fr: course.title_fr, en: course.title_en },
                            date: {
                                fr: new Date(s.start_date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
                                en: new Date(s.start_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
                            },
                            seats: Math.max(
                                0,
                                s.seats_available - (
                                    activeReservationsBySession.get(s.id)
                                    ?? Number(s.approved_enrollments_count || 0)
                                )
                            ),
                            price: course.sold_price ? `${course.sold_price} DT` : `${course.base_price} DT`,
                            oldPrice: course.sold_price ? `${course.base_price} DT` : null,
                            image: course.image_url,
                            category: course.category === 'Software'
                                ? 'Logiciel'
                                : course.category === 'Hardware' ? 'Matériel' : course.category
                        };
                    })
                    .sort((a: any, b: any) => new Date(a.date.en).getTime() - new Date(b.date.en).getTime())
                    .slice(0, 3);

                setSessions(formattedSessions);
            } catch (err) {
                console.error('Error fetching sessions:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSessions();
    }, []);

    return (
        <section className="bg-slate-50 py-16 md:py-24">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="mb-10 flex flex-col justify-between gap-6 md:mb-14 md:flex-row md:items-end">
                    <div className="max-w-2xl">
                        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                            <span className="h-[2px] w-8 bg-brand-blue"></span>
                            {t.nav.formations}
                        </div>
                        <h2 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-900 md:text-4xl">
                            {t.sessions.upcoming}
                        </h2>
                        <p className="text-base leading-relaxed text-slate-600">
                            Ne manquez pas nos prochaines sessions. Les places sont limitées pour garantir une formation personnalisée de haute qualité avec nos ingénieurs experts.
                        </p>
                    </div>
                    <Link
                        href="/formations"
                        className="group inline-flex h-11 w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-900 shadow-sm transition hover:border-brand-blue/40 hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
                    >
                        {t.common.seeMore}
                        <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {loading ? (
                        [0, 1, 2].map((i) => (
                            <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-hidden="true">
                                <div className="aspect-[16/10] animate-pulse bg-slate-100" />
                                <div className="space-y-3 p-5 md:p-6">
                                    <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                                    <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
                                    <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
                                </div>
                            </div>
                        ))
                    ) : sessions.length > 0 ? (
                        sessions.map((session, index) => {
                            const isFull = session.seats <= 0;
                            const isLow = !isFull && session.seats <= 5;
                            return (
                                <motion.article
                                    key={session.sessionId}
                                    initial={{ opacity: 0, y: 10 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: Math.min(index * 0.03, 0.12), duration: 0.3 }}
                                    className="premium-card group relative flex h-full flex-col overflow-hidden bg-white"
                                >
                                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                                        {session.image && (
                                            <img
                                                src={session.image}
                                                alt={session.name[language]}
                                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                loading="lazy"
                                            />
                                        )}
                                        {session.category && (
                                            <span className="absolute top-4 left-4 inline-flex items-center rounded-full bg-[#ffffffee] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-900 shadow-sm">
                                                {session.category}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-grow flex-col p-5 md:p-6">
                                        <div className="mb-3 flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold tabular-nums text-sky-800">
                                                <Calendar size={13} />
                                                {session.date[language]}
                                            </span>
                                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${isFull
                                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                                : isLow
                                                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                                                    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                }`}>
                                                <Users size={13} />
                                                {isFull ? 'Complet' : <><span className="tabular-nums">{session.seats}</span> {t.sessions.seatsLeft}</>}
                                            </span>
                                        </div>

                                        <h3 className="mb-5 text-lg font-bold leading-snug text-slate-900 md:text-xl">
                                            <Link href={`/formations/${session.id}`} className="transition-colors hover:text-brand-blue focus-visible:outline-none focus-visible:underline">
                                                {session.name[language]}
                                            </Link>
                                        </h3>

                                        <div className="mt-auto flex items-end justify-between gap-4 border-t border-slate-200 pt-5">
                                            <div className="flex min-w-0 flex-col">
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Frais de formation</span>
                                                <div className="flex flex-wrap items-baseline gap-x-2">
                                                    <span className="text-xl font-black tabular-nums text-slate-900">{session.price}</span>
                                                    {session.oldPrice && (
                                                        <span className="text-sm font-semibold tabular-nums text-slate-500 line-through">{session.oldPrice}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <Link
                                                href={`/formations/${session.id}`}
                                                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-brand-green px-4 text-sm font-bold text-black transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
                                                aria-label={`${t.sessions.book} : ${session.name[language]}`}
                                            >
                                                Réserver <ArrowRight size={16} />
                                            </Link>
                                        </div>
                                    </div>
                                </motion.article>
                            );
                        })
                    ) : (
                        <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
                            <CalendarX size={36} className="mx-auto mb-3 text-[#cbd5e1]" />
                            <p className="font-semibold text-slate-900">Aucune session disponible pour le moment.</p>
                            <p className="mt-1 text-sm text-slate-600">Consultez nos formations et demandez l&apos;ouverture d&apos;une session.</p>
                            <Link href="/formations" className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-brand-green px-4 text-sm font-bold text-black hover:brightness-95">
                                {t.hero.cta} <ArrowRight size={16} />
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default UpcomingSessions;
