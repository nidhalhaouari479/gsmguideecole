"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/context/LanguageContext';
import { ChevronRight, ArrowRight, Play, X } from 'lucide-react';

const Hero = () => {
    const { t } = useLanguage();
    const [isVideoOpen, setIsVideoOpen] = React.useState(false);

    return (
        <section className="relative overflow-hidden pt-12 pb-24 md:pt-24 md:pb-40 bg-white dark:bg-slate-950">
            {/* Background elements */}
            <div className="absolute top-0 right-0 -z-10 w-1/2 h-full bg-gradient-to-l from-brand-blue/5 to-transparent dark:from-brand-blue/10" />
            <div className="absolute -top-24 -right-24 -z-10 w-96 h-96 bg-brand-blue/10 blur-3xl rounded-full" />

            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 text-brand-blue font-bold text-sm mb-8">
                            <span className="flex h-2 w-2 rounded-full bg-brand-green animate-pulse" />
                            ACADÉMIE N°1 EN TUNISIE
                        </div>

                        <h1 className="text-4xl xs:text-5xl md:text-7xl font-black mb-8 leading-tight tracking-tight text-slate-900 dark:text-white">
                            {t.hero.title} <br />
                            <span className="text-gradient">Carrière Professionnelle</span>
                        </h1>

                        <p className="text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-xl leading-relaxed font-medium">
                            {t.hero.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-6">
                            <Link href="/formations" className="btn-primary flex items-center gap-2 group px-8 py-4 text-lg">
                                {t.hero.cta}
                                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                            </Link>

                            <button
                                onClick={() => setIsVideoOpen(true)}
                                className="flex items-center gap-4 group hover:text-brand-blue transition-colors"
                            >
                                <div className="w-14 h-14 rounded-full border-2 border-brand-blue flex items-center justify-center text-brand-blue group-hover:bg-brand-blue group-hover:text-white transition-all shadow-lg shadow-brand-blue/20">
                                    <Play size={24} fill="currentColor" />
                                </div>
                                <span className="font-bold text-lg">Regarder la Vidéo</span>
                            </button>
                        </div>

                        <div className="mt-16 flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-border w-full sm:w-fit">
                            <div className="flex -space-x-4">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="w-14 h-14 rounded-full border-4 border-white dark:border-slate-800 bg-slate-200 overflow-hidden relative shadow-md">
                                        <Image 
                                            src={`https://i.pravatar.cc/150?u=${i + 10}`} 
                                            alt="Student" 
                                            fill 
                                            sizes="56px"
                                            className="object-cover" 
                                        />
                                    </div>
                                ))}
                            </div>
                            <div className="pr-4">
                                <div className="font-black text-xl text-slate-900 dark:text-white">+1 200 Étudiants</div>
                                <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Certifiés &amp; Employés</div>
                            </div>
                        </div>
                    </motion.div>

                    <div className="relative hidden lg:block h-[550px]">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1 }}
                            className="relative z-10 w-full h-full rounded-[48px] overflow-hidden shadow-2xl border-2 border-slate-200 dark:border-slate-800"
                        >
                            <img src="/603807524_122162202128668326_405473167361075168_n.jpg" className="w-full h-full object-cover" alt="GSM Academy Lab" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                        </motion.div>

                        {/* More professional floating badge */}
                        <motion.div
                            animate={{ y: [0, -15, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -bottom-6 -left-6 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-6 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-[220px]"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-brand-green/20 flex items-center justify-center text-brand-green">
                                    <Play size={20} fill="currentColor" />
                                </div>
                                <div className="text-xs font-black uppercase tracking-widest text-slate-500">Démo en direct</div>
                            </div>
                            <div className="text-brand-blue font-black text-3xl mb-1">98% Succès</div>
                            <p className="text-[10px] font-bold text-slate-400 leading-tight">Formation certifiée reconnue à l'international.</p>
                        </motion.div>

                        <div className="absolute top-1/2 -right-4 z-0 w-64 h-64 bg-brand-green/20 blur-[100px] rounded-full" />
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
                        className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl"
                        >
                            <button
                                onClick={() => setIsVideoOpen(false)}
                                className="absolute top-6 right-6 z-10 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
                            >
                                <X size={24} />
                            </button>
                            <iframe
                                className="w-full h-full"
                                src="https://www.youtube.com/embed/F06FjwYzz4E?autoplay=1&mute=1"
                                title="GSM Academy Presentation"
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
