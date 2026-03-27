"use client";

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Clock, Tag, ChevronRight, Search, Star } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { supabase } from '@/lib/supabase';

export default function FormationsPage() {
    const { language, t } = useLanguage();
    const [formations, setFormations] = React.useState<any[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchFormations = async () => {
            try {
                // Fetch course details with instructor names from database
                const { data, error } = await supabase
                    .from('courses')
                    .select('*, professeurs(nom, prenom)')
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Supabase error detailed:', {
                        message: error.message,
                        details: error.details,
                        hint: error.hint,
                        code: error.code
                    });
                    throw error;
                }

                console.log('Data received:', data);

                // Fetch ratings for all courses via RPC v2
                const { data: ratingsData, error: ratingsError } = await supabase
                    .rpc('get_course_ratings_v2');
                // Riverside: Updated to v2 RPC.

                if (ratingsError) {
                    console.error('Error fetching ratings:', ratingsError);
                }

                // Group ratings by course_id
                const ratingStats: any = {};
                if (Array.isArray(ratingsData)) {
                    ratingsData.forEach((r: any) => {
                        ratingStats[r.course_id] = { 
                            total: r.total, 
                            average: r.average 
                        };
                    });
                }

                // Map Supabase data to the local format expected by the UI
                const formattedData = data ? data.map((course: any) => ({
                    id: course.id,
                    title: { fr: course.title_fr, en: course.title_en },
                    desc: { fr: course.description_fr, en: course.description_en },
                    duration: course.duration,
                    base_price: course.base_price,
                    sold_price: course.sold_price,
                    price: course.sold_price ? `${course.sold_price} DT` : `${course.base_price} DT`,
                    category: course.category,
                    image: course.image_url,
                    level: course.level,
                    instructor: course.professeurs 
                        ? `${course.professeurs.nom} ${course.professeurs.prenom}` 
                        : (course.instructor_name || 'Ing. Academy'),
                    rating: ratingStats[course.id]?.average || 0,
                    reviewCount: ratingStats[course.id]?.total || 0,
                })) : [];

                setFormations(formattedData);
            } catch (err) {
                console.error('Error fetching formations:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchFormations();
    }, []);

    return (
        <div className="pb-32 bg-slate-50 dark:bg-slate-950 min-h-screen">
            {/* Header - Light Theme as requested */}
            <section className="bg-white dark:bg-slate-950 text-slate-900 dark:text-white py-32 relative overflow-hidden border-b border-border">
                <div className="absolute top-0 right-0 w-1/2 h-full">
                    <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,var(--color-brand-green),transparent_70%)] opacity-10" />
                </div>
                <div className="container mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                        >
                            <h1 className="text-4xl xs:text-5xl md:text-7xl font-black mb-8 leading-tight">
                                Découvrez nos <br />
                                <span className="text-brand-blue">formations d’experts</span>
                            </h1>
                            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                                Transformez votre passion en une carrière professionnelle avec la première académie de réparation de smartphones en Tunisie. Des laboratoires pratiques, des ingénieurs experts et un accompagnement à vie.
                            </p>
                        </motion.div>

                        <div className="relative hidden lg:block h-[400px]">
                            {/* Animated Images Gallery */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                                animate={{ opacity: 1, scale: 1, rotate: -5 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className="absolute top-0 right-10 w-64 h-80 rounded-3xl overflow-hidden border-8 border-white dark:border-slate-800 shadow-2xl z-10"
                            >
                                <img src="/A3.jpg" className="w-full h-full object-cover" alt="Lab 1" />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
                                animate={{ opacity: 1, scale: 1, rotate: 5 }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                                className="absolute bottom-0 right-40 w-56 h-72 rounded-3xl overflow-hidden border-8 border-white dark:border-slate-800 shadow-2xl z-20"
                            >
                                <img src="/A2.jpg" className="w-full h-full object-cover" alt="Lab 2" />
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                                animate={{ opacity: 1, scale: 1, rotate: -10 }}
                                transition={{ duration: 0.8, delay: 0.6 }}
                                className="absolute top-20 right-64 w-48 h-60 rounded-3xl overflow-hidden border-8 border-white dark:border-slate-800 shadow-2xl z-0 opacity-50"
                            >
                                <img src="/A1.jpg" className="w-full h-full object-cover" alt="Lab 3" />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Content Section */}
            <section className="container mx-auto px-6 py-16 relative z-20">
                {/* Search & Filters */}
                <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 mb-16 border border-white/20 dark:border-slate-700/50 flex flex-col lg:flex-row items-center justify-between gap-8">
                    <div className="flex flex-wrap items-center gap-3">
                        {['All', 'Hardware', 'Software', 'Advanced'].map((cat) => (
                            <button
                                key={cat}
                                className={`px-8 py-3 rounded-2xl font-bold transition-all border ${cat === 'All'
                                    ? 'bg-brand-blue text-white border-brand-blue shadow-lg shadow-brand-blue/20'
                                    : 'bg-white dark:bg-slate-900 border-border hover:border-brand-blue hover:text-brand-blue text-slate-600 dark:text-slate-400'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    <div className="relative w-full lg:w-96 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-blue transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Search our courses..."
                            className="bg-slate-50 dark:bg-slate-900 pl-14 pr-6 py-4 rounded-2xl border border-border w-full outline-none focus:ring-2 focus:ring-brand-blue focus:bg-white dark:focus:bg-slate-800 transition-all text-sm font-medium"
                        />
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {loading ? (
                        <div className="col-span-full py-20 text-center">
                            <div className="w-16 h-16 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Loading amazing courses...</p>
                        </div>
                    ) : formations.length > 0 ? (
                        formations.map((f, index) => (
                            <motion.div
                                key={f.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className="premium-card group overflow-hidden flex flex-col md:flex-row h-full bg-white dark:bg-slate-800"
                            >
                                <div className="md:w-2/5 relative h-72 md:h-auto overflow-hidden">
                                    <img
                                        src={f.image}
                                        alt={f.title[language]}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute top-6 left-6 bg-brand-green/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xl">
                                        {f.category}
                                    </div>
                                    <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md text-slate-900 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xl border border-border/50">
                                        {f.level}
                                    </div>
                                </div>
                                <div className="p-8 md:w-3/5 flex flex-col">
                                    <h3 className="text-2xl font-bold mb-1 text-slate-900 dark:text-white group-hover:text-brand-blue transition-colors leading-tight line-clamp-2">{f.title[language]}</h3>
                                    {f.reviewCount > 0 && (
                                        <div className="flex items-center gap-1.5 mb-4">
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Star key={s} size={10} className={s <= Math.round(f.rating) ? "fill-amber-500 text-amber-500" : "text-slate-200 dark:text-slate-700"} />
                                                ))}
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400">({f.reviewCount})</span>
                                        </div>
                                    )}
                                    <p className="text-slate-500 dark:text-slate-400 mb-8 flex-grow leading-relaxed text-sm line-clamp-4">
                                        {f.desc[language]}
                                    </p>

                                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 sm:gap-6 mb-8 py-6 border-y border-border/50">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue">
                                                <Clock size={16} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-bold text-slate-400">Duration</span>
                                                <span className="text-sm font-bold">{f.duration}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-brand-green/10 rounded-lg text-brand-green">
                                                <Tag size={16} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] uppercase font-bold text-slate-400">Fixed Cost</span>
                                                <div className="flex items-center gap-2">
                                                    {f.sold_price ? (
                                                        <>
                                                            <span className="text-sm font-bold text-brand-green">{f.sold_price} DT</span>
                                                            <span className="text-[10px] font-bold text-slate-400 line-through opacity-50">{f.base_price} DT</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-sm font-bold">{f.base_price} DT</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <Link
                                            href={`/formations/${f.id}`}
                                            className="btn-primary flex-grow py-3 text-sm text-center shadow-none group-hover:shadow-brand-blue/20 group-hover:shadow-lg"
                                        >
                                            {t.common.viewDetails}
                                        </Link>
                                        <Link
                                            href={`/register?course=${f.id}`}
                                            className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-border group-hover:border-brand-green group-hover:text-brand-green transition-all"
                                            title="Direct Application"
                                        >
                                            <ChevronRight size={20} />
                                        </Link>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[40px] border-2 border-dashed border-border">
                            <p className="text-slate-500 font-bold">No formations found yet.</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
