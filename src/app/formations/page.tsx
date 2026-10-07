"use client";

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { Clock, Tag, ChevronRight, Search, Star, ArrowRight, BookOpen, SearchX } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { supabase } from '@/lib/supabase';
import { htmlToPlainText } from '@/lib/rich-text';

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
                    category: course.category === 'Software'
                        ? 'Logiciel'
                        : course.category === 'Hardware' ? 'Matériel' : course.category,
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

    // ---- UI-only filtering (category chips + search); does not touch fetched data ----
    const [activeFilter, setActiveFilter] = React.useState<'Toutes' | 'Matériel' | 'Logiciel' | 'Avancé'>('Toutes');
    const [query, setQuery] = React.useState('');

    const visibleFormations = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        return formations.filter((f) => {
            if (activeFilter === 'Matériel' || activeFilter === 'Logiciel') {
                if (f.category !== activeFilter) return false;
            } else if (activeFilter === 'Avancé') {
                if (!String(f.level || '').toLowerCase().includes('avanc') && !String(f.level || '').toLowerCase().includes('advanced')) return false;
            }
            if (!q) return true;
            return [f.title?.fr, f.title?.en, f.category, f.instructor]
                .filter(Boolean)
                .some((v: string) => String(v).toLowerCase().includes(q));
        });
    }, [formations, activeFilter, query]);

    return (
        <div className="min-h-screen bg-slate-50 pb-20 md:pb-28">
            {/* Header */}
            <section className="relative overflow-hidden border-b border-slate-200 bg-white py-10 md:py-16">
                <div aria-hidden="true" className="pointer-events-none absolute top-0 right-0 h-full w-1/2">
                    <div className="absolute top-0 right-0 h-full w-full bg-[radial-gradient(circle_at_top_right,var(--color-brand-green),transparent_70%)] opacity-10" />
                </div>
                <div className="container relative z-10 mx-auto px-4 sm:px-6">
                    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-blue">Catalogue</p>
                            <h1 className="mb-4 text-3xl font-black leading-tight tracking-tight text-slate-900 md:text-5xl">
                                Découvrez nos <span className="text-brand-blue">formations d’experts</span>
                            </h1>
                            <p className="max-w-2xl text-base leading-relaxed text-slate-600 md:text-lg">
                                Transformez votre passion en une carrière professionnelle avec la première académie de réparation de smartphones en Tunisie. Des laboratoires pratiques, des ingénieurs experts et un accompagnement à vie.
                            </p>
                        </motion.div>

                        <div className="relative hidden h-[300px] lg:block" aria-hidden="true">
                            <div className="absolute top-0 right-6 z-10 h-64 w-52 -rotate-3 overflow-hidden rounded-3xl border-4 border-white shadow-2xl">
                                <img src="/A3.jpg" className="h-full w-full object-cover" alt="" />
                            </div>
                            <div className="absolute bottom-0 right-48 z-20 h-56 w-44 rotate-3 overflow-hidden rounded-3xl border-4 border-white shadow-2xl">
                                <img src="/A2.jpg" className="h-full w-full object-cover" alt="" />
                            </div>
                            <div className="absolute top-8 right-80 z-0 h-48 w-40 -rotate-6 overflow-hidden rounded-3xl border-4 border-white opacity-60 shadow-xl">
                                <img src="/A1.jpg" className="h-full w-full object-cover" alt="" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Content Section */}
            <section className="container relative z-20 mx-auto px-4 py-8 sm:px-6 md:py-12">
                {/* Toolbar: filters + search */}
                <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:mb-8 lg:flex-row lg:items-center lg:justify-between">
                    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:pb-0" role="group" aria-label="Filtrer par catégorie">
                        {(['Toutes', 'Matériel', 'Logiciel', 'Avancé'] as const).map((cat) => {
                            const active = activeFilter === cat;
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setActiveFilter(cat)}
                                    aria-pressed={active}
                                    className={`h-10 shrink-0 rounded-xl border px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-1 ${active
                                        ? 'border-[#0f172a] bg-[#0f172a] text-[#fff]'
                                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    {cat}
                                </button>
                            );
                        })}
                    </div>
                    <div className="relative w-full lg:w-80">
                        <label htmlFor="formations-search" className="sr-only">Rechercher une formation</label>
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            id="formations-search"
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Rechercher une formation..."
                            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                        />
                    </div>
                </div>

                {!loading && formations.length > 0 && (
                    <p className="mb-4 text-sm text-slate-600" aria-live="polite">
                        <span className="font-bold tabular-nums text-slate-900">{visibleFormations.length}</span> formation{visibleFormations.length > 1 ? 's' : ''} {activeFilter !== 'Toutes' || query ? 'trouvée' + (visibleFormations.length > 1 ? 's' : '') : 'disponible' + (visibleFormations.length > 1 ? 's' : '')}
                    </p>
                )}

                {/* Grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {loading ? (
                        [0, 1, 2].map((i) => (
                            <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-hidden="true">
                                <div className="aspect-[16/10] animate-pulse bg-slate-100" />
                                <div className="space-y-3 p-5">
                                    <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
                                    <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                                    <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                                    <div className="h-11 w-full animate-pulse rounded-xl bg-slate-100" />
                                </div>
                            </div>
                        ))
                    ) : formations.length === 0 ? (
                        <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                            <BookOpen size={36} className="mx-auto mb-3 text-[#cbd5e1]" />
                            <p className="font-semibold text-slate-900">Aucune formation disponible pour le moment.</p>
                            <p className="mt-1 text-sm text-slate-600">Revenez bientôt ou contactez-nous pour connaître les prochaines ouvertures.</p>
                            <Link href="/#contact" className="mt-5 inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 hover:bg-slate-50">
                                Nous contacter
                            </Link>
                        </div>
                    ) : visibleFormations.length === 0 ? (
                        <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                            <SearchX size={36} className="mx-auto mb-3 text-[#cbd5e1]" />
                            <p className="font-semibold text-slate-900">Aucune formation ne correspond à votre recherche.</p>
                            <p className="mt-1 text-sm text-slate-600">Essayez un autre mot-clé ou une autre catégorie.</p>
                            <button
                                type="button"
                                onClick={() => { setQuery(''); setActiveFilter('Toutes'); }}
                                className="mt-5 inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 hover:bg-slate-50"
                            >
                                Réinitialiser les filtres
                            </button>
                        </div>
                    ) : (
                        visibleFormations.map((f, index) => (
                            <motion.article
                                key={f.id}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: Math.min(index * 0.03, 0.15), duration: 0.3 }}
                                className="premium-card group flex h-full flex-col overflow-hidden bg-white"
                            >
                                <Link href={`/formations/${f.id}`} className="relative block aspect-[16/10] overflow-hidden bg-slate-100" tabIndex={-1} aria-hidden="true">
                                    {f.image && (
                                        <img
                                            src={f.image}
                                            alt=""
                                            loading="lazy"
                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    )}
                                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                                        {f.category && (
                                            <span className="inline-flex items-center rounded-full bg-[#ffffffee] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-900 shadow-sm">
                                                {f.category}
                                            </span>
                                        )}
                                        {f.level && (
                                            <span className="inline-flex items-center rounded-full bg-brand-blue px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-[#fff] shadow-sm">
                                                {f.level}
                                            </span>
                                        )}
                                    </div>
                                </Link>

                                <div className="flex flex-grow flex-col p-5 md:p-6">
                                    <h2 className="mb-1.5 text-lg font-bold leading-snug text-slate-900 line-clamp-2">
                                        <Link href={`/formations/${f.id}`} className="transition-colors hover:text-brand-blue focus-visible:outline-none focus-visible:underline">
                                            {f.title[language]}
                                        </Link>
                                    </h2>
                                    {f.reviewCount > 0 && (
                                        <div className="mb-2 flex items-center gap-1.5" aria-label={`Note ${Number(f.rating).toFixed(1)} sur 5, ${f.reviewCount} avis`}>
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map((s) => (
                                                    <Star key={s} size={14} className={s <= Math.round(f.rating) ? "fill-amber-500 text-amber-500" : "text-[#cbd5e1]"} />
                                                ))}
                                            </div>
                                            <span className="text-xs font-semibold text-slate-600">({f.reviewCount} avis)</span>
                                        </div>
                                    )}
                                    <p className="mb-5 text-sm leading-relaxed text-slate-600 line-clamp-3">
                                        {htmlToPlainText(f.desc[language])}
                                    </p>

                                    <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-slate-200 pt-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blue/10 text-brand-blue">
                                                <Clock size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Durée</dt>
                                                <dd className="truncate text-sm font-bold text-slate-900">{f.duration || '—'}</dd>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-green/15 text-slate-900">
                                                <Tag size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Prix fixe</dt>
                                                <dd className="flex flex-wrap items-baseline gap-x-1.5">
                                                    {f.sold_price ? (
                                                        <>
                                                            <span className="text-sm font-black tabular-nums text-emerald-700">{f.sold_price} DT</span>
                                                            <span className="text-xs font-semibold tabular-nums text-slate-500 line-through">{f.base_price} DT</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-sm font-black tabular-nums text-slate-900">{f.base_price} DT</span>
                                                    )}
                                                </dd>
                                            </div>
                                        </div>
                                    </dl>

                                    <div className="mt-5 flex items-center gap-2">
                                        <Link
                                            href={`/formations/${f.id}`}
                                            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-green px-4 text-sm font-bold text-black transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
                                        >
                                            {t.common.viewDetails} <ArrowRight size={16} />
                                        </Link>
                                        <Link
                                            href={`/register?course=${f.id}`}
                                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-brand-blue/40 hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                                            title="Inscription directe"
                                            aria-label={`Inscription directe : ${f.title[language]}`}
                                        >
                                            <ChevronRight size={20} />
                                        </Link>
                                    </div>
                                </div>
                            </motion.article>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
