"use client";

import React, { useState } from 'react';
import {
    Settings,
    Globe,
    Shield,
    Bell,
    CreditCard,
    Save,
    Building,
    Mail,
    Phone,
    MapPin,
    Lock,
    Eye,
    EyeOff,
    CheckCircle,
    Loader2,
    AlertTriangle,
    Database,
    Fingerprint,
    Server,
    Cpu
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsAdminPage() {
    const [activeTab, setActiveTab] = useState<'general' | 'payments' | 'security'>('general');
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSave = () => {
        setSaving(true);
        // Simulate save
        setTimeout(() => {
            setSaving(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }, 1500);
    };

    const tabs = [
        { id: 'general', label: 'CORE_SYSTEM', icon: Server },
        { id: 'payments', label: 'FINANCIAL_GATEWAY', icon: CreditCard },
        { id: 'security', label: 'ACCESS_CONTROL', icon: Fingerprint },
    ];

    return (
        <div className="max-w-[1600px] mx-auto space-y-12 pb-32 font-sans">
            {/* Command Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-8 border-b border-white/5">
                <div>
                    <div className="flex items-center gap-3 text-brand-green text-[10px] font-black uppercase tracking-[0.4em] mb-4">
                        <div className="w-10 h-[1px] bg-gradient-to-r from-brand-green to-transparent" />
                        SYSTEM_CONFIGURATION
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tighter">System <span className="text-slate-500">Parameters</span></h1>
                    <p className="text-slate-500 text-sm font-bold mt-2 uppercase tracking-widest">Global Variables & Security Directives</p>
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-command flex items-center justify-center gap-3 w-full md:w-auto"
                >
                    {saving ? <Loader2 className="animate-spin" size={18} strokeWidth={3} /> : success ? <CheckCircle size={18} strokeWidth={3} className="text-brand-green" /> : <Save size={18} strokeWidth={3} />}
                    {success ? 'DATA_COMMITTED' : 'EXECUTE_SAVE'}
                </button>
            </header>

            <div className="flex flex-col lg:flex-row gap-12">
                {/* Navigation Tabs - Command Matrix Style */}
                <aside className="lg:w-80 space-y-3">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`w-full flex items-center gap-4 px-6 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all relative overflow-hidden ${isActive
                                    ? 'bg-slate-900 border border-brand-green/30 text-white shadow-[0_0_30px_rgba(161,184,62,0.1)]'
                                    : 'bg-slate-950/50 border border-white/5 text-slate-500 hover:text-slate-300 hover:bg-slate-900 group'
                                    }`}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-green shadow-[0_0_15px_rgba(161,184,62,0.8)]" />
                                )}
                                <Icon size={20} className={isActive ? 'text-brand-green' : 'group-hover:text-slate-400'} strokeWidth={isActive ? 2.5 : 2} />
                                {tab.label}
                                {isActive && (
                                    <div className="ml-auto w-2 h-2 rounded-full bg-brand-green animate-pulse shadow-[0_0_10px_rgba(161,184,62,0.8)]" />
                                )}
                            </button>
                        );
                    })}

                    <div className="mt-8 p-6 glass-effect-dark border border-brand-blue/20 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Cpu size={80} />
                        </div>
                        <div className="flex items-center gap-2 text-brand-blue text-[9px] font-black uppercase tracking-widest mb-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
                            System Status
                        </div>
                        <div className="space-y-2 relative z-10">
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>Network</span>
                                <span className="text-brand-green">Optimized</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>Database</span>
                                <span className="text-brand-green">Connected</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>Encryption</span>
                                <span className="text-brand-blue">AES-256</span>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Content Area - Command Card */}
                <div className="flex-1">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="command-card bg-slate-900/40 border border-white/5 p-8 md:p-12 min-h-[600px]"
                    >
                        {activeTab === 'general' && (
                            <div className="space-y-10">
                                <div className="border-b border-white/5 pb-8 mb-10">
                                    <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Core Academy Identity</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Public-facing operational metrics.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Building size={12} className="text-brand-green" /> Facility Designation
                                        </label>
                                        <div className="relative group">
                                            <input type="text" defaultValue="Dreamworld Academy" className="w-full px-6 py-5 bg-slate-950/80 border border-white/5 rounded-2xl font-black text-white focus:outline-none focus:border-brand-green/50 focus:ring-4 focus:ring-brand-green/10 transition-all uppercase tracking-wider" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Mail size={12} className="text-brand-green" /> Primary Comm Channel
                                        </label>
                                        <div className="relative group">
                                            <input type="email" defaultValue="support@dreamworld.tn" className="w-full px-6 py-5 bg-slate-950/80 border border-white/5 rounded-2xl font-black text-brand-blue focus:outline-none focus:border-brand-green/50 focus:ring-4 focus:ring-brand-green/10 transition-all uppercase tracking-wider" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <Phone size={12} className="text-brand-blue" /> Voice Link
                                        </label>
                                        <div className="relative group">
                                            <input type="tel" defaultValue="+216 71 000 000" className="w-full px-6 py-5 bg-slate-950/80 border border-white/5 rounded-2xl font-black text-white focus:outline-none focus:border-brand-blue/50 focus:ring-4 focus:ring-brand-blue/10 transition-all uppercase tracking-wider" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <MapPin size={12} className="text-brand-green" /> Physical Coordinates
                                        </label>
                                        <div className="relative group">
                                            <input type="text" defaultValue="Tunis, Tunisie" className="w-full px-6 py-5 bg-slate-950/80 border border-white/5 rounded-2xl font-black text-white focus:outline-none focus:border-brand-green/50 focus:ring-4 focus:ring-brand-green/10 transition-all uppercase tracking-wider" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'payments' && (
                            <div className="space-y-10">
                                <div className="border-b border-white/5 pb-8 mb-10">
                                    <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Financial Routing Protocol</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Variables for monetary transfers.</p>
                                </div>

                                <div className="p-6 bg-brand-neon/5 border border-brand-neon/20 rounded-2xl flex gap-6 text-brand-neon mb-10 items-start shadow-[0_0_20px_rgba(244,63,94,0.05)]">
                                    <AlertTriangle className="shrink-0 mt-1" size={24} />
                                    <div>
                                        <h4 className="text-sm font-black uppercase tracking-widest mb-1">Critical Parameter</h4>
                                        <p className="text-[10px] font-bold uppercase tracking-wide leading-relaxed opacity-80">
                                            Verify routing numbers carefully. Invalid configuration will result in transaction failures and system alerts.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-8 max-w-2xl">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Financial Institution</label>
                                        <input type="text" defaultValue="BIAT Tunisie" className="w-full px-6 py-5 bg-slate-950/80 border border-white/5 rounded-2xl font-black text-white focus:outline-none focus:border-brand-green/50 focus:ring-4 focus:ring-brand-green/10 transition-all uppercase tracking-wider" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Routing / Account String (RIB)</label>
                                        <input type="text" defaultValue="08 000 00000000000 00" className="w-full px-6 py-5 bg-slate-950/80 border border-brand-green/20 rounded-2xl font-black text-xl tracking-[0.3em] text-brand-green focus:outline-none focus:border-brand-green focus:ring-4 focus:ring-brand-green/20 transition-all placeholder:tracking-normal shadow-inner" />
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Base Authorization Limit (DT)</label>
                                        <input type="number" defaultValue="200" className="w-48 px-6 py-5 bg-slate-950/80 border border-white/5 rounded-2xl font-black text-white focus:outline-none focus:border-brand-green/50 focus:ring-4 focus:ring-brand-green/10 transition-all tabular-nums text-xl" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="space-y-10">
                                <div className="border-b border-white/5 pb-8 mb-10">
                                    <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Authorization Overrides</h3>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Manage master access credentials.</p>
                                </div>

                                <div className="space-y-8 max-w-lg">
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Current Security Key</label>
                                        <div className="relative group">
                                            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-blue transition-colors" size={18} />
                                            <input type="password" placeholder="••••••••••••" className="w-full pl-16 pr-6 py-5 bg-slate-950/80 border border-white/5 rounded-2xl font-black text-white focus:outline-none focus:border-brand-blue/50 focus:ring-4 focus:ring-brand-blue/10 transition-all tracking-[0.3em]" />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">New Security Key</label>
                                        <div className="relative group">
                                            <Shield className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-brand-green transition-colors" size={18} />
                                            <input type="password" placeholder="MINIMUM 12 CHARACTERS" className="w-full pl-16 pr-6 py-5 bg-slate-950/80 border border-white/5 rounded-2xl font-black text-white focus:outline-none focus:border-brand-green/50 focus:ring-4 focus:ring-brand-green/10 transition-all uppercase tracking-widest text-xs" />
                                        </div>
                                    </div>
                                    <div className="pt-6 flex flex-col sm:flex-row gap-4 border-t border-white/5">
                                        <button className="flex-1 py-5 bg-slate-950 border border-brand-neon/30 text-brand-neon rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-brand-neon/10 transition-all shadow-[0_0_15px_rgba(244,63,94,0.1)]">Initialize Cipher</button>
                                        <button className="flex-1 py-5 bg-slate-950 border border-rose-500/20 text-rose-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-rose-500/10 transition-all">Revoke Clearance</button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
