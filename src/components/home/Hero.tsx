"use client";

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { ArrowRight, Play, X, GraduationCap, Award, Wrench, Users } from 'lucide-react';

const trustItems = [
    { icon: Users, value: '+1 200', label: 'Étudiants certifiés & employés' },
    { icon: Award, value: '10+ ans', label: "D'expérience terrain" },
    { icon: Wrench, value: '100 %', label: 'Laboratoires pratiques' },
    { icon: GraduationCap, value: '98 %', label: 'Taux de réussite' },
];

const Hero = () => {
    const { t } = useLanguage();
    const [isVideoOpen, setIsVideoOpen] = React.useState(false);

    // UI only: close the video modal with Escape
    React.useEffect(() => {
        if (!isVideoOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsVideoOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isVideoOpen]);

    return (
        <section className="relative overflow-hidden bg-white pt-10 pb-14 md:pt-16 md:pb-20 lg:pt-20 lg:pb-24">
            {/* Background elements */}
            <div aria-hidden="true" className="pointer-events-none absolute top-0 right-0 -z-0 h-full w-1/2 bg-gradient-to-l from-brand-blue/5 to-transparent" />
            <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-blue/10 blur-3xl" />

            <div className="container relative mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue/5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-blue">
                            <span className="h-2 w-2 rounded-full bg-brand-green" />
                            Académie n°1 en Tunisie
                        </div>

                        <h1 className="mb-5 text-4xl font-black leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                            {t.hero.title}{' '}
                            <span className="text-brand-blue">{t.hero.subtitle}</span>
                        </h1>

                        <p className="mb-8 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
                            {t.hero.description}{' '}
                            <span className="font-semibold text-slate-900">Lancez votre carrière professionnelle en quelques semaines.</span>
                        </p>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                            <Link
                                href="/formations"
                                className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-green px-6 text-base font-bold text-black shadow-lg shadow-brand-green/25 transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green focus-visible:ring-offset-2"
                            >
                                {t.hero.cta}
                                <ArrowRight className="transition-transform group-hover:translate-x-1" size={20} />
                            </Link>

                            <button
                                onClick={() => setIsVideoOpen(true)}
                                className="group inline-flex h-12 items-center justify-center gap-3 rounded-xl px-2 text-base font-bold text-slate-900 transition-colors hover:text-brand-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
                            >
                                <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-brand-blue text-brand-blue transition-colors group-hover:bg-brand-blue group-hover:text-[#fff]">
                                    <Play size={16} fill="currentColor" />
                                </span>
                                Regarder la vidéo
                            </button>
                        </div>

                        {/* Trust signals */}
                        <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {trustItems.map(({ icon: Icon, value, label }) => (
                                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <Icon size={18} className="mb-2 text-brand-blue" aria-hidden="true" />
                                    <dt className="sr-only">{label}</dt>
                                    <dd className="text-xl font-black tabular-nums text-slate-900">{value}</dd>
                                    <dd className="text-xs leading-snug text-slate-600">{label}</dd>
                                </div>
                            ))}
                        </dl>
                    </motion.div>

                    <div className="relative">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-slate-200 shadow-2xl lg:aspect-auto lg:h-[540px]"
                        >
                            <img src="/603807524_122162202128668326_405473167361075168_n.jpg" className="h-full w-full object-cover" alt="Atelier GSM Guide Academy" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        </motion.div>

                        {/* Floating badge */}
                        <div className="absolute -bottom-5 left-4 z-20 hidden max-w-[240px] rounded-2xl border border-slate-200 bg-white/95 p-5 shadow-2xl backdrop-blur-xl sm:block lg:-left-6">
                            <div className="mb-2 flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green/20 text-slate-900">
                                    <Award size={18} />
                                </div>
                                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Certification</div>
                            </div>
                            <div className="mb-1 text-2xl font-black text-brand-blue">98 % de réussite</div>
                            <p className="text-xs leading-snug text-slate-600">Formation certifiée reconnue à l&apos;international.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Video Modal */}
            <AnimatePresence>
                {isVideoOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl md:p-6"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Vidéo de présentation"
                        onClick={() => setIsVideoOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.97, y: 10 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.97, y: 10 }}
                            className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-2xl bg-black shadow-2xl md:rounded-3xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setIsVideoOpen(false)}
                                className="absolute top-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-[#fff] backdrop-blur-md transition-colors hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fff] md:top-5 md:right-5"
                                aria-label="Fermer la vidéo"
                                title="Fermer"
                            >
                                <X size={22} />
                            </button>
                            <iframe
                                className="h-full w-full"
                                src="https://www.youtube.com/embed/F06FjwYzz4E?autoplay=1&mute=1"
                                title="Présentation de GSM Guide Academy"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
};

export default Hero;
