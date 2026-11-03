"use client";

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, MessageCircle } from 'lucide-react';

const StudentReelCard = ({ short, index }: { short: any, index: number }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isMuted, setIsMuted] = useState(true);

    const toggleSound = () => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            if (isMuted) {
                iframeRef.current.contentWindow.postMessage('{"event":"command","func":"unMute","args":""}', '*');
            } else {
                iframeRef.current.contentWindow.postMessage('{"event":"command","func":"mute","args":""}', '*');
            }
            setIsMuted(!isMuted);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: Math.min(index * 0.03, 0.12), duration: 0.3 }}
            className="group relative w-[72%] shrink-0 snap-center cursor-pointer rounded-[28px] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:w-auto"
            onClick={toggleSound}
            role="button"
            tabIndex={0}
            aria-label={`${short.title} : ${isMuted ? 'activer le son' : 'couper le son'}`}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSound();
                }
            }}
        >
            {/* Smartphone Container Mockup */}
            <div className="relative aspect-[9/16] overflow-hidden rounded-[28px] border border-slate-200/80 bg-black shadow-[var(--shadow-card)] transition-[box-shadow,border-color] duration-200 group-hover:border-brand-blue/50 group-hover:shadow-[var(--shadow-lift)]">

                <iframe
                    ref={iframeRef}
                    className="absolute inset-0 w-full h-[120%] -top-[10%] pointer-events-none scale-110"
                    src={`https://www.youtube.com/embed/${short.id}?autoplay=1&mute=1&loop=1&playlist=${short.id}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1`}
                    title={short.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    loading="lazy"
                />

                {/* Transparent Overlay and visual masking to hide top YT UI elements completely */}
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black via-black/90 to-transparent z-20 pointer-events-none" />
                <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-0 z-30 pointer-events-none" />

                <div className="absolute bottom-5 left-5 right-5 z-30 pointer-events-none flex items-end justify-between gap-3">
                    <p className="text-sm font-bold leading-tight text-[#fff]">{short.title}</p>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-[#fff] backdrop-blur-sm transition-colors duration-200 ${isMuted ? 'border-[#ffffff33] bg-black/50 group-hover:bg-black/70' : 'border-brand-green-600 bg-brand-green-600'}`} aria-hidden="true">
                        {isMuted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default function StudentReels() {
    const shorts = [
        { id: 'ytCAZZgMCEU', title: 'L\'expérience d\'un technicien certifié' },
        { id: 'exKWK_I0XWc', title: 'L\'apprentissage par la pratique' },
        { id: 'XUM3PzbwhaE', title: 'Mon parcours à l\'Académie' },
        { id: 'Slv0mYyepMM', title: 'Réussite après formation' }
    ];

    return (
        <div className="w-full">
            <div className="mx-auto mb-8 flex max-w-2xl flex-col items-center text-center md:mb-10">
                <div className="site-icon-tile mb-4 bg-brand-blue">
                    <MessageCircle size={20} aria-hidden="true" />
                </div>
                <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
                    Ce que disent nos étudiants
                </h3>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                    <Volume2 size={13} aria-hidden="true" />
                    Touchez une vidéo pour activer le son.
                </p>
            </div>
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pt-1 pb-4 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
                {shorts.map((short, index) => (
                    <StudentReelCard key={index} short={short} index={index} />
                ))}
            </div>
        </div>
    );
}
