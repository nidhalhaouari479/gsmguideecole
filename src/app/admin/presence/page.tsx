"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Check,
    CheckCheck,
    CheckCircle2,
    ChevronRight,
    Clock3,
    FileCheck2,
    Save,
    Search,
    Users,
    X,
} from 'lucide-react';
import {
    Badge,
    Button,
    Card,
    CardHeader,
    EmptyState,
    Field,
    LoadingState,
    PageHeader,
    SearchInput,
    Toolbar,
    cn,
    inputClass,
    selectClass,
    table,
} from '@/components/admin/ui';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

type Course = {
    id: string;
    title_fr: string;
};

type Seance = {
    date: string;
    start_time: string;
    end_time?: string;
};

type Session = {
    id: string;
    course_id: string;
    start_date: string;
    end_date: string;
    schedule: string;
    courses?: Course | null;
};

type StudentAttendance = {
    user_id: string;
    full_name: string;
    email: string;
    phone: string;
    status: AttendanceStatus;
    arrival_time: string;
    note: string;
};

const statusOptions: Array<{ value: AttendanceStatus; label: string }> = [
    { value: 'present', label: 'Présent' },
    { value: 'absent', label: 'Absent' },
    { value: 'late', label: 'Retard' },
    { value: 'excused', label: 'Excusé' },
];

const statusTones: Record<AttendanceStatus, 'success' | 'danger' | 'warning' | 'info'> = {
    present: 'success',
    absent: 'danger',
    late: 'warning',
    excused: 'info',
};

// Solid fills used for the selected state of the status toggles.
// text-[#fff] is used instead of text-white because the admin light theme remaps .text-white.
const activeStatusClasses: Record<AttendanceStatus, string> = {
    present: 'border-emerald-600 bg-emerald-600 text-[#fff]',
    absent: 'border-rose-600 bg-rose-600 text-[#fff]',
    late: 'border-amber-500 bg-amber-500 text-[#fff]',
    excused: 'border-sky-600 bg-sky-600 text-[#fff]',
};

const statusDotClasses: Record<AttendanceStatus, string> = {
    present: 'bg-emerald-500',
    absent: 'bg-rose-500',
    late: 'bg-amber-500',
    excused: 'bg-sky-500',
};

const statusIcons: Record<AttendanceStatus, typeof Check> = {
    present: Check,
    absent: X,
    late: Clock3,
    excused: FileCheck2,
};

const makeSeanceKey = (seance: Seance) =>
    `${seance.date}|${seance.start_time}|${seance.end_time || ''}`;

const parseSeances = (session: Session | undefined): Seance[] => {
    if (!session) return [];
    try {
        const parsed = JSON.parse(session.schedule);
        if (Array.isArray(parsed?.seances) && parsed.seances.length > 0) {
            return [...parsed.seances].sort(
                (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );
        }
    } catch {
        // Une ancienne session devient une séance unique.
    }

    return [{
        date: session.start_date,
        start_time: '09:00',
        end_time: '17:00',
    }];
};

export default function PresenceAdminPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedSessionId, setSelectedSessionId] = useState('');
    const [selectedSeanceKey, setSelectedSeanceKey] = useState('');
    const [students, setStudents] = useState<StudentAttendance[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadingStudents, setLoadingStudents] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                const sessionsResponse = await fetch('/api/admin/sessions');
                const sessionsData = await sessionsResponse.json();

                if (!sessionsResponse.ok || sessionsData.error) {
                    throw new Error(sessionsData.error || 'Impossible de charger les sessions.');
                }

                setSessions(sessionsData);
                const availableCourses = Array.from(
                    new Map(
                        sessionsData
                            .filter((session: Session) => session.courses)
                            .map((session: Session) => [session.course_id, session.courses as Course])
                    ).values()
                ) as Course[];
                setCourses(availableCourses);
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : 'Erreur de chargement.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const availableSessions = useMemo(
        () => sessions.filter((session) => session.course_id === selectedCourseId),
        [sessions, selectedCourseId]
    );

    const selectedSession = sessions.find((session) => session.id === selectedSessionId);
    const seances = useMemo(() => parseSeances(selectedSession), [selectedSession]);
    const selectedSeance = seances.find((seance) => makeSeanceKey(seance) === selectedSeanceKey);

    const filteredStudents = students.filter((student) => {
        const query = searchQuery.toLowerCase();
        return student.full_name.toLowerCase().includes(query)
            || student.email.toLowerCase().includes(query)
            || student.phone.toLowerCase().includes(query);
    });

    const summary = statusOptions.map((option) => ({
        ...option,
        count: students.filter((student) => student.status === option.value).length,
    }));

    const selectCourse = (courseId: string) => {
        setSelectedCourseId(courseId);
        setSelectedSessionId('');
        setSelectedSeanceKey('');
        setStudents([]);
        setError(null);
        setSuccess(null);
    };

    const selectSession = (sessionId: string) => {
        setSelectedSessionId(sessionId);
        setSelectedSeanceKey('');
        setStudents([]);
        setError(null);
        setSuccess(null);
    };

    const loadAttendance = async (seance: Seance) => {
        if (!selectedSessionId) return;

        const seanceKey = makeSeanceKey(seance);
        setSelectedSeanceKey(seanceKey);
        setStudents([]);
        setLoadingStudents(true);
        setError(null);
        setSuccess(null);

        try {
            const params = new URLSearchParams({
                sessionId: selectedSessionId,
                seanceKey,
            });
            const response = await fetch(`/api/admin/presence?${params.toString()}`);
            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || 'Impossible de charger les présences.');
            }

            setStudents(data);
        } catch (loadError) {
            const message = loadError instanceof Error ? loadError.message : 'Erreur de chargement.';
            setError(
                message.includes('attendance_records')
                    ? 'La table de présence n’existe pas encore. Exécutez le fichier supabase-attendance.sql dans Supabase.'
                    : message
            );
        } finally {
            setLoadingStudents(false);
        }
    };

    const updateStudent = (
        userId: string,
        field: 'status' | 'arrival_time' | 'note',
        value: string
    ) => {
        setStudents((current) => current.map((student) => {
            if (student.user_id !== userId) return student;

            if (field === 'status') {
                const status = value as AttendanceStatus;
                return {
                    ...student,
                    status,
                    arrival_time: status === 'absent' ? '' : (student.arrival_time || '09:00'),
                };
            }

            return { ...student, [field]: value };
        }));
        setSuccess(null);
    };

    const saveAttendance = async () => {
        if (!selectedSessionId || !selectedSeance || students.length === 0) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const response = await fetch('/api/admin/presence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: selectedSessionId,
                    seance: selectedSeance,
                    records: students.map((student) => ({
                        user_id: student.user_id,
                        status: student.status,
                        arrival_time: student.arrival_time || '09:00',
                        note: student.note,
                    })),
                }),
            });
            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || 'Impossible d’enregistrer les présences.');
            }

            setSuccess(`${data.saved} présence${data.saved > 1 ? 's' : ''} enregistrée${data.saved > 1 ? 's' : ''}.`);
        } catch (saveError) {
            const message = saveError instanceof Error ? saveError.message : 'Erreur d’enregistrement.';
            setError(
                message.includes('attendance_records')
                    ? 'Exécutez d’abord le fichier supabase-attendance.sql dans Supabase.'
                    : message
            );
        } finally {
            setSaving(false);
        }
    };

    const markAllPresent = () => {
        students.forEach((student) => {
            if (student.status !== 'present') updateStudent(student.user_id, 'status', 'present');
        });
    };

    const statusLabel = (status: AttendanceStatus) =>
        statusOptions.find((option) => option.value === status)?.label;

    const renderStatusToggle = (student: StudentAttendance, size: 'compact' | 'large') => (
        <div
            role="radiogroup"
            aria-label={`État de présence de ${student.full_name}`}
            className={size === 'large' ? 'grid grid-cols-4 gap-1.5' : 'inline-flex gap-1'}
        >
            {statusOptions.map((option) => {
                const isActive = student.status === option.value;
                const Icon = statusIcons[option.value];
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={isActive}
                        onClick={() => updateStudent(student.user_id, 'status', option.value)}
                        className={cn(
                            size === 'large'
                                ? 'flex h-14 flex-col items-center justify-center gap-1 rounded-lg border text-xs font-medium'
                                : 'inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium',
                            'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50',
                            isActive
                                ? activeStatusClasses[option.value]
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'
                        )}
                    >
                        <Icon size={size === 'large' ? 18 : 14} aria-hidden="true" />
                        {option.label}
                    </button>
                );
            })}
        </div>
    );

    if (loading) {
        return <LoadingState label="Chargement des sessions…" />;
    }

    const stepDone = [Boolean(selectedCourseId), Boolean(selectedSessionId), Boolean(selectedSeance)];

    const renderStepBadge = (index: number) => (
        <span
            className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
                stepDone[index] ? 'bg-emerald-600 text-[#fff]' : 'bg-slate-100 text-slate-500'
            )}
            aria-hidden="true"
        >
            {stepDone[index] ? <Check size={12} /> : index + 1}
        </span>
    );

    return (
        <div className="space-y-6 pb-6 md:pb-12">
            <PageHeader
                title="Gestion des présences"
                description="Choisissez une formation, une session et une séance pour remplir la feuille de présence."
            />

            {/* Selection */}
            <Card className="grid gap-4 lg:grid-cols-3">
                <Field
                    label={<span className="flex items-center gap-2">{renderStepBadge(0)} Formation</span>}
                    htmlFor="presence-course"
                    hint={courses.length === 0 ? 'Aucune formation avec session pour le moment.' : undefined}
                >
                    <select
                        id="presence-course"
                        value={selectedCourseId}
                        onChange={(event) => selectCourse(event.target.value)}
                        className={selectClass}
                    >
                        <option value="">Choisir une formation</option>
                        {courses.map((course) => (
                            <option key={course.id} value={course.id}>{course.title_fr}</option>
                        ))}
                    </select>
                </Field>

                <Field
                    label={<span className="flex items-center gap-2">{renderStepBadge(1)} Session</span>}
                    htmlFor="presence-session"
                    hint={!selectedCourseId ? 'Choisissez d’abord une formation.' : undefined}
                >
                    <select
                        id="presence-session"
                        value={selectedSessionId}
                        onChange={(event) => selectSession(event.target.value)}
                        disabled={!selectedCourseId}
                        title={!selectedCourseId ? 'Choisissez d’abord une formation' : undefined}
                        className={`${selectClass} tabular-nums`}
                    >
                        <option value="">Choisir une session</option>
                        {availableSessions.map((session) => (
                            <option key={session.id} value={session.id}>
                                {new Date(session.start_date).toLocaleDateString('fr-FR')} → {new Date(session.end_date).toLocaleDateString('fr-FR')}
                            </option>
                        ))}
                    </select>
                </Field>

                <div className="space-y-1.5">
                    <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        {renderStepBadge(2)} Séance
                    </p>
                    <div className={cn(
                        'flex h-10 items-center rounded-lg border px-3 text-sm',
                        selectedSeance ? 'border-slate-200 bg-white font-medium text-slate-900' : 'border-dashed border-slate-200 bg-slate-50 text-slate-500'
                    )}>
                        <span className="truncate tabular-nums">
                            {selectedSeance
                                ? `${new Date(selectedSeance.date).toLocaleDateString('fr-FR')} à ${selectedSeance.start_time}`
                                : selectedSessionId
                                    ? `${seances.length} séance${seances.length > 1 ? 's' : ''} disponible${seances.length > 1 ? 's' : ''} — choisissez ci-dessous`
                                    : 'Choisissez d’abord une session'}
                        </span>
                    </div>
                </div>
            </Card>

            {selectedSessionId && (
                <Card>
                    <CardHeader
                        title="Liste des séances"
                        actions={<span className="text-xs text-slate-500 tabular-nums">{seances.length} séance{seances.length > 1 ? 's' : ''}</span>}
                        className="mb-4"
                    />
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {seances.map((seance, index) => {
                            const key = makeSeanceKey(seance);
                            const isSelected = key === selectedSeanceKey;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => loadAttendance(seance)}
                                    aria-pressed={isSelected}
                                    className={cn(
                                        'flex min-h-16 items-center justify-between gap-3 rounded-lg border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50',
                                        isSelected
                                            ? 'border-slate-900 bg-white ring-1 ring-slate-900'
                                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                                    )}
                                >
                                    <div className="min-w-0">
                                        <p className="text-xs text-slate-500">Séance {index + 1}</p>
                                        <p className="mt-0.5 text-sm font-medium first-letter:uppercase text-slate-900">
                                            {new Date(seance.date).toLocaleDateString('fr-FR', {
                                                weekday: 'long',
                                                day: '2-digit',
                                                month: 'long',
                                                year: 'numeric',
                                            })}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                                            {seance.start_time} – {seance.end_time || '—'}
                                        </p>
                                    </div>
                                    {isSelected
                                        ? <CheckCircle2 className="shrink-0 text-slate-900" size={18} />
                                        : <ChevronRight className="shrink-0 text-slate-300" size={18} />}
                                </button>
                            );
                        })}
                    </div>
                </Card>
            )}

            {error && (
                <div role="alert" className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-sm text-rose-700">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {loadingStudents && (
                <Card padded={false}>
                    <LoadingState label="Chargement des étudiants…" />
                </Card>
            )}

            {selectedSeance && !loadingStudents && !error && (
                <Card padded={false}>
                    <Toolbar>
                        <div>
                            <h2 className="text-base font-semibold text-slate-900">Feuille de présence</h2>
                            <p className="mt-0.5 text-sm text-slate-500 tabular-nums">
                                {students.length} étudiant{students.length > 1 ? 's' : ''}
                            </p>
                        </div>
                        {students.length > 0 && (
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <SearchInput
                                    value={searchQuery}
                                    onChange={setSearchQuery}
                                    placeholder="Nom, e-mail ou téléphone…"
                                    label="Rechercher un étudiant"
                                />
                                <Button variant="secondary" icon={CheckCheck} onClick={markAllPresent} className="shrink-0">
                                    Tous présents
                                </Button>
                            </div>
                        )}
                    </Toolbar>

                    {students.length === 0 ? (
                        <EmptyState
                            icon={Users}
                            title="Aucun étudiant validé dans cette session."
                            description="Les étudiants apparaissent ici une fois leur inscription validée."
                        />
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-2 border-b border-slate-200 bg-slate-50/60 p-4 md:grid-cols-4">
                                {summary.map((item) => (
                                    <div key={item.value} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                                        <span className="flex items-center gap-2 text-sm text-slate-600">
                                            <span className={cn('h-1.5 w-1.5 rounded-full', statusDotClasses[item.value])} aria-hidden="true" />
                                            {item.label}
                                        </span>
                                        <span className="text-base font-semibold text-slate-900 tabular-nums">{item.count}</span>
                                    </div>
                                ))}
                            </div>

                            {filteredStudents.length === 0 && (
                                <EmptyState
                                    icon={Search}
                                    title="Aucun résultat"
                                    description={`Aucun étudiant ne correspond à « ${searchQuery} ».`}
                                />
                            )}

                            {filteredStudents.length > 0 && (
                                <div className={cn(table.wrapper, 'hidden md:block')}>
                                    <table className={cn(table.table, 'min-w-[860px]')}>
                                        <thead className={table.thead}>
                                            <tr>
                                                <th className={table.th}>Étudiant</th>
                                                <th className={table.th}>État</th>
                                                <th className={table.th}>Heure d’arrivée</th>
                                                <th className={table.th}>Remarque</th>
                                            </tr>
                                        </thead>
                                        <tbody className={table.tbody}>
                                            {filteredStudents.map((student) => (
                                                <tr key={student.user_id} className={table.tr}>
                                                    <td className={table.td}>
                                                        <p className="font-medium text-slate-900">{student.full_name}</p>
                                                        <p className="mt-0.5 text-xs text-slate-500">{student.email}</p>
                                                    </td>
                                                    <td className={cn(table.td, 'whitespace-nowrap')}>
                                                        {renderStatusToggle(student, 'compact')}
                                                    </td>
                                                    <td className={table.td}>
                                                        <input
                                                            type="time"
                                                            value={student.arrival_time}
                                                            disabled={student.status === 'absent'}
                                                            onChange={(event) => updateStudent(student.user_id, 'arrival_time', event.target.value)}
                                                            aria-label={`Heure d’arrivée de ${student.full_name}`}
                                                            title={student.status === 'absent' ? 'Non applicable pour un étudiant absent' : undefined}
                                                            className={cn(inputClass, 'w-32 tabular-nums')}
                                                        />
                                                    </td>
                                                    <td className={table.td}>
                                                        <input
                                                            value={student.note}
                                                            onChange={(event) => updateStudent(student.user_id, 'note', event.target.value)}
                                                            placeholder="Ajouter une remarque…"
                                                            aria-label={`Remarque pour ${student.full_name}`}
                                                            className={cn(inputClass, 'min-w-56')}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div className="divide-y divide-slate-100 md:hidden">
                                {filteredStudents.map((student) => (
                                    <div key={student.user_id} className="space-y-3 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-slate-900">{student.full_name}</p>
                                                <p className="mt-0.5 truncate text-xs text-slate-500">{student.email}</p>
                                            </div>
                                            <Badge tone={statusTones[student.status]} className="shrink-0">
                                                {statusLabel(student.status)}
                                            </Badge>
                                        </div>

                                        {renderStatusToggle(student, 'large')}

                                        <div className="grid grid-cols-[auto_1fr] items-end gap-2">
                                            <Field label="Arrivée" htmlFor={`arrival-${student.user_id}`}>
                                                <input
                                                    id={`arrival-${student.user_id}`}
                                                    type="time"
                                                    value={student.arrival_time}
                                                    disabled={student.status === 'absent'}
                                                    onChange={(event) => updateStudent(student.user_id, 'arrival_time', event.target.value)}
                                                    className={cn(inputClass, 'h-11 w-28 text-base tabular-nums')}
                                                />
                                            </Field>
                                            <Field label="Remarque" htmlFor={`note-${student.user_id}`} className="min-w-0">
                                                <input
                                                    id={`note-${student.user_id}`}
                                                    value={student.note}
                                                    onChange={(event) => updateStudent(student.user_id, 'note', event.target.value)}
                                                    placeholder="Facultatif…"
                                                    className={cn(inputClass, 'h-11 min-w-0 text-base')}
                                                />
                                            </Field>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 flex flex-col gap-3 rounded-b-xl border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:bottom-0 md:px-5">
                                <div aria-live="polite" className="min-w-0">
                                    {success ? (
                                        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                                            <CheckCircle2 size={16} /> {success}
                                        </p>
                                    ) : (
                                        <p className="text-xs text-slate-500">L’heure par défaut est 09:00 et peut être modifiée individuellement.</p>
                                    )}
                                </div>
                                <Button
                                    variant="primary"
                                    icon={Save}
                                    loading={saving}
                                    onClick={saveAttendance}
                                    className="w-full shrink-0 sm:w-auto"
                                >
                                    {saving ? 'Enregistrement…' : 'Enregistrer les présences'}
                                </Button>
                            </div>
                        </>
                    )}
                </Card>
            )}
        </div>
    );
}
