"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    ArrowDown,
    ArrowUp,
    BookOpen,
    CalendarDays,
    ChevronDown,
    ChevronRight,
    CheckCircle2,
    CirclePlay,
    Download,
    Flag,
    Flame,
    Gauge,
    HandCoins,
    ImageOff,
    MessageSquare,
    Minus,
    Repeat,
    User,
    UserCheck,
    UserPlus,
    UserRoundX,
    UserX,
    Users,
    Wallet,
    X,
    type LucideIcon,
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
} from 'recharts';
import {
    Badge,
    Button,
    Card,
    EmptyState,
    IconButton,
    Skeleton,
    table,
    cn,
    formatDT,
} from '@/components/admin/ui';

/* ------------------------------------------------------------------ */
/* Data shapes (what /api/admin/dashboard returns)                     */
/* ------------------------------------------------------------------ */

type Student = { id: string; full_name?: string | null; avatar_url?: string | null; source?: string | null; created_at?: string | null };
type Teacher = { id: string; nom?: string | null; prenom?: string | null };
type Course = { id: string; title_fr?: string | null; image_url?: string | null; instructor_id?: string | null };
type Session = {
    id: string;
    course_id?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    seats_available?: number | null;
    schedule?: unknown;
    courses?: Course | Course[] | null;
};
type Enrollment = {
    id: string;
    user_id: string;
    session_id: string;
    status?: string | null;
    amount_paid?: number | string | null;
    total_price?: number | string | null;
    created_at?: string | null;
};
type SessionRequest = {
    id: string;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    availability?: string | null;
    message?: string | null;
    request_type?: string | null;
    status?: string | null;
    created_at: string;
    courses?: { title_fr?: string | null } | null;
};
type AttendanceRecord = { status?: string | null; seance_date?: string | null };
type DashboardData = {
    students: Student[];
    teachers: Teacher[];
    sessions: Session[];
    enrollments: Enrollment[];
    courses: Course[];
    sessionRequests: SessionRequest[];
    attendance: AttendanceRecord[];
};

type Period = 'month' | 'year' | 'all';
type FinanceRange = '7d' | '30d' | '3m' | 'year';
type Trend = { direction: 'up' | 'down' | 'flat'; text: string; caption?: string } | null;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const PERIOD_LABEL: Record<Period, string> = { month: 'Ce mois', year: 'Cette année', all: 'Depuis le début' };
const PERIOD_CAPTION: Record<Period, string> = { month: 'vs mois dernier', year: 'vs année dernière', all: '' };

// Chart series, in the order of the reference design.
const SERIES = { billed: '#8DAA2E', paid: '#2572B0', unpaid: '#E5484D' };

const SOURCE_META: Record<string, { label: string; color: string }> = {
    facebook: { label: 'Facebook', color: '#2572B0' },
    instagram: { label: 'Instagram', color: '#E8578A' },
    google: { label: 'Google', color: '#F5A524' },
    youtube: { label: 'YouTube', color: '#E5484D' },
    friend: { label: 'Recommandation', color: '#8DAA2E' },
    other: { label: 'Autres', color: '#94A3B8' },
    unknown: { label: 'Non renseigné', color: '#CBD5E1' },
};

const fmtInt = (value: number) => value.toLocaleString('fr-FR');
const fmtPct = (value: number) => `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%`;
const startOfDay = (date: Date) => { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; };
const addDays = (date: Date, days: number) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
const toDate = (value?: string | null) => (value ? new Date(value) : null);
const inRange = (value: string | null | undefined, start: Date, end: Date) => {
    const date = toDate(value);
    return !!date && date >= start && date < end;
};

const billedOf = (e: Enrollment) => Number(e.total_price) || Number(e.amount_paid) || 0;
const paidOf = (e: Enrollment) => Number(e.amount_paid) || 0;
const dueOf = (e: Enrollment) => Math.max(billedOf(e) - paidOf(e), 0);

const courseOf = (session?: Session | null): Course | null =>
    (Array.isArray(session?.courses) ? session?.courses[0] : session?.courses) || null;

const parseSchedule = (schedule: unknown): { instructor_id?: string; label?: string; seances?: Array<{ date?: string; start_time?: string }> } | null => {
    if (!schedule) return null;
    try {
        return typeof schedule === 'string' ? JSON.parse(schedule) : (schedule as never);
    } catch {
        return null;
    }
};

const normalizeSource = (value?: string | null) => {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return 'unknown';
    if (raw.includes('facebook')) return 'facebook';
    if (raw.includes('instagram')) return 'instagram';
    if (raw.includes('google')) return 'google';
    if (raw.includes('youtube')) return 'youtube';
    if (raw.includes('ami') || raw.includes('friend') || raw.includes('recommand')) return 'friend';
    return 'other';
};

/** Current period window and the matching window just before it (same length, for a fair comparison). */
const periodWindows = (period: Period, now: Date) => {
    if (period === 'all') return { start: new Date(0), end: addDays(now, 1), prevStart: null, prevEnd: null };
    const start = period === 'month' ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), 0, 1);
    const prevStart = period === 'month' ? new Date(now.getFullYear(), now.getMonth() - 1, 1) : new Date(now.getFullYear() - 1, 0, 1);
    const elapsed = now.getTime() - start.getTime();
    return { start, end: addDays(now, 1), prevStart, prevEnd: new Date(prevStart.getTime() + elapsed) };
};

const makeTrend = (current: number, previous: number | null, mode: 'pct' | 'abs', caption?: string): Trend => {
    if (previous === null) return null;
    const diff = current - previous;
    if (diff === 0) return { direction: 'flat', text: 'Stable' };
    const text = mode === 'abs'
        ? fmtInt(Math.abs(diff))
        : previous > 0 ? fmtPct((Math.abs(diff) / previous) * 100) : 'Nouveau';
    return { direction: diff > 0 ? 'up' : 'down', text, caption };
};

const initialsOf = (name?: string | null) =>
    String(name || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() || '').join('') || '?';

const AVATAR_TINTS = ['bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700', 'bg-amber-100 text-amber-800', 'bg-violet-100 text-violet-700', 'bg-rose-100 text-rose-700', 'bg-teal-100 text-teal-700'];
const tintOf = (key: string) => AVATAR_TINTS[[...key].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_TINTS.length];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminDashboard() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<DashboardData | null>(null);
    const [requests, setRequests] = useState<SessionRequest[]>([]);
    const [period, setPeriod] = useState<Period>('month');
    const [financeRange, setFinanceRange] = useState<FinanceRange>('30d');
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const response = await fetch('/api/admin/dashboard');
                const payload = await response.json();
                if (payload.error) throw new Error(payload.error);
                setData(payload);
                setRequests(payload.sessionRequests || []);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const view = useMemo(() => (data ? buildDashboard(data, period, financeRange) : null), [data, period, financeRange]);

    const handleGenerateReport = () => {
        if (!view) return;
        setIsGenerating(true);
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            doc.setFillColor(15, 23, 42);
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
                    ['Total Étudiants', view.report.students.toString()],
                    ['Nouveaux ce jour', view.report.newToday.toString()],
                    ['Chiffre d\'Affaires Global', `${view.report.revenue.toLocaleString()} DT`],
                    ['Nombre de Formations', view.report.courses.toString()],
                    ['Professeurs', view.report.teachers.toString()]
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
            setRequests(current => current.map(request => request.id === id ? { ...request, status } : request));
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Impossible de mettre à jour la demande.');
        }
    };

    const periodSelect = (
        <label className="relative inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white pl-4 pr-9 text-[13.5px] text-slate-700 shadow-[var(--shadow-card)] transition-colors hover:border-slate-300 focus-within:ring-2 focus-within:ring-focus/40">
            <CalendarDays size={17} className="text-slate-500" aria-hidden="true" />
            <span className="hidden sm:inline">Période :</span>
            <select
                value={period}
                onChange={(event) => setPeriod(event.target.value as Period)}
                aria-label="Période"
                className="cursor-pointer appearance-none border-none bg-transparent p-0 font-semibold text-slate-900 shadow-none focus:outline-none focus:ring-0"
            >
                {(Object.keys(PERIOD_LABEL) as Period[]).map(key => <option key={key} value={key}>{PERIOD_LABEL[key]}</option>)}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 text-slate-500" aria-hidden="true" />
        </label>
    );

    const exportButton = (
        <Button
            icon={Download}
            onClick={handleGenerateReport}
            loading={isGenerating}
            disabled={!view}
            title={isGenerating ? 'Génération du rapport en cours' : 'Télécharger le rapport PDF'}
            className="h-11 rounded-xl px-5"
        >
            {isGenerating ? 'Génération…' : 'Exporter rapport'}
        </Button>
    );

    return (
        <div className="admin-home-dashboard space-y-5">
            {/* Title + controls */}
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <h1 className="text-[20px] font-extrabold uppercase tracking-[-0.01em] text-slate-900 md:text-[22px]">Tableau de bord</h1>
                    <p className="mt-0.5 text-[13.5px] text-slate-500">Bienvenue, Admin ! Voici l’aperçu de votre académie.</p>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    {periodSelect}
                    <span className="hidden sm:inline-flex">{exportButton}</span>
                    <IconButton label="Exporter le rapport PDF" icon={Download} variant="secondary" onClick={handleGenerateReport} disabled={!view || isGenerating} className="h-11 w-11 rounded-xl sm:hidden" />
                </div>
            </header>

            {loading || !view ? <DashboardSkeleton /> : (
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
                        {view.kpis.map(kpi => <KpiCard key={kpi.label} {...kpi} />)}
                    </div>

                    {/* Finance + to-do + upcoming sessions */}
                    <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                        <Card padded={false} className="min-w-0 overflow-hidden xl:col-span-8">
                            <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
                                <div className="min-w-0 p-5">
                                    <SectionHeader
                                        title="Performance financière"
                                        actions={
                                            <Segmented
                                                label="Période du graphique"
                                                value={financeRange}
                                                onChange={setFinanceRange}
                                                options={[
                                                    { value: '7d', label: '7 jours' },
                                                    { value: '30d', label: '30 jours' },
                                                    { value: '3m', label: '3 mois' },
                                                    { value: 'year', label: 'Année' },
                                                ]}
                                            />
                                        }
                                    />
                                    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600" aria-label="Légende">
                                        <LegendItem color={SERIES.billed} label="CA facturé" />
                                        <LegendItem color={SERIES.paid} label="Encaissements" />
                                        <LegendItem color={SERIES.unpaid} label="Impayés" />
                                    </ul>
                                    <div className="mt-3 h-60 w-full md:h-[270px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={view.finance} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
                                                <defs>
                                                    {(['billed', 'paid'] as const).map(key => (
                                                        <linearGradient key={key} id={`fin-${key}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="0%" stopColor={SERIES[key]} stopOpacity={0.16} />
                                                            <stop offset="100%" stopColor={SERIES[key]} stopOpacity={0} />
                                                        </linearGradient>
                                                    ))}
                                                </defs>
                                                <CartesianGrid stroke="#e2e8f0" strokeDasharray="4 4" vertical={false} />
                                                <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={18} />
                                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} width={48} tickFormatter={(val) => val >= 1000 ? `${Math.round(val / 100) / 10}k` : String(val)} />
                                                <Tooltip content={<FinanceTooltip />} cursor={{ stroke: '#cbd5e1', strokeDasharray: '4 4' }} />
                                                <Area type="monotone" dataKey="billed" name="CA facturé" stroke={SERIES.billed} strokeWidth={2.25} fill="url(#fin-billed)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                                                <Area type="monotone" dataKey="paid" name="Encaissements" stroke={SERIES.paid} strokeWidth={2.25} fill="url(#fin-paid)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                                                <Area type="monotone" dataKey="unpaid" name="Impayés" stroke={SERIES.unpaid} strokeWidth={2} fill="transparent" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 p-5 lg:border-l lg:border-t-0">
                                    <SectionHeader title="À traiter aujourd’hui" />
                                    <ul className="mt-3 space-y-1">
                                        {view.todo.map(item => (
                                            <li key={item.label}>
                                                <Link
                                                    href={item.href}
                                                    className="group flex min-h-12 items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
                                                >
                                                    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', item.tile)}>
                                                        <item.icon size={17} aria-hidden="true" />
                                                    </span>
                                                    <span className="min-w-0 flex-1 text-[13px] font-medium text-slate-800">{item.label}</span>
                                                    <span className={cn('flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-[15px] font-bold tabular-nums', item.count > 0 ? item.badge : 'bg-slate-50 text-slate-400')}>
                                                        {item.count}
                                                    </span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Finance summary strip */}
                            <dl className="grid grid-cols-2 gap-px border-t border-slate-100 bg-slate-100 sm:grid-cols-3 xl:grid-cols-6">
                                {view.summary.map(item => (
                                    <div key={item.label} className="min-w-0 bg-white px-5 py-4">
                                        <dt className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">{item.label}</dt>
                                        <dd className="mt-1.5">
                                            {item.value}
                                            {item.trend && <TrendText trend={item.trend} className="mt-1" />}
                                        </dd>
                                    </div>
                                ))}
                            </dl>
                        </Card>

                        <Card padded={false} className="min-w-0 xl:col-span-4">
                            <SectionHeader title="Prochaines sessions" className="p-5 pb-3" actions={<ViewAll href="/admin/sessions" />} />
                            {view.upcoming.length === 0 ? (
                                <EmptyState icon={CalendarDays} title="Aucune session à venir" description="Les prochaines sessions planifiées apparaîtront ici." />
                            ) : (
                                <ul className="divide-y divide-slate-100 px-5 pb-2">
                                    {view.upcoming.map(session => (
                                        <li key={session.id} className="flex items-center gap-4 py-3.5">
                                            <div className="flex w-14 shrink-0 flex-col items-center rounded-xl border border-slate-200 py-2 text-center leading-none">
                                                <span className="text-[20px] font-bold text-slate-900 tabular-nums">{session.day}</span>
                                                <span className="mt-1 text-[10px] font-semibold uppercase text-slate-500">{session.month}</span>
                                                {session.time && <span className="mt-1.5 text-[10px] font-medium text-slate-500 tabular-nums">{session.time}</span>}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[14px] font-semibold text-slate-900">{session.title}</p>
                                                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                                                    <span className="inline-flex min-w-0 items-center gap-1.5">
                                                        <User size={13} aria-hidden="true" />
                                                        <span className="truncate">{session.instructor || 'Sans professeur'}</span>
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 tabular-nums">
                                                        <Users size={13} aria-hidden="true" />
                                                        {session.capacity > 0 ? `${session.occupied} / ${session.capacity}` : session.occupied}
                                                    </span>
                                                </p>
                                                {session.label && <p className="mt-1 truncate text-xs text-slate-400">{session.label}</p>}
                                            </div>
                                            <Badge tone={session.badge.tone} dot={false} className="shrink-0 rounded-lg">{session.badge.label}</Badge>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </div>

                    {/* Students, sources, popular courses */}
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                        <Card className="min-w-0">
                            <SectionHeader title="Évolution des étudiants" actions={<Badge dot={false}>{PERIOD_LABEL[period]}</Badge>} />
                            <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
                                <ul className="space-y-2">
                                    {view.studentFlow.map(item => (
                                        <li key={item.label} className="flex items-center gap-3 rounded-xl px-1 py-1">
                                            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', item.tile)}>
                                                <item.icon size={16} aria-hidden="true" />
                                            </span>
                                            <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700">{item.label}</span>
                                            <span className="text-[14px] font-bold text-slate-900 tabular-nums">{fmtInt(item.value)}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="space-y-4 border-slate-100 sm:border-l sm:pl-5">
                                    {view.rates.map(rate => (
                                        <div key={rate.label}>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">{rate.label}</p>
                                            <p className="mt-1 text-[15px] font-bold text-slate-900 tabular-nums">{rate.value === null ? '—' : fmtPct(rate.value)}</p>
                                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                                                <div className={cn('h-full rounded-full', rate.bar)} style={{ width: `${Math.min(100, rate.value || 0)}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">Étudiants multi-formations</p>
                                        <p className="mt-1 flex items-center gap-2 text-[15px] font-bold text-slate-900 tabular-nums">
                                            {fmtInt(view.multiCourse)} <Repeat size={14} className="text-slate-400" aria-hidden="true" />
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card className="min-w-0">
                            <SectionHeader title="Origine des inscriptions" actions={<Badge dot={false}>Tous les étudiants</Badge>} />
                            {view.sources.total === 0 ? (
                                <EmptyState icon={Users} title="Aucun étudiant enregistré" className="py-10" />
                            ) : (
                                <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                                    <div className="relative h-40 w-40 shrink-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={view.sources.rows} dataKey="count" nameKey="label" innerRadius={50} outerRadius={76} paddingAngle={2} stroke="none" startAngle={90} endAngle={-270}>
                                                    {view.sources.rows.map(row => <Cell key={row.key} fill={row.color} />)}
                                                </Pie>
                                                <Tooltip formatter={(value, name) => [`${value} étudiants`, name]} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-[20px] font-bold text-slate-900 tabular-nums">{fmtInt(view.sources.total)}</span>
                                            <span className="text-[11px] text-slate-500">étudiants</span>
                                        </div>
                                    </div>
                                    <table className="w-full min-w-0 text-[12.5px]">
                                        <caption className="sr-only">Origine des inscriptions</caption>
                                        <tbody>
                                            {view.sources.rows.map(row => (
                                                <tr key={row.key}>
                                                    <th scope="row" className="py-1.5 pr-2 text-left font-medium text-slate-700">
                                                        <span className="inline-flex items-center gap-2">
                                                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} aria-hidden="true" />
                                                            {row.label}
                                                        </span>
                                                    </th>
                                                    <td className="py-1.5 pr-2 text-right font-semibold text-slate-900 tabular-nums">{row.count}</td>
                                                    <td className="py-1.5 pr-2 text-right text-slate-500 tabular-nums">({fmtPct(row.share)})</td>
                                                    <td className="whitespace-nowrap py-1.5 text-right font-medium text-slate-700 tabular-nums">{formatDT(row.revenue)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="border-t border-slate-100">
                                                <th scope="row" className="pt-2.5 text-left font-semibold text-slate-900">Total</th>
                                                <td className="pt-2.5 pr-2 text-right font-semibold text-slate-900 tabular-nums">{view.sources.total}</td>
                                                <td className="pt-2.5 pr-2 text-right text-slate-500">(100%)</td>
                                                <td className="whitespace-nowrap pt-2.5 text-right font-bold text-slate-900 tabular-nums">{formatDT(view.sources.revenue)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </Card>

                        <Card className="min-w-0 md:col-span-2 xl:col-span-1">
                            <SectionHeader title="Formations populaires" actions={<ViewAll href="/admin/courses" />} />
                            {view.popular.length === 0 ? (
                                <EmptyState icon={BookOpen} title="Aucune inscription validée" description="Les formations les plus suivies apparaîtront ici." className="py-10" />
                            ) : (
                                <ul className="mt-3 space-y-3">
                                    {view.popular.map(course => (
                                        <li key={course.id} className="flex items-center gap-3">
                                            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
                                                {course.image ? (
                                                    <img src={course.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                                                ) : (
                                                    <ImageOff size={18} aria-hidden="true" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[13.5px] font-semibold text-slate-900">{course.title}</p>
                                                <p className="text-xs text-slate-500">{fmtInt(course.students)} étudiant{course.students > 1 ? 's' : ''}</p>
                                                {course.fill !== null && (
                                                    <div className="mt-1.5 flex items-center gap-2">
                                                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                                                            <div className="h-full rounded-full bg-brand-green" style={{ width: `${Math.min(100, course.fill)}%` }} />
                                                        </div>
                                                        <span className="shrink-0 text-[11px] text-slate-500 tabular-nums">{Math.round(course.fill)}% rempli</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="shrink-0 text-right">
                                                <p className="text-[14px] font-bold text-slate-900 tabular-nums">{formatDT(course.revenue)}</p>
                                                <p className="text-[11px] text-slate-500">CA généré</p>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Card>
                    </div>

                    {/* Recent enrollments */}
                    <Card>
                        <SectionHeader title="Inscriptions récentes" actions={<ViewAll href="/admin/students" />} />
                        {view.recent.length === 0 ? (
                            <EmptyState icon={UserPlus} title="Aucune inscription pour le moment" className="py-10" />
                        ) : (
                            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                                {view.recent.map(item => (
                                    <li key={item.id} className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200/80 p-3.5">
                                        {item.avatar ? (
                                            <img src={item.avatar} alt="" loading="lazy" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                                        ) : (
                                            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-bold', tintOf(item.name))} aria-hidden="true">
                                                {initialsOf(item.name)}
                                            </span>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13.5px] font-semibold text-slate-900">{item.name}</p>
                                            <p className="truncate text-xs text-slate-500">{item.course}</p>
                                            <div className="mt-2 flex items-center justify-between gap-2">
                                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 tabular-nums">
                                                    <CalendarDays size={12} aria-hidden="true" />{item.date}
                                                </span>
                                                <Badge tone={item.badge.tone} dot={false} className="rounded-lg px-2 text-[11px]">{item.badge.label}</Badge>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>

                    {/* Student requests (actionable) */}
                    <RequestsCard requests={requests} onUpdate={updateSessionRequest} />
                </>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Derived data                                                        */
/* ------------------------------------------------------------------ */

function buildDashboard(raw: DashboardData, period: Period, financeRange: FinanceRange) {
    const now = new Date();
    const today = startOfDay(now);
    const tomorrow = addDays(today, 1);
    const { start, end, prevStart, prevEnd } = periodWindows(period, now);
    const caption = PERIOD_CAPTION[period];

    const students = raw.students || [];
    const sessions = raw.sessions || [];
    const enrollments = raw.enrollments || [];
    const approved = enrollments.filter(e => e.status === 'approved');
    const sessionById = new Map(sessions.map(s => [s.id, s]));
    const studentById = new Map(students.map(s => [s.id, s]));
    const courseById = new Map((raw.courses || []).map(c => [c.id, c]));
    const occupiedBySession = approved.reduce((map, e) => map.set(e.session_id, (map.get(e.session_id) || 0) + 1), new Map<string, number>());
    const courseForSession = (session?: Session | null) => courseOf(session) || (session?.course_id ? courseById.get(session.course_id) || null : null);

    const instructorName = (session: Session) => {
        const id = parseSchedule(session.schedule)?.instructor_id || courseForSession(session)?.instructor_id;
        const teacher = id ? raw.teachers.find(t => t.id === id) : null;
        return teacher ? `${teacher.prenom || ''} ${teacher.nom || ''}`.trim() || null : null;
    };

    const sumPaid = (from: Date, to: Date) => approved.filter(e => inRange(e.created_at, from, to)).reduce((sum, e) => sum + paidOf(e), 0);
    const countStudents = (from: Date, to: Date) => students.filter(s => inRange(s.created_at, from, to)).length;

    // --- KPIs
    const enrolledStudents = new Set(approved.map(e => e.user_id)).size;
    const newStudents = countStudents(start, end);
    const newStudentsPrev = prevStart && prevEnd ? countStudents(prevStart, prevEnd) : null;
    const cashed = sumPaid(start, end);
    const cashedPrev = prevStart && prevEnd ? sumPaid(prevStart, prevEnd) : null;
    const openBalances = approved.filter(e => dueOf(e) > 0);
    const toCollect = openBalances.reduce((sum, e) => sum + dueOf(e), 0);

    const sessionStart = (s: Session) => toDate(s.start_date);
    const sessionEnd = (s: Session) => toDate(s.end_date) || sessionStart(s);
    const running = sessions.filter(s => { const a = sessionStart(s); const b = sessionEnd(s); return !!a && !!b && a < tomorrow && b >= today; });
    const upcomingAll = sessions.filter(s => { const a = sessionStart(s); return !!a && a >= tomorrow; });
    const liveOrNext = [...running, ...upcomingAll].filter(s => Number(s.seats_available) > 0);
    const seatsTotal = liveOrNext.reduce((sum, s) => sum + Number(s.seats_available || 0), 0);
    const seatsTaken = liveOrNext.reduce((sum, s) => sum + Math.min(occupiedBySession.get(s.id) || 0, Number(s.seats_available || 0)), 0);
    const fillRate = seatsTotal > 0 ? (seatsTaken / seatsTotal) * 100 : null;

    const kpis: KpiProps[] = [
        { label: 'Étudiants actifs', value: fmtInt(enrolledStudents), icon: Users, tile: 'bg-brand-green', note: `${fmtInt(students.length)} comptes au total`, href: '/admin/students' },
        { label: 'Nouveaux étudiants', value: fmtInt(newStudents), icon: UserPlus, tile: 'bg-[#4C8DF6]', trend: makeTrend(newStudents, newStudentsPrev, 'abs', caption), note: PERIOD_LABEL[period], href: '/admin/students' },
        { label: 'CA encaissé', value: fmtInt(cashed), unit: 'DT', icon: Wallet, tile: 'bg-emerald-500', trend: makeTrend(cashed, cashedPrev, 'pct', caption), note: PERIOD_LABEL[period], href: '/admin/payments' },
        { label: 'À encaisser', value: fmtInt(toCollect), unit: 'DT', icon: HandCoins, tile: 'bg-amber-500', note: `${fmtInt(openBalances.length)} solde${openBalances.length > 1 ? 's' : ''} ouvert${openBalances.length > 1 ? 's' : ''}`, href: '/admin/payments' },
        { label: 'Sessions en cours', value: fmtInt(running.length), icon: CalendarDays, tile: 'bg-violet-500', note: `${fmtInt(upcomingAll.length)} à venir`, href: '/admin/sessions' },
        { label: 'Taux de remplissage', value: fillRate === null ? '—' : fmtPct(Math.round(fillRate)), icon: Gauge, tile: 'bg-teal-500', note: seatsTotal > 0 ? `${fmtInt(seatsTaken)} / ${fmtInt(seatsTotal)} places` : 'Aucune session ouverte', href: '/admin/sessions' },
    ];

    // --- Finance chart (amounts are dated by enrollment, as in the rest of the dashboard)
    const buckets: Array<{ label: string; from: Date; to: Date }> = [];
    if (financeRange === '7d' || financeRange === '30d') {
        const days = financeRange === '7d' ? 7 : 30;
        for (let i = days - 1; i >= 0; i--) {
            const from = addDays(today, -i);
            buckets.push({ label: from.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), from, to: addDays(from, 1) });
        }
    } else if (financeRange === '3m') {
        for (let i = 12; i >= 0; i--) {
            const to = addDays(tomorrow, -7 * i);
            const from = addDays(to, -7);
            buckets.push({ label: from.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }), from, to });
        }
    } else {
        for (let i = 11; i >= 0; i--) {
            const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
            buckets.push({ label: from.toLocaleDateString('fr-FR', { month: 'short' }), from, to: new Date(from.getFullYear(), from.getMonth() + 1, 1) });
        }
    }
    const finance = buckets.map(({ label, from, to }) => {
        const inBucket = approved.filter(e => inRange(e.created_at, from, to));
        const billed = inBucket.reduce((sum, e) => sum + billedOf(e), 0);
        const paid = inBucket.reduce((sum, e) => sum + paidOf(e), 0);
        return { label, billed, paid, unpaid: Math.max(billed - paid, 0) };
    });

    // --- Summary strip
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const elapsedMonth = now.getTime() - monthStart.getTime();
    const elapsedYear = now.getTime() - yearStart.getTime();
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const monthPaid = sumPaid(monthStart, tomorrow);
    const yearPaid = sumPaid(yearStart, tomorrow);
    const avgBasket = approved.length > 0 ? approved.reduce((sum, e) => sum + billedOf(e), 0) / approved.length : 0;

    const revenueByCourse = new Map<string, { id: string; title: string; image: string | null; revenue: number; students: number }>();
    approved.forEach(e => {
        const course = courseForSession(sessionById.get(e.session_id));
        const id = course?.id || 'unknown';
        const entry = revenueByCourse.get(id) || { id, title: course?.title_fr || 'Formation', image: course?.image_url || null, revenue: 0, students: 0 };
        entry.revenue += paidOf(e);
        entry.students += 1;
        revenueByCourse.set(id, entry);
    });
    const bestCourse = [...revenueByCourse.values()].sort((a, b) => b.revenue - a.revenue)[0];

    const money = (value: number) => (
        <span className="text-[18px] font-bold text-slate-900 tabular-nums">{fmtInt(Math.round(value))} <span className="text-[12px] font-semibold text-slate-500">DT</span></span>
    );
    const summary: Array<{ label: string; value: React.ReactNode; trend?: Trend }> = [
        { label: 'Aujourd’hui', value: money(sumPaid(today, tomorrow)) },
        { label: 'Ce mois', value: money(monthPaid), trend: makeTrend(monthPaid, sumPaid(lastMonthStart, new Date(lastMonthStart.getTime() + elapsedMonth)), 'pct') },
        { label: 'Cette année', value: money(yearPaid), trend: makeTrend(yearPaid, sumPaid(lastYearStart, new Date(lastYearStart.getTime() + elapsedYear)), 'pct') },
        { label: 'À encaisser', value: money(toCollect) },
        { label: 'Panier moyen', value: money(avgBasket) },
        {
            label: 'Meilleure formation',
            value: bestCourse ? (
                <span className="block min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-slate-900" title={bestCourse.title}>{bestCourse.title}</span>
                    <span className="text-xs text-slate-500 tabular-nums">{formatDT(bestCourse.revenue)}</span>
                </span>
            ) : <span className="text-[13px] text-slate-400">—</span>,
        },
    ];

    // --- To-do list
    const weekAgo = addDays(today, -7);
    const nearlyFull = upcomingAll.filter(s => {
        const cap = Number(s.seats_available || 0);
        const occ = occupiedBySession.get(s.id) || 0;
        return cap > 0 && occ / cap >= 0.8 && occ < cap;
    }).length;
    const todo: Array<{ label: string; count: number; icon: LucideIcon; tile: string; badge: string; href: string }> = [
        { label: 'Inscriptions à confirmer', count: enrollments.filter(e => e.status === 'pending').length, icon: UserCheck, tile: 'bg-sky-50 text-sky-700', badge: 'bg-sky-50 text-sky-700', href: '/admin/payments' },
        { label: 'Soldes impayés', count: openBalances.length, icon: Wallet, tile: 'bg-rose-50 text-rose-600', badge: 'bg-rose-50 text-rose-700', href: '/admin/payments' },
        { label: 'Sessions presque complètes', count: nearlyFull, icon: Flame, tile: 'bg-amber-50 text-amber-600', badge: 'bg-amber-50 text-amber-700', href: '/admin/sessions' },
        { label: 'Absences (7 derniers jours)', count: (raw.attendance || []).filter(r => r.status === 'absent' && inRange(r.seance_date, weekAgo, tomorrow)).length, icon: UserX, tile: 'bg-violet-50 text-violet-600', badge: 'bg-violet-50 text-violet-700', href: '/admin/presence' },
        { label: 'Sessions sans professeur', count: upcomingAll.filter(s => !instructorName(s)).length, icon: UserRoundX, tile: 'bg-orange-50 text-orange-600', badge: 'bg-orange-50 text-orange-700', href: '/admin/sessions' },
        { label: 'Demandes d’étudiants', count: (raw.sessionRequests || []).filter(r => r.status === 'pending').length, icon: MessageSquare, tile: 'bg-teal-50 text-teal-600', badge: 'bg-teal-50 text-teal-700', href: '#demandes' },
    ];

    // --- Upcoming sessions
    const upcoming = [...upcomingAll]
        .sort((a, b) => (sessionStart(a)?.getTime() || 0) - (sessionStart(b)?.getTime() || 0))
        .slice(0, 4)
        .map(s => {
            const startDate = sessionStart(s) as Date;
            const schedule = parseSchedule(s.schedule);
            const capacity = Number(s.seats_available || 0);
            const occupied = occupiedBySession.get(s.id) || 0;
            const ratio = capacity > 0 ? occupied / capacity : 0;
            const badge: { tone: 'danger' | 'warning' | 'success'; label: string } = capacity > 0 && occupied >= capacity
                ? { tone: 'danger', label: 'Complète' }
                : ratio >= 0.8 ? { tone: 'warning', label: 'Presque complète' } : { tone: 'success', label: 'Places disponibles' };
            return {
                id: s.id,
                day: String(startDate.getDate()).padStart(2, '0'),
                month: startDate.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
                time: schedule?.seances?.[0]?.start_time?.slice(0, 5) || '',
                title: courseForSession(s)?.title_fr || 'Formation',
                instructor: instructorName(s),
                label: schedule?.label || '',
                capacity,
                occupied,
                badge,
            };
        });

    // --- Student flow & rates
    const attendance = raw.attendance || [];
    const present = attendance.filter(r => r.status === 'present' || r.status === 'late').length;
    const absent = attendance.filter(r => r.status === 'absent').length;
    const enrollmentsPerStudent = approved.reduce((map, e) => map.set(e.user_id, (map.get(e.user_id) || 0) + 1), new Map<string, number>());
    const studentFlow: Array<{ label: string; value: number; icon: LucideIcon; tile: string }> = [
        { label: 'Nouveaux étudiants', value: newStudents, icon: UserPlus, tile: 'bg-brand-green-soft text-brand-green-700' },
        { label: 'Inscrits en formation', value: enrolledStudents, icon: CheckCircle2, tile: 'bg-sky-50 text-sky-700' },
        { label: 'Formations en cours', value: approved.filter(e => { const s = sessionById.get(e.session_id); const a = s && sessionStart(s); const b = s && sessionEnd(s); return !!a && !!b && a < tomorrow && b >= today; }).length, icon: CirclePlay, tile: 'bg-amber-50 text-amber-700' },
        { label: 'Formations terminées', value: approved.filter(e => { const s = sessionById.get(e.session_id); const b = s && sessionEnd(s); return !!b && b < today; }).length, icon: Flag, tile: 'bg-violet-50 text-violet-700' },
        { label: 'Comptes créés', value: students.length, icon: Users, tile: 'bg-slate-100 text-slate-600' },
    ];
    const rates: Array<{ label: string; value: number | null; bar: string }> = [
        { label: 'Taux d’assiduité', value: attendance.length ? (present / attendance.length) * 100 : null, bar: 'bg-brand-green' },
        { label: 'Taux d’absence', value: attendance.length ? (absent / attendance.length) * 100 : null, bar: 'bg-rose-500' },
        { label: 'Taux de conversion', value: students.length ? (enrolledStudents / students.length) * 100 : null, bar: 'bg-sky-500' },
    ];
    const multiCourse = [...enrollmentsPerStudent.values()].filter(count => count > 1).length;

    // --- Sources
    const sourceCounts = new Map<string, { count: number; revenue: number }>();
    students.forEach(s => {
        const key = normalizeSource(s.source);
        const entry = sourceCounts.get(key) || { count: 0, revenue: 0 };
        entry.count += 1;
        sourceCounts.set(key, entry);
    });
    approved.forEach(e => {
        const key = normalizeSource(studentById.get(e.user_id)?.source);
        const entry = sourceCounts.get(key) || { count: 0, revenue: 0 };
        entry.revenue += paidOf(e);
        sourceCounts.set(key, entry);
    });
    const sourceRows = Object.keys(SOURCE_META)
        .map(key => ({ key, ...SOURCE_META[key], ...(sourceCounts.get(key) || { count: 0, revenue: 0 }) }))
        .filter(row => row.count > 0)
        .map(row => ({ ...row, share: students.length ? (row.count / students.length) * 100 : 0 }));
    const sources = {
        rows: sourceRows,
        total: students.length,
        revenue: sourceRows.reduce((sum, row) => sum + row.revenue, 0),
    };

    // --- Popular courses
    const seatsByCourse = new Map<string, { cap: number; occ: number }>();
    sessions.forEach(s => {
        const id = courseForSession(s)?.id;
        if (!id) return;
        const entry = seatsByCourse.get(id) || { cap: 0, occ: 0 };
        entry.cap += Number(s.seats_available || 0);
        entry.occ += occupiedBySession.get(s.id) || 0;
        seatsByCourse.set(id, entry);
    });
    const popular = [...revenueByCourse.values()]
        .sort((a, b) => b.students - a.students || b.revenue - a.revenue)
        .slice(0, 4)
        .map(course => {
            const seats = seatsByCourse.get(course.id);
            return { ...course, fill: seats && seats.cap > 0 ? (seats.occ / seats.cap) * 100 : null };
        });

    // --- Recent enrollments
    const recent = [...enrollments]
        .sort((a, b) => (toDate(b.created_at)?.getTime() || 0) - (toDate(a.created_at)?.getTime() || 0))
        .slice(0, 5)
        .map(e => {
            const student = studentById.get(e.user_id);
            const badge: { tone: 'success' | 'warning' | 'danger'; label: string } = e.status === 'approved'
                ? { tone: 'success', label: 'Confirmée' }
                : e.status === 'pending' ? { tone: 'warning', label: 'En attente' } : { tone: 'danger', label: 'Refusée' };
            return {
                id: e.id,
                name: student?.full_name || 'Étudiant',
                avatar: student?.avatar_url || null,
                course: courseForSession(sessionById.get(e.session_id))?.title_fr || 'Formation',
                date: e.created_at ? new Date(e.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—',
                badge,
            };
        });

    const report = {
        students: students.length,
        newToday: countStudents(today, tomorrow),
        revenue: approved.reduce((sum, e) => sum + paidOf(e), 0),
        courses: (raw.courses || []).length,
        teachers: (raw.teachers || []).length,
    };

    return { kpis, finance, summary, todo, upcoming, studentFlow, rates, multiCourse, sources, popular, recent, report };
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

type KpiProps = {
    label: string;
    value: string;
    unit?: string;
    icon: LucideIcon;
    tile: string;
    trend?: Trend;
    note?: string;
    href: string;
};

function KpiCard({ label, value, unit, icon: Icon, tile, trend, note, href }: KpiProps) {
    return (
        <Link
            href={href}
            className="group flex min-w-0 flex-col rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50 motion-reduce:hover:translate-y-0 md:p-5"
        >
            <div className="flex items-center gap-2.5">
                <span className={cn('hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#fff] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] md:flex', tile)}>
                    <Icon size={18} aria-hidden="true" />
                </span>
                <span className="min-w-0 text-[12px] font-medium text-slate-600 md:text-[11px] md:font-semibold md:uppercase md:leading-tight md:tracking-[0.02em]">{label}</span>
            </div>
            <p className="mt-3 text-[24px] font-bold leading-none tracking-tight text-slate-900 tabular-nums md:mt-4 md:text-[30px]">
                {value}
                {unit && <span className="ml-1 text-[13px] font-semibold text-slate-500 md:text-[16px]">{unit}</span>}
            </p>
            <div className="mt-auto pt-3">
                {trend ? <TrendText trend={trend} /> : note ? <p className="truncate text-xs text-slate-500">{note}</p> : null}
            </div>
        </Link>
    );
}

function TrendText({ trend, className }: { trend: NonNullable<Trend>; className?: string }) {
    const Icon = trend.direction === 'up' ? ArrowUp : trend.direction === 'down' ? ArrowDown : Minus;
    return (
        <p className={cn('flex min-w-0 items-center gap-1 text-xs', className)}>
            <span className={cn(
                'inline-flex shrink-0 items-center gap-0.5 font-semibold tabular-nums',
                trend.direction === 'up' ? 'text-emerald-700' : trend.direction === 'down' ? 'text-rose-600' : 'text-slate-500'
            )}>
                <Icon size={12} strokeWidth={2.5} aria-hidden="true" />
                <span className="sr-only">{trend.direction === 'up' ? 'Hausse de' : trend.direction === 'down' ? 'Baisse de' : ''}</span>
                {trend.text}
            </span>
            {trend.caption && <span className="truncate text-slate-500">{trend.caption}</span>}
        </p>
    );
}

function LegendItem({ color, label }: { color: string; label: string }) {
    return (
        <li className="inline-flex items-center gap-2">
            <span className="h-[3px] w-4 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
            {label}
        </li>
    );
}

function FinanceTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey?: string | number; value?: number | string; name?: string; color?: string }>; label?: string }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="min-w-44 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs shadow-[var(--shadow-pop)]">
            <p className="mb-1.5 font-semibold text-slate-500">{label}</p>
            {payload.map(entry => (
                <p key={String(entry.dataKey)} className="flex items-center justify-between gap-4 py-0.5">
                    <span className="inline-flex items-center gap-2 text-slate-600">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden="true" />
                        {entry.name}
                    </span>
                    <span className="font-semibold text-slate-900 tabular-nums">{formatDT(Number(entry.value))}</span>
                </p>
            ))}
        </div>
    );
}

/** Dashboard section title: uppercase, as in the reference design. */
function SectionHeader({ title, description, actions, className }: { title: React.ReactNode; description?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
    return (
        <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between', className)}>
            <div className="min-w-0">
                <h2 className="text-[13px] font-bold uppercase tracking-[0.02em] text-slate-900">{title}</h2>
                {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
            </div>
            {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

/** Segmented control with the lime active state of the reference design. */
function Segmented<T extends string>({ options, value, onChange, label }: { options: Array<{ value: T; label: string }>; value: T; onChange: (value: T) => void; label: string }) {
    return (
        <div role="group" aria-label={label} className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-xl border border-slate-200/80 bg-white p-1">
            {options.map(option => {
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            'inline-flex h-8 shrink-0 cursor-pointer items-center rounded-lg px-3 text-[12.5px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50',
                            active ? 'bg-brand-green-600 font-semibold text-[#fff]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                        )}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

function ViewAll({ href }: { href: string }) {
    return (
        <Link
            href={href}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-semibold text-brand-green-700 transition-colors hover:bg-brand-green-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
        >
            Voir tout <ChevronRight size={14} aria-hidden="true" />
        </Link>
    );
}

function RequestsCard({ requests, onUpdate }: { requests: SessionRequest[]; onUpdate: (id: string, status: 'processed' | 'rejected') => void }) {
    const pending = requests.filter(request => request.status === 'pending').length;

    const typeBadge = (request: SessionRequest) => (
        <Badge>{request.request_type === 'create_session' ? 'Créer une session' : 'Prochaine session'}</Badge>
    );

    const actions = (request: SessionRequest) => request.status === 'pending' ? (
        <div className="flex gap-1">
            <IconButton
                icon={CheckCircle2}
                onClick={() => onUpdate(request.id, 'processed')}
                title="Marquer comme traitée"
                label={`Marquer la demande de ${request.full_name} comme traitée`}
                className="text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
            />
            <IconButton
                icon={X}
                onClick={() => onUpdate(request.id, 'rejected')}
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

    return (
        <Card padded={false} className="scroll-mt-24 overflow-hidden">
            <div id="demandes" />
            <SectionHeader
                className="border-b border-slate-100 p-5"
                title="Demandes d’étudiants"
                description="Demandes de création et de prochaine session"
                actions={<Badge tone={pending > 0 ? 'warning' : 'neutral'}>{pending} en attente</Badge>}
            />

            {requests.length === 0 ? (
                <EmptyState icon={MessageSquare} title="Aucune demande d’étudiant" description="Les demandes envoyées depuis le site apparaîtront ici." />
            ) : (
                <>
                    <ul className="divide-y divide-slate-100 md:hidden">
                        {requests.map(request => (
                            <li key={request.id} className="space-y-2.5 p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-slate-900">{request.full_name}</p>
                                        <p className="truncate text-sm text-slate-500">{request.courses?.title_fr || 'Formation'}</p>
                                    </div>
                                    <span className="whitespace-nowrap text-xs text-slate-500 tabular-nums">{new Date(request.created_at).toLocaleDateString('fr-FR')}</span>
                                </div>
                                {typeBadge(request)}
                                <div className="space-y-1 text-sm">
                                    <p className="flex min-w-0 flex-wrap gap-x-2 gap-y-1">
                                        {request.email && <a href={`mailto:${request.email}`} className="break-all text-brand-blue hover:underline">{request.email}</a>}
                                        {request.phone && <a href={`tel:${request.phone}`} className="whitespace-nowrap text-brand-blue hover:underline">{request.phone}</a>}
                                    </p>
                                    {request.availability && <p className="break-words text-slate-700"><span className="text-slate-500">Disponibilité : </span>{request.availability}</p>}
                                    {request.message && <p className="break-words text-slate-500">{request.message}</p>}
                                </div>
                                <div className="flex justify-end">{actions(request)}</div>
                            </li>
                        ))}
                    </ul>
                    <div className={cn(table.wrapper, 'hidden max-h-[520px] overflow-y-auto custom-scrollbar md:block')}>
                        <table className={cn(table.table, 'min-w-[900px]')}>
                            <thead className={table.thead}>
                                <tr>
                                    <th className={table.th}>Étudiant</th>
                                    <th className={table.th}>Formation</th>
                                    <th className={table.th}>Demande</th>
                                    <th className={table.th}>Disponibilité</th>
                                    <th className={table.th}>Date</th>
                                    <th className={cn(table.th, 'text-right')}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className={table.tbody}>
                                {requests.map(request => (
                                    <tr key={request.id} className={table.tr}>
                                        <td className={table.td}>
                                            <p className="font-medium text-slate-900">{request.full_name}</p>
                                            <p className="text-xs text-slate-500">
                                                {request.email && <a href={`mailto:${request.email}`} className="text-brand-blue hover:underline">{request.email}</a>}
                                                {request.email && request.phone && ' · '}
                                                {request.phone && <a href={`tel:${request.phone}`} className="whitespace-nowrap text-brand-blue hover:underline">{request.phone}</a>}
                                            </p>
                                            {request.message && <p className="mt-1 max-w-xs truncate text-xs text-slate-500" title={request.message}>{request.message}</p>}
                                        </td>
                                        <td className={table.td}>{request.courses?.title_fr || 'Formation'}</td>
                                        <td className={table.td}>{typeBadge(request)}</td>
                                        <td className={cn(table.td, 'text-slate-500')}>{request.availability || <span className="text-slate-400">—</span>}</td>
                                        <td className={cn(table.td, 'whitespace-nowrap text-slate-500 tabular-nums')}>{new Date(request.created_at).toLocaleDateString('fr-FR')}</td>
                                        <td className={table.td}><div className="flex justify-end">{actions(request)}</div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </Card>
    );
}

function DashboardSkeleton() {
    return (
        <div className="space-y-5" role="status" aria-live="polite">
            <span className="sr-only">Chargement du tableau de bord…</span>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[var(--shadow-card)]">
                        <div className="flex items-center gap-2.5">
                            <Skeleton className="h-9 w-9 rounded-xl" />
                            <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-3 w-28" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                <Skeleton className="h-[420px] rounded-2xl xl:col-span-8" />
                <Skeleton className="h-[420px] rounded-2xl xl:col-span-4" />
            </div>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                <Skeleton className="h-72 rounded-2xl" />
                <Skeleton className="h-72 rounded-2xl" />
                <Skeleton className="h-72 rounded-2xl" />
            </div>
        </div>
    );
}
