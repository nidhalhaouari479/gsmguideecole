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
        <section className="py-24 bg-slate-950 text-white overflow-hidden">
            <div className="container mx-auto px-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 mb-16">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-green/10 text-brand-green border border-brand-green/20 font-black text-xs uppercase tracking-widest mb-6">
                            <TrendingUp size={14} /> Points Forts de la Formation
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
                            Apprendre à Travers des <span className="text-brand-blue">Leçons Rapides</span>
                        </h2>
                        <p className="text-lg text-slate-400 font-medium leading-relaxed">
                            Regardez nos ingénieurs en action. Des extraits de formation courts, précis et professionnels de nos laboratoires quotidiens.
                        </p>
                    </div>

                    <div className="flex gap-8 items-center border-l-4 border-brand-blue pl-8 py-4">
                        <div className="text-center">
                            <div className="text-3xl font-black text-white">4</div>
                            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Nouvelles Leçons</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {shorts.map((short, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="group relative"
                        >
                            {/* Smartphone Container Mockup */}
                            <div className="aspect-[9/16] relative bg-black rounded-[40px] overflow-hidden border-2 border-slate-800 shadow-2xl group-hover:border-brand-blue/50 transition-all duration-500">

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
                                />

                                {/* Transparent Overlay to block all interactions (No Pause/Play) */}
                                <div className="absolute inset-0 z-20 pointer-events-auto cursor-default" />

                                {/* Visual masking to hide top/bottom YT UI elements further */}
                                <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

                                <div className="absolute bottom-10 left-8 right-8 z-30 pointer-events-none">
                                    <div className="text-brand-green font-black text-[10px] uppercase tracking-[0.2em] mb-2">Leçon n°{index + 1}</div>
                                    <h4 className="font-bold text-xl text-white leading-tight">{short.title}</h4>
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
