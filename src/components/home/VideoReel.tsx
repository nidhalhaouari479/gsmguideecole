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
        <section className="overflow-hidden bg-[#0b1220] py-16 text-[#fff] md:py-24">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="mb-10 flex flex-col justify-between gap-8 md:mb-14 lg:flex-row lg:items-end">
                    <div className="max-w-2xl">
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-green">
                            <TrendingUp size={14} /> Points forts de la formation
                        </div>
                        <h2 className="mb-4 text-3xl font-black leading-tight tracking-tight text-[#fff] md:text-5xl">
                            Apprendre à travers des <span className="text-[#5ea8e6]">leçons rapides</span>
                        </h2>
                        <p className="text-base leading-relaxed text-[#cbd5e1] md:text-lg">
                            Regardez nos ingénieurs en action. Des extraits de formation courts, précis et professionnels de nos laboratoires quotidiens.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 border-l-4 border-brand-blue py-2 pl-5">
                        <div className="text-3xl font-black tabular-nums text-[#fff]">{shorts.length}</div>
                        <div className="text-xs font-bold uppercase tracking-wider text-[#94a3b8]">Nouvelles<br />leçons</div>
                    </div>
                </div>

                {/* Mobile: horizontal snap carousel. Desktop: grid. */}
                <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
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
                            <div className="relative aspect-[9/16] overflow-hidden rounded-[32px] border-2 border-[#1e293b] bg-black shadow-2xl transition-colors duration-300 group-hover:border-brand-blue/60">

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

                                <div className="pointer-events-none absolute bottom-6 left-5 right-5 z-30">
                                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-green">Leçon n°{index + 1}</div>
                                    <h3 className="text-lg font-bold leading-tight text-[#fff]">{short.title}</h3>
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
