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
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="group relative cursor-pointer"
            onClick={toggleSound}
        >
            {/* Smartphone Container Mockup */}
            <div className="aspect-[9/16] relative bg-black rounded-[40px] overflow-hidden border-2 border-slate-800 shadow-xl group-hover:border-brand-blue/50 transition-all duration-500">

                <iframe
                    ref={iframeRef}
                    className="absolute inset-0 w-full h-[120%] -top-[10%] pointer-events-none scale-110"
                    src={`https://www.youtube.com/embed/${short.id}?autoplay=1&mute=1&loop=1&playlist=${short.id}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1`}
                    title={short.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />

                {/* Transparent Overlay and visual masking to hide top YT UI elements completely */}
                <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black via-black/90 to-transparent z-20 pointer-events-none" />
                <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-0 z-30 pointer-events-none" />

                <div className="absolute bottom-6 right-6 z-30 pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white transition-colors duration-300 group-hover:bg-black/60">
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
        <div className="w-full mt-12">
            <h3 className="text-3xl font-bold mb-10 text-center flex items-center justify-center gap-3">
                <MessageCircle className="text-brand-blue" size={28} />
                Ce que disent nos étudiants
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {shorts.map((short, index) => (
                    <StudentReelCard key={index} short={short} index={index} />
                ))}
            </div>
        </div>
    );
}
