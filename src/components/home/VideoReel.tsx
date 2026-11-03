"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';

const VideoReel = () => {
    const shorts = [
        {
            id: 'eVaebSTb9XM',
            title: 'Diagnostic Avancé'
        },
        {
            id: 'F06FjwYzz4E',
            title: 'Maîtrise de la Soudure'
        },
        {
            id: 'A-wBJ0AFNY4',
            title: 'Réussite des Étudiants'
        },
        {
            id: 'xHqMgmhWW-k',
            title: 'Laboratoire en Direct'
        }
    ];

    return (
        // Explicit hex colors: the public site runs under data-theme="light", which forces
        // `.text-white` / `.bg-slate-950` to light colors (see globals.css).
        <section className="site-section relative isolate overflow-hidden bg-navy-950 text-[#fff]">
            {/* Decorative glows */}
            <div className="pointer-events-none absolute -top-32 -left-24 -z-10 h-96 w-96 rounded-full bg-brand-blue/40 blur-3xl" aria-hidden="true" />
            <div className="pointer-events-none absolute -right-24 -bottom-32 -z-10 h-96 w-96 rounded-full bg-brand-green/20 blur-3xl" aria-hidden="true" />

            <div className="site-container">
                <div className="mb-10 flex flex-col justify-between gap-8 md:mb-14 lg:flex-row lg:items-end">
                    <div className="max-w-2xl">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-green/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.08em] text-brand-green ring-1 ring-inset ring-brand-green/30">
                            <TrendingUp size={14} aria-hidden="true" /> Points forts de la formation
                        </div>
                        <h2 className="site-title mb-4 text-[#fff]">
                            Apprendre à travers des <span className="text-[#5ea8e6]">leçons rapides</span>
                        </h2>
                        <p className="site-lead text-[#B4C0D3]">
                            Regardez nos ingénieurs en action. Des extraits de formation courts, précis et professionnels de nos laboratoires quotidiens.
                        </p>
                    </div>

                    <div className="flex w-fit items-center gap-4 rounded-2xl border border-[#ffffff1a] bg-[#ffffff0d] px-5 py-4 backdrop-blur-sm">
                        <div className="site-icon-tile bg-brand-blue">
                            <TrendingUp size={20} aria-hidden="true" />
                        </div>
                        <div>
                            <div className="text-3xl font-extrabold leading-none tracking-tight tabular-nums text-[#fff]">{shorts.length}</div>
                            <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-[#B4C0D3]">Nouvelles<br />leçons</div>
                        </div>
                    </div>
                </div>

                {/* Mobile: horizontal snap carousel. Desktop: grid. */}
                <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
                    {shorts.map((short, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: Math.min(index * 0.03, 0.12), duration: 0.3 }}
                            className="group relative w-[72%] shrink-0 snap-center sm:w-auto"
                        >
                            {/* Smartphone Container Mockup */}
                            <div className="relative aspect-[9/16] overflow-hidden rounded-[28px] border border-[#ffffff1f] bg-black shadow-[var(--shadow-pop)] ring-1 ring-[#ffffff0d] transition-colors duration-300 group-hover:border-brand-blue/60">

                                {/*
                                    YouTube Background Video Technique:
                                    - autoplay=1
                                    - mute=1 (required for autoplay)
                                    - loop=1 & playlist=ID (required for loop)
                                    - controls=0 & modestbranding=1
                                */}
                                <iframe
                                    className="absolute inset-0 w-full h-[120%] -top-[10%] pointer-events-none scale-110"
                                    src={`https://www.youtube.com/embed/${short.id}?autoplay=1&mute=1&loop=1&playlist=${short.id}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&fs=0`}
                                    title={short.title}
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    loading="lazy"
                                />

                                {/* Transparent Overlay to block all interactions (No Pause/Play) */}
                                <div className="absolute inset-0 z-20 pointer-events-auto cursor-default" />

                                {/* Visual masking to hide top/bottom YT UI elements */}
                                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black via-black/90 to-transparent z-20 pointer-events-none" />
                                <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-black/90 to-transparent z-10 pointer-events-none" />

                                <div className="pointer-events-none absolute bottom-5 left-5 right-5 z-30">
                                    <span className="mb-2 inline-flex items-center rounded-full bg-brand-green/15 px-2.5 py-1 text-xs font-semibold tabular-nums text-brand-green ring-1 ring-inset ring-brand-green/30">Leçon n°{index + 1}</span>
                                    <h3 className="text-lg font-bold leading-tight tracking-tight text-[#fff]">{short.title}</h3>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default VideoReel;
