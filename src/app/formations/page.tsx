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
        <div className="min-h-screen bg-site-muted pb-20 md:pb-28">
            {/* Header */}
            <section className="relative overflow-hidden bg-navy-950 pt-12 pb-24 md:pt-16 md:pb-32">
                <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                    <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-brand-blue/40 blur-3xl" />
                    <div className="absolute -right-16 -bottom-32 h-96 w-96 rounded-full bg-brand-green/20 blur-3xl" />
                </div>
                <div className="site-container relative z-10">
                    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                            <p className="site-eyebrow mb-5">
                                <span className="h-1.5 w-1.5 rounded-full bg-brand-green" aria-hidden="true" />
                                Catalogue
                            </p>
                            <h1 className="mb-5 text-[2.25rem] font-extrabold leading-[1.1] tracking-tight text-balance text-[#fff] md:text-5xl">
                                Découvrez nos <span className="text-brand-green">formations d’experts</span>
                            </h1>
                            <p className="max-w-2xl text-base leading-relaxed text-[#cbd5e1] md:text-lg">
                                Transformez votre passion en une carrière professionnelle avec la première académie de réparation de smartphones en Tunisie. Des laboratoires pratiques, des ingénieurs experts et un accompagnement à vie.
                            </p>
                        </motion.div>

                        <div className="relative hidden h-[300px] lg:block" aria-hidden="true">
                            <div className="absolute top-0 right-6 z-10 h-64 w-52 -rotate-3 overflow-hidden rounded-2xl ring-4 ring-[#ffffff1a] shadow-[var(--shadow-pop)]">
                                <img src="/A3.jpg" className="h-full w-full object-cover" alt="" />
                            </div>
                            <div className="absolute bottom-0 right-48 z-20 h-56 w-44 rotate-3 overflow-hidden rounded-2xl ring-4 ring-[#ffffff1a] shadow-[var(--shadow-pop)]">
                                <img src="/A2.jpg" className="h-full w-full object-cover" alt="" />
                            </div>
                            <div className="absolute top-8 right-80 z-0 h-48 w-40 -rotate-6 overflow-hidden rounded-2xl opacity-50 ring-4 ring-[#ffffff1a]">
                                <img src="/A1.jpg" className="h-full w-full object-cover" alt="" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Content Section */}
            <section className="site-container relative z-20 -mt-14 md:-mt-16">
                {/* Toolbar: filters + search */}
                <div className="site-card mb-6 flex flex-col gap-4 p-3 shadow-[var(--shadow-lift)] sm:p-4 md:mb-8 lg:flex-row lg:items-center lg:justify-between">
                    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5" role="group" aria-label="Filtrer par catégorie">
                        {(['Toutes', 'Matériel', 'Logiciel', 'Avancé'] as const).map((cat) => {
                            const active = activeFilter === cat;
                            return (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setActiveFilter(cat)}
                                    aria-pressed={active}
                                    className={`h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2 ${active
                                        ? 'border-brand-green-600 bg-brand-green-600 text-[#fff] shadow-sm'
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
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-400" size={18} aria-hidden="true" />
                        <input
                            id="formations-search"
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Rechercher une formation..."
                            className="site-input pl-11"
                        />
                    </div>
                </div>

                {!loading && formations.length > 0 && (
                    <p className="mb-5 text-sm text-slate-600" aria-live="polite">
                        <span className="font-bold tabular-nums text-slate-900">{visibleFormations.length}</span> formation{visibleFormations.length > 1 ? 's' : ''} {activeFilter !== 'Toutes' || query ? 'trouvée' + (visibleFormations.length > 1 ? 's' : '') : 'disponible' + (visibleFormations.length > 1 ? 's' : '')}
                    </p>
                )}

                {/* Grid */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-3">
                    {loading ? (
                        [0, 1, 2].map((i) => (
                            <div key={i} className="site-card overflow-hidden" aria-hidden="true">
                                <div className="aspect-[16/10] animate-pulse bg-site-muted" />
                                <div className="space-y-3 p-5">
                                    <div className="h-5 w-20 animate-pulse rounded-full bg-site-muted" />
                                    <div className="h-5 w-3/4 animate-pulse rounded bg-site-muted" />
                                    <div className="h-3 w-full animate-pulse rounded bg-site-muted" />
                                    <div className="h-3 w-2/3 animate-pulse rounded bg-site-muted" />
                                    <div className="flex items-end justify-between pt-3">
                                        <div className="h-8 w-24 animate-pulse rounded bg-site-muted" />
                                        <div className="h-11 w-32 animate-pulse rounded-xl bg-site-muted" />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : formations.length === 0 ? (
                        <div className="site-card col-span-full px-6 py-16 text-center">
                            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200">
                                <BookOpen size={20} aria-hidden="true" />
                            </div>
                            <p className="font-semibold text-slate-900">Aucune formation disponible pour le moment.</p>
                            <p className="mt-1 text-sm text-slate-600">Revenez bientôt ou contactez-nous pour connaître les prochaines ouvertures.</p>
                            <Link href="/#contact" className="site-btn-secondary mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2">
                                Nous contacter
                            </Link>
                        </div>
                    ) : visibleFormations.length === 0 ? (
                        <div className="site-card col-span-full px-6 py-16 text-center">
                            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200">
                                <SearchX size={20} aria-hidden="true" />
                            </div>
                            <p className="font-semibold text-slate-900">Aucune formation ne correspond à votre recherche.</p>
                            <p className="mt-1 text-sm text-slate-600">Essayez un autre mot-clé ou une autre catégorie.</p>
                            <button
                                type="button"
                                onClick={() => { setQuery(''); setActiveFilter('Toutes'); }}
                                className="site-btn-secondary mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2"
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
                                className="site-card site-card-hover group flex h-full flex-col overflow-hidden"
                            >
                                <Link href={`/formations/${f.id}`} className="relative block aspect-[16/10] overflow-hidden rounded-t-2xl bg-site-muted" tabIndex={-1} aria-hidden="true">
                                    {f.image && (
                                        <img
                                            src={f.image}
                                            alt=""
                                            loading="lazy"
                                            className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                                        />
                                    )}
                                    {f.level && (
                                        <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-[#ffffffeb] px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm ring-1 ring-inset ring-[#0f172a14] backdrop-blur">
                                            {f.level}
                                        </span>
                                    )}
                                </Link>

                                <div className="flex flex-grow flex-col p-5">
                                    {f.category && (
                                        <span className="mb-3 inline-flex w-fit items-center rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-blue-dark ring-1 ring-inset ring-brand-blue/15">
                                            {f.category}
                                        </span>
                                    )}
                                    <h2 className="mb-1.5 text-lg font-bold leading-snug tracking-tight text-slate-900 line-clamp-2">
                                        <Link href={`/formations/${f.id}`} className="rounded-sm transition-colors duration-150 hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2">
                                            {f.title[language]}
                                        </Link>
                                    </h2>
                                    {f.reviewCount > 0 && (
                                        <div className="mb-2 flex items-center gap-1.5" aria-label={`Note ${Number(f.rating).toFixed(1)} sur 5, ${f.reviewCount} avis`}>
                                            <div className="flex gap-0.5" aria-hidden="true">
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

                                    <dl className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
                                        <div className="min-w-0">
                                            <dt className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Durée</dt>
                                            <dd className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                                                <Clock size={13} className="shrink-0 text-brand-blue" aria-hidden="true" />
                                                <span className="truncate">{f.duration || '—'}</span>
                                            </dd>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <dt className="mb-0.5 flex items-center justify-end gap-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
                                                <Tag size={11} aria-hidden="true" /> Prix fixe
                                            </dt>
                                            <dd className="flex flex-wrap items-baseline justify-end gap-x-1.5">
                                                {f.sold_price ? (
                                                    <>
                                                        <span className="text-xs font-semibold tabular-nums text-slate-500 line-through">{f.base_price} DT</span>
                                                        <span className="text-2xl font-extrabold tracking-tight tabular-nums text-emerald-700">{f.sold_price}<span className="ml-1 text-sm font-bold">DT</span></span>
                                                    </>
                                                ) : (
                                                    <span className="text-2xl font-extrabold tracking-tight tabular-nums text-slate-900">{f.base_price}<span className="ml-1 text-sm font-bold text-slate-500">DT</span></span>
                                                )}
                                            </dd>
                                        </div>
                                    </dl>

                                    <div className="mt-4 flex items-center gap-2">
                                        <Link
                                            href={`/formations/${f.id}`}
                                            className="site-btn-primary flex-1 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2"
                                        >
                                            {t.common.viewDetails} <ArrowRight size={16} aria-hidden="true" />
                                        </Link>
                                        <Link
                                            href={`/register?course=${f.id}`}
                                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors duration-150 hover:border-brand-blue/40 hover:bg-brand-soft hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2"
                                            title="Inscription directe"
                                            aria-label={`Inscription directe : ${f.title[language]}`}
                                        >
                                            <ChevronRight size={20} aria-hidden="true" />
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
