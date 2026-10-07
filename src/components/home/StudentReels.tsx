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
            className="group relative w-[72%] shrink-0 snap-center cursor-pointer rounded-[32px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 sm:w-auto"
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
            <div className="aspect-[9/16] relative bg-black rounded-[32px] overflow-hidden border-2 border-slate-200 shadow-xl group-hover:border-brand-blue/60 transition-colors duration-300">

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
                    <div className="w-10 h-10 shrink-0 rounded-full bg-black/50 backdrop-blur-sm border border-[#ffffff33] flex items-center justify-center text-[#fff] transition-colors duration-300 group-hover:bg-black/70">
                        {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
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
            <div className="mb-8 text-center">
                <h3 className="flex items-center justify-center gap-3 text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
                    <MessageCircle className="text-brand-blue" size={26} />
                    Ce que disent nos étudiants
                </h3>
                <p className="mt-2 text-sm text-slate-600">Touchez une vidéo pour activer le son.</p>
            </div>
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
                {shorts.map((short, index) => (
                    <StudentReelCard key={index} short={short} index={index} />
                ))}
            </div>
        </div>
    );
}
