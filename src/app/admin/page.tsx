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
    ShieldCheck,
    MessageSquare,
    CheckCircle2,
    Facebook,
    Youtube,
    Instagram,
    Chrome,
    UsersRound,
    CircleHelp
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
    Legend,
    LineChart,
    Line
} from 'recharts';

// --- COLORS & STYLES ---
const COLORS = ['#a1b83e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#f43f5e'];
const DARK_COLORS = ['#88a030', '#2563eb', '#d97706', '#db2777', '#7c3aed', '#059669', '#e11d48'];

const SOURCE_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    google: { label: 'Google', color: '#4285F4', icon: Chrome },
    youtube: { label: 'YouTube', color: '#FF0000', icon: Youtube },
    facebook: { label: 'Facebook', color: '#1877F2', icon: Facebook },
    instagram: { label: 'Instagram', color: '#E4405F', icon: Instagram },
    friend: { label: 'Ami / connaissance', color: '#A1B83E', icon: UsersRound },
    other: { label: 'Autre', color: '#64748B', icon: CircleHelp },
    unknown: { label: 'Inconnu', color: '#94A3B8', icon: CircleHelp },
};

const SourceAxisTick = ({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value: string } }) => {
    const meta = SOURCE_META[payload?.value || 'unknown'] || SOURCE_META.unknown;
    const Icon = meta.icon;
    return (
        <foreignObject x={x - 145} y={y - 14} width={140} height={28}>
            <div className="flex h-full items-center justify-end gap-2 text-xs font-bold text-slate-600">
                <Icon size={16} strokeWidth={2.4} style={{ color: meta.color }} />
                <span>{meta.label}</span>
            </div>
        </foreignObject>
    );
};

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
        enrollments: 0,
        enrolledStudents: 0
    });

    const [revenueTimeline, setRevenueTimeline] = useState<any[]>([]);
    const [ageDistribution, setAgeDistribution] = useState<any[]>([]);
    const [sourceDistribution, setSourceDistribution] = useState<any[]>([]);
    const [coursePerformance, setCoursePerformance] = useState<any[]>([]);
    const [studentsByCourse, setStudentsByCourse] = useState<any[]>([]);
    const [enrollmentStatusData, setEnrollmentStatusData] = useState<any[]>([]);
    const [sessionOccupancy, setSessionOccupancy] = useState<any[]>([]);
    const [studentTimeline, setStudentTimeline] = useState<any[]>([]);
    const [absenceHeatmap, setAbsenceHeatmap] = useState<any[]>([]);
    const [upcomingSeances, setUpcomingSeances] = useState<any[]>([]);
    const [sessionRequests, setSessionRequests] = useState<any[]>([]);
    const [attendanceStats, setAttendanceStats] = useState({
        total: 0,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        rate: 0
    });
    
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
        setSessionRequests(raw.sessionRequests || []);

        const attendance = raw.attendance || [];
        const present = attendance.filter((record: any) => record.status === 'present').length;
        const absent = attendance.filter((record: any) => record.status === 'absent').length;
        const late = attendance.filter((record: any) => record.status === 'late').length;
        const excused = attendance.filter((record: any) => record.status === 'excused').length;
        const totalAttendance = attendance.length;
        setAttendanceStats({
            total: totalAttendance,
            present,
            absent,
            late,
            excused,
            rate: totalAttendance > 0 ? Math.round(((present + late) / totalAttendance) * 100) : 0
        });

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
            enrollments: raw.enrollments.length,
            enrolledStudents: new Set(confirmedEnrollments.map((enrollment: any) => enrollment.user_id)).size
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
        const sources: Record<string, number> = {
            google: 0,
            youtube: 0,
            facebook: 0,
            instagram: 0,
            friend: 0,
            other: 0
        };
        raw.students.forEach((s: any) => {
            const rawSource = String(s.source || 'unknown').trim().toLowerCase();
            const src = rawSource.includes('google') ? 'google'
                : rawSource.includes('youtube') ? 'youtube'
                : rawSource.includes('facebook') ? 'facebook'
                : rawSource.includes('instagram') ? 'instagram'
                : rawSource.includes('ami') || rawSource.includes('friend') ? 'friend'
                : rawSource === 'other' || rawSource.includes('autre') ? 'other'
                : 'unknown';
            sources[src] = (sources[src] || 0) + 1;
        });
        setSourceDistribution(Object.entries(sources).map(([name, value]) => ({
            name,
            label: (SOURCE_META[name] || SOURCE_META.unknown).label,
            color: (SOURCE_META[name] || SOURCE_META.unknown).color,
            value
        })));

        // Additional management charts
        const enrollmentCountsByCourse: Record<string, number> = {};
        confirmedEnrollments.forEach((enrollment: any) => {
            const session = raw.sessions.find((item: any) => item.id === enrollment.session_id);
            const course = raw.courses.find((item: any) => item.id === session?.course_id);
            const name = course?.title_fr || 'Formation inconnue';
            enrollmentCountsByCourse[name] = (enrollmentCountsByCourse[name] || 0) + 1;
        });
        setStudentsByCourse(Object.entries(enrollmentCountsByCourse)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value));

        const legacyStatusCounts = { approved: 0, pending: 0, rejected: 0 };
        raw.enrollments.forEach((enrollment: any) => {
            if (enrollment.status in legacyStatusCounts) legacyStatusCounts[enrollment.status as keyof typeof legacyStatusCounts]++;
        });
        setEnrollmentStatusData([
            { name: 'Validées', value: legacyStatusCounts.approved, color: '#10B981' },
            { name: 'En attente', value: legacyStatusCounts.pending, color: '#F59E0B' },
            { name: 'Refusées', value: legacyStatusCounts.rejected, color: '#F43F5E' }
        ]);

        setSessionOccupancy(raw.sessions.map((session: any) => {
            const course = raw.courses.find((item: any) => item.id === session.course_id);
            const occupied = confirmedEnrollments.filter((enrollment: any) => enrollment.session_id === session.id).length;
            return {
                name: course?.title_fr || 'Session',
                occupied,
                available: Math.max(Number(session.seats_available || 0) - occupied, 0),
                capacity: Number(session.seats_available || 0)
            };
        }).slice(0, 10));

        const registrationMonths: Array<{ name: string; students: number; month: number; year: number }> = [];
        for (let index = 5; index >= 0; index--) {
            const date = new Date();
            date.setMonth(date.getMonth() - index);
            registrationMonths.push({
                name: date.toLocaleDateString('fr-FR', { month: 'short' }),
                students: 0,
                month: date.getMonth(),
                year: date.getFullYear()
            });
        }
        raw.students.forEach((student: any) => {
            const date = new Date(student.created_at);
            const month = registrationMonths.find(item => item.month === date.getMonth() && item.year === date.getFullYear());
            if (month) month.students++;
        });
        setStudentTimeline(registrationMonths);

        const absenceByDate: Record<string, number> = {};
        (raw.attendance || []).forEach((record: any) => {
            if (record.status === 'absent' && record.seance_date) {
                absenceByDate[record.seance_date] = (absenceByDate[record.seance_date] || 0) + 1;
            }
        });
        const legacyHeatmapDays = Array.from({ length: 42 }, (_, index) => {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - (41 - index));
            const key = date.toISOString().split('T')[0];
            return { date: key, day: date.getDate(), label: date.toLocaleDateString('fr-FR'), count: absenceByDate[key] || 0 };
        });
        setAbsenceHeatmap(legacyHeatmapDays);

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

        const allCourseCounts: Record<string, number> = {};
        raw.courses.forEach((course: any) => {
            allCourseCounts[course.title_fr || 'Formation'] = 0;
        });
        confirmedEnrollments.forEach((enrollment: any) => {
            const session = raw.sessions.find((item: any) => item.id === enrollment.session_id);
            const course = Array.isArray(session?.courses) ? session.courses[0] : session?.courses;
            const title = course?.title_fr || 'Formation';
            allCourseCounts[title] = (allCourseCounts[title] || 0) + 1;
        });
        setStudentsByCourse(Object.entries(allCourseCounts).map(([name, value]) => ({ name, value })));

        const statusCounts = raw.enrollments.reduce((counts: Record<string, number>, enrollment: any) => {
            const status = enrollment.status === 'approved' || enrollment.status === 'confirmed'
                ? 'Validées'
                : enrollment.status === 'pending'
                    ? 'En attente'
                    : 'Refusées';
            counts[status] = (counts[status] || 0) + 1;
            return counts;
        }, { 'Validées': 0, 'En attente': 0, 'Refusées': 0 });
        setEnrollmentStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));

        setSessionOccupancy(raw.sessions.map((session: any) => {
            const course = Array.isArray(session.courses) ? session.courses[0] : session.courses;
            const occupied = confirmedEnrollments.filter((enrollment: any) => enrollment.session_id === session.id).length;
            const capacity = Number(session.seats_available || 0);
            return {
                name: `${course?.title_fr || 'Session'} · ${new Date(session.start_date).toLocaleDateString('fr-FR')}`,
                occupied,
                available: Math.max(capacity - occupied, 0),
                capacity
            };
        }).slice(0, 10));

        const studentMonths: { name: string; month: number; year: number; value: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            studentMonths.push({
                name: date.toLocaleDateString('fr-FR', { month: 'short' }),
                month: date.getMonth(),
                year: date.getFullYear(),
                value: 0
            });
        }
        raw.students.forEach((student: any) => {
            const createdAt = new Date(student.created_at);
            const month = studentMonths.find(item => item.month === createdAt.getMonth() && item.year === createdAt.getFullYear());
            if (month) month.value += 1;
        });
        setStudentTimeline(studentMonths);

        const absenceCounts = (raw.attendance || [])
            .filter((record: any) => record.status === 'absent')
            .reduce((counts: Record<string, number>, record: any) => {
                const date = String(record.seance_date || '').slice(0, 10);
                if (date) counts[date] = (counts[date] || 0) + 1;
                return counts;
            }, {});
        const heatmapDays = Array.from({ length: 84 }, (_, index) => {
            const date = new Date();
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - (83 - index));
            const key = date.toISOString().slice(0, 10);
            return { date, key, value: absenceCounts[key] || 0 };
        });
        setAbsenceHeatmap(heatmapDays);

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
                                room: 'Atelier principal'
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

    const updateSessionRequest = async (id: string, status: 'processed' | 'rejected') => {
        try {
            const response = await fetch('/api/session-requests', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            setSessionRequests(current => current.map(request => request.id === id ? { ...request, status } : request));
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Impossible de mettre à jour la demande.');
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
                <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] animate-pulse">Chargement du tableau de bord...</p>
            </div>
        );
    }

    return (
        <div className="admin-home-dashboard space-y-10 pb-20 max-w-[1600px] mx-auto">
            {/* --- HEADER --- */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-brand-green font-black uppercase tracking-[0.3em] text-[10px] mb-2">
                        <Zap size={14} fill="currentColor" /> Centre de contrôle
                    </div>
                    <h1 className="admin-main-title text-white uppercase">
                        TABLEAU <span className="text-brand-green">DE BORD</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">GSM GUIDE ACADEMY • Tableau de contrôle opérationnel</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="px-6 py-2 bg-slate-900 border border-white/5 rounded-2xl flex items-center gap-3 shadow-2xl">
                        <div className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
                        <span className="text-xs font-black text-white uppercase tracking-widest">DONNÉES EN DIRECT</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
                {[
                    { label: 'Total Étudiants', value: stats.students, sub: `+${stats.newToday} aujourd'hui`, icon: Users, color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
                    { label: 'Chiffre d\'Affaires', value: `${stats.revenue.toLocaleString()} DT`, sub: 'Revenus confirmés', icon: CreditCard, color: 'text-brand-green', bg: 'bg-brand-green/10' },
                    { label: 'Sessions Actives', value: stats.sessions, sub: 'Planning opérationnel', icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-400/10' },
                    { label: 'Experts techniques', value: stats.teachers, sub: 'Professeurs actifs', icon: GraduationCap, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                    { label: 'Étudiants inscrits', value: stats.enrolledStudents, sub: 'Inscriptions validées', icon: BookOpen, color: 'text-violet-500', bg: 'bg-violet-500/10' },
                ].map((stat, i) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        onClick={() => router.push(['/admin/students', '/admin/payments', '/admin/sessions', '/admin/teachers', '/admin/students'][i])}
                        role="link"
                        tabIndex={0}
                        onKeyDown={(event) => event.key === 'Enter' && router.push(['/admin/students', '/admin/payments', '/admin/sessions', '/admin/teachers', '/admin/students'][i])}
                        className="premium-card p-8 group relative overflow-hidden cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-green"
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
                        <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-brand-green opacity-0 transition-opacity group-hover:opacity-100">Voir les détails <ChevronRight size={13} /></span>
                    </motion.div>
                ))}
            </div>

            <section
                onClick={() => router.push('/admin/presence')}
                role="link"
                tabIndex={0}
                onKeyDown={(event) => event.key === 'Enter' && router.push('/admin/presence')}
                className="premium-card cursor-pointer overflow-hidden focus:outline-none focus:ring-2 focus:ring-brand-green"
            >
                <div className="flex flex-col gap-4 border-b border-slate-200 p-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-black uppercase text-white"><CheckCircle2 size={20} className="text-brand-green" /> Statistiques des présences</h2>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Toutes les feuilles de présence enregistrées</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl font-black text-brand-green">{attendanceStats.rate}%</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Taux de présence</span>
                        <ChevronRight className="text-brand-green" size={20} />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-px bg-slate-200 md:grid-cols-5">
                    {[
                        { label: 'Pointages', value: attendanceStats.total, color: 'text-brand-blue' },
                        { label: 'Présents', value: attendanceStats.present, color: 'text-emerald-500' },
                        { label: 'Absents', value: attendanceStats.absent, color: 'text-rose-500' },
                        { label: 'Retards', value: attendanceStats.late, color: 'text-amber-500' },
                        { label: 'Excusés', value: attendanceStats.excused, color: 'text-blue-500' }
                    ].map(item => (
                        <div key={item.label} className="bg-white p-6 text-center transition-colors hover:bg-slate-50">
                            <p className={`text-3xl font-black tabular-nums ${item.color}`}>{item.value}</p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{item.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="premium-card overflow-hidden">
                <div className="flex flex-col gap-3 border-b border-slate-200 p-6 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h2 className="flex items-center gap-2 text-lg font-black uppercase text-white"><MessageSquare size={20} className="text-brand-green" /> Demandes d’étudiants</h2>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Demandes de création et de prochaine session</p>
                    </div>
                    <span className="w-fit rounded-lg bg-brand-green/15 px-3 py-1.5 text-xs font-black text-brand-green">{sessionRequests.filter(request => request.status === 'pending').length} en attente</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px] text-left">
                        <thead className="bg-slate-50"><tr className="text-[10px] font-black uppercase tracking-widest text-slate-500"><th className="px-6 py-4">Étudiant</th><th className="px-5 py-4">Formation</th><th className="px-5 py-4">Demande</th><th className="px-5 py-4">Disponibilité</th><th className="px-5 py-4">Date</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {sessionRequests.map(request => (
                                <tr key={request.id} className="hover:bg-brand-green/[0.04]">
                                    <td className="px-6 py-4"><p className="font-black text-white">{request.full_name}</p><p className="text-xs text-slate-500">{request.email} · {request.phone}</p>{request.message && <p className="mt-1 max-w-xs truncate text-xs text-slate-400" title={request.message}>{request.message}</p>}</td>
                                    <td className="px-5 py-4 text-sm font-bold text-slate-700">{request.courses?.title_fr || 'Formation'}</td>
                                    <td className="px-5 py-4"><span className="rounded-lg bg-brand-blue/10 px-3 py-1.5 text-[10px] font-black uppercase text-brand-blue">{request.request_type === 'create_session' ? 'Créer une session' : 'Prochaine session'}</span></td>
                                    <td className="px-5 py-4 text-sm font-bold text-slate-600">{request.availability}</td>
                                    <td className="px-5 py-4 text-xs font-bold text-slate-500">{new Date(request.created_at).toLocaleDateString('fr-FR')}</td>
                                    <td className="px-6 py-4"><div className="flex justify-end gap-2">{request.status === 'pending' ? <><button onClick={() => updateSessionRequest(request.id, 'processed')} className="rounded-lg border border-emerald-200 p-2 text-emerald-600 hover:bg-emerald-50" title="Marquer comme traitée"><CheckCircle2 size={17} /></button><button onClick={() => updateSessionRequest(request.id, 'rejected')} className="rounded-lg border border-rose-200 p-2 text-rose-500 hover:bg-rose-50" title="Refuser"><X size={17} /></button></> : <span className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase ${request.status === 'processed' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>{request.status === 'processed' ? 'Traitée' : 'Refusée'}</span>}</div></td>
                                </tr>
                            ))}
                            {sessionRequests.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-sm font-bold text-slate-400">Aucune demande d’étudiant.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* --- MAIN CHARTS AREA --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Revenue & Growth Trend */}
                <div onClick={() => router.push('/admin/payments')} role="link" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && router.push('/admin/payments')} className="lg:col-span-2 premium-card p-8 flex flex-col cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-green">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h3 className="text-xl font-black text-white flex items-center gap-2 uppercase italic tracking-tight">
                                <TrendingUp size={24} className="text-brand-green" />
                                Évolution des revenus
                            </h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Évolution des revenus mensuels (DT)</p>
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
                    <div onClick={() => router.push('/admin/courses')} role="link" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && router.push('/admin/courses')} className="premium-card p-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-green">
                        <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                            <Layers size={16} className="text-brand-blue" /> Formations populaires
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
                    <div onClick={() => router.push('/admin/sessions')} role="link" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && router.push('/admin/sessions')} className="premium-card p-6 bg-gradient-to-br from-slate-900/50 to-brand-green/5 border-l-4 border-l-brand-green cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-green">
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
                <div onClick={() => router.push('/admin/students')} role="link" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && router.push('/admin/students')} className="premium-card p-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-green">
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
                <div onClick={() => router.push('/admin/students')} role="link" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && router.push('/admin/students')} className="premium-card p-8 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-green">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 rounded-2xl bg-amber-400/10 text-amber-400">
                            <Target size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase italic tracking-tight">Origine des inscriptions</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Répartition par source</p>
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
                                    width={160}
                                    axisLine={false}
                                    tickLine={false}
                                    tick={<SourceAxisTick />}
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '16px', border: 'none' }}
                                    cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                    labelFormatter={(source) => (SOURCE_META[String(source)] || SOURCE_META.unknown).label}
                                    formatter={(value) => [value, 'Inscriptions']}
                                />
                                <Bar 
                                    dataKey="value" 
                                    fill="#a1b83e" 
                                    radius={[0, 8, 8, 0]} 
                                    barSize={20}
                                >
                                    {sourceDistribution.map((source) => (
                                        <Cell key={source.name} fill={source.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            
            {/* --- OPERATIONAL DETAILS --- */}
            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
                <div onClick={() => router.push('/admin/courses')} role="link" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && router.push('/admin/courses')} className="premium-card cursor-pointer p-8 focus:outline-none focus:ring-2 focus:ring-brand-green">
                    <div className="mb-6 flex items-center justify-between">
                        <div><h3 className="text-lg font-black uppercase text-white">Étudiants par formation</h3><p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Inscriptions validées par formation</p></div>
                        <BookOpen className="text-brand-blue" size={24} />
                    </div>
                    <div className="h-[340px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={studentsByCourse} layout="vertical" margin={{ left: 25 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis dataKey="name" type="category" width={155} tick={{ fontSize: 10, fontWeight: 700 }} />
                                <Tooltip formatter={(value) => [value, 'Étudiants']} />
                                <Bar dataKey="value" fill="#2572B0" radius={[0, 8, 8, 0]} barSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div onClick={() => router.push('/admin/students')} role="link" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && router.push('/admin/students')} className="premium-card cursor-pointer p-8 focus:outline-none focus:ring-2 focus:ring-brand-green">
                    <div className="mb-6 flex items-center justify-between">
                        <div><h3 className="text-lg font-black uppercase text-white">Statut des inscriptions</h3><p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Validées, en attente et refusées</p></div>
                        <PieIcon className="text-brand-green" size={24} />
                    </div>
                    <div className="h-[340px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={enrollmentStatusData} dataKey="value" nameKey="name" cx="50%" cy="48%" innerRadius={75} outerRadius={115} paddingAngle={5}>
                                    {enrollmentStatusData.map((entry, index) => <Cell key={entry.name} fill={['#10B981', '#F59E0B', '#F43F5E'][index]} />)}
                                </Pie>
                                <Tooltip formatter={(value) => [value, 'Inscriptions']} />
                                <Legend verticalAlign="bottom" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div onClick={() => router.push('/admin/sessions')} role="link" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && router.push('/admin/sessions')} className="premium-card cursor-pointer p-8 focus:outline-none focus:ring-2 focus:ring-brand-green">
                    <div className="mb-6 flex items-center justify-between">
                        <div><h3 className="text-lg font-black uppercase text-white">Remplissage des sessions</h3><p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Places occupées et encore disponibles</p></div>
                        <Calendar className="text-amber-500" size={24} />
                    </div>
                    <div className="h-[360px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sessionOccupancy} layout="vertical" margin={{ left: 25 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                <XAxis type="number" allowDecimals={false} />
                                <YAxis dataKey="name" type="category" width={170} tick={{ fontSize: 9, fontWeight: 700 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="occupied" name="Places occupées" stackId="capacity" fill="#A1B83E" barSize={18} />
                                <Bar dataKey="available" name="Places disponibles" stackId="capacity" fill="#CBD5E1" radius={[0, 8, 8, 0]} barSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div onClick={() => router.push('/admin/students')} role="link" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && router.push('/admin/students')} className="premium-card cursor-pointer p-8 focus:outline-none focus:ring-2 focus:ring-brand-green">
                    <div className="mb-6 flex items-center justify-between">
                        <div><h3 className="text-lg font-black uppercase text-white">Nouvelles inscriptions</h3><p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Évolution sur les six derniers mois</p></div>
                        <TrendingUp className="text-brand-green" size={24} />
                    </div>
                    <div className="h-[360px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={studentTimeline}>
                                <defs><linearGradient id="studentGrowth" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2572B0" stopOpacity={0.35} /><stop offset="95%" stopColor="#2572B0" stopOpacity={0} /></linearGradient></defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis allowDecimals={false} />
                                <Tooltip formatter={(value) => [value, 'Nouveaux étudiants']} />
                                <Area type="monotone" dataKey="value" stroke="#2572B0" strokeWidth={4} fill="url(#studentGrowth)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div onClick={() => router.push('/admin/presence')} role="link" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && router.push('/admin/presence')} className="premium-card cursor-pointer p-8 focus:outline-none focus:ring-2 focus:ring-brand-green">
                <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div><h3 className="text-lg font-black uppercase text-white">Calendrier thermique des absences</h3><p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">Les 12 dernières semaines · plus la case est foncée, plus les absences sont nombreuses</p></div>
                    <Activity className="text-rose-500" size={26} />
                </div>
                <div className="overflow-x-auto pb-2">
                    <div className="grid min-w-[720px] grid-flow-col grid-rows-7 gap-2">
                        {absenceHeatmap.map(day => {
                            const intensity = day.value === 0 ? 'bg-slate-100' : day.value === 1 ? 'bg-rose-200' : day.value <= 3 ? 'bg-rose-400' : 'bg-rose-600';
                            return <div key={day.key} title={`${day.date.toLocaleDateString('fr-FR')} : ${day.value} absence(s)`} className={`h-7 min-w-7 rounded-md ${intensity} transition-transform hover:scale-125`} />;
                        })}
                    </div>
                </div>
                <div className="mt-5 flex items-center justify-end gap-2 text-[10px] font-bold uppercase text-slate-500"><span>Moins</span><span className="h-3 w-3 rounded-sm bg-slate-100" /><span className="h-3 w-3 rounded-sm bg-rose-200" /><span className="h-3 w-3 rounded-sm bg-rose-400" /><span className="h-3 w-3 rounded-sm bg-rose-600" /><span>Plus</span></div>
            </div>

            {/* --- SYSTEM HEALTH --- */}
            <div onClick={() => router.push('/admin/analytics')} role="link" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && router.push('/admin/analytics')} className="premium-card p-10 bg-gradient-to-r from-slate-900 to-[#0a0f19] flex flex-col md:flex-row items-center justify-between gap-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-green">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-brand-green/20 flex items-center justify-center text-brand-green shadow-[0_0_30px_rgba(161,184,62,0.1)]">
                        <ShieldCheck size={32} />
                    </div>
                    <div>
                        <h4 className="text-xl font-black text-white italic uppercase tracking-tight">Intégrité du système optimisée</h4>
                        <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Connectivité Supabase stable • Disponibilité de 99,9 %</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-center flex flex-col justify-center">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Latence</span>
                        <span className="text-lg font-black text-white tabular-nums">14ms</span>
                    </div>
                    <div className="px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-center flex flex-col justify-center">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Sauvegarde</span>
                        <span className="text-lg font-black text-green-400 tabular-nums">SÉCURISÉE</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
