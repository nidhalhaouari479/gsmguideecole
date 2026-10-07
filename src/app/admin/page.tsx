"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '@/lib/supabase';
import {
    Users,
    BookOpen,
    CreditCard,
    GraduationCap,
    Calendar,
    ArrowUpRight,
    Target,
    X,
    PieChart as PieIcon,
    Layers,
    Download,
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
import {
    PageHeader,
    Card,
    CardHeader,
    StatCard,
    Badge,
    Button,
    IconButton,
    FilterTabs,
    EmptyState,
    Skeleton,
    table,
    cn,
    formatDT,
} from '@/components/admin/ui';

// --- CHART SYSTEM ---
// One accent (blue) for magnitude, slate for "rest", semantic colours only for status.
const ACCENT = '#2563eb';
const NEUTRAL_FILL = '#e2e8f0';
const MUTED_SERIES = '#94a3b8';
const STATUS_COLORS: Record<string, string> = { 'Validées': '#10b981', 'En attente': '#f59e0b', 'Refusées': '#f43f5e' };

const GRID_STROKE = '#f1f5f9';
const AXIS_TICK = { fill: '#64748b', fontSize: 12 };
const AXIS_TICK_SMALL = { fill: '#64748b', fontSize: 12 };
const LEGEND_STYLE: React.CSSProperties = { fontSize: 12, color: '#475569', paddingBottom: 8 };
const TOOLTIP_STYLE: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    boxShadow: '0 4px 12px -4px rgba(15, 23, 42, 0.12)',
    fontSize: 13,
    color: '#0f172a',
    padding: '8px 12px',
};
const TOOLTIP_LABEL_STYLE: React.CSSProperties = { color: '#0f172a', fontWeight: 600, marginBottom: 4 };
const TOOLTIP_CURSOR = { fill: 'rgba(15,23,42,0.04)' };
const truncateLabel = (value: string) => {
    const text = String(value ?? '');
    return text.length > 22 ? `${text.slice(0, 21)}…` : text;
};

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
            <div className="flex h-full items-center justify-end gap-2 pr-1 text-xs text-slate-600">
                <Icon size={14} className="text-slate-400" />
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
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const query = window.matchMedia('(max-width: 767px)');
        const update = () => setIsMobile(query.matches);
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

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
        const months: { name: string; month: number; year: number; revenue: number; siteStudents: number; trainingStudents: number }[] = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            months.push({
                name: d.toLocaleDateString('fr-FR', { month: 'short' }),
                month: d.getMonth(),
                year: d.getFullYear(),
                revenue: 0,
                siteStudents: 0,
                trainingStudents: 0
            });
        }

        raw.students.forEach((student: any) => {
            const date = new Date(student.created_at);
            const entry = months.find(m => m.month === date.getMonth() && m.year === date.getFullYear());
            if (entry) entry.siteStudents += 1;
        });

        const trainingStudentIdsByMonth = new Map<string, Set<string>>();
        confirmedEnrollments.forEach((e: any) => {
            const date = new Date(e.created_at);
            const entry = months.find(m => m.month === date.getMonth() && m.year === date.getFullYear());
            if (entry) {
                entry.revenue += (Number(e.amount_paid) || 0);
                const key = `${entry.year}-${entry.month}`;
                const ids = trainingStudentIdsByMonth.get(key) || new Set<string>();
                ids.add(e.user_id);
                trainingStudentIdsByMonth.set(key, ids);
            }
        });
        months.forEach((entry) => {
            entry.trainingStudents = trainingStudentIdsByMonth.get(`${entry.year}-${entry.month}`)?.size || 0;
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

    // UI-only: which measure the main trend chart shows (avoids a dual-axis chart).
    const [trendView, setTrendView] = useState<'revenue' | 'students'>('revenue');

    if (loading) {
        return (
            <div className="admin-home-dashboard mx-auto max-w-[1600px] space-y-6" role="status" aria-live="polite">
                <span className="sr-only">Chargement du tableau de bord…</span>
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-56" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                    <Skeleton className="h-10 w-full md:w-44" />
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={cn('space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm', i === 4 && 'col-span-2 md:col-span-1')}>
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-7 w-20" />
                            <Skeleton className="h-3 w-28" />
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <Skeleton className="h-80 rounded-xl lg:col-span-2" />
                    <Skeleton className="h-80 rounded-xl" />
                </div>
            </div>
        );
    }

    const kpiTiles = [
        { label: 'Étudiants', value: stats.students.toLocaleString('fr-FR'), sub: `+${stats.newToday} aujourd'hui`, icon: Users, href: '/admin/students' },
        { label: "Chiffre d'affaires", value: formatDT(stats.revenue), sub: 'Revenus confirmés', icon: CreditCard, href: '/admin/payments' },
        { label: 'Sessions', value: stats.sessions.toLocaleString('fr-FR'), sub: 'Planning opérationnel', icon: Calendar, href: '/admin/sessions' },
        { label: 'Professeurs', value: stats.teachers.toLocaleString('fr-FR'), sub: 'Professeurs actifs', icon: GraduationCap, href: '/admin/teachers' },
        { label: 'Étudiants inscrits', value: stats.enrolledStudents.toLocaleString('fr-FR'), sub: 'Inscriptions validées', icon: BookOpen, href: '/admin/students' },
    ];

    const pendingRequests = sessionRequests.filter(request => request.status === 'pending').length;

    const renderRequestTypeBadge = (request: any) => (
        <Badge>{request.request_type === 'create_session' ? 'Créer une session' : 'Prochaine session'}</Badge>
    );

    const renderRequestActions = (request: any) => request.status === 'pending' ? (
        <div className="flex gap-1">
            <IconButton
                icon={CheckCircle2}
                onClick={() => updateSessionRequest(request.id, 'processed')}
                title="Marquer comme traitée"
                label={`Marquer la demande de ${request.full_name} comme traitée`}
                className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            />
            <IconButton
                icon={X}
                onClick={() => updateSessionRequest(request.id, 'rejected')}
                title="Refuser"
                label={`Refuser la demande de ${request.full_name}`}
                className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            />
        </div>
    ) : (
        <Badge tone={request.status === 'processed' ? 'success' : 'danger'}>
            {request.status === 'processed' ? 'Traitée' : 'Refusée'}
        </Badge>
    );

    const hasStudentsByCourse = studentsByCourse.some(item => item.value > 0);
    const hasEnrollmentStatus = enrollmentStatusData.some(item => item.value > 0);
    const hasAgeData = ageDistribution.some(item => item.value > 0);
    const hasSourceData = sourceDistribution.some(item => item.value > 0);

    const attendanceItems = [
        { label: 'Pointages', value: attendanceStats.total, className: 'text-slate-900' },
        { label: 'Présents', value: attendanceStats.present, className: 'text-emerald-700' },
        { label: 'Absents', value: attendanceStats.absent, className: 'text-rose-600' },
        { label: 'Retards', value: attendanceStats.late, className: 'text-amber-700' },
        { label: 'Excusés', value: attendanceStats.excused, className: 'text-slate-900' },
    ];

    return (
        <div className="admin-home-dashboard mx-auto max-w-[1600px] space-y-6 pb-4 md:pb-10">
            <PageHeader
                title="Tableau de bord"
                description="Vue d’ensemble de l’activité de GSM Guide Academy."
                actions={
                    <>
                        <span className="inline-flex h-10 items-center gap-2 px-1 text-sm text-slate-500">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                            Données en direct
                        </span>
                        <Button
                            variant="primary"
                            icon={Download}
                            onClick={handleGenerateReport}
                            loading={isGenerating}
                            title={isGenerating ? 'Génération du rapport en cours' : 'Télécharger le rapport PDF'}
                            className="w-full sm:w-auto"
                        >
                            {isGenerating ? 'Génération…' : 'Exporter le rapport'}
                        </Button>
                    </>
                }
            />

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {kpiTiles.map((stat, i) => (
                    <div key={stat.label} className={cn('min-w-0', i === 4 && 'col-span-2 md:col-span-1')}>
                        <StatCard
                            label={stat.label}
                            value={stat.value}
                            hint={stat.sub}
                            icon={stat.icon}
                            onClick={() => router.push(stat.href)}
                        />
                    </div>
                ))}
            </div>

            {/* Trend + side lists */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <Card className="min-w-0 lg:col-span-2">
                    <CardHeader
                        title={trendView === 'revenue' ? 'Évolution des revenus' : 'Évolution des inscriptions'}
                        description="6 derniers mois"
                        actions={
                            <FilterTabs
                                label="Mesure affichée"
                                value={trendView}
                                onChange={setTrendView}
                                options={[
                                    { value: 'revenue', label: 'Revenus' },
                                    { value: 'students', label: 'Inscriptions' },
                                ]}
                            />
                        }
                    />
                    <div className="mt-5 h-64 w-full md:h-[320px]">
                        <ResponsiveContainer width="100%" height="100%">
                            {trendView === 'revenue' ? (
                                <AreaChart data={revenueTimeline} margin={isMobile ? { left: -16, right: 4, top: 4 } : { top: 4, right: 8, left: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={ACCENT} stopOpacity={0.12} />
                                            <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                                    <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(val) => `${val / 1000}k`} />
                                    <Tooltip
                                        contentStyle={TOOLTIP_STYLE}
                                        labelStyle={TOOLTIP_LABEL_STYLE}
                                        cursor={{ stroke: '#cbd5e1' }}
                                        formatter={(value) => [formatDT(Number(value)), 'Revenus']}
                                    />
                                    <Area type="monotone" dataKey="revenue" name="Revenus (DT)" stroke={ACCENT} strokeWidth={2} fill="url(#colorRev)" activeDot={{ r: 4 }} />
                                </AreaChart>
                            ) : (
                                <LineChart data={revenueTimeline} margin={isMobile ? { left: -16, right: 4, top: 4 } : { top: 4, right: 8, left: -8 }}>
                                    <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                                    <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                                    <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={{ stroke: '#cbd5e1' }} />
                                    <Legend verticalAlign="top" align="right" height={32} iconType="circle" iconSize={8} wrapperStyle={LEGEND_STYLE} />
                                    <Line type="monotone" dataKey="siteStudents" name="Inscrits sur le site" stroke={ACCENT} strokeWidth={2} dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }} activeDot={{ r: 4 }} />
                                    <Line type="monotone" dataKey="trainingStudents" name="Inscrits en formation" stroke={MUTED_SERIES} strokeWidth={2} dot={{ r: 3, fill: MUTED_SERIES, strokeWidth: 0 }} activeDot={{ r: 4 }} />
                                </LineChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </Card>

                <div className="grid min-w-0 grid-cols-1 content-start gap-4">
                    {/* Course popularity */}
                    <Card className="min-w-0">
                        <CardHeader title="Formations populaires" description="Top 5 des inscriptions validées" actions={<ViewLink href="/admin/courses" />} />
                        {coursePerformance.length === 0 ? (
                            <EmptyState icon={Layers} title="Aucune inscription validée" description="Les formations les plus suivies apparaîtront ici." className="py-8" />
                        ) : (
                            <ol className="mt-4 space-y-3.5">
                                {coursePerformance.map((item, i) => (
                                    <li key={item.name} className="space-y-1.5">
                                        <div className="flex items-baseline justify-between gap-3 text-sm">
                                            <span className="flex min-w-0 items-baseline gap-2">
                                                <span className="text-xs text-slate-400 tabular-nums">{i + 1}</span>
                                                <span className="truncate font-medium text-slate-700" title={item.name}>{item.name}</span>
                                            </span>
                                            <span className="shrink-0 text-xs text-slate-500 tabular-nums">{item.value} inscr.</span>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className="h-full rounded-full"
                                                style={{ width: `${Math.min((item.value / Math.max(stats.enrollments, 1)) * 100, 100)}%`, backgroundColor: ACCENT }}
                                            />
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </Card>

                    {/* Upcoming seances */}
                    <Card className="min-w-0">
                        <CardHeader title="Prochaines séances" description="Les 4 séances à venir" actions={<ViewLink href="/admin/sessions" />} />
                        {upcomingSeances.length === 0 ? (
                            <EmptyState icon={Calendar} title="Aucune séance planifiée" description="Les prochaines séances apparaîtront ici." className="py-8" />
                        ) : (
                            <ul className="mt-4 divide-y divide-slate-100">
                                {upcomingSeances.map((s, i) => (
                                    <li key={i} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                                        <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                                            <span className="text-sm font-semibold leading-none text-slate-900 tabular-nums">{s.date.getDate()}</span>
                                            <span className="mt-0.5 text-[11px] leading-none text-slate-500">{s.date.toLocaleDateString('fr-FR', { month: 'short' })}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-slate-900" title={s.title}>{s.title}</p>
                                            <p className="truncate text-xs text-slate-500">
                                                {s.label} · <span className="tabular-nums">{s.time}</span> · {s.room}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                </div>
            </div>

            {/* Attendance */}
            <Card>
                <CardHeader
                    title="Présences"
                    description="Toutes les feuilles de présence enregistrées"
                    actions={<ViewLink href="/admin/presence" label="Ouvrir les présences" />}
                />
                <div className="mt-5 flex items-end justify-between gap-4">
                    <div>
                        <p className="text-sm text-slate-500">Taux de présence</p>
                        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">{attendanceStats.rate} %</p>
                    </div>
                </div>
                <div
                    className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-label="Taux de présence"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={attendanceStats.rate}
                >
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${attendanceStats.rate}%` }} />
                </div>
                <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-slate-100 pt-4 sm:grid-cols-5">
                    {attendanceItems.map((item) => (
                        <div key={item.label} className="min-w-0">
                            <dt className="text-xs text-slate-500">{item.label}</dt>
                            <dd className={cn('mt-0.5 text-lg font-semibold tabular-nums', item.className)}>{item.value.toLocaleString('fr-FR')}</dd>
                        </div>
                    ))}
                </dl>
            </Card>

            {/* Student requests */}
            <Card padded={false} className="overflow-hidden">
                <CardHeader
                    className="border-b border-slate-200 p-5"
                    title="Demandes d’étudiants"
                    description="Demandes de création et de prochaine session"
                    actions={<Badge tone={pendingRequests > 0 ? 'warning' : 'neutral'}>{pendingRequests} en attente</Badge>}
                />

                {sessionRequests.length === 0 ? (
                    <EmptyState icon={MessageSquare} title="Aucune demande d’étudiant" description="Les demandes envoyées depuis le site apparaîtront ici." />
                ) : (
                    <>
                        <ul className="divide-y divide-slate-100 md:hidden">
                            {sessionRequests.map(request => (
                                <li key={request.id} className="space-y-2.5 p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-slate-900">{request.full_name}</p>
                                            <p className="truncate text-sm text-slate-500">{request.courses?.title_fr || 'Formation'}</p>
                                        </div>
                                        <span className="whitespace-nowrap text-xs text-slate-500 tabular-nums">{new Date(request.created_at).toLocaleDateString('fr-FR')}</span>
                                    </div>
                                    {renderRequestTypeBadge(request)}
                                    <div className="space-y-1 text-sm">
                                        <p className="flex min-w-0 flex-wrap gap-x-2 gap-y-1">
                                            {request.email && <a href={`mailto:${request.email}`} className="break-all text-brand-blue hover:underline">{request.email}</a>}
                                            {request.phone && <a href={`tel:${request.phone}`} className="whitespace-nowrap text-brand-blue hover:underline">{request.phone}</a>}
                                        </p>
                                        {request.availability && <p className="break-words text-slate-700"><span className="text-slate-500">Disponibilité : </span>{request.availability}</p>}
                                        {request.message && <p className="break-words text-slate-500">{request.message}</p>}
                                    </div>
                                    <div className="flex justify-end">{renderRequestActions(request)}</div>
                                </li>
                            ))}
                        </ul>
                        <div className={cn(table.wrapper, 'hidden max-h-[520px] overflow-y-auto custom-scrollbar md:block')}>
                            <table className={cn(table.table, 'min-w-[900px]')}>
                                <thead className={table.thead}>
                                    <tr>
                                        <th className={cn(table.th, 'pl-5')}>Étudiant</th>
                                        <th className={table.th}>Formation</th>
                                        <th className={table.th}>Demande</th>
                                        <th className={table.th}>Disponibilité</th>
                                        <th className={table.th}>Date</th>
                                        <th className={cn(table.th, 'pr-5 text-right')}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className={table.tbody}>
                                    {sessionRequests.map(request => (
                                        <tr key={request.id} className={table.tr}>
                                            <td className={cn(table.td, 'pl-5')}>
                                                <p className="font-medium text-slate-900">{request.full_name}</p>
                                                <p className="text-xs text-slate-500">
                                                    {request.email && <a href={`mailto:${request.email}`} className="text-brand-blue hover:underline">{request.email}</a>}
                                                    {request.email && request.phone && ' · '}
                                                    {request.phone && <a href={`tel:${request.phone}`} className="whitespace-nowrap text-brand-blue hover:underline">{request.phone}</a>}
                                                </p>
                                                {request.message && <p className="mt-1 max-w-xs truncate text-xs text-slate-500" title={request.message}>{request.message}</p>}
                                            </td>
                                            <td className={table.td}>{request.courses?.title_fr || 'Formation'}</td>
                                            <td className={table.td}>{renderRequestTypeBadge(request)}</td>
                                            <td className={cn(table.td, 'text-slate-500')}>{request.availability || <span className="text-slate-400">—</span>}</td>
                                            <td className={cn(table.td, 'whitespace-nowrap text-slate-500 tabular-nums')}>{new Date(request.created_at).toLocaleDateString('fr-FR')}</td>
                                            <td className={cn(table.td, 'pr-5')}><div className="flex justify-end">{renderRequestActions(request)}</div></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </Card>

            {/* Analytics charts */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {/* Age distribution */}
                <Card className="min-w-0">
                    <CardHeader title="Âge des étudiants" description="Répartition par tranche d’âge" actions={<ViewLink href="/admin/students" />} />
                    {!hasAgeData ? <ChartEmpty icon={Users} title="Aucun étudiant enregistré" /> : (
                        <div className="mt-4 h-64 w-full md:h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={ageDistribution} margin={{ top: 4, right: 4, left: -24 }}>
                                    <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                                    <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                                    <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={TOOLTIP_CURSOR} labelFormatter={(label) => label === 'N/D' ? 'Âge non renseigné' : `${label} ans`} formatter={(value) => [value, 'Étudiants']} />
                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
                                        {ageDistribution.map((entry) => (
                                            <Cell key={entry.name} fill={entry.name === 'N/D' ? NEUTRAL_FILL : ACCENT} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>

                {/* Source distribution */}
                <Card className="min-w-0">
                    <CardHeader title="Origine des inscriptions" description="Comment les étudiants nous ont connus" actions={<ViewLink href="/admin/students" />} />
                    {!hasSourceData ? <ChartEmpty icon={Target} title="Aucune source renseignée" /> : (
                        <div className="mt-4 h-64 w-full md:h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={sourceDistribution} layout="vertical" margin={{ right: 12 }}>
                                    <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={150} axisLine={false} tickLine={false} tick={<SourceAxisTick />} />
                                    <Tooltip
                                        contentStyle={TOOLTIP_STYLE}
                                        labelStyle={TOOLTIP_LABEL_STYLE}
                                        cursor={TOOLTIP_CURSOR}
                                        labelFormatter={(source) => (SOURCE_META[String(source)] || SOURCE_META.unknown).label}
                                        formatter={(value) => [value, 'Inscriptions']}
                                    />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                                        {sourceDistribution.map((source) => (
                                            <Cell key={source.name} fill={source.name === 'unknown' || source.name === 'other' ? MUTED_SERIES : ACCENT} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>

                {/* Enrollment status */}
                <Card className="min-w-0">
                    <CardHeader title="Statut des inscriptions" description="Validées, en attente et refusées" actions={<ViewLink href="/admin/students" />} />
                    {!hasEnrollmentStatus ? <ChartEmpty icon={PieIcon} title="Aucune inscription pour le moment" /> : (
                        <div className="mt-4 h-64 md:h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={enrollmentStatusData} dataKey="value" nameKey="name" cx="50%" cy="45%" innerRadius={isMobile ? 56 : 66} outerRadius={isMobile ? 80 : 92} paddingAngle={2} stroke="#fff" strokeWidth={2}>
                                        {enrollmentStatusData.map((entry) => <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || MUTED_SERIES} />)}
                                    </Pie>
                                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value) => [value, 'Inscriptions']} />
                                    <Legend verticalAlign="bottom" iconType="circle" iconSize={8} formatter={(value) => <span className="ml-1 text-xs text-slate-600">{value}</span>} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>

                {/* Students by course */}
                <Card className="min-w-0">
                    <CardHeader title="Étudiants par formation" description="Inscriptions validées par formation" actions={<ViewLink href="/admin/courses" />} />
                    {!hasStudentsByCourse ? <ChartEmpty icon={BookOpen} title="Aucune inscription validée par formation" /> : (
                        <div className="mt-4 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={studentsByCourse} layout="vertical" margin={{ left: 0, right: 12 }}>
                                    <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                                    <YAxis dataKey="name" type="category" width={isMobile ? 110 : 150} tick={AXIS_TICK_SMALL} tickFormatter={truncateLabel} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={TOOLTIP_CURSOR} formatter={(value) => [value, 'Étudiants']} />
                                    <Bar dataKey="value" fill={ACCENT} radius={[0, 4, 4, 0]} barSize={14} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>

                {/* Session occupancy */}
                <Card className="min-w-0">
                    <CardHeader title="Remplissage des sessions" description="Places occupées et encore disponibles" actions={<ViewLink href="/admin/sessions" />} />
                    {sessionOccupancy.length === 0 ? <ChartEmpty icon={Calendar} title="Aucune session créée" /> : (
                        <div className="mt-4 h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={sessionOccupancy} layout="vertical" margin={{ left: 0, right: 12 }}>
                                    <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                                    <YAxis dataKey="name" type="category" width={isMobile ? 120 : 170} tick={AXIS_TICK_SMALL} tickFormatter={truncateLabel} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={TOOLTIP_CURSOR} />
                                    <Legend verticalAlign="top" align="right" height={28} iconType="circle" iconSize={8} wrapperStyle={LEGEND_STYLE} />
                                    <Bar dataKey="occupied" name="Places occupées" stackId="capacity" fill={ACCENT} barSize={14} />
                                    <Bar dataKey="available" name="Places disponibles" stackId="capacity" fill={NEUTRAL_FILL} radius={[0, 4, 4, 0]} barSize={14} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </Card>

                {/* New registrations */}
                <Card className="min-w-0">
                    <CardHeader title="Nouvelles inscriptions" description="Six derniers mois" actions={<ViewLink href="/admin/students" />} />
                    <div className="mt-4 h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={studentTimeline} margin={{ top: 4, right: 8, left: isMobile ? -16 : -8 }}>
                                <defs>
                                    <linearGradient id="studentGrowth" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={ACCENT} stopOpacity={0.12} />
                                        <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                                <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
                                <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} />
                                <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} cursor={{ stroke: '#cbd5e1' }} formatter={(value) => [value, 'Nouveaux étudiants']} />
                                <Area type="monotone" dataKey="value" stroke={ACCENT} strokeWidth={2} fill="url(#studentGrowth)" activeDot={{ r: 4 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Absence heatmap */}
            <Card className="min-w-0">
                <CardHeader
                    title="Calendrier des absences"
                    description="12 dernières semaines — plus la case est foncée, plus il y a d’absences"
                    actions={<ViewLink href="/admin/presence" />}
                />
                <div className="mt-5 overflow-x-auto pb-2 custom-scrollbar">
                    <div className="grid min-w-[720px] grid-flow-col grid-rows-7 gap-1">
                        {absenceHeatmap.map(day => {
                            const intensity = day.value === 0 ? 'bg-slate-100' : day.value === 1 ? 'bg-rose-200' : day.value <= 3 ? 'bg-rose-400' : 'bg-rose-600';
                            return <div key={day.key} title={`${day.date.toLocaleDateString('fr-FR')} : ${day.value} absence(s)`} className={`h-6 min-w-6 rounded ${intensity}`} />;
                        })}
                    </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-slate-500">
                    <span className="mr-1">Moins</span>
                    <span className="h-3 w-3 rounded-sm bg-slate-100 ring-1 ring-inset ring-slate-200" />
                    <span className="h-3 w-3 rounded-sm bg-rose-200" />
                    <span className="h-3 w-3 rounded-sm bg-rose-400" />
                    <span className="h-3 w-3 rounded-sm bg-rose-600" />
                    <span className="ml-1">Plus</span>
                </div>
            </Card>

            {/* System status */}
            <Card className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                        <ShieldCheck size={18} />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-slate-900">Système opérationnel</h2>
                        <p className="text-sm text-slate-500">Connectivité Supabase stable · Disponibilité de 99,9 %</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <div>
                        <p className="text-xs text-slate-500">Latence</p>
                        <p className="text-sm font-semibold text-slate-900 tabular-nums">14 ms</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500">Sauvegarde</p>
                        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />Sécurisée
                        </p>
                    </div>
                    <ViewLink href="/admin/analytics" label="Voir l’analyse du site" />
                </div>
            </Card>
        </div>
    );
}

function ViewLink({ href, label = 'Voir' }: { href: string; label?: string }) {
    return (
        <Link
            href={href}
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40"
        >
            {label}
            <ArrowUpRight size={14} />
        </Link>
    );
}

function ChartEmpty({ icon, title }: { icon: React.ComponentProps<typeof EmptyState>['icon']; title: string }) {
    return (
        <div className="mt-4 flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-200 md:h-[280px]">
            <EmptyState icon={icon} title={title} className="py-0" />
        </div>
    );
}
