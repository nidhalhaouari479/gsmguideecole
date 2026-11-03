"use client";

import React, { useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { CheckCircle2, Award, Microscope, Briefcase, VolumeX, Volume2, X, PlayCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const tileColors = ['bg-brand-green', 'bg-brand-blue', 'bg-violet-500', 'bg-amber-500'];

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
            className={`site-card group relative flex min-h-[240px] flex-col overflow-hidden md:min-h-[290px] ${showVideo ? 'p-0' : 'site-card-hover cursor-pointer p-6'} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 focus-visible:ring-offset-2`}
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
                    <div className={`site-icon-tile mb-5 ${tileColors[index % tileColors.length]}`}>{benefit.icon}</div>
                    <h3 className="mb-2 text-lg font-bold tracking-tight text-slate-900">{benefit.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600">
                        {benefit.desc}
                    </p>
                    <div className="mt-auto pt-5">
                        <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1.5 text-sm font-bold text-brand-blue transition-colors duration-200 group-hover:bg-brand-blue group-hover:text-[#fff]">
                            <PlayCircle size={16} aria-hidden="true" /> Voir la vidéo
                        </span>
                    </div>
                    <div className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-brand-green transition-transform duration-300 group-hover:scale-x-100 motion-reduce:transition-none" aria-hidden="true" />
                </>
            ) : (
                <div 
                    className="absolute inset-0 w-full h-full bg-black flex flex-col z-20"
                    onClick={toggleSound}
                >
                     <button 
                        onClick={(e) => { e.stopPropagation(); setShowVideo(false); setIsMuted(true); }}
                        className="absolute top-3 right-3 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[#ffffff33] bg-black/60 text-[#fff] backdrop-blur-sm transition-colors duration-200 hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fff]"
                        aria-label="Fermer la vidéo"
                        title="Fermer la vidéo"
                     >
                        <X size={18} aria-hidden="true" />
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
                        <div className="flex h-10 w-10 items-center rounded-full bg-black/50 backdrop-blur-sm border border-[#ffffff33] justify-center text-[#fff] transition-colors duration-300 group-hover:bg-black/70" title={isMuted ? 'Touchez pour activer le son' : 'Touchez pour couper le son'}>
                            {isMuted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
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
            icon: <CheckCircle2 className="text-[#fff]" size={22} aria-hidden="true" />,
            videoId: 'tGcxQn0x7Es'
        },
        {
            title: t.benefits.certified,
            desc: t.benefits.certifiedDesc,
            icon: <Award className="text-[#fff]" size={22} aria-hidden="true" />,
            videoId: 'z5CHxszlr7s'
        },
        {
            title: t.benefits.lab,
            desc: t.benefits.labDesc,
            icon: <Microscope className="text-[#fff]" size={22} aria-hidden="true" />,
            videoId: 'G7Npbz5_nrQ'
        },
        {
            title: t.benefits.career,
            desc: t.benefits.careerDesc,
            icon: <Briefcase className="text-[#fff]" size={22} aria-hidden="true" />,
            videoId: 'KYz2dwz7RfA'
        },
    ];

    return (
        <section className="site-section bg-site-muted">
            <div className="site-container">
                <div className="mx-auto mb-10 max-w-2xl text-center md:mb-14">
                    <p className="site-eyebrow mb-4">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-green" aria-hidden="true" />
                        Nos atouts
                    </p>
                    <h2 className="site-title mb-4">Pourquoi choisir <span className="text-brand-blue">GSM Guide Academy</span> ?</h2>
                    <p className="site-lead">
                        Nous offrons la formation en réparation de smartphones la plus complète d&apos;Afrique du Nord, alliant théorie et pratique intensive. Cliquez sur une carte pour découvrir en vidéo.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                    {benefits.map((benefit, index) => (
                        <BenefitCard key={index} benefit={benefit} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Benefits;
