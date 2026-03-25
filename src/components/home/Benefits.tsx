"use client";

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { CheckCircle2, Award, Zap, Microscope, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

const Benefits = () => {
    const { t } = useLanguage();

    const benefits = [
        {
            title: t.benefits.practical,
            desc: t.benefits.practicalDesc,
            icon: <CheckCircle2 className="text-brand-green" size={32} />,
        },
        {
            title: t.benefits.certified,
            desc: t.benefits.certifiedDesc,
            icon: <Award className="text-brand-green" size={32} />,
        },
        {
            title: t.benefits.lab,
            desc: t.benefits.labDesc,
            icon: <Microscope className="text-brand-green" size={32} />,
        },
        {
            title: t.benefits.career,
            desc: t.benefits.careerDesc,
            icon: <Briefcase className="text-brand-green" size={32} />,
        },
    ];

    return (
        <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold mb-4">Pourquoi choisir GSM Guide Academy ?</h2>
                    <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        Nous offrons la formation en réparation de smartphones la plus complète d'Afrique du Nord, alliant théorie et pratique intensive.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {benefits.map((benefit, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="premium-card p-8"
                        >
                            <div className="mb-6">{benefit.icon}</div>
                            <h3 className="text-xl font-bold mb-4">{benefit.title}</h3>
                            <p className="text-slate-600 dark:text-slate-400">
                                {benefit.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Benefits;
