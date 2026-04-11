"use client";

import React, { useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { CheckCircle2, Award, Microscope, Briefcase, VolumeX, Volume2, X } from 'lucide-react';
import { motion } from 'framer-motion';

const BenefitCard = ({ benefit, index }: { benefit: any, index: number }) => {
    const [showVideo, setShowVideo] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isMuted, setIsMuted] = useState(true);

    const toggleSound = (e: React.MouseEvent) => {
        e.stopPropagation();
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
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className={`premium-card relative overflow-hidden transition-all duration-500 min-h-[250px] md:min-h-[300px] flex flex-col justify-center ${showVideo ? 'p-0 cursor-pointer' : 'p-8 cursor-pointer'} group hover:border-brand-blue/50`}
            onClick={() => !showVideo && setShowVideo(true)}
        >
            {!showVideo ? (
                <>
                    <div className="mb-6 group-hover:scale-110 transition-transform origin-left">{benefit.icon}</div>
                    <h3 className="text-xl font-bold mb-4">{benefit.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                        {benefit.desc}
                    </p>
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-brand-green scale-x-0 group-hover:scale-x-100 transition-transform origin-left rounded-b-xl" />
                </>
            ) : (
                <div 
                    className="absolute inset-0 w-full h-full bg-black flex flex-col z-20"
                    onClick={toggleSound}
                >
                     <button 
                        onClick={(e) => { e.stopPropagation(); setShowVideo(false); setIsMuted(true); }}
                        className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 border border-white/20 transition-colors"
                     >
                        <X size={16} />
                     </button>
                    
                     <iframe
                        ref={iframeRef}
                        className="absolute inset-0 w-full h-[120%] -top-[10%] pointer-events-none scale-110"
                        src={`https://www.youtube.com/embed/${benefit.videoId}?autoplay=1&mute=1&loop=1&playlist=${benefit.videoId}&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&fs=0&enablejsapi=1`}
                        title={benefit.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                     />
                    
                    {/* Transparent Overlay and visual masking to hide top YT UI elements completely */}
                    <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-black via-black/90 to-transparent z-20 pointer-events-none" />
                    <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/80 to-transparent z-10 pointer-events-none" />
                    <div className="absolute inset-0 z-30 pointer-events-none" />

                    <div className="absolute bottom-4 right-4 z-30 pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white transition-colors duration-300 group-hover:bg-black/60">
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

const Benefits = () => {
    const { t } = useLanguage();

    const benefits = [
        {
            title: t.benefits.practical,
            desc: t.benefits.practicalDesc,
            icon: <CheckCircle2 className="text-brand-green" size={32} />,
            videoId: 'tGcxQn0x7Es'
        },
        {
            title: t.benefits.certified,
            desc: t.benefits.certifiedDesc,
            icon: <Award className="text-brand-green" size={32} />,
            videoId: 'z5CHxszlr7s'
        },
        {
            title: t.benefits.lab,
            desc: t.benefits.labDesc,
            icon: <Microscope className="text-brand-green" size={32} />,
            videoId: 'G7Npbz5_nrQ'
        },
        {
            title: t.benefits.career,
            desc: t.benefits.careerDesc,
            icon: <Briefcase className="text-brand-green" size={32} />,
            videoId: 'KYz2dwz7RfA'
        },
    ];

    return (
        <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold mb-4">Pourquoi choisir GSM Guide Academy ?</h2>
                    <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        Nous offrons la formation en réparation de smartphones la plus complète d'Afrique du Nord, alliant théorie et pratique intensive. Cliquez sur une carte pour découvrir en vidéo.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {benefits.map((benefit, index) => (
                        <BenefitCard key={index} benefit={benefit} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Benefits;
