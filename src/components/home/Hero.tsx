"use client";

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { ArrowRight, Play, X, GraduationCap, Award, Wrench, Users } from 'lucide-react';

const trustItems = [
    { icon: Users, value: '+1 200', label: 'Étudiants certifiés & employés', tile: 'bg-brand-green' },
    { icon: Award, value: '10+ ans', label: "D'expérience terrain", tile: 'bg-brand-blue' },
    { icon: Wrench, value: '100 %', label: 'Laboratoires pratiques', tile: 'bg-amber-500' },
    { icon: GraduationCap, value: '98 %', label: 'Taux de réussite', tile: 'bg-violet-500' },
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
        <section className="relative overflow-hidden bg-white pt-10 pb-16 md:pt-16 md:pb-24 lg:pt-20 lg:pb-28">
            {/* Background elements */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,#000_40%,transparent_100%)]"
            />
            <div aria-hidden="true" className="pointer-events-none absolute -top-32 right-[-10%] h-[28rem] w-[28rem] rounded-full bg-brand-blue/15 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute top-40 left-[-10%] h-80 w-80 rounded-full bg-brand-green/15 blur-3xl" />

            <div className="site-container relative">
                <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="site-eyebrow mb-6">
                            <span className="relative flex h-2 w-2" aria-hidden="true">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-60 motion-reduce:animate-none" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-green" />
                            </span>
                            Académie n°1 en Tunisie
                        </div>

                        <h1 className="mb-5 text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-slate-900 [text-wrap:balance] sm:text-5xl lg:text-[4rem]">
                            {t.hero.title}{' '}
                            <span className="bg-gradient-to-r from-brand-blue to-brand-green-600 bg-clip-text text-transparent">{t.hero.subtitle}</span>
                        </h1>

                        <p className="mb-8 max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
                            {t.hero.description}{' '}
                            <span className="font-semibold text-slate-900">Lancez votre carrière professionnelle en quelques semaines.</span>
                        </p>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                            <Link
                                href="/formations"
                                className="site-btn-primary group min-h-[52px] px-7 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2"
                            >
                                {t.hero.cta}
                                <ArrowRight className="transition-transform duration-200 group-hover:translate-x-1" size={20} aria-hidden="true" />
                            </Link>

                            <button
                                onClick={() => setIsVideoOpen(true)}
                                className="site-btn-secondary group min-h-[52px] gap-3 pl-2 pr-6 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2"
                            >
                                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue text-[#fff] shadow-[var(--shadow-brand)] transition-transform duration-200 group-hover:scale-105">
                                    <Play size={15} fill="currentColor" aria-hidden="true" />
                                </span>
                                Regarder la vidéo
                            </button>
                        </div>

                        {/* Trust signals */}
                        <dl className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {trustItems.map(({ icon: Icon, value, label, tile }) => (
                                <div key={label} className="site-card p-4">
                                    <span className={`site-icon-tile mb-3 h-9! w-9! rounded-xl! ${tile}`}>
                                        <Icon size={17} aria-hidden="true" />
                                    </span>
                                    <dt className="sr-only">{label}</dt>
                                    <dd className="text-[22px] font-bold leading-none tracking-tight tabular-nums text-slate-900">{value}</dd>
                                    <dd className="mt-1.5 text-xs leading-snug text-slate-600">{label}</dd>
                                </div>
                            ))}
                        </dl>
                    </motion.div>

                    <div className="relative">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            className="relative aspect-[4/3] w-full overflow-hidden rounded-[28px] border-[6px] border-white shadow-[0_32px_64px_-24px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/80 lg:aspect-auto lg:h-[540px]"
                        >
                            <img src="/603807524_122162202128668326_405473167361075168_n.jpg" className="h-full w-full object-cover" alt="Atelier GSM Guide Academy" />
                            <div className="absolute inset-0 bg-gradient-to-t from-navy-950/50 via-transparent to-transparent" />
                        </motion.div>

                        {/* Floating badge */}
                        <div className="absolute -bottom-6 left-4 z-20 hidden max-w-[260px] overflow-hidden rounded-2xl bg-navy-950 p-5 shadow-[var(--shadow-pop)] sm:block lg:-left-8">
                            <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand-blue/40 blur-2xl" />
                            <span aria-hidden="true" className="pointer-events-none absolute -bottom-12 left-6 h-28 w-28 rounded-full bg-brand-green/25 blur-2xl" />
                            <div className="relative mb-3 flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-brand-green ring-1 ring-inset ring-white/15">
                                    <Award size={18} aria-hidden="true" />
                                </span>
                                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#B4C0D3]">Certification</span>
                            </div>
                            <div className="relative mb-1 text-[26px] font-bold leading-none tracking-tight text-[#fff] tabular-nums">98 % <span className="text-[15px] font-semibold text-[#B4C0D3]">de réussite</span></div>
                            <p className="relative mt-2 text-xs leading-snug text-[#B4C0D3]">Formation certifiée reconnue à l&apos;international.</p>
                        </div>

                        <div className="absolute -top-4 right-4 z-20 hidden items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/95 p-3 pr-4 shadow-[var(--shadow-lift)] backdrop-blur-xl md:flex lg:-right-6">
                            <span className="site-icon-tile h-10! w-10! rounded-xl! bg-brand-green">
                                <Wrench size={18} aria-hidden="true" />
                            </span>
                            <span className="leading-tight">
                                <span className="block text-[13px] font-bold text-slate-900">Laboratoire équipé</span>
                                <span className="block text-xs text-slate-500">Diagnostic & micro-soudure</span>
                            </span>
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
