"use client";

import React, { useEffect, useState } from 'react';
import {
    Activity, Users, Clock, MousePointer2, FileText,
    TrendingUp, BarChart3, PieChart as PieIcon,
    ArrowUpRight, Download, Loader2, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface AnalyticsData {
    kpis: { uniqueVisitors: number; totalPageViews: number; totalClicks: number; avgTime: string; };
    trafficChart: { name: string; traffic: number }[];
    timePerPage: { name: string; time: number }[];
    clicksChart: { name: string; value: number }[];
    pageTable: { page: string; views: number; time: string }[];
}

const COLORS = ['#a1b83e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

export default function AnalyticsAdminPage() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeRange, setTimeRange] = useState('7J');

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin/analytics');
            const json = await res.json();
            if (json.error) {
                setError(json.error);
            } else {
                setData(json);
            }
        } catch (e: any) {
            setError(e.message || 'Erreur réseau');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const cards = [
        { label: 'Visiteurs', value: data?.kpis.uniqueVisitors?.toLocaleString() ?? '—', icon: Users, color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
        { label: 'Temps Moyen', value: data?.kpis.avgTime ?? '—', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
        { label: 'Total Clicks', value: data?.kpis.totalClicks?.toLocaleString() ?? '—', icon: MousePointer2, color: 'text-brand-green', bg: 'bg-brand-green/10' },
        { label: 'Pages Vues', value: data?.kpis.totalPageViews?.toLocaleString() ?? '—', icon: FileText, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    ];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="animate-spin text-brand-green" size={48} />
                <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] animate-pulse">Chargement des données...</p>
            </div>
        );
    }

    const hasData = data !== null;

    // Show API error
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="premium-card p-8 text-center max-w-lg">
                    <h3 className="text-xl font-black text-rose-400 mb-2">Erreur API Analytics</h3>
                    <pre className="text-xs text-slate-400 bg-slate-950 p-4 rounded-xl overflow-auto text-left whitespace-pre-wrap">{error}</pre>
                    <button onClick={fetchData} className="mt-4 px-6 py-2 bg-brand-green text-slate-950 rounded-xl font-black uppercase tracking-widest text-xs">Réessayer</button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20 max-w-[1600px] mx-auto">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-brand-green font-black uppercase tracking-[0.3em] text-[10px] mb-2">
                        <Activity size={14} /> Intelligence Web Réelle
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">
                        WEB <span className="text-brand-green">ANALYTICS</span>
                    </h1>
                </div>
                <div className="flex gap-2">
                    {['7J', '30J'].map(t => (
                        <button
                            key={t}
                            onClick={() => setTimeRange(t)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${timeRange === t ? 'bg-brand-green text-slate-950 shadow-[0_0_15px_rgba(161,184,62,0.5)]' : 'bg-slate-900 border border-white/5 text-slate-400 hover:text-white hover:border-brand-green/50'}`}
                        >
                            {t}
                        </button>
                    ))}
                    <button onClick={fetchData} className="p-2 ml-2 bg-slate-900 border border-white/5 rounded-xl text-slate-400 hover:text-white hover:border-brand-green/50 transition-all" title="Rafraîchir">
                        <RefreshCw size={18} />
                    </button>
                </div>
            </header>

            {!hasData && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="premium-card p-10 flex flex-col items-center gap-3 text-center">
                    <Activity size={48} className="text-slate-700" />
                    <h3 className="text-xl font-black text-white">Aucune donnée de trafic pour l'instant</h3>
                    <p className="text-slate-500 text-sm max-w-md">
                        Le système de tracking est actif. Les données vont commencer à apparaître ici dès que les visiteurs navigueront sur votre site.
                    </p>
                </motion.div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, i) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="premium-card p-6 overflow-hidden relative group cursor-default"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className={`w-12 h-12 rounded-2xl ${card.bg} ${card.color} flex items-center justify-center shadow-lg group-hover:-rotate-12 transition-transform duration-300`}>
                                <card.icon size={24} />
                            </div>
                        </div>
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{card.label}</h3>
                        <p className="text-4xl font-black text-white tracking-tighter tabular-nums">{card.value}</p>
                    </motion.div>
                ))}
            </div>

            {hasData && (
                <>
                    {/* Charts Row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Traffic Area Chart */}
                        <div className="lg:col-span-2 premium-card p-8 bg-[#0a0f19]">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-3">
                                        <TrendingUp className="text-brand-green" /> Trafic par jour
                                    </h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Visites des 7 derniers jours</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse"></span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Live</span>
                                </div>
                            </div>
                            <div className="h-[280px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.trafficChart}>
                                        <defs>
                                            <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#a1b83e" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#a1b83e" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff03" vertical={false} />
                                        <XAxis dataKey="name" stroke="#475569" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                                        <YAxis stroke="#475569" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} allowDecimals={false} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', fontWeight: 'bold' }} itemStyle={{ color: '#a1b83e' }} />
                                        <Area type="monotone" dataKey="traffic" stroke="#a1b83e" strokeWidth={3} fillOpacity={1} fill="url(#colorTraffic)" name="Visites" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Clicks Pie Chart */}
                        <div className="premium-card p-8">
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-3">
                                <PieIcon className="text-brand-blue" /> Clicks par bouton
                            </h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 mb-4">Répartition des interactions</p>
                            {data.clicksChart.length > 0 ? (
                                <div className="h-[280px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={data.clicksChart} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value" stroke="none">
                                                {data.clicksChart.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: 'none', color: '#fff', fontWeight: 'bold' }} />
                                            <Legend verticalAlign="bottom" iconType="circle" formatter={(value) => <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{value}</span>} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[280px] flex items-center justify-center text-slate-600 text-sm font-bold">Aucun clic enregistré</div>
                            )}
                        </div>
                    </div>

                    {/* Charts Row 2 & Table */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Time per page Bar Chart */}
                        <div className="premium-card p-8">
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-3">
                                <Clock className="text-amber-500" /> Temps moyen par page
                            </h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1 mb-6">Durée moyenne d'engagement (sec)</p>
                            {data.timePerPage.length > 0 ? (
                                <div className="h-[280px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.timePerPage} layout="vertical" margin={{ left: -10, right: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" stroke="#475569" fontSize={10} fontWeight="black" width={110} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', fontWeight: 'bold', color: '#fff' }} formatter={(val: any) => [`${val}s`, 'Temps Moyen']} />
                                            <Bar dataKey="time" radius={[0, 8, 8, 0]} barSize={18}>
                                                {data.timePerPage.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[280px] flex items-center justify-center text-slate-600 text-sm font-bold">Données insuffisantes</div>
                            )}
                        </div>

                        {/* Page Table */}
                        <div className="premium-card flex flex-col overflow-hidden">
                            <div className="p-8 border-b border-white/5">
                                <h3 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-3">
                                    <FileText className="text-rose-500" /> Pages les plus visitées
                                </h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Top URLs & Performance</p>
                            </div>
                            <div className="overflow-x-auto overflow-y-auto flex-grow">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-white/[0.02]">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Page</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Views</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Temps Moyen</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {data.pageTable.length > 0 ? data.pageTable.map((row, i) => (
                                            <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-4 text-sm font-black text-white group-hover:text-brand-green transition-colors font-mono">{row.page}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-300 tabular-nums">{row.views.toLocaleString()}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-300 tabular-nums">{row.time}</td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={3} className="px-6 py-16 text-center text-slate-600 text-sm font-bold">Aucune donnée disponible</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
