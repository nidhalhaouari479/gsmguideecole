"use client";

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const inputClass = "w-full pl-12 pr-4 py-3 rounded-xl border border-border focus:ring-2 focus:ring-brand-blue outline-none transition-all bg-white dark:bg-slate-900 dark:text-white placeholder-slate-400 font-medium";
const labelClass = "block text-sm font-bold mb-2 ml-1 text-slate-700 dark:text-slate-200";

export default function ContactSection() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowErrors(false);
        setError(null);

        if (!name || !email || !isValidEmail(email) || !subject || !message) {
            setShowErrors(true);
            return;
        }

        setIsSubmitting(true);

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, subject, message })
            });

            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setShowSuccess(true);
            // Reset form
            setName('');
            setEmail('');
            setSubject('');
            setMessage('');
        } catch (err: any) {
            setError(err.message || "Une erreur s'est produite lors de l'envoi.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (showSuccess) {
        return (
            <section id="contact" className="py-24 bg-slate-50 dark:bg-slate-950">
                <div className="container mx-auto px-6">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-2xl mx-auto premium-card p-12 bg-white dark:bg-slate-900 text-center shadow-2xl border-2 border-brand-green/20"
                    >
                        <div className="w-24 h-24 rounded-full bg-brand-green/10 flex items-center justify-center mx-auto mb-8 relative">
                            <motion.div
                                animate={{ scale: [1, 1.4, 1] }}
                                transition={{ repeat: Infinity, duration: 2 }}
                                className="absolute inset-0 rounded-full bg-brand-green/10"
                            />
                            <CheckCircle2 size={48} className="text-brand-green relative z-10" />
                        </div>
                        <h2 className="text-4xl font-black mb-4 tracking-tight">Message Envoyé !</h2>
                        <div className="bg-brand-green/5 p-6 rounded-2xl border border-brand-green/10 mb-8">
                            <p className="text-lg text-slate-700 dark:text-slate-200 font-bold mb-2">
                                Merci pour votre message, {name.split(' ')[0]} !
                            </p>
                            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                                Nous avons bien reçu votre demande. Un e-mail de confirmation vient de vous être envoyé.
                            </p>
                            <p className="mt-4 text-brand-green font-black uppercase tracking-widest text-xs">
                                ⏳ Nous vous rappellerons sous un délai maximum de 2 jours.
                            </p>
                        </div>
                        <button 
                            onClick={() => setShowSuccess(false)}
                            className="text-slate-500 font-bold hover:text-brand-blue transition-colors flex items-center justify-center gap-2 mx-auto"
                        >
                            <Send size={16} /> Envoyer un autre message
                        </button>
                    </motion.div>
                </div>
            </section>
        );
    }

    return (
        <section id="contact" className="py-24 bg-slate-50 dark:bg-slate-950">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-black mb-4 uppercase italic tracking-tighter">Contactez-nous</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Des questions ? Nous sommes là pour vous aider à lancer votre carrière.</p>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                    {/* Form Card */}
                    <div className="premium-card p-10 bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none border border-white/5">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-500/10 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl flex items-start gap-3">
                                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={20} />
                                <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className={`${labelClass} ${showErrors && !name ? 'text-red-500' : ''}`}>Nom Complet *</label>
                                    <div className="relative">
                                        <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${showErrors && !name ? 'text-red-500' : 'text-slate-400'}`}>
                                            <Send size={18} className="-rotate-45" />
                                        </div>
                                        <input 
                                            type="text" 
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className={`${inputClass} ${showErrors && !name ? 'border-red-500 ring-red-100 focus:ring-red-200' : ''}`}
                                            placeholder="Ahmed Ben Ali"
                                            required 
                                        />
                                    </div>
                                    {showErrors && !name && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1 uppercase tracking-widest">Requis</p>}
                                </div>
                                <div>
                                    <label className={`${labelClass} ${showErrors && (!email || !isValidEmail(email)) ? 'text-red-500' : ''}`}>E-mail *</label>
                                    <div className="relative">
                                        <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 ${showErrors && (!email || !isValidEmail(email)) ? 'text-red-500' : 'text-slate-400'}`} size={18} />
                                        <input 
                                            type="email" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={`${inputClass} ${showErrors && (!email || !isValidEmail(email)) ? 'border-red-500 ring-red-100 focus:ring-red-200' : ''}`}
                                            placeholder="ahmed@example.com"
                                            required 
                                        />
                                    </div>
                                    {showErrors && !email && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1 uppercase tracking-widest">Requis</p>}
                                    {showErrors && email && !isValidEmail(email) && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1 uppercase tracking-widest">Email invalide</p>}
                                </div>
                            </div>
                            
                            <div>
                                <label className={`${labelClass} ${showErrors && !subject ? 'text-red-500' : ''}`}>Sujet *</label>
                                <input 
                                    type="text" 
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className={`${inputClass} pl-6 ${showErrors && !subject ? 'border-red-500 ring-red-100 focus:ring-red-200' : ''}`}
                                    placeholder="Demande d'information / Inscription..."
                                    required 
                                />
                                {showErrors && !subject && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1 uppercase tracking-widest">Requis</p>}
                            </div>

                            <div>
                                <label className={`${labelClass} ${showErrors && !message ? 'text-red-500' : ''}`}>Message *</label>
                                <textarea 
                                    rows={4} 
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className={`${inputClass.replace('py-3', 'py-4')} pl-6 ${showErrors && !message ? 'border-red-500 ring-red-100 focus:ring-red-200' : ''}`}
                                    placeholder="Dites-nous comment nous pouvons vous aider..."
                                    required
                                ></textarea>
                                {showErrors && !message && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1 uppercase tracking-widest">Requis</p>}
                            </div>

                            <button 
                                type="submit" 
                                disabled={isSubmitting}
                                className="btn-primary w-full py-4 text-lg font-black tracking-tight flex items-center justify-center gap-3 shadow-xl shadow-brand-blue/20"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Envoi en cours...
                                    </>
                                ) : (
                                    <>
                                        <Send size={20} />
                                        Envoyer le message
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Info Side */}
                    <div className="flex flex-col justify-between py-6">
                        <div className="space-y-10">
                            {[
                                { icon: Phone, title: "Téléphone", value: "+216 54 15 15 15", desc: "Disponible de 9h à 18h" },
                                { icon: Mail, title: "E-mail", value: "Gsmguideacademy@gmail.com", desc: "Réponse sous 24h" },
                                { icon: MapPin, title: "Adresse", value: "Centre Makni, Menzah 9", desc: "Tunis, Tunisie" }
                            ].map((item, i) => (
                                <motion.div 
                                    key={i}
                                    initial={{ opacity: 0, x: 20 }}
                                    whileInView={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-start gap-5 hover:translate-x-2 transition-transform cursor-pointer"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 flex items-center justify-center text-brand-blue shadow-lg shadow-brand-blue/5">
                                        <item.icon size={24} />
                                    </div>
                                    <div>
                                        <div className="font-black text-2xl tracking-tighter italic uppercase text-slate-900 dark:text-white leading-none mb-2">{item.title}</div>
                                        <div className="text-brand-blue font-bold text-lg">{item.value}</div>
                                        <div className="text-slate-400 text-sm font-medium">{item.desc}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Google Maps Integration */}
                        <div className="mt-12 w-full h-64 rounded-3xl overflow-hidden shadow-2xl border-4 border-white dark:border-slate-800 rotate-1 hover:rotate-0 transition-transform duration-500">
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3192.837574959774!2d10.1512780753052!3d36.84636586509678!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12fd33bd1e95da93%3A0x4bf9be9ecc20cedd!2sGsm%20Guide%20Academy!5e0!3m2!1sfr!2stn!4v1772617470401!5m2!1sfr!2stn"
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                allowFullScreen={true}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                            ></iframe>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
