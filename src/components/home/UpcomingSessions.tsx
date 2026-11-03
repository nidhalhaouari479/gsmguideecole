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
        <section className="site-section bg-white">
            <div className="site-container">
                <div className="mb-10 flex flex-col justify-between gap-6 md:mb-14 md:flex-row md:items-end">
                    <div className="max-w-2xl">
                        <p className="site-eyebrow mb-4">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-green" aria-hidden="true" />
                            {t.nav.formations}
                        </p>
                        <h2 className="site-title mb-4">
                            {t.sessions.upcoming}
                        </h2>
                        <p className="site-lead">
                            Ne manquez pas nos prochaines sessions. Les places sont limitées pour garantir une formation personnalisée de haute qualité avec nos ingénieurs experts.
                        </p>
                    </div>
                    <Link
                        href="/formations"
                        className="site-btn-secondary group w-fit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2"
                    >
                        {t.common.seeMore}
                        <ArrowRight size={18} aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                    {loading ? (
                        [0, 1, 2].map((i) => (
                            <div key={i} className="site-card overflow-hidden" aria-hidden="true">
                                <div className="aspect-[16/10] animate-pulse bg-slate-50" />
                                <div className="space-y-3 p-5 md:p-6">
                                    <div className="h-3 w-24 animate-pulse rounded-full bg-slate-50 ring-1 ring-inset ring-slate-200" />
                                    <div className="h-5 w-3/4 animate-pulse rounded-md bg-slate-50 ring-1 ring-inset ring-slate-200" />
                                    <div className="h-12 w-full animate-pulse rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200" />
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
                                    className="site-card site-card-hover group relative flex h-full flex-col overflow-hidden"
                                >
                                    <div className="relative aspect-[16/10] overflow-hidden bg-slate-50">
                                        {session.image && (
                                            <img
                                                src={session.image}
                                                alt={session.name[language]}
                                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                                                loading="lazy"
                                            />
                                        )}
                                        {session.category && (
                                            <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-[#ffffffee] px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-[var(--shadow-card)] ring-1 ring-inset ring-slate-200 backdrop-blur-sm">
                                                {session.category}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-grow flex-col p-5 md:p-6">
                                        <div className="mb-3 flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold tabular-nums text-brand-blue-dark ring-1 ring-inset ring-brand-blue/20">
                                                <Calendar size={13} aria-hidden="true" />
                                                {session.date[language]}
                                            </span>
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${isFull
                                                ? 'bg-rose-50 text-rose-700 ring-rose-200'
                                                : isLow
                                                    ? 'bg-amber-50 text-amber-700 ring-amber-200'
                                                    : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                }`}>
                                                <Users size={13} aria-hidden="true" />
                                                {isFull ? 'Complet' : <><span className="tabular-nums">{session.seats}</span> {t.sessions.seatsLeft}</>}
                                            </span>
                                        </div>

                                        <h3 className="mb-5 text-lg font-bold leading-snug tracking-tight text-slate-900">
                                            <Link href={`/formations/${session.id}`} className="rounded-sm transition-colors duration-200 hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2">
                                                {session.name[language]}
                                            </Link>
                                        </h3>

                                        <div className="mt-auto flex items-end justify-between gap-4 border-t border-slate-100 pt-5">
                                            <div className="flex min-w-0 flex-col">
                                                <span className="text-xs font-semibold text-slate-500">Frais de formation</span>
                                                <div className="flex flex-wrap items-baseline gap-x-2">
                                                    <span className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900">{session.price}</span>
                                                    {session.oldPrice && (
                                                        <span className="text-sm font-medium tabular-nums text-slate-400 line-through">{session.oldPrice}</span>
                                                    )}
                                                </div>
                                            </div>
                                            <Link
                                                href={`/formations/${session.id}`}
                                                className="site-btn-primary shrink-0 px-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2"
                                                aria-label={`${t.sessions.book} : ${session.name[language]}`}
                                            >
                                                Réserver <ArrowRight size={16} aria-hidden="true" />
                                            </Link>
                                        </div>
                                    </div>
                                </motion.article>
                            );
                        })
                    ) : (
                        <div className="site-card col-span-full border-dashed px-6 py-12 text-center">
                            <div className="site-icon-tile mx-auto mb-4 bg-slate-400">
                                <CalendarX size={22} aria-hidden="true" />
                            </div>
                            <p className="font-semibold text-slate-900">Aucune session disponible pour le moment.</p>
                            <p className="mt-1 text-sm text-slate-600">Consultez nos formations et demandez l&apos;ouverture d&apos;une session.</p>
                            <Link href="/formations" className="site-btn-primary mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2">
                                {t.hero.cta} <ArrowRight size={16} aria-hidden="true" />
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default UpcomingSessions;
