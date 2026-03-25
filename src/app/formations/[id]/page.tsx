"use client";

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { motion } from 'framer-motion';
import {
    Clock, Tag, Calendar, Users, BookOpen,
    CheckCircle2,
    CheckCircle,
    ArrowLeft,
    ShieldCheck, Award, AlertCircle,
    Star, StarOff, MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

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
                    .select('*, professeurs(nom, prenom)')
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
                        category: course.category,
                        level: course.level,
                        // Learning outcomes
                        learning: [
                            { fr: "Diagnostic complet hardware iPhone & Android", en: "Complete iPhone & Android hardware diagnosis" },
                            { fr: "Changement de vitre et écrans (tous modèles)", en: "Glass and screen replacement (all models)" },
                            { fr: "Soudure de connecteurs de charge et petits composants", en: "Soldering of charging ports and small components" },
                            { fr: "Flashage, déblocage et restauration système", en: "Flashing, unlocking, and system restoration" }
                        ],
                        sessions: (sessionsWithCounts || [])
                            .sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
                            .map((s: any) => {
                                return {
                                    id: s.id,
                                    start: s.start_date,
                                    end: s.end_date,
                                    schedule: s.schedule || "Full Time",
                                    seats: Math.max(0, s.seats_available - Number(s.approved_enrollments_count || 0))
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
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="w-16 h-16 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!formation) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
                <h2 className="text-2xl font-bold mb-4">Formation not found</h2>
                <button onClick={() => router.push('/formations')} className="btn-primary px-6 py-2">Back to Formations</button>
            </div>
        );
    }

    return (
        <div className="pb-32 bg-slate-50 dark:bg-slate-950 min-h-screen">
            {/* Hero Section */}
            <div className="relative h-[500px] w-full overflow-hidden">
                <img src={formation.image} alt={formation.title[language]} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />

                <div className="absolute inset-0 flex items-end">
                    <div className="container mx-auto px-6 pb-16">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <button
                                onClick={() => router.back()}
                                className="flex items-center gap-2 text-white/70 hover:text-white mb-8 transition-colors bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 w-fit"
                            >
                                <ArrowLeft size={18} /> {t.common.back}
                            </button>

                            <div className="flex flex-col gap-4">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-blue/20 backdrop-blur-md text-brand-blue border border-brand-blue/30 font-bold text-xs uppercase tracking-widest w-fit">
                                    <BookOpen size={14} /> Best Seller
                                </div>
                                <h1 className="text-4xl md:text-6xl font-black text-white leading-tight max-w-4xl tracking-tight">
                                    {formation.title[language]}
                                </h1>
                                {ratingStats.total > 0 && (
                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star
                                                    key={s}
                                                    size={16}
                                                    className={s <= Math.round(ratingStats.average) ? "fill-brand-green text-brand-green" : "text-slate-400"}
                                                />
                                            ))}
                                        </div>
                                        <span className="text-white font-bold">{ratingStats.average}</span>
                                        <span className="text-slate-400 text-sm">({ratingStats.total} avis)</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-4 mt-8">
                                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl text-white">
                                    <Clock size={20} className="text-brand-green" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold opacity-60">Duration</span>
                                        <span className="font-bold">{formation.duration}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl text-white">
                                    <Award size={20} className="text-brand-green" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold opacity-60">Formateur</span>
                                        <span className="font-bold">{formation.instructor || "Ing. Academy"}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl text-white">
                                    <Tag size={20} className="text-brand-green" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold opacity-60">Investissement</span>
                                        <div className="flex items-center gap-2">
                                            {formation.sold_price ? (
                                                <>
                                                    <span className="font-bold text-brand-green">{formation.sold_price} DT</span>
                                                    <span className="text-xs font-bold opacity-50 line-through">{formation.base_price} DT</span>
                                                </>
                                            ) : (
                                                <span className="font-bold">{formation.base_price} DT</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl text-white">
                                    <Users size={20} className="text-brand-green" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase font-bold opacity-60">Taille de la classe</span>
                                        <span className="font-bold">12 Personnes</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 mt-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Left Column: Info */}
                    <div className="lg:col-span-2 space-y-16">
                        {/* Summary Card */}
                        <section className="bg-white dark:bg-slate-800 p-10 rounded-3xl border border-border shadow-2xl shadow-slate-200/50 dark:shadow-none -mt-24 relative z-30">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                <div className="max-w-md">
                                    <div className="flex items-center gap-4 mb-2">
                                        {formation.sold_price ? (
                                            <>
                                                <div className="text-brand-green font-black text-4xl">{formation.sold_price} DT</div>
                                                <div className="text-slate-400 font-bold text-xl line-through opacity-50">{formation.base_price} DT</div>
                                            </>
                                        ) : (
                                            <div className="text-brand-blue font-black text-4xl">{formation.base_price} DT</div>
                                        )}
                                    </div>
                                    <p className="text-slate-500 font-medium">Les frais complets du cours incluent toutes les taxes et les supports de formation.</p>
                                </div>
                                <button
                                    onClick={() => bookSession()}
                                    className="btn-primary py-4 px-10 text-lg shadow-xl shadow-brand-blue/20"
                                >
                                    Réserver ma place
                                </button>
                            </div>
                            <div className="mt-8 pt-8 border-t border-border flex items-center gap-4 text-sm text-slate-400 font-medium">
                                <ShieldCheck size={18} className="text-brand-green" />
                                <span>Dépôt de 400 DT requis pour la réservation. Satisfaction garantie à 100 %.</span>
                            </div>
                        </section>

                        <section className="space-y-6">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                <span className="w-1.5 h-8 bg-brand-blue rounded-full"></span>
                                Aperçu du cours
                            </h2>
                            <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
                                {formation.longDesc[language]}
                            </p>
                        </section>

                        <section className="space-y-8">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                <span className="w-1.5 h-8 bg-brand-green rounded-full"></span>
                                Programme du cours
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {formation.learning.map((item: any, i: number) => (
                                    <motion.div
                                        key={i}
                                        whileHover={{ x: 5 }}
                                        className="flex items-center gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-border group hover:border-brand-blue transition-all shadow-sm"
                                    >
                                        <div className="bg-brand-blue/10 p-2 rounded-xl text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-colors">
                                            <CheckCircle2 size={24} />
                                        </div>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">{item[language]}</span>
                                    </motion.div>
                                ))}
                            </div>
                        </section>

                        <section className="space-y-8 bg-brand-blue/5 dark:bg-brand-blue/10 p-10 rounded-3xl border border-brand-blue/10">
                            <h2 className="text-3xl font-black text-brand-blue">Included Benefits</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="space-y-4 p-6 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl">
                                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500 w-fit"><ShieldCheck size={32} /></div>
                                    <h4 className="font-black text-lg">Official Diploma</h4>
                                    <p className="text-sm text-slate-500">Recognized certificate to start your own business.</p>
                                </div>
                                <div className="space-y-4 p-6 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl">
                                    <div className="p-3 bg-green-500/10 rounded-xl text-green-500 w-fit"><Users size={32} /></div>
                                    <h4 className="font-black text-lg">Daily Labs</h4>
                                    <p className="text-sm text-slate-500">90% practical learning in our modern lab ecosystem.</p>
                                </div>
                                <div className="space-y-4 p-6 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl">
                                    <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500 w-fit"><Award size={32} /></div>
                                    <h4 className="font-black text-lg">Career Boost</h4>
                                    <p className="text-sm text-slate-500">Job support and lifetime access to our community.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 pt-8 border-t border-brand-blue/10">
                                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 font-bold">
                                    <CheckCircle className="text-brand-green" size={20} />
                                    <span>Free toolkit for every student</span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400 font-bold">
                                    <CheckCircle className="text-brand-green" size={20} />
                                    <span>Modern diagnostic materials used</span>
                                </div>
                            </div>
                        </section>

                        {/* Ratings & Reviews Section */}
                        <section className="space-y-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                                    <span className="w-1.5 h-8 bg-amber-500 rounded-full"></span>
                                    Avis des étudiants
                                </h2>
                                {ratingStats.total > 0 && (
                                    <div className="flex items-center gap-4 bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl border border-border">
                                        <div className="text-3xl font-black text-slate-900 dark:text-white">{ratingStats.average}</div>
                                        <div className="flex flex-col">
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Star key={s} size={12} className={s <= Math.round(ratingStats.average) ? "fill-amber-500 text-amber-500" : "text-slate-300"} />
                                                ))}
                                            </div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400">{ratingStats.total} avis</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {userId ? (
                                isEnrolled ? (
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-border space-y-6 shadow-sm">
                                        <h4 className="font-bold text-lg">Laisser un avis</h4>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-medium text-slate-500 italic">Votre note :</span>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <button
                                                        key={s}
                                                        onClick={() => setUserRating(prev => ({ ...prev, rating: s }))}
                                                        className="transition-transform hover:scale-125 focus:outline-none"
                                                    >
                                                        <Star
                                                            size={28}
                                                            className={s <= userRating.rating ? "fill-amber-500 text-amber-500" : "text-slate-300 dark:text-slate-600"}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <textarea
                                            placeholder="Partagez votre expérience avec cette formation (optionnel)..."
                                            value={userRating.comment}
                                            onChange={(e) => setUserRating(prev => ({ ...prev, comment: e.target.value }))}
                                            className="w-full bg-slate-50 dark:bg-slate-900/50 border border-border rounded-2xl p-4 text-sm focus:ring-2 focus:ring-brand-blue outline-none min-h-[100px]"
                                        />
                                        <button
                                            onClick={submitRating}
                                            disabled={submittingRating || userRating.rating === 0}
                                            className="btn-primary py-3 px-8 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {submittingRating ? "Envoi..." : "Publier mon avis"}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-amber-50 dark:bg-amber-900/20 p-8 rounded-3xl border border-amber-200 dark:border-amber-800/30 flex items-start gap-4 shadow-sm">
                                        <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl text-amber-500 shadow-sm">
                                            <AlertCircle size={24} />
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-amber-900 dark:text-amber-400">Avis réservé aux inscrits</h4>
                                            <p className="text-sm text-amber-800 dark:text-amber-500/80 leading-relaxed font-medium">
                                                Vous devez avoir validé votre inscription à cette formation pour pouvoir laisser un avis et partager votre expérience.
                                            </p>
                                        </div>
                                    </div>
                                )
                            ) : null}

                            {ratings.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {ratings.map((r, i) => (
                                        <div key={i} className="bg-white dark:bg-slate-900 border border-border rounded-2xl p-6 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 uppercase">
                                                        {r.profiles?.full_name?.charAt(0) || 'E'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-sm">{r.profiles?.full_name || 'Étudiant'}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium">Posté le {new Date(r.created_at).toLocaleDateString()}</div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-0.5">
                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                        <Star key={s} size={12} className={s <= r.rating ? "fill-amber-500 text-amber-500" : "text-slate-200 dark:text-slate-700"} />
                                                    ))}
                                                </div>
                                            </div>
                                            {r.comment && (
                                                <p className="text-sm text-slate-600 dark:text-slate-400 italic leading-relaxed">
                                                    "{r.comment}"
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 bg-slate-100/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-border">
                                    <MessageSquare size={32} className="mx-auto mb-4 text-slate-300" />
                                    <p className="text-slate-500 font-bold text-sm italic">Soyez le premier à donner votre avis !</p>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right Column: Sessions Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-32 space-y-8">
                            <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-border shadow-2xl shadow-slate-200/50 dark:shadow-none overflow-hidden relative group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-blue/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />

                                <h3 className="text-2xl font-black mb-8 relative z-10">Toutes les sessions</h3>
                                <div className="space-y-6 relative z-10">
                                    {formation.sessions.map((s: any, i: number) => (
                                        <div
                                            key={i}
                                            className="p-6 border border-border rounded-2xl hover:border-brand-blue/50 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all group/item"
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="font-black text-slate-900 dark:text-white group-hover/item:text-brand-blue transition-colors">
                                                    {new Date(s.start).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { month: 'short', day: 'numeric' })} - {new Date(s.end).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${s.seats <= 5 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                    {s.seats} {t.sessions.seatsLeft}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                                    <Calendar size={14} className="text-brand-green" /> {(() => {
                                                        try {
                                                            const p = JSON.parse(s.schedule);
                                                            return p.label || s.schedule;
                                                        } catch (e) { return s.schedule; }
                                                    })()}
                                                </div>
                                                <div className={`text-xs font-bold px-3 py-1 rounded-lg ${new Date(s.start) < new Date() ? 'bg-slate-100 text-slate-500' : 'bg-brand-blue/10 text-brand-blue'}`}>
                                                    {new Date(s.start) < new Date() ? 'Terminée' : 'Ouverte'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-border flex items-start gap-4">
                                    <AlertCircle size={20} className="text-brand-blue shrink-0 mt-0.5" />
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                        Remarque : Un dépôt non remboursable de 400 DT est obligatoire pour finaliser votre inscription et réserver votre place.                                    </p>
                                </div>
                            </div>

                            {/* Help Box */}
                            <div className="bg-slate-900 text-white p-8 rounded-3xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
                                    <svg viewBox="0 0 100 100" className="w-full h-full"><circle cx="80" cy="20" r="40" fill="currentColor" /></svg>
                                </div>
                                <h4 className="text-lg font-bold mb-4 relative z-10">Besoin d'aide?</h4>
                                <p className="text-sm text-slate-400 mb-6 relative z-10 font-medium">Parlez à notre conseiller en carrière avant de vous inscrire.</p>
                                <Link
                                    href="/#contact"
                                    className="block w-full text-center py-3 bg-white text-slate-900 font-black rounded-2xl hover:bg-brand-green hover:text-white transition-colors relative z-10"
                                >
                                    Support WhatsApp
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
