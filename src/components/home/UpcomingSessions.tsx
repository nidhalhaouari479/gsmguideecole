"use client";

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Calendar, Users, ArrowRight } from 'lucide-react';
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

                // Now we need the course details for these sessions
                const sessionIds = data.map((s: any) => s.id);
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
                            seats: Math.max(0, s.seats_available - Number(s.approved_enrollments_count || 0)),
                            price: course.sold_price ? `${course.sold_price} DT` : `${course.base_price} DT`,
                            oldPrice: course.sold_price ? `${course.base_price} DT` : null,
                            image: course.image_url,
                            category: course.category
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
        <section className="py-32 bg-slate-50 dark:bg-slate-950">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row items-end justify-between mb-20 gap-8">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-2 text-brand-blue font-bold text-sm uppercase tracking-widest mb-4">
                            <span className="w-10 h-[2px] bg-brand-blue"></span>
                            {t.nav.formations}
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black mb-6 text-slate-900 dark:text-white leading-tight">
                            {t.sessions.upcoming}
                        </h2>
                        <p className="text-lg text-slate-600 dark:text-slate-400">
                            Ne manquez pas nos prochaines sessions. Les places sont limitées pour garantir une formation personnalisée de haute qualité avec nos ingénieurs experts.
                        </p>
                    </div>
                    <Link
                        href="/formations"
                        className="group flex items-center gap-3 text-brand-blue font-bold hover:gap-4 transition-all bg-white dark:bg-slate-900 px-8 py-4 rounded-2xl shadow-sm hover:shadow-md border border-border"
                    >
                        {t.common.seeMore}
                        <ArrowRight size={20} className="transition-transform" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {loading ? (
                        <div className="col-span-full py-20 text-center">
                            <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        </div>
                    ) : sessions.length > 0 ? (
                        sessions.map((session, index) => (
                            <motion.div
                                key={session.sessionId}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1, duration: 0.5 }}
                                whileHover={{ y: -12 }}
                                className="premium-card group relative flex flex-col h-full bg-white dark:bg-slate-900"
                            >
                                <div className="relative h-64 overflow-hidden">
                                    <img
                                        src={session.image}
                                        alt={session.name[language]}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />
                                    <div className="absolute top-6 left-6 flex flex-col gap-2">
                                        <div className="bg-brand-blue/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-white uppercase tracking-wider shadow-lg">
                                            {session.category}
                                        </div>
                                        <div className={`backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg inline-flex items-center gap-2 border ${session.seats <= 5
                                            ? 'bg-red-500/90 text-white border-red-400/50'
                                            : 'bg-green-500/90 text-white border-green-400/50'
                                            }`}>
                                            <Users size={12} />
                                            {session.seats} {t.sessions.seatsLeft}
                                        </div>
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-8">
                                        <Link
                                            href={`/formations/${session.id}`}
                                            className="w-full bg-white text-brand-blue py-3 rounded-xl font-bold flex items-center justify-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 shadow-xl"
                                        >
                                            Voir le détail <ArrowRight size={18} />
                                        </Link>
                                    </div>
                                </div>

                                <div className="p-8 flex flex-col flex-grow">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold mb-4">
                                        <Calendar size={14} className="text-brand-green" />
                                        <span>{session.date[language]}</span>
                                    </div>
                                    <h3 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white group-hover:text-brand-blue transition-colors leading-tight">
                                        {session.name[language]}
                                    </h3>

                                    <div className="mt-auto pt-6 border-t border-border flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Frais de formation</span>
                                            <div className="flex items-center gap-2">
                                                {session.oldPrice && (
                                                    <span className="text-sm font-bold text-slate-400 line-through">{session.oldPrice}</span>
                                                )}
                                                <span className="text-2xl font-black text-brand-blue">{session.price}</span>
                                            </div>
                                        </div>
                                        <Link
                                            href={`/formations/${session.id}`}
                                            className="btn-primary py-3 px-6 text-sm shadow-none group-hover:shadow-brand-blue/20 group-hover:shadow-lg"
                                        >
                                            {t.sessions.book}
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-border">
                            <p className="text-slate-500">Aucune session disponible pour le moment.</p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
};

export default UpcomingSessions;
