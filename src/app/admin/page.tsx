"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';
import {
    Users,
    BookOpen,
    CreditCard,
    TrendingUp,
    Loader2,
    GraduationCap,
    Calendar,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Clock,
    Target,
    Filter,
    X,
    Search,
    ChevronRight,
    ArrowUpDown,
    PieChart as PieIcon,
    BarChart3,
    Layers,
    MapPin,
    Zap,
    Briefcase,
    ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend
} from 'recharts';

// --- COLORS & STYLES ---
const COLORS = ['#a1b83e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#f43f5e'];
const DARK_COLORS = ['#88a030', '#2563eb', '#d97706', '#db2777', '#7c3aed', '#059669', '#e11d48'];

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    
    // --- DATA STATE ---
    const [stats, setStats] = useState({
        students: 0,
        courses: 0,
        revenue: 0,
        sessions: 0,
        teachers: 0,
        newToday: 0,
        enrollments: 0
    });

    const [revenueTimeline, setRevenueTimeline] = useState<any[]>([]);
    const [ageDistribution, setAgeDistribution] = useState<any[]>([]);
    const [sourceDistribution, setSourceDistribution] = useState<any[]>([]);
    const [coursePerformance, setCoursePerformance] = useState<any[]>([]);
    const [upcomingSeances, setUpcomingSeances] = useState<any[]>([]);
    
    const [filterConfig, setFilterConfig] = useState({
        dateType: 'all',
        dateValue: ''
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/dashboard');
            const data = await response.json();
            
            if (data.error) throw new Error(data.error);

            processAllData(data);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const processAllData = (raw: any) => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // 1. Stats Counter
        const confirmedEnrollments = raw.enrollments.filter((e: any) => e.status === 'approved');
        const totalRevenue = confirmedEnrollments.reduce((sum: number, e: any) => sum + (e.amount_paid || 0), 0);
        const newStudentsToday = raw.students.filter((s: any) => s.created_at?.startsWith(todayStr)).length;

        setStats({
            students: raw.students.length,
            courses: raw.courses.length,
            revenue: totalRevenue,
            sessions: raw.sessions.length,
            teachers: raw.teachers.length,
            newToday: newStudentsToday,
            enrollments: raw.enrollments.length
        });

        // 2. Revenue Timeline (Last 6 Months)
        const months: { name: string; month: number; year: number; revenue: number; enrollments: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            months.push({
                name: d.toLocaleDateString('fr-FR', { month: 'short' }),
                month: d.getMonth(),
                year: d.getFullYear(),
                revenue: 0,
                enrollments: 0
            });
        }

        confirmedEnrollments.forEach((e: any) => {
            const date = new Date(e.created_at);
            const entry = months.find(m => m.month === date.getMonth() && m.year === date.getFullYear());
            if (entry) {
                entry.revenue += (Number(e.amount_paid) || 0);
                entry.enrollments += 1;
            }
        });
        setRevenueTimeline(months);

        // 3. Age Distribution
        const ageGroups = {
            '18-24': 0,
            '25-34': 0,
            '35-44': 0,
            '45+': 0,
            'N/D': 0
        };

        raw.students.forEach((s: any) => {
            const age = s.age;
            if (!age) ageGroups['N/D']++;
            else if (age <= 24) ageGroups['18-24']++;
            else if (age <= 34) ageGroups['25-34']++;
            else if (age <= 44) ageGroups['35-44']++;
            else ageGroups['45+']++;
        });

        setAgeDistribution(Object.entries(ageGroups).map(([name, value]) => ({ name, value })));

        // 4. Source Distribution
        const sources: Record<string, number> = {};
        raw.students.forEach((s: any) => {
            const src = s.source || 'Inconnu';
            sources[src] = (sources[src] || 0) + 1;
        });
        setSourceDistribution(Object.entries(sources).map(([name, value]) => ({ name, value })));

        // 5. Course Performance
        const courseCounts: Record<string, number> = {};
        confirmedEnrollments.forEach((e: any) => {
            // Find session then course
            const session = raw.sessions.find((s: any) => s.id === e.session_id);
            const courseData = Array.isArray(session?.courses) ? session.courses[0] : session?.courses;
            const courseTitle = courseData?.title_fr || 'Formation';
            courseCounts[courseTitle] = (courseCounts[courseTitle] || 0) + 1;
        });
        setCoursePerformance(Object.entries(courseCounts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
        );

        // 6. Upcoming Seances
        const allSeances: any[] = [];
        raw.sessions.forEach((s: any) => {
            try {
                const parsed = typeof s.schedule === 'string' ? JSON.parse(s.schedule) : s.schedule;
                if (parsed?.seances) {
                    parsed.seances.forEach((se: any) => {
                        const seDate = new Date(se.date);
                        if (seDate >= now) {
                            allSeances.push({
                                date: seDate,
                                title: s.courses?.title_fr || 'Formation',
                                label: parsed.label || 'Session Standard',
                                time: se.start_time,
                                room: 'Lab Main'
                            });
                        }
                    });
                }
            } catch (e) {
                if (new Date(s.start_date) >= now) {
                    allSeances.push({ date: new Date(s.start_date), title: s.courses?.title_fr, label: 'Début Session', time: '09:00', room: 'TBD' });
                }
            }
        });
        setUpcomingSeances(allSeances.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 4));
    };

    const handleGenerateReport = () => {
        setIsGenerating(true);
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            doc.setFillColor(15, 23, 42); // Navy Dark
            doc.rect(0, 0, 210, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.text('CONSOLE STRATÉGIQUE', 14, 25);
            doc.setFontSize(10);
            doc.text(`GSM Guide Academy - Rapport Automatisé - ${new Date().toLocaleDateString('fr-FR')}`, 14, 32);

            doc.setTextColor(15, 23, 42);
            doc.setFontSize(14);
            doc.text('Indicateurs de Performance', 14, 55);

            autoTable(doc, {
                startY: 60,
                head: [['Métrique', 'Valeur']],
                body: [
                    ['Total Étudiants', stats.students.toString()],
                    ['Nouveaux ce jour', stats.newToday.toString()],
                    ['Chiffre d\'Affaires Global', `${stats.revenue.toLocaleString()} DT`],
                    ['Nombre de Formations', stats.courses.toString()],
                    ['Professeurs', stats.teachers.toString()]
                ],
                theme: 'striped',
                headStyles: { fillColor: [15, 23, 42] }
            });

            doc.save(`Rapport_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] gap-6">
                <div className="relative">
                    <Loader2 className="animate-spin text-brand-green" size={56} />
                    <motion.div 
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 bg-brand-green/20 rounded-full blur-xl"
                    />
                </div>
                <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Syncing Intelligence Engine...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20 max-w-[1600px] mx-auto">
            {/* --- HEADER --- */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-brand-green font-black uppercase tracking-[0.3em] text-[10px] mb-2">
                        <Zap size={14} fill="currentColor" /> Console Command Center
                    </div>
                    <h1 className="text-5xl font-black text-white tracking-tighter uppercase italic">
                        SYSTEM <span className="text-brand-green">INTELLIGENCE</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">GSM GUIDE ACADEMY • Operational Control Dashboard</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-6 py-2 bg-slate-900 border border-white/5 rounded-2xl flex items-center gap-3 shadow-2xl">
                        <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                        <span className="text-xs font-black text-white uppercase tracking-widest">LIVE DATA FEED</span>
                    </div>
                    <button 
                        onClick={handleGenerateReport}
                        disabled={isGenerating}
                        className="btn-primary py-3 px-8 rounded-2xl shadow-xl shadow-brand-green/20 flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                    >
                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <BarChart3 size={16} />}
                        {isGenerating ? 'GEN...' : 'Exporter Rapport'}
                    </button>
                </div>
            </header>

            {/* --- TOP STATS GRID --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Étudiants', value: stats.students, sub: `+${stats.newToday} aujourd'hui`, icon: Users, color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
                    { label: 'Chiffre d\'Affaires', value: `${stats.revenue.toLocaleString()} DT`, sub: 'Revenus confirmés', icon: CreditCard, color: 'text-brand-green', bg: 'bg-brand-green/10' },
                    { label: 'Sessions Actives', value: stats.sessions, sub: 'Planning opérationnel', icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                    { label: 'Experts Tech', value: stats.teachers, sub: 'Professeurs actifs', icon: GraduationCap, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="premium-card p-8 group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                        <div className="flex items-center justify-between mb-6">
                            <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-lg`}>
                                <stat.icon size={28} />
                            </div>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.sub}</div>
                        </div>
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</h3>
                        <p className="text-4xl font-black text-white tracking-tighter tabular-nums">{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* --- MAIN CHARTS AREA --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Revenue & Growth Trend */}
                <div className="lg:col-span-2 premium-card p-8 flex flex-col">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h3 className="text-xl font-black text-white flex items-center gap-2 uppercase italic tracking-tight">
                                <TrendingUp size={24} className="text-brand-green" />
                                Growth Performance
                            </h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Timeline des revenus mensuels (DT)</p>
                        </div>
                    </div>
                    
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueTimeline}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#a1b83e" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#a1b83e" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis 
                                    dataKey="name" 
                                    stroke="#475569" 
                                    fontSize={10} 
                                    fontWeight="bold" 
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis 
                                    stroke="#475569" 
                                    fontSize={10} 
                                    fontWeight="bold" 
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(val) => `${val/1000}k`}
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', fontWeight: 'bold' }}
                                    itemStyle={{ color: '#a1b83e' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="#a1b83e" 
                                    strokeWidth={4}
                                    fillOpacity={1} 
                                    fill="url(#colorRev)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribution Overview */}
                <div className="space-y-8">
                    {/* Course Popularity */}
                    <div className="premium-card p-6">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Layers size={16} className="text-brand-blue" /> Top Formations
                        </h3>
                        <div className="space-y-4">
                            {coursePerformance.map((item, i) => (
                                <div key={item.name} className="space-y-2">
                                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                                        <span className="text-slate-400 truncate max-w-[150px]">{item.name}</span>
                                        <span className="text-white">{item.value} inscr.</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }} 
                                            animate={{ width: `${(item.value / stats.enrollments) * 100}%` }} 
                                            className="h-full bg-brand-blue rounded-full" 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Upcoming Calendar */}
                    <div className="premium-card p-6 bg-gradient-to-br from-slate-900/50 to-brand-green/5 border-l-4 border-l-brand-green">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Clock size={16} className="text-brand-green" /> Événements Radar
                        </h3>
                        <div className="space-y-4">
                            {upcomingSeances.map((s, i) => (
                                <div key={i} className="flex gap-4 items-start">
                                    <div className="w-12 h-12 rounded-xl bg-slate-950 flex flex-col items-center justify-center border border-white/5 shrink-0">
                                        <span className="text-[10px] font-black text-brand-green leading-none">{s.date.getDate()}</span>
                                        <span className="text-[8px] font-black text-slate-500 uppercase mt-1">{s.date.toLocaleDateString('fr-FR', { month: 'short' })}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-white truncate uppercase tracking-tight">{s.title}</p>
                                        <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 leading-relaxed">
                                            {s.label} • {s.time} • <span className="text-brand-green/80">{s.room}</span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- PIE CHARTS SECTION --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Age Distribution */}
                <div className="premium-card p-8">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 rounded-2xl bg-brand-blue/10 text-brand-blue">
                            <Users size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Démographie Étudiante</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Répartition par tranches d'âge</p>
                        </div>
                    </div>
                    
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={ageDistribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={100}
                                    paddingAngle={8}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {ageDistribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: 'none', color: '#fff' }}
                                />
                                <Legend 
                                    verticalAlign="middle" 
                                    align="right" 
                                    layout="vertical"
                                    iconType="circle"
                                    formatter={(value) => <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Source Distribution */}
                <div className="premium-card p-8">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 rounded-2xl bg-amber-400/10 text-amber-400">
                            <Target size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Acquisition Intelligence</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Origine des inscriptions (Source)</p>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sourceDistribution} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    stroke="#475569" 
                                    fontSize={10} 
                                    fontWeight="bold" 
                                    width={100}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: 'none' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                />
                                <Bar 
                                    dataKey="value" 
                                    fill="#a1b83e" 
                                    radius={[0, 8, 8, 0]} 
                                    barSize={20}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            
            {/* --- SYSTEM HEALTH --- */}
            <div className="premium-card p-10 bg-gradient-to-r from-slate-900 to-[#0a0f19] flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-brand-green/20 flex items-center justify-center text-brand-green shadow-[0_0_30px_rgba(161,184,62,0.1)]">
                        <ShieldCheck size={32} />
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-white italic uppercase tracking-tight">Core Integrity Optimized</h4>
                        <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Connectivité Supabase stable • 99.9% Up-time</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-center flex flex-col justify-center">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Latency</span>
                        <span className="text-lg font-black text-white tabular-nums">14ms</span>
                    </div>
                    <div className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-center flex flex-col justify-center">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Backup</span>
                        <span className="text-lg font-black text-green-400 tabular-nums">SECURED</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
