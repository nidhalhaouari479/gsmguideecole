"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
    BookOpen,
    Plus,
    Edit2,
    Trash2,
    Clock,
    Users,
    TrendingUp,
    X,
    LayoutGrid,
    List,
    Target,
    Layers,
    Upload
} from 'lucide-react';
import {
    Badge,
    Button,
    Card,
    EmptyState,
    Field,
    FilterTabs,
    IconButton,
    LoadingState,
    Modal,
    PageHeader,
    SearchInput,
    StatCard,
    Toolbar,
    cn,
    formatDT,
    inputClass,
    table,
} from '@/components/admin/ui';
import RichTextEditor from '@/components/admin/RichTextEditor';

interface Course {
    id: string;
    title_fr: string;
    title_en: string;
    description_fr: string;
    description_en: string;
    duration: string;
    base_price: number;
    sold_price: number | null;
    reservation_amount: number;
    category: string;
    image_url: string;
    level: string;
    instructor_id: string;
    professeurs?: { id: string; nom: string; prenom: string };
    created_at: string;
    student_count?: number;
    course_programs?: {
        id: string;
        content: string;
        position: number;
    }[];
}

interface Professor {
    id: string;
    nom: string;
    prenom: string;
}

export default function CoursesAdminPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [professors, setProfessors] = useState<Professor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Upload state
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        title_fr: '', title_en: '', description_fr: '', description_en: '',
        duration: '', base_price: '', sold_price: '', reservation_amount: '400', category: '',
        image_url: '', level: '', instructor_id: '',
        program_items: ['', '', '', '']
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch courses from custom API
            const coursesRes = await fetch('/api/admin/courses');
            const coursesData = await coursesRes.json();
            if (coursesData.error) throw new Error(coursesData.error);

            // Fetch professors for the dropdown
            const profsRes = await fetch('/api/admin/teachers');
            const profsData = await profsRes.json();
            if (!profsData.error) {
                setProfessors(profsData);
            }

            // Fetch enrollments to get student count
            const { data: enrollmentData } = await supabase.from('enrollments').select('course_id');

            const coursesWithStats = coursesData.map((course: Course) => ({
                ...course,
                student_count: (enrollmentData || []).filter(e => e.course_id === course.id).length
            }));

            setCourses(coursesWithStats);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette formation ?')) return;

        try {
            const res = await fetch(`/api/admin/courses?id=${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setCourses(courses.filter(c => c.id !== id));
            setActiveDropdown(null);
        } catch (error) {
            console.error('Delete error:', error);
            alert('Erreur lors de la suppression.');
        }
    };

    const handleOpenModal = (course?: Course) => {
        if (course) {
            const programItems = [...(course.course_programs || [])]
                .sort((a, b) => a.position - b.position)
                .map(item => item.content);

            setEditingCourse(course);
            setFormData({
                title_fr: course.title_fr,
                title_en: course.title_en || '',
                description_fr: course.description_fr || '',
                description_en: course.description_en || '',
                duration: course.duration || '',
                base_price: course.base_price != null ? course.base_price.toString() : '',
                sold_price: course.sold_price ? course.sold_price.toString() : '',
                reservation_amount: (course.reservation_amount ?? 400).toString(),
                category: course.category || '',
                image_url: course.image_url || '',
                level: course.level || '',
                instructor_id: course.instructor_id || '',
                program_items: Array.from({ length: 4 }, (_, index) => programItems[index] || '')
            });
            setImageFile(null);
            setImagePreview(course.image_url || null);
        } else {
            setEditingCourse(null);
            setFormData({
                title_fr: '', title_en: '', description_fr: '', description_en: '',
                duration: '', base_price: '', sold_price: '', reservation_amount: '400', category: '',
                image_url: '', level: '', instructor_id: '',
                program_items: ['', '', '', '']
            });
            setImageFile(null);
            setImagePreview(null);
        }
        setIsModalOpen(true);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let finalImageUrl = formData.image_url;

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `covers/${fileName}`;

                const uploadFormData = new FormData();
                uploadFormData.append('file', imageFile);
                uploadFormData.append('bucket', 'courses');
                uploadFormData.append('path', filePath);

                const uploadRes = await fetch('/api/admin/upload', {
                    method: 'POST',
                    body: uploadFormData
                });
                
                const uploadData = await uploadRes.json();
                if (uploadData.error) throw new Error("Erreur de téléversement de l’image : " + uploadData.error);
                
                finalImageUrl = uploadData.url;
            }

            const method = editingCourse ? 'PUT' : 'POST';
            const payload = {
                ...formData,
                image_url: finalImageUrl,
                id: editingCourse?.id,
                base_price: Number(formData.base_price),
                sold_price: formData.sold_price ? parseFloat(formData.sold_price) : null,
                reservation_amount: Number(formData.reservation_amount)
            };

            const response = await fetch('/api/admin/courses', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            await fetchData();
            setIsModalOpen(false);
        } catch (error: any) {
            alert(error.message || 'Une erreur est survenue.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredCourses = courses.filter(c =>
        c.title_fr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <LoadingState label="Chargement des formations…" />;
    }

    const stats = [
        { label: 'Formations', value: courses.length, icon: BookOpen },
        { label: 'Secteurs d’activité', value: [...new Set(courses.map(c => c.category))].length, icon: Layers },
        { label: 'Élèves par formation (moy.)', value: (courses.reduce((sum, c) => sum + (c.student_count || 0), 0) / (courses.length || 1)).toFixed(1), icon: Users },
        { label: 'Prix de base moyen', value: formatDT(Number((courses.reduce((sum, c) => sum + c.base_price, 0) / (courses.length || 1)).toFixed(0))), icon: TrendingUp }
    ];

    const translateCategory = (category: string) => (category || '')
        .split(', ')
        .map(cat => cat === 'Software' ? 'Logiciel' : cat === 'Hardware' ? 'Matériel' : cat)
        .join(', ');

    const professorName = (course: Course) => course.professeurs ? `${course.professeurs.nom} ${course.professeurs.prenom}` : 'Non assigné';

    const renderPrice = (course: Course, size: 'sm' | 'lg' = 'sm') => (
        <div className={size === 'lg' ? '' : 'text-right md:text-left'}>
            <p className="whitespace-nowrap tabular-nums">
                <span className={cn('text-sm font-semibold', course.sold_price ? 'text-emerald-700' : 'text-slate-900')}>
                    {formatDT(course.sold_price || course.base_price)}
                </span>
                {course.sold_price ? (
                    <span className="ml-1.5 text-xs text-slate-400 line-through">{formatDT(course.base_price)}</span>
                ) : null}
            </p>
            <p className="mt-0.5 whitespace-nowrap text-xs text-slate-500 tabular-nums">Avance : {formatDT(course.reservation_amount ?? 400)}</p>
        </div>
    );

    const chipClassName = (checked: boolean) => cn(
        'inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-focus/40',
        checked ? 'border-slate-400 bg-slate-50 text-slate-900' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
    );

    const dtSuffix = <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">DT</span>;

    return (
        <div className="space-y-6 pb-6 md:pb-12">
            <PageHeader
                title="Catalogue des formations"
                description="Créez et mettez à jour les formations, leurs tarifs et leur programme."
                actions={
                    <Button variant="primary" icon={Plus} onClick={() => handleOpenModal()} className="max-md:w-full">
                        Ajouter une formation
                    </Button>
                }
            />

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {stats.map((stat) => (
                    <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} />
                ))}
            </div>

            <Card padded={false}>
                <Toolbar>
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Titre ou catégorie…"
                        label="Rechercher une formation"
                    />
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span className="text-sm text-slate-500 tabular-nums">
                            {filteredCourses.length} formation{filteredCourses.length > 1 ? 's' : ''}
                        </span>
                        <FilterTabs
                            label="Mode d’affichage"
                            value={viewMode}
                            onChange={setViewMode}
                            options={[
                                { value: 'grid', label: <><LayoutGrid size={16} aria-hidden="true" /><span className="sr-only sm:not-sr-only">Cartes</span></> },
                                { value: 'list', label: <><List size={16} aria-hidden="true" /><span className="sr-only sm:not-sr-only">Tableau</span></> },
                            ]}
                        />
                    </div>
                </Toolbar>

                {courses.length === 0 && (
                    <EmptyState
                        icon={BookOpen}
                        title="Aucune formation"
                        description="Créez une première entrée dans le catalogue."
                        action={<Button variant="primary" icon={Plus} onClick={() => handleOpenModal()}>Ajouter une formation</Button>}
                    />
                )}

                {filteredCourses.length === 0 && courses.length > 0 && (
                    <EmptyState
                        icon={Target}
                        title="Aucune formation correspondante"
                        description={`Aucun titre ni catégorie ne correspond à « ${searchQuery} ».`}
                        action={<Button variant="secondary" icon={X} onClick={() => setSearchQuery('')}>Effacer la recherche</Button>}
                    />
                )}

                {/* List view */}
                {viewMode === 'list' && filteredCourses.length > 0 && (
                    <>
                        <div className="divide-y divide-slate-100 md:hidden">
                            {filteredCourses.map((course) => (
                                <div key={course.id} className="p-4">
                                    <div className="flex items-start gap-3">
                                        <img src={course.image_url} alt="" className="h-12 w-16 shrink-0 rounded-md bg-slate-100 object-cover" />
                                        <div className="min-w-0 flex-1">
                                            <p className="line-clamp-2 font-medium leading-snug text-slate-900">{course.title_fr}</p>
                                            <p className="mt-0.5 text-xs text-slate-500">{course.level || 'Tous niveaux'}</p>
                                        </div>
                                        <Badge dot={false} className="shrink-0">{translateCategory(course.category)}</Badge>
                                    </div>
                                    <dl className="mt-3 space-y-1.5 text-sm">
                                        <div className="flex items-center justify-between gap-3">
                                            <dt className="shrink-0 text-slate-500">Durée</dt>
                                            <dd className="min-w-0 truncate text-right text-slate-900">{course.duration}</dd>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <dt className="shrink-0 text-slate-500">Professeur</dt>
                                            <dd className="min-w-0 truncate text-right text-slate-900">{professorName(course)}</dd>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <dt className="shrink-0 text-slate-500">Élèves</dt>
                                            <dd className="text-slate-900 tabular-nums">{course.student_count || 0}</dd>
                                        </div>
                                        <div className="flex items-start justify-between gap-3">
                                            <dt className="shrink-0 text-slate-500">Prix</dt>
                                            <dd>{renderPrice(course)}</dd>
                                        </div>
                                    </dl>
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <Button size="sm" icon={Edit2} onClick={() => handleOpenModal(course)}>Modifier</Button>
                                        <Button size="sm" variant="ghost" icon={Trash2} onClick={() => handleDelete(course.id)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700">Supprimer</Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className={cn(table.wrapper, 'hidden md:block')}>
                            <table className={cn(table.table, 'min-w-[920px]')}>
                                <thead className={table.thead}>
                                    <tr>
                                        <th className={table.th}>Formation</th>
                                        <th className={table.th}>Catégorie</th>
                                        <th className={table.th}>Durée</th>
                                        <th className={table.th}>Professeur</th>
                                        <th className={cn(table.th, 'text-right')}>Élèves</th>
                                        <th className={table.th}>Prix</th>
                                        <th className={cn(table.th, 'text-right')}><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody className={table.tbody}>
                                    {filteredCourses.map((course) => (
                                        <tr key={course.id} className={table.tr}>
                                            <td className={table.td}>
                                                <div className="flex min-w-[260px] items-center gap-3">
                                                    <img src={course.image_url} alt="" className="h-9 w-12 shrink-0 rounded-md bg-slate-100 object-cover" />
                                                    <div className="min-w-0">
                                                        <p className="max-w-xs font-medium leading-snug text-slate-900">{course.title_fr}</p>
                                                        <p className="mt-0.5 text-xs text-slate-500">{course.level || 'Tous niveaux'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={table.td}><Badge dot={false}>{translateCategory(course.category)}</Badge></td>
                                            <td className={table.td}>{course.duration}</td>
                                            <td className={table.td}>{professorName(course)}</td>
                                            <td className={cn(table.td, 'text-right font-medium text-slate-900 tabular-nums')}>{course.student_count || 0}</td>
                                            <td className={table.td}>{renderPrice(course)}</td>
                                            <td className={table.td}>
                                                <div className="flex justify-end gap-1">
                                                    <IconButton icon={Edit2} label={`Modifier ${course.title_fr}`} title="Modifier" onClick={() => handleOpenModal(course)} />
                                                    <IconButton icon={Trash2} label={`Supprimer ${course.title_fr}`} title="Supprimer" onClick={() => handleDelete(course.id)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Grid view */}
                {viewMode === 'grid' && filteredCourses.length > 0 && (
                    <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
                        {filteredCourses.map((course) => (
                            <article
                                key={course.id}
                                className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-200 bg-white transition-colors hover:border-slate-300"
                            >
                                <div className="aspect-[2/1] overflow-hidden bg-slate-100">
                                    <img src={course.image_url} alt="" className="h-full w-full object-cover" />
                                </div>

                                <div className="flex flex-1 flex-col p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <h3 className="text-sm font-semibold leading-snug text-slate-900">{course.title_fr}</h3>
                                        <Badge dot={false} className="shrink-0">{translateCategory(course.category)}</Badge>
                                    </div>
                                    <p className="mt-0.5 text-xs text-slate-500">{course.level || 'Tous niveaux'}</p>

                                    <dl className="mb-4 mt-3 space-y-1.5 text-sm text-slate-600">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <Clock size={14} className="shrink-0 text-slate-400" />
                                            <dt className="sr-only">Durée</dt>
                                            <dd className="truncate">{course.duration}</dd>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users size={14} className="shrink-0 text-slate-400" />
                                            <dt className="sr-only">Élèves</dt>
                                            <dd className="tabular-nums">{course.student_count || 0} élève{(course.student_count || 0) > 1 ? 's' : ''}</dd>
                                        </div>
                                        {course.professeurs && (
                                            <div className="flex min-w-0 items-center gap-2">
                                                <dt className="shrink-0 text-slate-500">Professeur :</dt>
                                                <dd className="truncate text-slate-900">{course.professeurs.nom} {course.professeurs.prenom}</dd>
                                            </div>
                                        )}
                                    </dl>

                                    <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-3">
                                        {renderPrice(course, 'lg')}
                                        <div className="flex shrink-0 gap-1">
                                            <IconButton icon={Edit2} label={`Modifier ${course.title_fr}`} title="Modifier" onClick={() => handleOpenModal(course)} />
                                            <IconButton icon={Trash2} label={`Supprimer ${course.title_fr}`} title="Supprimer" onClick={() => handleDelete(course.id)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700" />
                                        </div>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </Card>

            {/* Modal for Add/Edit */}
            <Modal
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingCourse ? 'Modifier la formation' : 'Ajouter une formation'}
                size="lg"
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                        <Button type="submit" form="course-form" variant="primary" loading={isSubmitting}>
                            {editingCourse ? 'Enregistrer les modifications' : 'Créer la formation'}
                        </Button>
                    </>
                }
            >
                <form id="course-form" onSubmit={handleSubmit} className="space-y-6 py-1">
                    {/* General */}
                    <fieldset className="space-y-4">
                        <legend className="mb-3 text-sm font-semibold text-slate-900">Informations générales</legend>
                        <Field label="Titre (FR)" htmlFor="course-title" required>
                            <input id="course-title" type="text" required value={formData.title_fr} onChange={(e) => setFormData({ ...formData, title_fr: e.target.value })} className={inputClass} placeholder="Ex. : Réparation de smartphones" />
                        </Field>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field label="Catégorie" required hint="Plusieurs choix possibles.">
                                <div className="flex flex-wrap gap-2">
                                    {['Software', 'Hardware'].map(cat => {
                                        const checked = (formData.category ? formData.category.split(', ') : []).includes(cat);
                                        return (
                                            <label key={cat} className={chipClassName(checked)}>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => {
                                                        const currentCats = formData.category ? formData.category.split(', ') : [];
                                                        if (currentCats.includes(cat)) {
                                                            setFormData({ ...formData, category: currentCats.filter(c => c !== cat).join(', ') });
                                                        } else {
                                                            setFormData({ ...formData, category: [...currentCats, cat].join(', ') });
                                                        }
                                                    }}
                                                    className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                                                />
                                                {cat === 'Software' ? 'Logiciel' : 'Matériel'}
                                            </label>
                                        );
                                    })}
                                </div>
                            </Field>
                            <Field label="Niveau" required>
                                <div className="flex flex-wrap gap-2">
                                    {['Débutant', 'Intermédiaire', 'Avancé'].map(lvl => {
                                        const checked = (formData.level ? formData.level.split(', ') : []).includes(lvl);
                                        return (
                                            <label key={lvl} className={chipClassName(checked)}>
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => {
                                                        const currentLvls = formData.level ? formData.level.split(', ') : [];
                                                        if (currentLvls.includes(lvl)) {
                                                            setFormData({ ...formData, level: currentLvls.filter(l => l !== lvl).join(', ') });
                                                        } else {
                                                            setFormData({ ...formData, level: [...currentLvls, lvl].join(', ') });
                                                        }
                                                    }}
                                                    className="h-4 w-4 rounded border-slate-300 accent-slate-900"
                                                />
                                                {lvl}
                                            </label>
                                        );
                                    })}
                                </div>
                            </Field>
                        </div>
                    </fieldset>

                    {/* Pricing */}
                    <fieldset className="space-y-4 border-t border-slate-100 pt-5">
                        <legend className="mb-3 text-sm font-semibold text-slate-900">Tarifs et durée</legend>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field label="Prix de base" htmlFor="course-base-price" required>
                                <div className="relative">
                                    <input id="course-base-price" type="number" min="0" step="0.01" required value={formData.base_price} onChange={(e) => setFormData({ ...formData, base_price: e.target.value })} className={`${inputClass} pr-12 tabular-nums`} />
                                    {dtSuffix}
                                </div>
                            </Field>
                            <Field label="Prix soldé" htmlFor="course-sold-price" hint="Laissez vide s’il n’y a pas de promotion.">
                                <div className="relative">
                                    <input id="course-sold-price" type="number" min="0" step="0.01" value={formData.sold_price} onChange={(e) => setFormData({ ...formData, sold_price: e.target.value })} className={`${inputClass} pr-12 tabular-nums`} placeholder="Optionnel" />
                                    {dtSuffix}
                                </div>
                            </Field>
                            <Field label="Avance de réservation" htmlFor="course-reservation" required hint="Montant minimum si l’étudiant paie lors de la réservation.">
                                <div className="relative">
                                    <input
                                        id="course-reservation"
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        required
                                        value={formData.reservation_amount}
                                        onChange={(e) => setFormData({ ...formData, reservation_amount: e.target.value })}
                                        className={`${inputClass} pr-12 tabular-nums`}
                                    />
                                    {dtSuffix}
                                </div>
                            </Field>
                            <Field label="Durée" htmlFor="course-duration" required>
                                <input id="course-duration" type="text" required value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} className={inputClass} placeholder="Ex. : 12 semaines" />
                            </Field>
                        </div>
                    </fieldset>

                    {/* Cover */}
                    <div className="border-t border-slate-100 pt-5">
                        <Field
                            label="Image de couverture"
                            required
                            error={!imagePreview && !formData.image_url ? 'L’image est requise.' : undefined}
                        >
                            <div className={cn(
                                'relative flex min-h-[140px] items-center justify-center overflow-hidden rounded-lg border border-dashed p-4 transition-colors focus-within:ring-2 focus-within:ring-focus/40',
                                imagePreview ? 'border-slate-200 bg-slate-50' : 'border-slate-300 bg-slate-50 hover:border-slate-400'
                            )}>
                                <input
                                    type="file"
                                    accept="image/*"
                                    aria-label="Téléverser une image de couverture"
                                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            const file = e.target.files[0];
                                            setImageFile(file);
                                            setImagePreview(URL.createObjectURL(file));
                                            setFormData({ ...formData, image_url: 'pending_upload' });
                                        }
                                    }}
                                />
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Aperçu de la couverture" className="absolute inset-0 h-full w-full object-cover" />
                                ) : null}
                                <div className={cn('pointer-events-none relative flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-center', imagePreview && 'border border-slate-200 bg-[#fff]')}>
                                    <Upload size={18} className="text-slate-400" />
                                    <span className="text-sm font-medium text-slate-900">
                                        {imagePreview ? "Changer l'image" : 'Cliquez pour téléverser une image'}
                                    </span>
                                    {!imagePreview && <span className="text-xs text-slate-500">JPG, PNG ou WEBP</span>}
                                </div>
                            </div>
                        </Field>
                    </div>

                    {/* Description */}
                    <div className="border-t border-slate-100 pt-5">
                        <Field label="Description principale (français / arabe)">
                            <RichTextEditor
                                value={formData.description_fr}
                                onChange={(description_fr) => setFormData({ ...formData, description_fr })}
                                placeholder="Rédigez la description de la formation…"
                            />
                        </Field>
                    </div>

                    {/* Program */}
                    <fieldset className="space-y-3 border-t border-slate-100 pt-5">
                        <legend className="sr-only">Programme du cours</legend>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">Programme du cours</h3>
                            <p className="mt-0.5 text-xs text-slate-500">Renseignez les quatre éléments qui seront affichés sur la page de cette formation.</p>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {formData.program_items.map((item, index) => (
                                <Field key={index} label={`Élément ${index + 1}`} htmlFor={`course-program-${index}`} required>
                                    <input
                                        id={`course-program-${index}`}
                                        type="text"
                                        required
                                        dir="auto"
                                        value={item}
                                        onChange={(e) => {
                                            const nextItems = [...formData.program_items];
                                            nextItems[index] = e.target.value;
                                            setFormData({ ...formData, program_items: nextItems });
                                        }}
                                        placeholder={`Programme ${index + 1}`}
                                        className={`${inputClass} text-start [unicode-bidi:plaintext]`}
                                    />
                                </Field>
                            ))}
                        </div>
                    </fieldset>
                </form>
            </Modal>
        </div>
    );
}
