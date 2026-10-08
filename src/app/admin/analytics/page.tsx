"use client";

import React, { useEffect, useState } from 'react';
import {
    Activity, Users, Clock, MousePointer2, FileText,
    TrendingUp, RefreshCw, AlertTriangle, BarChart3
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
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
} from '@/components/admin/ui';

interface AnalyticsData {
    kpis: { uniqueVisitors: number; totalPageViews: number; totalClicks: number; avgTime: string; };
    trafficChart: { name: string; traffic: number }[];
    timePerPage: { name: string; time: number }[];
    clicksChart: { name: string; value: number }[];
    pageTable: { page: string; views: number; time: string }[];
}

// Chart system: one accent, recessive slate grid/axes.
const ACCENT = '#2563eb';
const GRID_STROKE = '#f1f5f9';
const AXIS_TICK = { fill: '#64748b', fontSize: 12 };
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
        { label: 'Visiteurs uniques', value: data?.kpis.uniqueVisitors?.toLocaleString('fr-FR') ?? '—', icon: Users },
        { label: 'Temps moyen', value: data?.kpis.avgTime ?? '—', icon: Clock },
        { label: 'Nombre de clics', value: data?.kpis.totalClicks?.toLocaleString('fr-FR') ?? '—', icon: MousePointer2 },
        { label: 'Pages vues', value: data?.kpis.totalPageViews?.toLocaleString('fr-FR') ?? '—', icon: FileText },
    ];

    if (loading) {
        return (
            <div className="mx-auto max-w-[1600px] space-y-6" role="status" aria-live="polite">
                <span className="sr-only">Chargement des données…</span>
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-56" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                    <Skeleton className="h-10 w-48" />
                </div>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[var(--shadow-card)]">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-7 w-16" />
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

    const hasData = data !== null;

    // Show API error
    if (error) {
        return (
            <div className="mx-auto max-w-[1600px] space-y-6">
                <PageHeader title="Analyse du site" description="Trafic, engagement et interactions des visiteurs du site public." />
                <Card padded={false}>
                    <div role="alert">
                        <EmptyState
                            icon={AlertTriangle}
                            title="Erreur du module d’analyse"
                            description="Les statistiques n’ont pas pu être chargées. Détail technique :"
                            action={
                                <div className="flex flex-col items-center gap-4">
                                    <pre className="max-h-48 w-full max-w-lg overflow-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 p-3 text-left text-xs text-rose-700">{error}</pre>
                                    <Button variant="primary" icon={RefreshCw} onClick={fetchData}>Réessayer</Button>
                                </div>
                            }
                        />
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-[1600px] space-y-6 pb-4 md:pb-10">
            <PageHeader
                title="Analyse du site"
                description="Trafic, engagement et interactions des visiteurs du site public."
                actions={
                    <>
                        <FilterTabs
                            label="Période"
                            value={timeRange}
                            onChange={setTimeRange}
                            options={[
                                { value: '7J', label: '7 jours' },
                                { value: '30J', label: '30 jours' },
                            ]}
                        />
                        <IconButton
                            variant="secondary"
                            icon={RefreshCw}
                            onClick={fetchData}
                            title="Rafraîchir"
                            label="Rafraîchir les données"
                        />
                    </>
                }
            />

            {!hasData && (
                <Card padded={false}>
                    <EmptyState
                        icon={Activity}
                        title="Aucune donnée de trafic pour l’instant"
                        description="Le système de tracking est actif. Les données vont commencer à apparaître ici dès que les visiteurs navigueront sur votre site."
                        action={<Button icon={RefreshCw} onClick={fetchData}>Vérifier à nouveau</Button>}
                    />
                </Card>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {cards.map((card) => (
                    <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} />
                ))}
            </div>

            {hasData && (
                <>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        {/* Traffic */}
                        <Card className="min-w-0 lg:col-span-2">
                            <CardHeader
                                title="Trafic par jour"
                                description="Visites des 7 derniers jours"
                                actions={<Badge tone="success">En direct</Badge>}
                            />
                            {data.trafficChart.length > 0 ? (
                                <div className="mt-5 h-56 w-full md:h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data.trafficChart} margin={{ top: 4, right: 8, left: -16 }}>
                                            <defs>
                                                <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor={ACCENT} stopOpacity={0.12} />
                                                    <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid stroke={GRID_STROKE} vertical={false} />
                                            <XAxis dataKey="name" tick={AXIS_TICK} tickLine={false} axisLine={false} />
                                            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={{ color: '#0f172a' }} cursor={{ stroke: '#cbd5e1' }} />
                                            <Area type="monotone" dataKey="traffic" stroke={ACCENT} strokeWidth={2} fill="url(#colorTraffic)" name="Visites" activeDot={{ r: 4 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <ChartEmpty icon={TrendingUp} title="Aucune visite enregistrée sur la période." />
                            )}
                        </Card>

                        {/* Clicks */}
                        <Card className="min-w-0">
                            <CardHeader title="Clics par bouton" description="Répartition des interactions" />
                            {data.clicksChart.length > 0 ? (
                                <div className="mt-4 h-56 w-full md:h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.clicksChart} layout="vertical" margin={{ left: 0, right: 12 }}>
                                            <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
                                            <XAxis type="number" hide allowDecimals={false} />
                                            <YAxis dataKey="name" type="category" tick={AXIS_TICK} width={110} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={TOOLTIP_CURSOR} contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} formatter={(val: any) => [val, 'Clics']} />
                                            <Bar dataKey="value" fill={ACCENT} radius={[0, 4, 4, 0]} barSize={14} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <ChartEmpty icon={MousePointer2} title="Aucun clic enregistré." />
                            )}
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {/* Time per page */}
                        <Card className="min-w-0">
                            <CardHeader title="Temps moyen par page" description="Durée moyenne d’engagement (en secondes)" />
                            {data.timePerPage.length > 0 ? (
                                <div className="mt-4 h-60 w-full md:h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.timePerPage} layout="vertical" margin={{ left: 0, right: 16 }}>
                                            <CartesianGrid stroke={GRID_STROKE} horizontal={false} />
                                            <XAxis type="number" hide />
                                            <YAxis dataKey="name" type="category" tick={AXIS_TICK} width={120} axisLine={false} tickLine={false} />
                                            <Tooltip cursor={TOOLTIP_CURSOR} contentStyle={TOOLTIP_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} formatter={(val: any) => [`${val} s`, 'Temps moyen']} />
                                            <Bar dataKey="time" fill={ACCENT} radius={[0, 4, 4, 0]} barSize={14} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <ChartEmpty icon={Clock} title="Données insuffisantes pour le moment." />
                            )}
                        </Card>

                        {/* Top pages */}
                        <Card padded={false} className="flex min-w-0 flex-col overflow-hidden">
                            <CardHeader
                                className="border-b border-slate-200 p-5"
                                title="Pages les plus visitées"
                                description="Pages principales et performances"
                            />
                            {data.pageTable.length === 0 ? (
                                <EmptyState icon={BarChart3} title="Aucune donnée disponible" description="Les pages consultées apparaîtront ici." />
                            ) : (
                                <>
                                    <ul className="divide-y divide-slate-100 md:hidden">
                                        {data.pageTable.map((row, i) => (
                                            <li key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                                                <p className="min-w-0 truncate font-mono text-sm text-slate-900" title={row.page}>{row.page}</p>
                                                <div className="shrink-0 text-right">
                                                    <p className="text-sm font-medium text-slate-900 tabular-nums">{row.views.toLocaleString('fr-FR')} vues</p>
                                                    <p className="text-xs text-slate-500 tabular-nums">{row.time}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className={cn(table.wrapper, 'hidden max-h-[360px] flex-grow overflow-y-auto custom-scrollbar md:block')}>
                                        <table className={table.table}>
                                            <thead className={table.thead}>
                                                <tr>
                                                    <th className={cn(table.th, 'pl-5')}>Page</th>
                                                    <th className={cn(table.th, 'text-right')}>Vues</th>
                                                    <th className={cn(table.th, 'pr-5 text-right')}>Temps moyen</th>
                                                </tr>
                                            </thead>
                                            <tbody className={table.tbody}>
                                                {data.pageTable.map((row, i) => (
                                                    <tr key={i} className={table.tr}>
                                                        <td className={cn(table.td, 'max-w-[280px] truncate pl-5 font-mono text-slate-900')} title={row.page}>{row.page}</td>
                                                        <td className={cn(table.td, 'whitespace-nowrap text-right font-medium text-slate-900 tabular-nums')}>{row.views.toLocaleString('fr-FR')}</td>
                                                        <td className={cn(table.td, 'whitespace-nowrap pr-5 text-right text-slate-500 tabular-nums')}>{row.time}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}

function ChartEmpty({ icon, title }: { icon: React.ComponentProps<typeof EmptyState>['icon']; title: string }) {
    return (
        <div className="mt-4 flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-200 md:h-[280px]">
            <EmptyState icon={icon} title={title} className="py-0" />
        </div>
    );
}
