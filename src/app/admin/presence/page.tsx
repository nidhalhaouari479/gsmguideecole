"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Clock3,
    Loader2,
    Save,
    School,
    Search,
    Users,
} from 'lucide-react';

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

const statusClasses: Record<AttendanceStatus, string> = {
    present: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    absent: 'border-rose-200 bg-rose-50 text-rose-700',
    late: 'border-amber-200 bg-amber-50 text-amber-700',
    excused: 'border-blue-200 bg-blue-50 text-blue-700',
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
                const [coursesResponse, sessionsResponse] = await Promise.all([
                    fetch('/api/admin/courses'),
                    fetch('/api/admin/sessions'),
                ]);
                const coursesData = await coursesResponse.json();
                const sessionsData = await sessionsResponse.json();

                if (!coursesResponse.ok || coursesData.error) {
                    throw new Error(coursesData.error || 'Impossible de charger les formations.');
                }
                if (!sessionsResponse.ok || sessionsData.error) {
                    throw new Error(sessionsData.error || 'Impossible de charger les sessions.');
                }

                setCourses(coursesData);
                setSessions(sessionsData);
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

    if (loading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <Loader2 className="animate-spin text-brand-green" size={44} />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            <header>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-brand-green">
                    <CheckCircle2 size={15} /> Suivi pédagogique
                </div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900">Gestion des présences</h1>
                <p className="mt-2 text-sm text-slate-500">
                    Choisissez une formation, une session et une séance pour remplir la feuille de présence.
                </p>
            </header>

            <div className="grid gap-4 lg:grid-cols-3">
                <section className="premium-card bg-white p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-xl bg-brand-blue/10 p-2 text-brand-blue"><School size={20} /></div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Étape 1</p>
                            <h2 className="font-black text-slate-900">Formation</h2>
                        </div>
                    </div>
                    <select
                        value={selectedCourseId}
                        onChange={(event) => selectCourse(event.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-800 outline-none focus:border-brand-blue"
                    >
                        <option value="">Choisir une formation</option>
                        {courses.map((course) => (
                            <option key={course.id} value={course.id}>{course.title_fr}</option>
                        ))}
                    </select>
                </section>

                <section className="premium-card bg-white p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-xl bg-brand-green/10 p-2 text-brand-green"><CalendarDays size={20} /></div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Étape 2</p>
                            <h2 className="font-black text-slate-900">Session</h2>
                        </div>
                    </div>
                    <select
                        value={selectedSessionId}
                        onChange={(event) => selectSession(event.target.value)}
                        disabled={!selectedCourseId}
                        className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-800 outline-none disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-brand-green"
                    >
                        <option value="">Choisir une session</option>
                        {availableSessions.map((session) => (
                            <option key={session.id} value={session.id}>
                                {new Date(session.start_date).toLocaleDateString('fr-FR')} → {new Date(session.end_date).toLocaleDateString('fr-FR')}
                            </option>
                        ))}
                    </select>
                </section>

                <section className="premium-card bg-white p-6">
                    <div className="mb-4 flex items-center gap-3">
                        <div className="rounded-xl bg-amber-50 p-2 text-amber-600"><Clock3 size={20} /></div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Étape 3</p>
                            <h2 className="font-black text-slate-900">Séance</h2>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500">
                        {selectedSeance
                            ? `${new Date(selectedSeance.date).toLocaleDateString('fr-FR')} à ${selectedSeance.start_time}`
                            : selectedSessionId
                                ? `${seances.length} séance${seances.length > 1 ? 's' : ''} disponible${seances.length > 1 ? 's' : ''}`
                                : 'Choisissez d’abord une session'}
                    </p>
                </section>
            </div>

            {selectedSessionId && (
                <section className="premium-card bg-white p-6">
                    <h2 className="mb-5 text-xl font-black text-slate-900">Liste des séances</h2>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {seances.map((seance, index) => {
                            const key = makeSeanceKey(seance);
                            const isSelected = key === selectedSeanceKey;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => loadAttendance(seance)}
                                    className={`flex items-center justify-between rounded-2xl border-2 p-4 text-left transition-all ${isSelected
                                        ? 'border-brand-blue bg-brand-blue/5'
                                        : 'border-slate-200 hover:border-brand-blue/40'
                                        }`}
                                >
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Séance {index + 1}</p>
                                        <p className="mt-1 font-black text-slate-900">
                                            {new Date(seance.date).toLocaleDateString('fr-FR', {
                                                weekday: 'long',
                                                day: '2-digit',
                                                month: 'long',
                                                year: 'numeric',
                                            })}
                                        </p>
                                        <p className="mt-1 text-sm font-bold text-brand-blue">
                                            {seance.start_time} – {seance.end_time || '—'}
                                        </p>
                                    </div>
                                    <ChevronRight className={isSelected ? 'text-brand-blue' : 'text-slate-300'} size={20} />
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
                    {error}
                </div>
            )}

            {loadingStudents && (
                <div className="flex items-center justify-center gap-3 rounded-3xl bg-white p-16 text-slate-500">
                    <Loader2 className="animate-spin text-brand-blue" size={28} />
                    Chargement des étudiants…
                </div>
            )}

            {selectedSeance && !loadingStudents && !error && (
                <section className="premium-card overflow-hidden bg-white">
                    <div className="flex flex-col gap-5 border-b border-slate-200 p-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="flex items-center gap-2 text-brand-blue">
                                <Users size={19} />
                                <span className="text-xs font-black uppercase tracking-widest">{students.length} étudiants</span>
                            </div>
                            <h2 className="mt-2 text-2xl font-black text-slate-900">Feuille de présence</h2>
                        </div>
                        <div className="relative w-full lg:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                            <input
                                value={searchQuery}
                                onChange={(event) => setSearchQuery(event.target.value)}
                                placeholder="Rechercher un étudiant"
                                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-brand-blue"
                            />
                        </div>
                    </div>

                    {students.length === 0 ? (
                        <div className="p-16 text-center">
                            <Users className="mx-auto mb-3 text-slate-300" size={38} />
                            <p className="font-bold text-slate-500">Aucun étudiant validé dans cette session.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-3 border-b border-slate-100 bg-slate-50 p-5 md:grid-cols-4">
                                {summary.map((item) => (
                                    <div key={item.value} className={`rounded-xl border px-4 py-3 ${statusClasses[item.value]}`}>
                                        <p className="text-[10px] font-black uppercase tracking-widest">{item.label}</p>
                                        <p className="mt-1 text-2xl font-black">{item.count}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[950px]">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50 text-left">
                                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Étudiant</th>
                                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">État</th>
                                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Heure d’arrivée</th>
                                            <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Remarque</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredStudents.map((student) => (
                                            <tr key={student.user_id} className="hover:bg-slate-50/70">
                                                <td className="px-6 py-4">
                                                    <p className="font-black text-slate-900">{student.full_name}</p>
                                                    <p className="mt-1 text-xs text-slate-500">{student.email}</p>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <select
                                                        value={student.status}
                                                        onChange={(event) => updateStudent(student.user_id, 'status', event.target.value)}
                                                        className={`w-36 rounded-xl border px-3 py-2.5 text-sm font-black outline-none ${statusClasses[student.status]}`}
                                                    >
                                                        {statusOptions.map((option) => (
                                                            <option key={option.value} value={option.value}>{option.label}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-4">
                                                    <input
                                                        type="time"
                                                        value={student.arrival_time}
                                                        disabled={student.status === 'absent'}
                                                        onChange={(event) => updateStudent(student.user_id, 'arrival_time', event.target.value)}
                                                        className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 focus:border-brand-blue"
                                                    />
                                                </td>
                                                <td className="px-4 py-4">
                                                    <input
                                                        value={student.note}
                                                        onChange={(event) => updateStudent(student.user_id, 'note', event.target.value)}
                                                        placeholder="Ajouter une remarque…"
                                                        className="w-full min-w-64 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-blue"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 p-6 sm:flex-row">
                                <div>
                                    {success && <p className="font-bold text-emerald-600">{success}</p>}
                                    <p className="text-xs text-slate-500">L’heure par défaut est 09:00 et peut être modifiée individuellement.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={saveAttendance}
                                    disabled={saving}
                                    className="btn-primary min-w-56 py-3"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                                    {saving ? 'Enregistrement…' : 'Enregistrer les présences'}
                                </button>
                            </div>
                        </>
                    )}
                </section>
            )}
        </div>
    );
}
