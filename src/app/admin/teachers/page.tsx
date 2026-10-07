"use client";

import React, { useEffect, useState } from 'react';
import { Users, Search, Loader2, X, Edit2, Plus } from 'lucide-react';
import {
    PageHeader,
    Card,
    Badge,
    Button,
    IconButton,
    SearchInput,
    Toolbar,
    table,
    EmptyState,
    LoadingState,
    Field,
    inputClass,
    Modal,
    cn,
} from '@/components/admin/ui';

interface TeacherData {
    id: string;
    nom: string;
    prenom: string;
    specialite: string;
    email: string;
    created_at: string;
}

export default function TeachersAdminPage() {
    const [teachers, setTeachers] = useState<TeacherData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<TeacherData | null>(null);
    const [formData, setFormData] = useState({ nom: '', prenom: '', specialite: '', email: '', password: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchTeachers();
    }, []);

    const fetchTeachers = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/teachers');
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setTeachers(data);
        } catch (error) {
            console.error('Error fetching teachers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (userId: string, action: 'block' | 'unblock' | 'delete') => {
        if (action === 'delete') {
            if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement ce professeur ?')) return;
        }

        setActionLoading(userId);
        try {
            const response = await fetch('/api/admin/actions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action })
            });
            const data = await response.json();
            if (data.error) {
                alert(data.error);
            } else {
                await fetchTeachers();
                setActiveDropdown(null);
            }
        } catch (error) {
            console.error('Action error:', error);
            alert('Une erreur est survenue.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleOpenModal = (teacher?: TeacherData) => {
        if (teacher) {
            setEditingTeacher(teacher);
            setFormData({
                nom: teacher.nom || '',
                prenom: teacher.prenom || '',
                specialite: teacher.specialite || '', email: teacher.email || '', password: ''
            });
        } else {
            setEditingTeacher(null);
            setFormData({ nom: '', prenom: '', specialite: '', email: '', password: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const url = '/api/admin/teachers';
            const method = editingTeacher ? 'PUT' : 'POST';
            const body = editingTeacher
                ? { id: editingTeacher.id, ...formData }
                : formData;

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            await fetchTeachers();
            setIsModalOpen(false);
        } catch (error: any) {
            alert(error.message || 'Une erreur est survenue.');
        } finally {
            setIsSubmitting(false);
        }
    };


    const filteredTeachers = teachers.filter(t =>
        t.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.specialite && t.specialite.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (loading) {
        return <LoadingState label="Chargement des professeurs…" />;
    }

    const specialtiesCount = new Set(teachers.map(t => t.specialite).filter(Boolean)).size;

    const hasSearch = searchQuery.trim().length > 0;
    const getInitials = (teacher: TeacherData) => `${teacher.prenom?.charAt(0) || ''}${teacher.nom?.charAt(0) || ''}`.toUpperCase() || '?';
    const formatDate = (value: string) => value ? new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    const passwordTooShort = formData.password.length > 0 && formData.password.length < 8;

    const avatar = (teacher: TeacherData) => (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600" aria-hidden="true">
            {getInitials(teacher)}
        </span>
    );

    const emailLine = (teacher: TeacherData) => teacher.email ? (
        <a href={`mailto:${teacher.email}`} className="truncate text-xs text-slate-500 hover:text-brand-blue">{teacher.email}</a>
    ) : (
        <span className="text-xs text-slate-400">Email non renseigné</span>
    );

    const emptyState = hasSearch ? (
        <EmptyState
            icon={Search}
            title="Aucun professeur ne correspond à votre recherche"
            description={<>Aucun résultat pour « {searchQuery} ». Vérifiez l&apos;orthographe ou effacez la recherche.</>}
            action={<Button variant="secondary" size="sm" icon={X} onClick={() => setSearchQuery('')}>Effacer la recherche</Button>}
        />
    ) : (
        <EmptyState
            icon={Users}
            title="Aucun professeur pour le moment"
            description="Ajoutez votre premier professeur pour l’assigner à des sessions."
            action={<Button variant="primary" size="sm" icon={Plus} onClick={() => handleOpenModal()}>Ajouter un professeur</Button>}
        />
    );

    return (
        <div className="space-y-6 pb-6 md:pb-20">
            <PageHeader
                title={
                    <span className="inline-flex items-center gap-2">
                        Professeurs
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-600 tabular-nums">{teachers.length}</span>
                    </span>
                }
                description={
                    <>
                        Comptes formateurs et spécialités
                        {specialtiesCount > 0 && <> · <span className="tabular-nums">{specialtiesCount}</span> spécialité{specialtiesCount > 1 ? 's' : ''} couverte{specialtiesCount > 1 ? 's' : ''}</>}
                    </>
                }
                actions={
                    <Button variant="primary" icon={Plus} onClick={() => handleOpenModal()} className="w-full sm:w-auto">
                        Ajouter un professeur
                    </Button>
                }
            />

            <Card padded={false} className="overflow-hidden">
                <section aria-label="Liste des professeurs">
                    <Toolbar>
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Nom, prénom ou spécialité…"
                            label="Rechercher un professeur"
                            className="sm:w-80"
                        />
                        <p className="text-xs text-slate-500 tabular-nums" aria-live="polite">
                            {hasSearch
                                ? <><span className="font-medium text-slate-900">{filteredTeachers.length}</span> résultat{filteredTeachers.length > 1 ? 's' : ''} sur {teachers.length}</>
                                : <><span className="font-medium text-slate-900">{teachers.length}</span> professeur{teachers.length > 1 ? 's' : ''}</>}
                        </p>
                    </Toolbar>

                    {filteredTeachers.length === 0 ? emptyState : (
                        <>
                            {/* Mobile card list */}
                            <ul className="divide-y divide-slate-100 md:hidden">
                                {filteredTeachers.map((teacher) => (
                                    <li key={teacher.id} className="p-4">
                                        <div className="flex items-start gap-3">
                                            {avatar(teacher)}
                                            <div className="flex min-w-0 flex-1 flex-col">
                                                <span className="truncate text-sm font-medium text-slate-900">{teacher.prenom} {teacher.nom}</span>
                                                {emailLine(teacher)}
                                            </div>
                                            <div className="-mr-2 -mt-1 flex shrink-0 items-center">
                                                <IconButton
                                                    label={`Modifier ${teacher.prenom} ${teacher.nom}`}
                                                    icon={Edit2}
                                                    onClick={() => handleOpenModal(teacher)}
                                                />
                                                <IconButton
                                                    label={`Révoquer ${teacher.prenom} ${teacher.nom}`}
                                                    icon={actionLoading === teacher.id ? Loader2 : X}
                                                    onClick={() => handleAction(teacher.id, 'delete')}
                                                    disabled={actionLoading === teacher.id}
                                                    className={cn('text-rose-600 hover:bg-rose-50 hover:text-rose-700', actionLoading === teacher.id && '[&>svg]:animate-spin')}
                                                />
                                            </div>
                                        </div>
                                        <dl className="mt-3 grid grid-cols-2 gap-3 pl-12 text-sm">
                                            <div className="min-w-0">
                                                <dt className="text-xs text-slate-500">Spécialité</dt>
                                                <dd className="mt-0.5 truncate text-slate-900">
                                                    {teacher.specialite || <span className="text-slate-400">Non renseignée</span>}
                                                </dd>
                                            </div>
                                            <div className="min-w-0">
                                                <dt className="text-xs text-slate-500">Ajouté le</dt>
                                                <dd className="mt-0.5 text-slate-900 tabular-nums">{formatDate(teacher.created_at)}</dd>
                                            </div>
                                        </dl>
                                    </li>
                                ))}
                            </ul>

                            {/* Desktop table */}
                            <div className={cn(table.wrapper, 'hidden md:block custom-scrollbar')}>
                                <table className={table.table}>
                                    <thead className={table.thead}>
                                        <tr>
                                            <th scope="col" className={cn(table.th, 'pl-5')}>Professeur</th>
                                            <th scope="col" className={table.th}>Spécialité</th>
                                            <th scope="col" className={table.th}>Date d&apos;ajout</th>
                                            <th scope="col" className={cn(table.th, 'pr-5 text-right')}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className={table.tbody}>
                                        {filteredTeachers.map((teacher) => (
                                            <tr key={teacher.id} className={table.tr}>
                                                <td className={cn(table.td, 'pl-5')}>
                                                    <div className="flex min-w-[14rem] items-center gap-3">
                                                        {avatar(teacher)}
                                                        <div className="flex min-w-0 flex-col">
                                                            <span className="font-medium text-slate-900">{teacher.prenom} {teacher.nom}</span>
                                                            {emailLine(teacher)}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className={table.td}>
                                                    {teacher.specialite ? (
                                                        <Badge dot={false}>{teacher.specialite}</Badge>
                                                    ) : (
                                                        <span className="text-slate-400">Non renseignée</span>
                                                    )}
                                                </td>
                                                <td className={cn(table.td, 'whitespace-nowrap tabular-nums text-slate-500')}>
                                                    {formatDate(teacher.created_at)}
                                                </td>
                                                <td className={cn(table.td, 'pr-5 text-right')}>
                                                    <div className="flex items-center justify-end gap-0.5">
                                                        <IconButton
                                                            label={`Modifier ${teacher.prenom} ${teacher.nom}`}
                                                            title="Modifier"
                                                            icon={Edit2}
                                                            onClick={() => handleOpenModal(teacher)}
                                                        />
                                                        <IconButton
                                                            label={`Révoquer ${teacher.prenom} ${teacher.nom}`}
                                                            title="Révoquer"
                                                            icon={actionLoading === teacher.id ? Loader2 : X}
                                                            onClick={() => handleAction(teacher.id, 'delete')}
                                                            disabled={actionLoading === teacher.id}
                                                            className={cn('text-rose-600 hover:bg-rose-50 hover:text-rose-700', actionLoading === teacher.id && '[&>svg]:animate-spin')}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </section>
            </Card>

            {/* Add / edit dialog */}
            <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingTeacher ? 'Modifier le professeur' : 'Ajouter un professeur'}
                description={editingTeacher ? 'Mettez à jour les informations et les identifiants.' : 'Un compte de connexion sera créé avec ces identifiants.'}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">
                            Annuler
                        </Button>
                        <Button type="submit" form="teacher-form" variant="primary" loading={isSubmitting} className="w-full sm:w-auto">
                            {isSubmitting ? 'Enregistrement…' : editingTeacher ? 'Enregistrer' : 'Créer le professeur'}
                        </Button>
                    </>
                }
            >
                <form id="teacher-form" onSubmit={handleSubmit} className="space-y-6" autoComplete="off">
                    <fieldset className="space-y-4">
                        <legend className="mb-3 text-sm font-semibold text-slate-900">Identité</legend>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field label="Nom" htmlFor="teacher-nom" required>
                                <input
                                    id="teacher-nom"
                                    type="text"
                                    required
                                    value={formData.nom}
                                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                                    className={inputClass}
                                    placeholder="Nom du professeur"
                                />
                            </Field>
                            <Field label="Prénom" htmlFor="teacher-prenom" required>
                                <input
                                    id="teacher-prenom"
                                    type="text"
                                    required
                                    value={formData.prenom}
                                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                                    className={inputClass}
                                    placeholder="Prénom du professeur"
                                />
                            </Field>
                        </div>
                        <Field label={<>Spécialité <span className="font-normal text-slate-400">(facultatif)</span></>} htmlFor="teacher-specialite">
                            <input
                                id="teacher-specialite"
                                type="text"
                                value={formData.specialite}
                                onChange={(e) => setFormData({ ...formData, specialite: e.target.value })}
                                className={inputClass}
                                placeholder="Ex : Réparation smartphone"
                            />
                        </Field>
                    </fieldset>

                    <fieldset className="space-y-4 border-t border-slate-200 pt-5">
                        <legend className="sr-only">Accès au compte</legend>
                        <p className="text-sm font-semibold text-slate-900">Accès au compte</p>
                        <Field label="Email de connexion" htmlFor="teacher-email" required hint="Le professeur utilisera cette adresse pour se connecter.">
                            <input id="teacher-email" type="email" required value={formData.email} name="teacher-account-email" autoComplete="off"
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className={inputClass}
                                placeholder="professeur@exemple.com" />
                        </Field>
                        <div className="space-y-1.5">
                            <label htmlFor="teacher-password" className="block text-sm font-medium text-slate-700">
                                {editingTeacher ? 'Nouveau mot de passe' : <>Mot de passe <span className="ml-0.5 text-rose-600" aria-hidden="true">*</span></>}
                            </label>
                            <input id="teacher-password" type="password" required={!editingTeacher} minLength={8} value={formData.password} name="teacher-new-password" autoComplete="new-password"
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                aria-describedby="teacher-password-help"
                                className={inputClass}
                                placeholder="8 caractères minimum" />
                            <p id="teacher-password-help" className={cn('text-xs', passwordTooShort ? 'text-rose-600' : 'text-slate-500')}>
                                {passwordTooShort
                                    ? `Encore ${8 - formData.password.length} caractère${8 - formData.password.length > 1 ? 's' : ''} minimum.`
                                    : editingTeacher
                                        ? 'Laissez vide pour conserver le mot de passe actuel. 8 caractères minimum.'
                                        : '8 caractères minimum.'}
                            </p>
                        </div>
                    </fieldset>
                    <p className="text-xs text-slate-500"><span className="text-rose-600">*</span> Champs obligatoires</p>
                </form>
            </Modal>
        </div>
    );
}
