"use client";

import React, { useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { CheckCircle2, Award, Microscope, Briefcase, VolumeX, Volume2, X, PlayCircle } from 'lucide-react';
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
            transition={{ delay: Math.min(index * 0.03, 0.12), duration: 0.3 }}
            className={`premium-card relative overflow-hidden min-h-[220px] md:min-h-[280px] flex flex-col ${showVideo ? 'p-0' : 'p-5 md:p-6'} cursor-pointer group hover:border-brand-blue/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue`}
            onClick={() => !showVideo && setShowVideo(true)}
            role={showVideo ? undefined : 'button'}
            tabIndex={showVideo ? undefined : 0}
            aria-label={showVideo ? undefined : `${benefit.title} : voir la vidéo`}
            onKeyDown={(e) => {
                if (!showVideo && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    setShowVideo(true);
                }
            }}
        >
            {!showVideo ? (
                <>
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green/15">{benefit.icon}</div>
                    <h3 className="mb-2 text-lg font-bold text-slate-900">{benefit.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                        {benefit.desc}
                    </p>
                    <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-bold text-brand-blue">
                        <PlayCircle size={18} /> Voir la vidéo
                    </span>
                    <div className="absolute inset-x-0 bottom-0 h-1 bg-brand-green scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                </>
            ) : (
                <div 
                    className="absolute inset-0 w-full h-full bg-black flex flex-col z-20"
                    onClick={toggleSound}
                >
                     <button 
                        onClick={(e) => { e.stopPropagation(); setShowVideo(false); setIsMuted(true); }}
                        className="absolute top-3 right-3 z-50 w-10 h-10 rounded-full bg-black/60 text-[#fff] flex items-center justify-center hover:bg-black/80 border border-[#ffffff33] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fff]"
                        aria-label="Fermer la vidéo"
                        title="Fermer la vidéo"
                     >
                        <X size={18} />
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
                        <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-[#ffffff33] flex items-center justify-center text-[#fff] transition-colors duration-300 group-hover:bg-black/70" title={isMuted ? 'Touchez pour activer le son' : 'Touchez pour couper le son'}>
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
            icon: <CheckCircle2 className="text-slate-900" size={24} />,
            videoId: 'tGcxQn0x7Es'
        },
        {
            title: t.benefits.certified,
            desc: t.benefits.certifiedDesc,
            icon: <Award className="text-slate-900" size={24} />,
            videoId: 'z5CHxszlr7s'
        },
        {
            title: t.benefits.lab,
            desc: t.benefits.labDesc,
            icon: <Microscope className="text-slate-900" size={24} />,
            videoId: 'G7Npbz5_nrQ'
        },
        {
            title: t.benefits.career,
            desc: t.benefits.careerDesc,
            icon: <Briefcase className="text-slate-900" size={24} />,
            videoId: 'KYz2dwz7RfA'
        },
    ];

    return (
        <section className="py-16 md:py-24 bg-slate-50">
            <div className="container mx-auto px-4 sm:px-6">
                <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-brand-blue">Nos atouts</p>
                    <h2 className="mb-4 text-3xl font-black tracking-tight text-slate-900 md:text-4xl">Pourquoi choisir GSM Guide Academy ?</h2>
                    <p className="text-base leading-relaxed text-slate-600">
                        Nous offrons la formation en réparation de smartphones la plus complète d&apos;Afrique du Nord, alliant théorie et pratique intensive. Cliquez sur une carte pour découvrir en vidéo.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {benefits.map((benefit, index) => (
                        <BenefitCard key={index} benefit={benefit} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Benefits;
